const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const SuppressionRule = require('../models/SuppressionRule');
const ruleEngine = require('../services/ruleEngine');

// GET /v1/rules
router.get('/', async (req, res) => {
  try {
    const rules = await SuppressionRule.find().sort({ priority: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/rules - create rule
router.post('/', async (req, res) => {
  try {
    const rule = await SuppressionRule.create({
      ...req.body,
      rule_id: req.body.rule_id || uuidv4()
    });
    ruleEngine.cacheExpiry = 0; // invalidate cache
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /v1/rules/:id
router.put('/:id', async (req, res) => {
  try {
    const rule = await SuppressionRule.findOneAndUpdate(
      { rule_id: req.params.id },
      { ...req.body, updated_by: req.body.updated_by || 'operator' },
      { new: true }
    );
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    ruleEngine.cacheExpiry = 0; // invalidate cache
    res.json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /v1/rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const rule = await SuppressionRule.findOneAndDelete({ rule_id: req.params.id });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    ruleEngine.cacheExpiry = 0;
    res.json({ message: 'Rule deleted', rule_id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;