const mongoose = require('mongoose');

const userNotificationHistorySchema = new mongoose.Schema({
  user_id: { type: String, required: true, index: true },
  channel: { type: String, required: true },
  event_type: { type: String },
  sent_at: { type: Date, default: Date.now },
  decision: { type: String },
  message_hash: { type: String },
  source: { type: String }
}, { timestamps: true });

userNotificationHistorySchema.index({ user_id: 1, sent_at: -1 });
userNotificationHistorySchema.index({ sent_at: 1 }, { expireAfterSeconds: 86400 }); // 24h TTL

module.exports = mongoose.model('UserNotificationHistory', userNotificationHistorySchema);
