import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Shield, AlertTriangle, Info, Zap, Radio, RefreshCw, X } from 'lucide-react'

const API_BASE = 'http://localhost:8000';

export function WatchlistPage({ watchlist, setWatchlist, onOpenAlertModal }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
    plate: '', reason: 'Stolen Vehicle', severity: 'CRITICAL', category: 'Criminal',
    vehicle_model: '', owner_name: '', fir_number: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/watchlist`)
      .then(res => res.json())
      .then(data => {
        setWatchlist(data);
        setLoading(false);
      })
      .catch(err => {
        console.log('Error loading watchlist:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const filtered = watchlist.filter(w =>
    (w.plate || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.reason || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.vehicle_model || w.vehicle || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.plate.trim()) return;
    const payload = {
      plate: form.plate.toUpperCase().replace(/\s/g, ''),
      reason: form.reason,
      severity: form.severity,
      category: form.category,
      vehicle_model: form.vehicle_model || 'Unknown',
      owner_name: form.owner_name || 'Unknown Suspect',
      fir_number: form.fir_number || `FIR-${form.plate.slice(0, 4)}-2024`,
      added_by: 'Inspector R. K. Jadeja (Crime Branch)'
    };

    fetch(`${API_BASE}/api/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(saved => {
        setWatchlist(prev => [saved, ...prev]);
        setForm({ plate: '', reason: 'Stolen Vehicle', severity: 'CRITICAL', category: 'Criminal', vehicle_model: '', owner_name: '', fir_number: '' });
        setShowModal(false);
      })
      .catch(() => {
        setWatchlist(prev => [{ id: Date.now(), ...payload }, ...prev]);
        setShowModal(false);
      });
  };

  const handleDelete = (id) => {
    fetch(`${API_BASE}/api/watchlist/${id}`, { method: 'DELETE' })
      .then(() => setWatchlist(prev => prev.filter(w => w.id !== id)))
      .catch(() => setWatchlist(prev => prev.filter(w => w.id !== id)));
  };

  const testTrigger = (item) => {
    fetch(`${API_BASE}/api/alerts/test_trigger`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (onOpenAlertModal && data.alert) {
          onOpenAlertModal({ ...data.alert, plate: item.plate, reason: item.reason, vehicleModel: item.vehicle_model || item.vehicle });
        }
      });
  };

  return (
    <div className="watchlist-page" style={{ paddingBottom: 24 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <Shield size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Watchlist Database & Cross-Reference Registry
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            High-priority target vehicles continuously cross-referenced against all 30 Gujarat Police AI ANPR video streams
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="map-search" style={{ maxWidth: 220 }}>
            <Search size={14} />
            <input placeholder="Search suspect / plate..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Suspect Target
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700 }}>🔴 CRITICAL THREAT TARGETS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#ef4444', marginTop: 2 }}>
            {watchlist.filter(w => (w.severity || 'CRITICAL').toUpperCase() === 'CRITICAL').length}
          </div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>🟠 HIGH PRIORITY TARGETS</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b', marginTop: 2 }}>
            {watchlist.filter(w => (w.severity || '').toUpperCase() === 'HIGH').length}
          </div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700 }}>🔵 TOTAL ACTIVE REGISTRY</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#38bdf8', marginTop: 2 }}>
            {watchlist.length}
          </div>
        </div>
      </div>

      <div className="watchlist-table" style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', overflow: 'hidden' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(148,163,184,0.15)', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Target Plate</th>
              <th style={{ padding: '12px 16px' }}>Crime Reason / FIR</th>
              <th style={{ padding: '12px 16px' }}>Threat Level</th>
              <th style={{ padding: '12px 16px' }}>Vehicle Model</th>
              <th style={{ padding: '12px 16px' }}>Registered Owner</th>
              <th style={{ padding: '12px 16px' }}>Added By</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tactical Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => {
              const isCrit = (w.severity || 'CRITICAL').toUpperCase() === 'CRITICAL';
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', fontSize: 12 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ 
                      background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: '2px 8px', 
                      borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12, border: '1.5px solid #334155',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <span style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 900 }}>IND</span>
                      <span>{w.plate}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                    {w.reason}
                    {w.fir_number && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{w.fir_number}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      background: isCrit ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', 
                      color: isCrit ? '#ef4444' : '#f59e0b',
                      border: isCrit ? '1px solid #ef4444' : '1px solid #f59e0b',
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800
                    }}>
                      {w.severity || 'CRITICAL'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{w.vehicle_model || w.vehicle || 'SUV'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{w.owner_name || w.owner || 'Unknown'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>{w.added_by || w.addedBy || 'Crime Branch'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '4px 8px', fontSize: 11, background: '#dc2626', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => testTrigger(w)}
                        title="Simulate Instant Live Intercept"
                      >
                        <Zap size={12} /> Test Intercept
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => handleDelete(w.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: 40 }}>
            <Shield size={36} />
            <h3>No watchlist entries found</h3>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 480, background: '#0f172a', border: '1px solid rgba(59,130,246,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15 }}>🚨 Add High-Risk Suspect Target</h3>
              <button className="detail-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Vehicle Registration Number (HSRP) *</label>
                <input placeholder="GJ 01 AB 1234" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} style={{ fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Crime Reason / Alert Title *</label>
                <input placeholder="e.g. Armed Robbery Suspect (Crime Branch)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Threat Level</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }}>
                    <option value="CRITICAL">🔴 Critical</option>
                    <option value="HIGH">🟠 High</option>
                    <option value="MEDIUM">🟡 Medium</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }}>
                    <option value="Criminal">Criminal</option>
                    <option value="Stolen">Stolen Vehicle</option>
                    <option value="Hit & Run">Hit & Run</option>
                    <option value="VIP Escort">VIP Security</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Vehicle Model & Color</label>
                <input placeholder="e.g. Mahindra Scorpio (White)" value={form.vehicle_model} onChange={e => setForm({ ...form, vehicle_model: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Suspect / Owner Name</label>
                <input placeholder="e.g. Suresh Solanki" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }} />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 18px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Enroll Target into Active Surveillance</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
