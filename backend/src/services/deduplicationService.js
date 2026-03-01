const crypto = require('crypto');
const UserNotificationHistory = require('../models/UserNotificationHistory');

class DeduplicationService {
  constructor() {
    this.inMemoryCache = new Map(); // fallback in-memory cache
  }

  generateHash(event) {
    const key = `${event.user_id}:${event.event_type}:${event.message}:${event.source}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  generateDedupeHash(event) {
    if (event.dedupe_key) {
      return crypto.createHash('sha256').update(`${event.user_id}:${event.dedupe_key}`).digest('hex');
    }
    return this.generateHash(event);
  }

  // Simple word-overlap similarity (no external embedding needed)
  calculateSimilarity(msg1, msg2) {
    const words1 = new Set(msg1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(msg2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (words1.size === 0 || words2.size === 0) return 0;
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  async checkExactDuplicate(event) {
    const hash = this.generateDedupeHash(event);
    const cacheKey = `dedupe:${hash}`;
    
    // Check in-memory cache first
    if (this.inMemoryCache.has(cacheKey)) {
      const cachedTime = this.inMemoryCache.get(cacheKey);
      if (Date.now() - cachedTime < 24 * 60 * 60 * 1000) { // 24h
        return { isDuplicate: true, type: 'exact', reason: 'Exact duplicate found in cache' };
      }
    }

    // Check database history
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await UserNotificationHistory.findOne({
      user_id: event.user_id,
      message_hash: hash,
      sent_at: { $gte: oneDayAgo }
    });

    if (existing) {
      return { isDuplicate: true, type: 'exact', reason: 'Exact duplicate found in 24h history' };
    }

    return { isDuplicate: false };
  }

  async checkNearDuplicate(event) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentHistory = await UserNotificationHistory.find({
      user_id: event.user_id,
      event_type: event.event_type,
      sent_at: { $gte: oneHourAgo }
    }).limit(10);

    for (const historical of recentHistory) {
      if (historical.source === event.source) {
        const similarity = this.calculateSimilarity(event.message, historical.message_hash || '');
        if (similarity > 0.8) {
          return { 
            isDuplicate: true, 
            type: 'near_duplicate', 
            similarity,
            reason: `Near-duplicate detected (${Math.round(similarity * 100)}% similarity)` 
          };
        }
      }
    }
    return { isDuplicate: false };
  }

  async recordSent(event, hash) {
    const msgHash = hash || this.generateDedupeHash(event);
    const cacheKey = `dedupe:${msgHash}`;
    this.inMemoryCache.set(cacheKey, Date.now());
    
    // Clean old cache entries
    if (this.inMemoryCache.size > 10000) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const [key, time] of this.inMemoryCache.entries()) {
        if (time < cutoff) this.inMemoryCache.delete(key);
      }
    }

    await UserNotificationHistory.create({
      user_id: event.user_id,
      channel: event.channel,
      event_type: event.event_type,
      sent_at: new Date(),
      decision: 'NOW',
      message_hash: msgHash,
      source: event.source
    });
  }
}

module.exports = new DeduplicationService();