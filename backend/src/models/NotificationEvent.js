const mongoose = require('mongoose');

const notificationEventSchema = new mongoose.Schema({
  event_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  event_type: { type: String, required: true },
  message: { type: String, required: true },
  title: { type: String },
  source: { type: String, required: true },
  priority_hint: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  channel: { 
    type: String, 
    enum: ['push', 'email', 'sms', 'in-app'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  expires_at: { type: Date },
  dedupe_key: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('NotificationEvent', notificationEventSchema);