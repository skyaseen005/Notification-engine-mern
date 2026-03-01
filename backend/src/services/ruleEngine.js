const SuppressionRule = require('../models/SuppressionRule');
const UserNotificationHistory = require('../models/UserNotificationHistory');

class RuleEngine {
  constructor() {
    this.cachedRules = [];
    this.cacheExpiry = 0;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 min cache
  }

  async getRules() {
    if (Date.now() < this.cacheExpiry && this.cachedRules.length > 0) {
      return this.cachedRules;
    }
    try {
      this.cachedRules = await SuppressionRule.find({ is_active: true }).sort({ priority: -1 });
      this.cacheExpiry = Date.now() + this.CACHE_TTL;
      return this.cachedRules;
    } catch (err) {
      console.error('Rules fetch failed, using cache:', err.message);
      return this.cachedRules;
    }
  }

  async getFatigueCounters(userId, channel) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await UserNotificationHistory.countDocuments({
      user_id: userId,
      channel: channel,
      sent_at: { $gte: oneHourAgo },
      decision: 'NOW'
    });
    return count;
  }

  evaluateCondition(condition, event, context = {}) {
    const { recent_count_1h = 0, user_dnd = false } = context;

    for (const [key, value] of Object.entries(condition)) {
      switch (key) {
        case 'event_type':
          if (Array.isArray(value)) {
            if (!value.includes(event.event_type)) return false;
          } else {
            if (event.event_type !== value) return false;
          }
          break;
        case 'priority_hint':
          if (typeof value === 'object' && value.not_in) {
            if (!value.not_in.includes(event.priority_hint)) {
              // condition means priority is NOT in this list = condition passes
            } else return false;
          } else if (Array.isArray(value)) {
            if (!value.includes(event.priority_hint)) return false;
          } else {
            if (event.priority_hint !== value) return false;
          }
          break;
        case 'channel':
          if (Array.isArray(value)) {
            if (!value.includes(event.channel)) return false;
          } else {
            if (event.channel !== value) return false;
          }
          break;
        case 'source':
          if (Array.isArray(value)) {
            if (!value.includes(event.source)) return false;
          } else {
            if (event.source !== value) return false;
          }
          break;
        case 'recent_count_1h':
          if (typeof value === 'object' && value.gte !== undefined) {
            if (recent_count_1h < value.gte) return false;
          }
          break;
        case 'user_dnd':
          if (value !== user_dnd) return false;
          break;
      }
    }
    return true;
  }

  async evaluate(event) {
    // 1. Check expiry
    if (event.expires_at && new Date(event.expires_at) < new Date()) {
      return { 
        decision: 'NEVER', 
        reason: 'Notification has expired before processing', 
        rule_matched: 'expiry_check',
        decision_path: 'rule_engine'
      };
    }

    // 2. Check critical - always send
    if (event.priority_hint === 'critical') {
      return {
        decision: 'NOW',
        reason: 'Critical priority notification - bypasses all fatigue limits',
        rule_matched: 'critical_override',
        decision_path: 'rule_engine'
      };
    }

    // 3. Get fatigue counters
    const fatigueCount = await this.getFatigueCounters(event.user_id, event.channel);
    const FATIGUE_THRESHOLD = 10; // max 10 per hour per channel

    // 4. Get and evaluate rules
    const rules = await this.getRules();
    const context = { recent_count_1h: fatigueCount };

    for (const rule of rules) {
      if (this.evaluateCondition(rule.conditions, event, context)) {
        // If rule says NOW and fatigue is high but no override, downgrade to LATER
        if (rule.action === 'NOW' && fatigueCount >= FATIGUE_THRESHOLD && !rule.override_fatigue) {
          return {
            decision: 'LATER',
            reason: `Rule "${rule.name}" matched (NOW), but alert fatigue limit reached (${fatigueCount}/hr). Deferred.`,
            rule_matched: rule.name,
            scheduled_for: new Date(Date.now() + (rule.defer_minutes || 60) * 60 * 1000),
            decision_path: 'rule_engine'
          };
        }
        return {
          decision: rule.action,
          reason: `Rule "${rule.name}" matched: ${rule.description || rule.name}`,
          rule_matched: rule.name,
          scheduled_for: rule.action === 'LATER' ? new Date(Date.now() + (rule.defer_minutes || 60) * 60 * 1000) : null,
          decision_path: 'rule_engine'
        };
      }
    }

    // 5. Alert fatigue check (no rule matched)
    if (fatigueCount >= FATIGUE_THRESHOLD) {
      return {
        decision: 'LATER',
        reason: `Alert fatigue: user received ${fatigueCount} notifications this hour on ${event.channel}. Deferring.`,
        rule_matched: 'fatigue_check',
        scheduled_for: new Date(Date.now() + 60 * 60 * 1000),
        decision_path: 'rule_engine'
      };
    }

    // No rule matched - return null to signal AI should decide
    return null;
  }
}

module.exports = new RuleEngine();
