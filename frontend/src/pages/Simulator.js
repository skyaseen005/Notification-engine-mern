import React, { useState } from 'react';
import { evaluateNotification } from '../services/api';

const EVENT_TYPES = ['message', 'direct_message', 'promo', 'marketing', 'security_alert', 'system_update', 'reminder', 'alert', 'account_breach', 'suspicious_login', 'maintenance', 'discount'];
const CHANNELS = ['push', 'email', 'sms', 'in-app'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SOURCES = ['chat-service', 'marketing-service', 'security-service', 'system', 'reminder-service', 'billing-service'];

const PRESETS = [
  { label: '🔴 Critical Security', event_type: 'security_alert', message: 'Suspicious login detected on your account', source: 'security-service', priority_hint: 'critical', channel: 'push' },
  { label: '💬 Direct Message', event_type: 'message', message: 'Hey! Are you free for a call?', source: 'chat-service', priority_hint: 'high', channel: 'push' },
  { label: '📢 Promo Low Value', event_type: 'promo', message: 'Check out our latest deals!', source: 'marketing-service', priority_hint: 'low', channel: 'email' },
  { label: '🔧 System Update', event_type: 'system_update', message: 'Scheduled maintenance at 2AM', source: 'system', priority_hint: 'medium', channel: 'in-app' },
];

export default function Simulator() {
  const [form, setForm] = useState({ user_id: 'user_demo_1', event_type: 'message', message: 'You have a new notification', source: 'chat-service', priority_hint: 'medium', channel: 'push' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePreset = (preset) => setForm(f => ({ ...f, ...preset }));

  const handleSubmit = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await evaluateNotification({ ...form, timestamp: new Date().toISOString() });
      setResult(res);
      setHistory(h => [{ ...form, result: res, time: new Date() }, ...h].slice(0, 10));
    } catch (e) {
      setError(e.error || 'Failed to evaluate. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const decisionColors = { NOW: '#6ee7b7', LATER: '#93c5fd', NEVER: '#fca5a5' };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🧪 Notification Simulator</h1>
        <p className="page-subtitle">Test the prioritization engine with custom or preset notifications</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">Quick Presets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {PRESETS.map(p => (
                <button key={p.label} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => handlePreset(p)}>{p.label}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Notification Event</div>
            <div className="form-group">
              <label className="form-label">User ID</label>
              <input name="user_id" value={form.user_id} onChange={handleChange} className="form-control" placeholder="user_123" />
            </div>
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <select name="event_type" value={form.event_type} onChange={handleChange} className="form-control">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea name="message" value={form.message} onChange={handleChange} className="form-control" rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select name="source" value={form.source} onChange={handleChange} className="form-control">
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select name="channel" value={form.channel} onChange={handleChange} className="form-control">
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority Hint</label>
                <select name="priority_hint" value={form.priority_hint} onChange={handleChange} className="form-control">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dedupe Key (optional)</label>
                <input name="dedupe_key" value={form.dedupe_key || ''} onChange={handleChange} className="form-control" placeholder="msg_abc123" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%' }}>
              {loading ? '⏳ Evaluating...' : '🚀 Evaluate Notification'}
            </button>
          </div>
        </div>

        <div>
          {error && <div className="alert alert-error">{error}</div>}
          {result && (
            <div className="card" style={{ marginBottom: '16px', borderColor: decisionColors[result.decision] + '55' }}>
              <div className="card-title">Decision Result</div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                  {result.decision === 'NOW' ? '✅' : result.decision === 'LATER' ? '⏰' : '🚫'}
                </div>
                <span className={`badge-${result.decision.toLowerCase()}`} style={{ fontSize: '20px', padding: '8px 24px' }}>{result.decision}</span>
              </div>
              <div style={{ background: '#0f172a', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>REASON</div>
                <div style={{ color: '#e2e8f0', fontSize: '14px' }}>{result.reason}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>DECISION PATH</div>
                  <div style={{ color: '#6366f1', fontSize: '13px', marginTop: '4px' }}>{result.decision_path || '—'}</div>
                </div>
                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>RULE MATCHED</div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>{result.rule_matched || '—'}</div>
                </div>
                {result.ai_score != null && (
                  <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>AI CONFIDENCE</div>
                    <div style={{ color: '#a78bfa', fontSize: '13px', marginTop: '4px' }}>{Math.round(result.ai_score * 100)}%</div>
                  </div>
                )}
                {result.scheduled_for && (
                  <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>SCHEDULED FOR</div>
                    <div style={{ color: '#93c5fd', fontSize: '13px', marginTop: '4px' }}>{new Date(result.scheduled_for).toLocaleString()}</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '12px' }}>Decision ID: {result.decision_id}</div>
            </div>
          )}

          {history.length > 0 && (
            <div className="card">
              <div className="card-title">Test History</div>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <div>
                    <div style={{ fontSize: '13px' }}>{h.event_type} • {h.source}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{h.message.substring(0, 40)}...</div>
                  </div>
                  <span className={`badge-${h.result.decision.toLowerCase()}`}>{h.result.decision}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
