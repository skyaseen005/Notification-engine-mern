const mongoose = require('mongoose');

const suppressionRuleSchema = new mongoose.Schema({
  rule_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  conditions: { type: mongoose.Schema.Types.Mixed, required: true },
  action: { 
    type: String, 
    enum: ['NOW', 'LATER', 'NEVER'],
    required: true
  },
  priority: { type: Number, default: 0 },
  override_fatigue: { type: Boolean, default: false },
  defer_minutes: { type: Number, default: 60 },
  is_active: { type: Boolean, default: true },
  updated_by: { type: String, default: 'system' },
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('SuppressionRule', suppressionRuleSchema);