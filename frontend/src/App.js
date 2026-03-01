import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Simulator from './pages/Simulator';
import AuditLog from './pages/AuditLog';
import RulesManager from './pages/RulesManager';
import UserHistory from './pages/UserHistory';
import BatchProcessor from './pages/BatchProcessor';
import HealthMonitor from './pages/HealthMonitor';
import './App.css';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/simulator', label: 'Simulator', icon: '🧪' },
  { path: '/audit', label: 'Audit Log', icon: '📋' },
  { path: '/rules', label: 'Rules', icon: '⚙️' },
  { path: '/users', label: 'User History', icon: '👤' },
  { path: '/batch', label: 'Batch', icon: '📦' },
  { path: '/health', label: 'Health', icon: '💚' },
];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <Router>
      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-icon">🔔</span>
              {sidebarOpen && <span className="logo-text">NotifyEngine</span>}
            </div>
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
          {sidebarOpen && (
            <div className="sidebar-footer">
              <div className="badge">Cyepro Solutions</div>
              <div className="version">Round 2 — MERN Stack</div>
            </div>
          )}
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/rules" element={<RulesManager />} />
            <Route path="/users" element={<UserHistory />} />
            <Route path="/batch" element={<BatchProcessor />} />
            <Route path="/health" element={<HealthMonitor />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
