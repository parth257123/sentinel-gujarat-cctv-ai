import { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, Shield, CheckCircle2, Zap, RefreshCw, Filter, Search, FileText, QrCode, X, Clock, MapPin, Gauge, Send, IndianRupee, ArrowRight } from 'lucide-react'

const API_BASE = 'http://localhost:8000';

function PlateBadge({ plate }) {
  return (
    <div style={{ 
      background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: '2px 8px', 
      borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12, border: '1.5px solid #334155',
      display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <span style={{ fontSize: 8, color: '#1d4ed8', fontWeight: 900 }}>IND</span>
      <span>{plate}</span>
    </div>
  );
}

// Live Speed Enforcement Camera View — shows the actual AI-processed MJPEG stream
function SpeedRadarConsole({ cameras = [] }) {
  const [selectedCam, setSelectedCam] = useState('1');

  const cameraOptions = useMemo(() => {
    if (cameras && cameras.length > 0) {
      return cameras.map(c => {
        const streamNum = c.stream_num || parseInt(String(c.id).replace(/\D/g, '')) || 1;
        return {
          id: String(streamNum),
          name: `${c.id} ${c.name} (${c.city || 'Gujarat'})`,
        };
      });
    }
    return [
      { id: '1', name: 'CAM-001 Chimanbhai Bridge (Ahmedabad)' },
      { id: '5', name: 'CAM-005 Visat T-Junction (Ahmedabad)' },
    ];
  }, [cameras]);

  return (
    <div style={{
      background: '#09090b',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8,
      marginBottom: 20,
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    }}>
      {/* Header */}
      <div style={{
        background: '#121215',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f5' }}>
            Live Speed Enforcement Camera
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>Camera:</span>
          <select
            value={selectedCam}
            onChange={e => setSelectedCam(e.target.value)}
            style={{
              padding: '4px 8px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 5, color: '#f4f4f5', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer'
            }}
          >
            {cameraOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Stream */}
      <div style={{ position: 'relative', background: '#000', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          key={`live-radar-cam-${selectedCam}`}
          src={`http://localhost:8000/api/real_speed_stream?camera_id=${selectedCam}`}
          alt="Live AI-processed speed enforcement stream"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}

export function ViolationsPage({ cameras = [] }) {
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchPlate, setSearchPlate] = useState('');
  const [selectedChallan, setSelectedChallan] = useState(null);

  const fetchViolations = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/violations`)
      .then(r => r.json())
      .then(data => {
        setViolations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`${API_BASE}/api/violations/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleIssueChallan = (id) => {
    fetch(`${API_BASE}/api/violations/issue_challan/${id}`, { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        setViolations(prev => prev.map(v => v.id === id ? { ...v, status: 'ISSUED' } : v));
        if (selectedChallan && selectedChallan.id === id) {
          setSelectedChallan(prev => ({ ...prev, status: 'ISSUED' }));
        }
      });
  };

  const handleTriggerTest = () => {
    fetch(`${API_BASE}/api/violations/test_trigger`, { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.violation) {
          setViolations(prev => [res.violation, ...prev]);
          setSelectedChallan(res.violation);
        }
        fetchViolations();
      });
  };

  const filtered = violations.filter(v => {
    if (typeFilter !== 'ALL' && v.violation_type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
    if (searchPlate && !v.plate.toLowerCase().includes(searchPlate.toLowerCase())) return false;
    return true;
  });

  const getViolationIcon = (type) => {
    switch (type) {
      case 'Overspeeding': return '🚀';
      case 'Wrong-Way Driving': return '⛔';
      case 'Helmetless Riding': return '🪖';
      case 'Triple Riding': return '👥';
      case 'Red Light Violation': return '🚦';
      default: return '⚠️';
    }
  };

  return (
    <div className="violations-page" style={{ paddingBottom: 24 }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gauge size={22} style={{ color: '#ef4444' }} />
            Traffic Violation & Behavior AI (e-Challan Enforcement)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Real-time optical speed radar, lane flow analysis, and automated Motor Vehicles Act e-Challan generation
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn btn-primary" 
            onClick={handleTriggerTest}
            style={{ background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, boxShadow: '0 0 15px rgba(220, 38, 38, 0.4)' }}
          >
            <Zap size={14} /> 🚨 Trigger Test Violation
          </button>
          <button className="btn btn-ghost" onClick={fetchViolations} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Total Violations Detected</div>
            <div className="stat-number" style={{ color: '#ef4444' }}>{stats.totalViolations}</div>
            <div className="stat-change negative"><AlertTriangle size={12} /> AI ANPR Optical Audit</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Penalties Value</div>
            <div className="stat-number" style={{ color: '#f59e0b' }}>₹{stats.totalFinesINR?.toLocaleString()}</div>
            <div className="stat-change positive"><IndianRupee size={12} /> Motor Vehicles Act</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Speed Over Limit</div>
            <div className="stat-number" style={{ color: '#38bdf8' }}>+{stats.avgOverspeedKmh} km/h</div>
            <div className="stat-change negative"><Gauge size={12} /> Radar Doppler Telemetry</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">e-Challan Collection Rate</div>
            <div className="stat-number" style={{ color: '#10b981' }}>{stats.collectionRate}</div>
            <div className="stat-change positive"><CheckCircle2 size={12} /> Parivahan National Portal</div>
          </div>
        </div>
      )}

      {/* LIVE GUJARAT CCTV OPTICAL SPEED RADAR & TRIPWIRE CALIBRATION CONSOLE */}
      <SpeedRadarConsole cameras={cameras} />

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', background: 'rgba(30,41,59,0.5)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.15)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Violation Type:</span>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select" style={{ padding: '4px 8px', background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: 'white', fontSize: 12 }}>
            <option value="ALL">All Types</option>
            <option value="Overspeeding">🚀 Overspeeding</option>
            <option value="Wrong-Way Driving">⛔ Wrong-Way Driving</option>
            <option value="Helmetless Riding">🪖 Helmetless Riding</option>
            <option value="Triple Riding">👥 Triple Riding</option>
            <option value="Red Light Violation">🚦 Red Light Violation</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Challan Status:</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select" style={{ padding: '4px 8px', background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: 'white', fontSize: 12 }}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Approval</option>
            <option value="ISSUED">Issued (SMS Sent)</option>
            <option value="PAID">Paid / Resolved</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input 
            placeholder="Search plate..." 
            value={searchPlate} 
            onChange={e => setSearchPlate(e.target.value)} 
            style={{ padding: '4px 10px', background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 4, color: 'white', fontSize: 12, width: 140 }} 
          />
        </div>
      </div>

      {/* Violations Feed Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(v => {
          const isPending = v.status === 'PENDING';
          const isPaid = v.status === 'PAID';
          return (
            <div 
              key={v.id}
              style={{ 
                background: 'rgba(30,41,59,0.6)', border: `1px solid ${isPending ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.15)'}`, 
                borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 
              }}
            >
              {/* Type Badge Icon */}
              <div style={{ fontSize: 24, width: 42, height: 42, borderRadius: 8, background: 'rgba(15,23,42,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {getViolationIcon(v.violation_type)}
              </div>

              {/* Main Information */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                    {v.violation_type}
                  </span>
                  <span style={{ 
                    fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 3,
                    background: isPaid ? 'rgba(16,185,129,0.2)' : isPending ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                    color: isPaid ? '#10b981' : isPending ? '#ef4444' : '#60a5fa',
                    border: `1px solid ${isPaid ? '#10b981' : isPending ? '#ef4444' : '#60a5fa'}`
                  }}>
                    {v.status}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {new Date(v.timestamp).toLocaleTimeString()} • {v.camera_name} ({v.city})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <PlateBadge plate={v.plate} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Owner: <strong>{v.owner_name}</strong>
                  </span>
                  {v.speed_recorded && (
                    <span style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '1px 6px', borderRadius: 3 }}>
                      ⚡ Recorded Speed: <strong>{v.speed_recorded} km/h</strong> {v.speed_limit && `(Limit: ${v.speed_limit})`}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                    {v.mv_act_section} • ₹{v.fine_amount}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {isPending && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleIssueChallan(v.id)}
                    style={{ background: '#dc2626', border: 'none', fontSize: 11, fontWeight: 700, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Send size={12} /> Issue e-Challan
                  </button>
                )}
                <button 
                  className="btn btn-ghost"
                  onClick={() => setSelectedChallan(v)}
                  style={{ fontSize: 11, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <FileText size={13} /> View Notice
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Official e-Challan Notice Modal */}
      {selectedChallan && (
        <div className="modal-overlay" onClick={() => setSelectedChallan(null)}>
          <div className="modal" style={{ maxWidth: 520, background: '#0f172a', border: '1.5px solid #ef4444' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#1e293b', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
              <div>
                <div style={{ fontSize: 10, color: '#f87171', fontWeight: 900, letterSpacing: 1 }}>GUJARAT TRAFFIC POLICE • E-CHALLAN NOTICE</div>
                <h3 style={{ margin: 0, fontSize: 14 }}>Notice of Violation &amp; Statutory Penalty</h3>
              </div>
              <button className="detail-close" onClick={() => setSelectedChallan(null)}><X size={18} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Challan ID Bar */}
              <div style={{ background: 'rgba(30,41,59,0.7)', padding: '8px 12px', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <div><strong>CHALLAN NO:</strong> <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>{selectedChallan.challan_id}</span></div>
                <div><strong>STATUS:</strong> <span style={{ color: selectedChallan.status === 'PAID' ? '#10b981' : '#ef4444', fontWeight: 800 }}>{selectedChallan.status}</span></div>
              </div>

              {/* Target Plate & Vehicle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', color: '#0f172a', padding: 12, borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>REGISTERED VEHICLE</div>
                  <PlateBadge plate={selectedChallan.plate} size="large" />
                </div>
                <div style={{ textAlign: 'right', fontSize: 11 }}>
                  <div>Owner: <strong>{selectedChallan.owner_name}</strong></div>
                  <div>Class: {selectedChallan.vehicle_type} ({selectedChallan.color})</div>
                </div>
              </div>

              {/* Violation Details */}
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: 12, fontSize: 11 }}>
                <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 13, marginBottom: 4 }}>
                  {getViolationIcon(selectedChallan.violation_type)} {selectedChallan.violation_type}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {selectedChallan.mv_act_section}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: '#94a3b8' }}>
                  <div><MapPin size={11} style={{ display: 'inline', marginRight: 3 }} /> {selectedChallan.camera_name}</div>
                  <div><Clock size={11} style={{ display: 'inline', marginRight: 3 }} /> {new Date(selectedChallan.timestamp).toLocaleString()}</div>
                  {selectedChallan.speed_recorded && (
                    <div style={{ color: '#38bdf8' }}>⚡ Speed: {selectedChallan.speed_recorded} km/h (Limit: {selectedChallan.speed_limit || 50})</div>
                  )}
                  <div style={{ color: '#f59e0b', fontWeight: 700 }}>Fine Amount: ₹{selectedChallan.fine_amount}</div>
                </div>
              </div>

              {/* Payment Info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, background: 'rgba(16,185,129,0.08)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.2)' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#10b981', fontWeight: 800 }}>PARIVAHAN E-PAYMENT PORTAL</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Pay online at echallan.gujarat.gov.in within 60 days</div>
                </div>
                <div style={{ width: 44, height: 44, background: '#ffffff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a' }}>
                  <QrCode size={36} />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '12px 18px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedChallan(null)}>Close</button>
              {selectedChallan.status === 'PENDING' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleIssueChallan(selectedChallan.id)}
                  style={{ background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Send size={13} /> Confirm &amp; Dispatch e-Challan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
