import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getStats } from '../services/api';

const COLORS = { NOW: '#6ee7b7', LATER: '#93c5fd', NEVER: '#fca5a5' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (e) {
        setError('Unable to load stats. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;

  const decisionData = stats ? [
    { name: 'Now', value: stats.decisions?.NOW || 0, color: '#6ee7b7' },
    { name: 'Later', value: stats.decisions?.LATER || 0, color: '#93c5fd' },
    { name: 'Never', value: stats.decisions?.NEVER || 0, color: '#fca5a5' },
  ] : [];

  const channelData = (stats?.by_channel || []).map(c => ({ name: c._id || 'unknown', count: c.count }));
  const priorityData = (stats?.by_priority || []).map(p => ({ name: p._id || 'unknown', count: p.count }));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🔔 Notification Engine Dashboard</h1>
        <p className="page-subtitle">Real-time overview of notification decisions (last 24 hours)</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_last_24h || 0}</div>
          <div className="stat-label">Total Events (24h)</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#064e3b' }}>
          <div className="stat-value" style={{ color: '#6ee7b7' }}>{stats?.decisions?.NOW || 0}</div>
          <div className="stat-label">Sent Now</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#1e3a5f' }}>
          <div className="stat-value" style={{ color: '#93c5fd' }}>{stats?.decisions?.LATER || 0}</div>
          <div className="stat-label">Deferred</div>
        </div>
        <div className="stat-card" style={{ borderColor: '#3f1616' }}>
          <div className="stat-value" style={{ color: '#fca5a5' }}>{stats?.decisions?.NEVER || 0}</div>
          <div className="stat-label">Suppressed</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-title">Decision Distribution</div>
          {decisionData.every(d => d.value === 0) ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
              No data yet — use the Simulator to generate events
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={decisionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {decisionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-title">By Channel</div>
          {channelData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>No channel data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelData}>
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Recent Decisions</div>
        {!stats?.recent_decisions?.length ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>No recent decisions</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>User</th><th>Event Type</th><th>Source</th><th>Decision</th><th>Reason</th><th>Time</th></tr>
            </thead>
            <tbody>
              {stats.recent_decisions.map(d => (
                <tr key={d._id}>
                  <td style={{ color: '#6366f1' }}>{d.user_id}</td>
                  <td>{d.original_event?.event_type || '—'}</td>
                  <td>{d.original_event?.source || '—'}</td>
                  <td><span className={`badge-${d.decision?.toLowerCase()}`}>{d.decision}</span></td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }}>{d.reason}</td>
                  <td style={{ color: '#64748b', fontSize: '12px' }}>{new Date(d.decided_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}