import React, { useState, useEffect } from 'react';
import { getRules, createRule, updateRule, deleteRule } from '../services/api';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_FORM = { name: '', description: '', conditions: '{}', action: 'LATER', priority: 50, override_fatigue: false, defer_minutes: 60, is_active: true };

export default function RulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setLoading(true);
    try { setRules(await getRules()); }
    catch (e) { setError('Failed to load rules'); }
    finally { setLoading(false); }
  };

  const handleEdit = (rule) => {
    setForm({ ...rule, conditions: JSON.stringify(rule.conditions, null, 2) });
    setEditId(rule.rule_id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      let conditions;
      try { conditions = JSON.parse(form.conditions); }
      catch { setError('Invalid JSON in conditions'); return; }

      const payload = { ...form, conditions };
      if (editId) {
        await updateRule(editId, payload);
        setSuccess('Rule updated successfully');
      } else {
        await createRule({ ...payload, rule_id: uuidv4() });
        setSuccess('Rule created successfully');
      }
      setShowForm(false); setEditId(null); setForm(DEFAULT_FORM);
      await fetchRules();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) { setError(e.error || 'Failed to save rule'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      await deleteRule(id);
      setSuccess('Rule deleted');
      await fetchRules();
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) { setError('Failed to delete rule'); }
  };

  const actionColor = { NOW: '#6ee7b7', LATER: '#93c5fd', NEVER: '#fca5a5' };

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">⚙️ Rules Manager</h1>
          <p className="page-subtitle">Configure prioritization rules without code deployment</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditId(null); setForm(DEFAULT_FORM); }}>+ New Rule</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px', borderColor: '#6366f1' }}>
          <div className="card-title">{editId ? 'Edit Rule' : 'Create New Rule'}</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Rule Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Critical Security Alert" />
            </div>
            <div className="form-group">
              <label className="form-label">Action *</label>
              <select className="form-control" value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
                <option value="NOW">NOW — Send Immediately</option>
                <option value="LATER">LATER — Defer/Schedule</option>
                <option value="NEVER">NEVER — Suppress</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority (higher = evaluated first)</label>
              <input type="number" className="form-control" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Defer Minutes (for LATER)</label>
              <input type="number" className="form-control" value={form.defer_minutes} onChange={e => setForm(f => ({ ...f, defer_minutes: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="When this rule triggers..." />
          </div>
          <div className="form-group">
            <label className="form-label">Conditions (JSON) — e.g. event_type, priority_hint, channel, source, recent_count_1h</label>
            <textarea className="form-control" rows={5} value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))}
              placeholder={'{\n  "event_type": ["promo", "marketing"],\n  "recent_count_1h": { "gte": 3 }\n}'} style={{ fontFamily: 'monospace', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.override_fatigue} onChange={e => setForm(f => ({ ...f, override_fatigue: e.target.checked }))} />
              Override fatigue limits
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleSubmit}>{editId ? '💾 Update Rule' : '✅ Create Rule'}</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rules.length === 0 && !showForm && (
            <div className="card" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
              No rules configured. Create your first rule!
            </div>
          )}
          {rules.map(rule => (
            <div key={rule._id} className="card" style={{ borderColor: rule.is_active ? '#334155' : '#1e293b', opacity: rule.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#e2e8f0' }}>{rule.name}</span>
                    <span style={{ background: '#0f172a', color: actionColor[rule.action] || '#64748b', padding: '2px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>{rule.action}</span>
                    {!rule.is_active && <span style={{ color: '#64748b', fontSize: '12px' }}>Disabled</span>}
                    <span style={{ color: '#475569', fontSize: '12px' }}>Priority: {rule.priority}</span>
                  </div>
                  {rule.description && <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>{rule.description}</div>}
                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#6366f1' }}>
                    {JSON.stringify(rule.conditions, null, 2)}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                    {rule.override_fatigue && <span style={{ marginRight: '12px', color: '#f59e0b' }}>⚡ Override Fatigue</span>}
                    {rule.action === 'LATER' && <span>Defer: {rule.defer_minutes}min</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleEdit(rule)}>✏️ Edit</button>
                  <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleDelete(rule.rule_id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

