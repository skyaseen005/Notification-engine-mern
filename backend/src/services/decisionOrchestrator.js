const { v4: uuidv4 } = require('uuid');
const NotificationEvent = require('../models/NotificationEvent');
const NotificationDecision = require('../models/NotificationDecision');
const deduplicationService = require('./deduplicationService');
const ruleEngine = require('./ruleEngine');
const aiScoringService = require('./aiScoringService');

class DecisionOrchestrator {
  async processEvent(eventData) {
    const event = {
      event_id: eventData.event_id || uuidv4(),
      user_id: eventData.user_id,
      event_type: eventData.event_type,
      message: eventData.message || eventData.title || '',
      title: eventData.title,
      source: eventData.source,
      priority_hint: eventData.priority_hint || 'medium',
      channel: eventData.channel,
      timestamp: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
      expires_at: eventData.expires_at ? new Date(eventData.expires_at) : null,
      dedupe_key: eventData.dedupe_key,
      metadata: eventData.metadata || {}
    };

    // Save event to DB
    try {
      await NotificationEvent.create(event);
    } catch (err) {
      if (err.code !== 11000) console.error('Event save error:', err.message);
    }

    let decision;

    // Step 1: Exact duplicate check
    const exactDup = await deduplicationService.checkExactDuplicate(event);
    if (exactDup.isDuplicate) {
      decision = {
        decision: 'NEVER',
        reason: exactDup.reason,
        rule_matched: 'deduplication',
        decision_path: 'rule_engine'
      };
    }

    // Step 2: Near-duplicate check
    if (!decision) {
      const nearDup = await deduplicationService.checkNearDuplicate(event);
      if (nearDup.isDuplicate) {
        decision = {
          decision: 'NEVER',
          reason: nearDup.reason,
          rule_matched: 'near_deduplication',
          decision_path: 'rule_engine'
        };
      }
    }

    // Step 3: Rule Engine
    if (!decision) {
      decision = await ruleEngine.evaluate(event);
    }

    // Step 4: AI Scoring (if no rule decision)
    if (!decision) {
      const fatigueCount = await ruleEngine.getFatigueCounters(event.user_id, event.channel);
      decision = await aiScoringService.score(event, { recent_count: fatigueCount });
      if (!decision.reason) {
        decision.reason = decision.ai_reasoning || 'AI-based classification';
      }
    }

    // Record in history if sending now
    if (decision.decision === 'NOW') {
      await deduplicationService.recordSent(event);
    }

    // Save decision
    const decisionRecord = {
      decision_id: uuidv4(),
      event_id: event.event_id,
      user_id: event.user_id,
      decision: decision.decision,
      reason: decision.reason || decision.ai_reasoning,
      rule_matched: decision.rule_matched,
      ai_score: decision.ai_score,
      ai_reasoning: decision.ai_reasoning,
      decided_at: new Date(),
      scheduled_for: decision.scheduled_for || null,
      original_event: event,
      decision_path: decision.decision_path || 'hybrid'
    };

    await NotificationDecision.create(decisionRecord);

    return {
      decision: decision.decision,
      reason: decisionRecord.reason,
      decision_id: decisionRecord.decision_id,
      scheduled_for: decisionRecord.scheduled_for,
      decision_path: decisionRecord.decision_path,
      rule_matched: decisionRecord.rule_matched,
      ai_score: decisionRecord.ai_score
    };
  }

  async processBatch(events) {
    const results = await Promise.allSettled(events.map(e => this.processEvent(e)));
    return results.map((r, i) => ({
      event_id: events[i].event_id || `batch_${i}`,
      status: r.status === 'fulfilled' ? 'processed' : 'failed',
      result: r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
    }));
  }
}

module.exports = new DecisionOrchestrator();
