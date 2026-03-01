import React, { useState, useEffect } from 'react';
import { healthCheck, getStats } from '../services/api';

export default function HealthMonitor() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const checkHealth = async () => {
    try {
      const [h, s] = await Promise.all([healthCheck(), getStats()]);
      setHealth({ status: 'healthy', ...h });
      setStats(s);
    } catch (e) {
      setHealth({ status: 'unhealthy', error: e.error || 'Backend unreachable' });
    } finally {
    
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';

  const services = [
    { name: 'API Server', status: isHealthy, description: 'Express.js REST API' },
    { name: 'MongoDB', status: isHealthy, description: 'Primary data store' },
    { name: 'Rule Engine', status: isHealthy, description: 'Configuration-based decisions' },
    { name: 'AI Module', status: isHealthy, description: 'Claude AI scoring (optional)' },
    { name: 'Dedup Service', status: isHealthy, description: 'In-memory + DB deduplication' },
  ];

  const total = stats?.total_last_24h || 0;
  const now = stats?.decisions?.NOW || 0;
  const never = stats?.decisions?.NEVER || 0;
  const suppressionRate = total > 0 ? Math.round((never / total) * 100) : 0;
  const sendRate = total > 0 ? Math.round((now / total) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">💚 Health Monitor</h1>
          <p className="page-subtitle">System status and performance metrics</p>
        </div>
        <button className="btn btn-secondary" onClick={checkHealth}>🔄 Refresh</button>
      </div>

      {lastCheck && <div style={{ color: '#475569', fontSize: '12px', marginBottom: '16px' }}>Last checked: {lastCheck.toLocaleTimeString()}</div>}

      <div style={{ marginBottom: '24px' }}>
        <div className="card" style={{ borderColor: isHealthy ? '#064e3b' : '#7f1d1d', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '48px' }}>{isHealthy ? '✅' : '❌'}</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: isHealthy ? '#6ee7b7' : '#fca5a5' }}>
                System {isHealthy ? 'Operational' : 'Degraded'}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
                {isHealthy ? `All services running • ${health?.service || 'Notification Engine'} v${health?.version || '1.0.0'}` : health?.error}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {services.map(s => (
            <div key={s.name} className="card" style={{ borderColor: s.status ? '#064e3b33' : '#7f1d1d33' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</span>
                <span style={{ fontSize: '18px' }}>{s.status ? '🟢' : '🔴'}</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>{s.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Events (24h)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#6ee7b7' }}>{sendRate}%</div>
          <div className="stat-label">Send Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#fca5a5' }}>{suppressionRate}%</div>
          <div className="stat-label">Suppression Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#93c5fd' }}>{stats?.decisions?.LATER || 0}</div>
          <div className="stat-label">Deferred</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">System Information</div>
        <table className="table">
          <tbody>
            <tr><td style={{ color: '#64748b' }}>Service</td><td>{health?.service || 'Notification Prioritization Engine'}</td></tr>
            <tr><td style={{ color: '#64748b' }}>Version</td><td>{health?.version || '1.0.0'}</td></tr>
            <tr><td style={{ color: '#64748b' }}>Stack</td><td>MERN (MongoDB + Express + React + Node.js)</td></tr>
            <tr><td style={{ color: '#64748b' }}>AI Provider</td><td>Anthropic Claude (claude-haiku-4-5-20251001)</td></tr>
            <tr><td style={{ color: '#64748b' }}>Decision Strategies</td><td>Rule Engine → Near-Dedup → AI Scoring → Fallback</td></tr>
            <tr><td style={{ color: '#64748b' }}>Dedup Window</td><td>24 hours (rolling)</td></tr>
            <tr><td style={{ color: '#64748b' }}>Fatigue Threshold</td><td>10 notifications / hour / channel</td></tr>
            <tr><td style={{ color: '#64748b' }}>AI Timeout</td><td>5 seconds (falls back to rule-based default)</td></tr>
            <tr><td style={{ color: '#64748b' }}>Server Time</td><td>{health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
 