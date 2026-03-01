import React, { useState } from 'react';
import { getUserHistory } from '../services/api';

export default function UserHistory() {
  const [userId, setUserId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!userId.trim()) return;
    setLoading(true); setError(null); setData(null);
    try { setData(await getUserHistory(userId)); }
    catch (e) { setError('User not found or no history available'); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">👤 User History</h1>
        <p className="page-subtitle">View notification history and fatigue counters per user</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input className="form-control" style={{ flex: 1 }} placeholder="Enter User ID (e.g. user_demo_1)" value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !userId.trim()}>
            {loading ? '⏳' : '🔍 Search'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <>
          <div className="grid-3" style={{ marginBottom: '24px' }}>
            <div className="stat-card" style={{ borderColor: data.hourly_sent_count > 8 ? '#7f1d1d' : '#334155' }}>
              <div className="stat-value" style={{ color: data.hourly_sent_count > 8 ? '#fca5a5' : '#e2e8f0' }}>{data.hourly_sent_count}</div>
              <div className="stat-label">Notifications (last hour)</div>
              {data.hourly_sent_count > 8 && <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>⚠️ High fatigue risk</div>}
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.recent_decisions?.length || 0}</div>
              <div className="stat-label">Recent Decisions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.history?.length || 0}</div>
              <div className="stat-label">History Records</div>
            </div>
          </div>

          {data.recent_decisions?.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Recent Decisions</div>
              <table className="table">
                <thead><tr><th>Time</th><th>Event Type</th><th>Channel</th><th>Decision</th><th>Path</th><th>Reason</th></tr></thead>
                <tbody>
                  {data.recent_decisions.map(d => (
                    <tr key={d._id}>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{new Date(d.decided_at).toLocaleString()}</td>
                      <td>{d.original_event?.event_type || '—'}</td>
                      <td>{d.original_event?.channel || '—'}</td>
                      <td><span className={`badge-${d.decision?.toLowerCase()}`}>{d.decision}</span></td>
                      <td style={{ fontSize: '12px', color: '#6366f1' }}>{d.decision_path}</td>
                      <td style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.history?.length > 0 && (
            <div className="card">
              <div className="card-title">Send History</div>
              <table className="table">
                <thead><tr><th>Sent At</th><th>Channel</th><th>Event Type</th><th>Source</th></tr></thead>
                <tbody>
                  {data.history.map(h => (
                    <tr key={h._id}>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{new Date(h.sent_at).toLocaleString()}</td>
                      <td>{h.channel}</td>
                      <td>{h.event_type || '—'}</td>
                      <td>{h.source || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.recent_decisions?.length === 0 && data.history?.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
              No history found for user "{data.user_id}"
            </div>
          )}
        </>
      )}
    </div>
  );
}


