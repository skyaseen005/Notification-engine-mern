const Anthropic = require('@anthropic-ai/sdk');

class AIScoringService {
  constructor() {
    this.client = null;
    this.isAvailable = false;
    this.initClient();
  }

  initClient() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.isAvailable = true;
    } else {
      console.warn('ANTHROPIC_API_KEY not set. AI scoring disabled.');
    }
  }

  async score(event, context = {}) {
    if (!this.isAvailable || !this.client) {
      return this.fallbackScore(event);
    }

    const prompt = `You are a Notification Prioritization Engine. Analyze this notification and decide: NOW (send immediately), LATER (defer/schedule), or NEVER (suppress).

Notification Event:
- User ID: ${event.user_id}
- Event Type: ${event.event_type}
- Message: "${event.message}"
- Source: ${event.source}
- Priority Hint: ${event.priority_hint}
- Channel: ${event.channel}
- Recent notifications this hour: ${context.recent_count || 0}

Rules to consider:
1. Critical/security events → NOW
2. Promotions/marketing when user already received 3+ → NEVER or LATER
3. Time-sensitive events → NOW
4. Low-value during high-volume → LATER
5. Expired notifications → NEVER

Respond ONLY with valid JSON in this format:
{
  "decision": "NOW" | "LATER" | "NEVER",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "scheduled_delay_minutes": null | number
}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      clearTimeout(timeout);

      const text = response.content[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          decision: parsed.decision,
          ai_score: parsed.confidence,
          ai_reasoning: parsed.reasoning,
          scheduled_for: parsed.scheduled_delay_minutes 
            ? new Date(Date.now() + parsed.scheduled_delay_minutes * 60 * 1000)
            : null,
          decision_path: 'ai_module'
        };
      }
      return this.fallbackScore(event);
    } catch (err) {
      console.error('AI scoring error:', err.message);
      return this.fallbackScore(event);
    }
  }

  fallbackScore(event) {
    // Conservative fallback: send high+ priority now, defer others
    const decision = ['high', 'critical'].includes(event.priority_hint) ? 'NOW' : 'LATER';
    return {
      decision,
      ai_score: null,
      ai_reasoning: null,
      reason: `Fallback decision: AI unavailable. ${decision === 'NOW' ? 'High priority detected.' : 'Defaulting to LATER for safety.'}`,
      scheduled_for: decision === 'LATER' ? new Date(Date.now() + 60 * 60 * 1000) : null,
      decision_path: 'fallback'
    };
  }
}

module.exports = new AIScoringService();