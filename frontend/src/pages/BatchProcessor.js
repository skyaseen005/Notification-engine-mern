import React, { useState } from 'react';
import { batchEvaluate } from '../services/api';

const SAMPLE_BATCH = [
  { user_id: 'user_001', event_type: 'security_alert', message: 'Suspicious activity on your account', source: 'security-service', priority_hint: 'critical', channel: 'push' },
  { user_id: 'user_001', event_type: 'promo', message: '50% off sale today only!', source: 'marketing-service', priority_hint: 'low', channel: 'email' },
  { user_id: 'user_002', event_type: 'message', message: 'Alice sent you a message', source: 'chat-service', priority_hint: 'high', channel: 'push' },
  { user_id: 'user_002', event_type: 'system_update', message: 'App update available', source: 'system', priority_hint: 'medium', channel: 'in-app' },
  { user_id: 'user_003', event_type: 'reminder', message: 'Meeting in 15 minutes', source: 'reminder-service', priority_hint: 'high', channel: 'push' },
];

export default function BatchProcessor() {
  const [input, setInput] = useState(JSON.stringify(SAMPLE_BATCH, null, 2));
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleProcess = async () => {
    setError(null); setLoading(true); setResults(null);
    try {
      let events;
      try { events = JSON.parse(input); }
      catch { setError('Invalid JSON input'); setLoading(false); return; }
      if (!Array.isArray(events)) { setError('Input must be a JSON array'); setLoading(false); return; }
      const data = await batchEvaluate(events);
      setResults(data);
    } catch (e) { setError(e.error || 'Batch processing failed'); }
    finally { setLoading(false); }
  };

  const decisionCounts = results?.results?.reduce((acc, r) => {
    const d = r.result?.decision; if (d) acc[d] = (acc[d] || 0) + 1; return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📦 Batch Processor</h1>
        <p className="page-subtitle">Evaluate multiple notification events at once (max 100)</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <div className="card">
            <div className="card-title">Input Events (JSON Array)</div>
            <textarea className="form-control" rows={20} value={input} onChange={e => setInput(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-primary" onClick={handleProcess} disabled={loading} style={{ flex: 1 }}>
                {loading ? '⏳ Processing...' : '🚀 Process Batch'}
              </button>
              <button className="btn btn-secondary" onClick={() => setInput(JSON.stringify(SAMPLE_BATCH, null, 2))}>Load Sample</button>
            </div>
          </div>
        </div>

        <div>
          {results && (
            <>
              <div className="grid-3" style={{ marginBottom: '16px' }}>
                {['NOW', 'LATER', 'NEVER'].map(d => (
                  <div key={d} className="stat-card" style={{ textAlign: 'center' }}>
                    <div className="stat-value" style={{ fontSize: '24px' }}>{decisionCounts?.[d] || 0}</div>
                    <div><span className={`badge-${d.toLowerCase()}`}>{d}</span></div>
                  </div>
                ))}
              </div>

              <div className="card">
                <div className="card-title">Results ({results.processed} processed)</div>
                {results.results.map((r, i) => (
                  <div key={i} style={{ padding: '12px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: '#6366f1', fontSize: '13px' }}>Event {i + 1}</span>
                        {r.result?.decision && <span className={`badge-${r.result.decision.toLowerCase()}`}>{r.result.decision}</span>}
                        {r.status === 'failed' && <span style={{ color: '#fca5a5', fontSize: '12px' }}>FAILED</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>{r.result?.reason || r.result?.error}</div>
                      {r.result?.rule_matched && <div style={{ color: '#475569', fontSize: '11px', marginTop: '2px' }}>Rule: {r.result.rule_matched}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!results && !loading && (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '60px 40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <div>Process a batch to see results here</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}