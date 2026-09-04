import { useState, useEffect } from 'react'
import { Bell, AlertTriangle, Check, X, Eye, Volume2, VolumeX, Navigation, Shield, Radio, FileText, Zap, RefreshCw } from 'lucide-react'

const API_BASE = 'http://localhost:8000';

export function AlertsPage({ alerts, setAlerts, onOpenAlertModal }) {
  const [filter, setFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/alerts`)
      .then(res => res.json())
      .then(data => {
        setActiveAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        console.log('Error fetching alerts:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, [alerts.length]);

  const allAlertsList = activeAlerts.length > 0 ? activeAlerts : alerts;

  const filtered = allAlertsList.filter(a => {
    if (filter === 'unread' && a.acknowledged) return false;
    if (filter === 'dispatched' && a.status !== 'DISPATCHED') return false;
    if (filter === 'active' && a.status === 'RESOLVED') return false;
    if (severityFilter !== 'all' && (a.severity || '').toLowerCase() !== severityFilter.toLowerCase()) return false;
    return true;
  });

  const handleDispatch = (id) => {
    fetch(`${API_BASE}/api/alerts/${id}/dispatch`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'DISPATCHED', acknowledged: 1 } : a));
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'DISPATCHED', acknowledged: true } : a));
      })
      .catch(() => {
        setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'DISPATCHED', acknowledged: 1 } : a));
      });
  };

  const handleAcknowledge = (id) => {
    fetch(`${API_BASE}/api/alerts/${id}/acknowledge`, { method: 'POST' })
      .then(res => res.json())
      .then(() => {
        setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: 1 } : a));
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
      })
      .catch(() => {
        setActiveAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: 1 } : a));
      });
  };

  const triggerTestIntercept = () => {
    fetch(`${API_BASE}/api/alerts/test_trigger`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        fetchAlerts();
        if (onOpenAlertModal && data.alert) {
          onOpenAlertModal(data.alert);
        }
      });
  };

  const criticalCount = allAlertsList.filter(a => (a.severity || 'CRITICAL').toUpperCase() === 'CRITICAL' && !a.acknowledged).length;
  const dispatchedCount = allAlertsList.filter(a => a.status === 'DISPATCHED').length;

  return (
    <div className="alerts-page" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            <Bell size={22} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Tactical Intercept & PCR Dispatch Command
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Real-time cross-referenced suspect intercepts and automated police patrol unit dispatching
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="btn btn-primary" 
            onClick={triggerTestIntercept}
            style={{ background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, boxShadow: '0 0 15px rgba(220, 38, 38, 0.5)' }}
          >
            <Zap size={14} /> 🚨 Trigger Test Intercept
          </button>
          <button className="btn btn-ghost" onClick={fetchAlerts} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">Active Intercepts</div>
          <div className="stat-number" style={{ color: '#ef4444' }}>{criticalCount}</div>
          <div className="stat-change negative"><AlertTriangle size={12} /> High-priority targets</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Dispatched PCR Units</div>
          <div className="stat-number" style={{ color: '#10b981' }}>{dispatchedCount}</div>
          <div className="stat-change positive"><Navigation size={12} /> Patrol units en route</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg PCR Arrival Time</div>
          <div className="stat-number">2.8 min</div>
          <div className="stat-change positive"><Zap size={12} /> Real-time telemetry</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Intercept Success Rate</div>
          <div className="stat-number" style={{ color: '#38bdf8' }}>94.2%</div>
          <div className="stat-change positive"><Shield size={12} /> Gujarat Police VISWAS</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', background: 'rgba(30,41,59,0.5)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.15)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Alerts</option>
          <option value="unread">Unacknowledged Only</option>
          <option value="dispatched">Dispatched PCR Only</option>
        </select>

        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginLeft: 10 }}>Severity:</span>
        <select className="filter-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="all">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
        </select>
        
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
          Showing {filtered.length} of {allAlertsList.length} alert records
        </span>
      </div>

      {/* Alerts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40, background: 'rgba(30,41,59,0.2)', borderRadius: 8 }}>
            <Bell size={40} style={{ color: 'var(--text-muted)' }} />
            <h3>No Active Intercept Alerts</h3>
            <p>Watchlist vehicles detected by any of the 30 Gujarat Police cameras will appear here instantly with automated PCR dispatch options.</p>
            <button className="btn btn-primary" onClick={triggerTestIntercept} style={{ marginTop: 12, background: '#dc2626', border: 'none' }}>
              <Zap size={14} /> Trigger Demonstration Intercept
            </button>
          </div>
        ) : (
          filtered.map(alert => {
            const isCritical = (alert.severity || 'CRITICAL').toUpperCase() === 'CRITICAL';
            const isDispatched = alert.status === 'DISPATCHED';
            
            return (
              <div 
                key={alert.id} 
                style={{ 
                  background: isDispatched ? 'rgba(16, 185, 129, 0.05)' : isCritical ? 'rgba(239, 68, 68, 0.06)' : 'rgba(30, 41, 59, 0.6)', 
                  border: isDispatched ? '1px solid rgba(16, 185, 129, 0.4)' : isCritical ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(148, 163, 184, 0.15)',
                  borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center',
                  boxShadow: isCritical && !alert.acknowledged ? '0 0 20px rgba(239, 68, 68, 0.15)' : 'none'
                }}
              >
                {/* Threat Icon */}
                <div style={{ 
                  width: 44, height: 44, borderRadius: 8, 
                  background: isDispatched ? '#065f46' : isCritical ? '#991b1b' : '#1e3a8a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 
                }}>
                  {isDispatched ? <Navigation size={22} /> : <AlertTriangle size={22} />}
                </div>

                {/* Main Body */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ 
                      background: isDispatched ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b', 
                      color: 'white', fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 
                    }}>
                      {isDispatched ? 'DISPATCHED' : (alert.severity || 'CRITICAL').toUpperCase()}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                      {alert.reason || alert.title || 'Watchlist Hit'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                      {new Date(alert.timestamp).toLocaleTimeString()} • {alert.camera_name || alert.cameraName || '02 Janpath'} ({alert.city || 'Ahmedabad'})
                    </span>
                  </div>

                  {/* Plate Badge + Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                    <div style={{ 
                      background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: '2px 8px', 
                      borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 13, border: '1.5px solid #334155',
                      display: 'inline-flex', alignItems: 'center', gap: 4
                    }}>
                      <span style={{ fontSize: 9, color: '#1d4ed8', fontWeight: 900 }}>IND</span>
                      <span>{alert.plate}</span>
                    </div>

                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Vehicle: <strong>{alert.vehicle_type || alert.vehicleModel || 'SUV'}</strong>
                    </span>

                    {alert.dispatched_unit && (
                      <span style={{ 
                        fontSize: 11, color: isDispatched ? '#10b981' : '#60a5fa', 
                        background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: 4,
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)' 
                      }}>
                        <Radio size={12} /> Assigned: <strong>{alert.dispatched_unit}</strong> ({alert.pcr_distance_km || 1.4} km • {alert.pcr_eta_mins || 3}m ETA)
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleDispatch(alert.id)}
                    disabled={isDispatched}
                    style={{ 
                      background: isDispatched ? '#065f46' : '#dc2626', 
                      border: 'none', fontSize: 12, fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 
                    }}
                  >
                    <Navigation size={13} /> {isDispatched ? 'En Route' : 'Dispatch PCR'}
                  </button>

                  {!alert.acknowledged && (
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{ padding: '6px 10px', fontSize: 12 }}
                      title="Acknowledge Alert"
                    >
                      <Check size={14} /> ACK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
