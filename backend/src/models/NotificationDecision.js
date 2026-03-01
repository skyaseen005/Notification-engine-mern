const mongoose = require('mongoose');

const notificationDecisionSchema = new mongoose.Schema({
  decision_id: { type: String, required: true, unique: true },
  event_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  decision: { 
    type: String, 
    enum: ['NOW', 'LATER', 'NEVER'],
    required: true
  },
  reason: { type: String, required: true },
  rule_matched: { type: String },
  ai_score: { type: Number },
  ai_reasoning: { type: String },
  decided_at: { type: Date, default: Date.now },
  scheduled_for: { type: Date },
  original_event: { type: mongoose.Schema.Types.Mixed },
  decision_path: { 
    type: String,
    enum: ['rule_engine', 'ai_module', 'fallback', 'hybrid'],
    default: 'rule_engine'
  }
}, { timestamps: true });

module.exports = mongoose.model('NotificationDecision', notificationDecisionSchema);
