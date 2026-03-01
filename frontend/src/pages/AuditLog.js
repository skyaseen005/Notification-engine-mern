import React, { useState, useEffect, useCallback } from 'react';
import { getDecisions } from '../services/api';

export default function AuditLog() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ decision: '', user_id: '', limit: 50, page: 1 });
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState(null);


const fetchDecisions = useCallback(async () => {
  setLoading(true);
  try {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v !== '')
    );
    const data = await getDecisions(params);
    setDecisions(data.decisions || []);
    setTotal(data.total || 0);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [filters]);

useEffect(() => {
  fetchDecisions();
}, [fetchDecisions]);


  const pathColor = { rule_engine: '#6366f1', ai_module: '#a78bfa', fallback: '#f59e0b', hybrid: '#06b6d4' };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📋 Audit Log</h1>
        <p className="page-subtitle">Full decision history with explanations — {total} total records</p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Filter by Decision</label>
            <select className="form-control" value={filters.decision} onChange={e => setFilters(f => ({ ...f, decision: e.target.value, page: 1 }))}>
              <option value="">All</option>
              <option value="NOW">NOW</option>
              <option value="LATER">LATER</option>
              <option value="NEVER">NEVER</option>
            </select>
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <label className="form-label">Filter by User ID</label>
            <input className="form-control" placeholder="user_123" value={filters.user_id} onChange={e => setFilters(f => ({ ...f, user_id: e.target.value, page: 1 }))} />
          </div>
          <div style={{ flex: 1, minWidth: '100px' }}>
            <label className="form-label">Per Page</label>
            <select className="form-control" value={filters.limit} onChange={e => setFilters(f => ({ ...f, limit: e.target.value, page: 1 }))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={fetchDecisions}>🔄 Refresh</button>
          </div>
        </div>
      </div>

      {loading ? <div className="loading"><div className="spinner"></div>Loading...</div> : (
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Time</th><th>User</th><th>Event Type</th><th>Decision</th><th>Path</th><th>Reason</th><th></th></tr>
            </thead>
            <tbody>
              {decisions.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No decisions found. Try the Simulator!</td></tr>
              ) : decisions.map(d => (
                <React.Fragment key={d._id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === d._id ? null : d._id)}>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{new Date(d.decided_at).toLocaleString()}</td>
                    <td style={{ color: '#6366f1' }}>{d.user_id}</td>
                    <td>{d.original_event?.event_type || '—'}</td>
                    <td><span className={`badge-${d.decision?.toLowerCase()}`}>{d.decision}</span></td>
                    <td><span style={{ fontSize: '11px', background: '#0f172a', color: pathColor[d.decision_path] || '#64748b', padding: '2px 8px', borderRadius: '4px' }}>{d.decision_path}</span></td>
                    <td style={{ color: '#94a3b8', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{d.reason}</td>
                    <td style={{ color: '#64748b' }}>{expanded === d._id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === d._id && (
                    <tr>
                      <td colSpan={7} style={{ background: '#0f172a', padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                          <div><span style={{ color: '#64748b', fontSize: '11px' }}>RULE MATCHED</span><br /><span style={{ color: '#e2e8f0' }}>{d.rule_matched || '—'}</span></div>
                          <div><span style={{ color: '#64748b', fontSize: '11px' }}>AI SCORE</span><br /><span style={{ color: '#a78bfa' }}>{d.ai_score != null ? `${Math.round(d.ai_score * 100)}%` : '—'}</span></div>
                          <div><span style={{ color: '#64748b', fontSize: '11px' }}>CHANNEL</span><br /><span style={{ color: '#e2e8f0' }}>{d.original_event?.channel || '—'}</span></div>
                          <div><span style={{ color: '#64748b', fontSize: '11px' }}>PRIORITY</span><br /><span style={{ color: '#e2e8f0' }}>{d.original_event?.priority_hint || '—'}</span></div>
                          <div><span style={{ color: '#64748b', fontSize: '11px' }}>SOURCE</span><br /><span style={{ color: '#e2e8f0' }}>{d.original_event?.source || '—'}</span></div>
                          {d.scheduled_for && <div><span style={{ color: '#64748b', fontSize: '11px' }}>SCHEDULED FOR</span><br /><span style={{ color: '#93c5fd' }}>{new Date(d.scheduled_for).toLocaleString()}</span></div>}
                        </div>
                        {d.ai_reasoning && <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', fontSize: '13px', color: '#94a3b8' }}><strong style={{ color: '#a78bfa' }}>AI Reasoning:</strong> {d.ai_reasoning}</div>}
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>Decision ID: {d.decision_id} • Event ID: {d.event_id}</div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {total > filters.limit && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>← Prev</button>
              <span style={{ color: '#64748b', padding: '8px 16px' }}>Page {filters.page} of {Math.ceil(total / filters.limit)}</span>
              <button className="btn btn-secondary" disabled={filters.page >= Math.ceil(total / filters.limit)} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


