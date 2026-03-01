const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const SuppressionRule = require('../models/SuppressionRule');

const defaultRules = [
  {
    rule_id: uuidv4(),
    name: 'Critical Security Alert',
    description: 'Security events always sent immediately',
    conditions: { event_type: ['account_breach', 'suspicious_login', 'password_changed', 'security_alert'] },
    action: 'NOW',
    priority: 100,
    override_fatigue: true
  },
  {
    rule_id: uuidv4(),
    name: 'Promotional Suppression - High Volume',
    description: 'Suppress promos when user received 3+ this hour',
    conditions: { event_type: ['promo', 'marketing', 'advertisement', 'discount'], recent_count_1h: { gte: 3 } },
    action: 'NEVER',
    priority: 80
  },
  {
    rule_id: uuidv4(),
    name: 'System Update - Defer',
    description: 'System updates are deferred to avoid noise',
    conditions: { event_type: ['system_update', 'maintenance', 'changelog'] },
    action: 'LATER',
    priority: 50,
    defer_minutes: 120
  },
  {
    rule_id: uuidv4(),
    name: 'Direct Message - Always Now',
    description: 'Personal messages sent immediately',
    conditions: { event_type: ['message', 'direct_message', 'chat'], priority_hint: ['high', 'medium', 'critical'] },
    action: 'NOW',
    priority: 90
  },
  {
    rule_id: uuidv4(),
    name: 'Low Priority Promotion',
    description: 'Low priority promos are deferred',
    conditions: { event_type: ['promo', 'marketing'], priority_hint: ['low'] },
    action: 'LATER',
    priority: 40,
    defer_minutes: 240
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notification_engine');
  await SuppressionRule.deleteMany({});
  await SuppressionRule.insertMany(defaultRules);
  console.log(`Seeded ${defaultRules.length} rules`);
  await mongoose.disconnect();
}

seed().catch(console.error);