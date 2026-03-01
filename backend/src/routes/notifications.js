const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const orchestrator = require('../services/decisionOrchestrator');
const NotificationDecision = require('../models/NotificationDecision');
const NotificationEvent = require('../models/NotificationEvent');
const UserNotificationHistory = require('../models/UserNotificationHistory');

// POST /v1/notifications/evaluate - single event
router.post('/evaluate', async (req, res) => {
  try {
    const { user_id, event_type, message, source, channel } = req.body;
    if (!user_id || !event_type || !source || !channel) {
      return res.status(400).json({ error: 'Missing required fields: user_id, event_type, source, channel' });
    }
    if (!message && !req.body.title) {
      return res.status(400).json({ error: 'Either message or title is required' });
    }

    const result = await orchestrator.processEvent({
      ...req.body,
      event_id: req.body.event_id || uuidv4()
    });

    res.json(result);
  } catch (err) {
    console.error('Evaluate error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// POST /v1/notifications/batch-evaluate - batch processing
router.post('/batch-evaluate', async (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array is required' });
    }
    if (events.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 events per batch' });
    }

    const results = await orchestrator.processBatch(events);
    res.json({ processed: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/decisions/:id - get decision by ID
router.get('/decisions/:id', async (req, res) => {
  try {
    const decision = await NotificationDecision.findOne({ decision_id: req.params.id });
    if (!decision) return res.status(404).json({ error: 'Decision not found' });
    res.json(decision);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/notifications/decisions - list all decisions with filters
router.get('/decisions', async (req, res) => {
  try {
    const { user_id, decision, limit = 50, page = 1, from, to } = req.query;
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (decision) filter.decision = decision.toUpperCase();
    if (from || to) {
      filter.decided_at = {};
      if (from) filter.decided_at.$gte = new Date(from);
      if (to) filter.decided_at.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [decisions, total] = await Promise.all([
      NotificationDecision.find(filter).sort({ decided_at: -1 }).skip(skip).limit(parseInt(limit)),
      NotificationDecision.countDocuments(filter)
    ]);

    res.json({ total, page: parseInt(page), limit: parseInt(limit), decisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/users/:userId/history - user notification history
router.get('/users/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [history, hourlyCount, decisions] = await Promise.all([
      UserNotificationHistory.find({ user_id: userId }).sort({ sent_at: -1 }).limit(parseInt(limit)),
      UserNotificationHistory.countDocuments({ user_id: userId, sent_at: { $gte: oneHourAgo } }),
      NotificationDecision.find({ user_id: userId }).sort({ decided_at: -1 }).limit(parseInt(limit))
    ]);

    res.json({ 
      user_id: userId,
      hourly_sent_count: hourlyCount,
      history,
      recent_decisions: decisions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/notifications/stats - dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, byDecision, byChannel, byPriority, recentDecisions] = await Promise.all([
      NotificationDecision.countDocuments({ decided_at: { $gte: last24h } }),
      NotificationDecision.aggregate([
        { $match: { decided_at: { $gte: last24h } } },
        { $group: { _id: '$decision', count: { $sum: 1 } } }
      ]),
      NotificationDecision.aggregate([
        { $match: { decided_at: { $gte: last24h } } },
        { $group: { _id: '$original_event.channel', count: { $sum: 1 } } }
      ]),
      NotificationDecision.aggregate([
        { $match: { decided_at: { $gte: last24h } } },
        { $group: { _id: '$original_event.priority_hint', count: { $sum: 1 } } }
      ]),
      NotificationDecision.find().sort({ decided_at: -1 }).limit(10)
    ]);

    const decisionMap = { NOW: 0, LATER: 0, NEVER: 0 };
    byDecision.forEach(d => { decisionMap[d._id] = d.count; });

    res.json({
      total_last_24h: total,
      decisions: decisionMap,
      by_channel: byChannel,
      by_priority: byPriority,
      recent_decisions: recentDecisions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;