import { useState, useEffect, useMemo } from 'react'
import { 
  Camera, Wifi, WifiOff, Wrench, AlertTriangle, AlertOctagon, CheckCircle2, 
  RefreshCw, Search, Filter, Sliders, Activity, Clock, Shield, MapPin, 
  Video, Eye, HardDrive, Download, ChevronRight, X, ExternalLink, Zap, Radio, Map
} from 'lucide-react'
import { MapPage } from '../components/MapComponents'

const API_BASE = 'http://localhost:8000';

const ACTION_COLORS = {
  OPTIMAL: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399', icon: CheckCircle2 },
  NEEDS_REPAIR: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24', icon: Wrench },
  NEEDS_REPLACEMENT: { bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.4)', text: '#f87171', icon: AlertOctagon },
};

const RES_COLORS = {
  '4K UHD': { bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc', border: 'rgba(99,102,241,0.3)' },
  '1080p FHD': { bg: 'rgba(56,189,248,0.15)', text: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
  '720p HD': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  'Substandard SD': { bg: 'rgba(239,68,68,0.2)', text: '#f87171', border: 'rgba(239,68,68,0.4)' },
};

export function CameraMonitoringPage({ cameras, selectedCamera, setSelectedCamera, detections }) {
  const [viewMode, setViewMode] = useState('monitoring'); // 'monitoring' | 'map'
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Filter state
  const [actionFilter, setActionFilter] = useState('all'); // 'all', 'NEEDS_REPAIR', 'NEEDS_REPLACEMENT', 'OFFLINE', 'OPTIMAL'
  const [resFilter, setResFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection modal state
  const [inspectedCamera, setInspectedCamera] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  const fetchMonitoringData = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/cameras/monitoring`)
      .then(res => res.json())
      .then(data => {
        setMonitoringData(data);
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch camera monitoring data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  // Handle Maintenance Ticket Dispatch
  const handleDispatchTicket = (cam, actionType) => {
    fetch(`${API_BASE}/api/cameras/${cam.camera_id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action_type: actionType,
        notes: cam.diagnostic_reason || 'Field technician dispatched.'
      })
    })
      .then(res => res.json())
      .then(data => {
        setActionFeedback({
          camId: cam.camera_id,
          ticketId: data.ticket?.ticket_id || 'TKT-9921',
          msg: data.message
        });
        setTimeout(() => setActionFeedback(null), 5000);
      })
      .catch(err => console.error('Maintenance dispatch error:', err));
  };

  // Filtered cameras
  const filteredCameras = useMemo(() => {
    if (!monitoringData?.cameras) return [];
    return monitoringData.cameras.filter(cam => {
      // Action filter
      if (actionFilter === 'NEEDS_REPAIR' && cam.action !== 'NEEDS_REPAIR') return false;
      if (actionFilter === 'NEEDS_REPLACEMENT' && cam.action !== 'NEEDS_REPLACEMENT') return false;
      if (actionFilter === 'OPTIMAL' && cam.action !== 'OPTIMAL') return false;
      if (actionFilter === 'OFFLINE' && cam.status !== 'OFFLINE') return false;

      // Resolution filter
      if (resFilter !== 'all' && cam.res_category !== resFilter) return false;

      // City filter
      if (cityFilter !== 'all' && cam.city !== cityFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (cam.camera_id || '').toLowerCase().includes(q);
        const matchName = (cam.name || '').toLowerCase().includes(q);
        const matchPole = (cam.pole_id || '').toLowerCase().includes(q);
        const matchVendor = (cam.vendor || '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPole && !matchVendor) return false;
      }

      return true;
    });
  }, [monitoringData, actionFilter, resFilter, cityFilter, searchQuery]);

  // City list
  const cities = useMemo(() => {
    if (!monitoringData?.cameras) return [];
    return Array.from(new Set(monitoringData.cameras.map(c => c.city).filter(Boolean)));
  }, [monitoringData]);

  return (
    <div style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* ── Page Header & View Toggle ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={22} color="#6366f1" /> Camera Health &amp; Infrastructure Monitoring
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
            Real-time telemetry, resolution compliance, downtime analysis, and automated repair/replacement lifecycle diagnostics
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* View Switcher: Monitoring Grid vs GIS Map */}
          <div style={{ display: 'flex', background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8, padding: 3 }}>
            <button
              onClick={() => setViewMode('monitoring')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none',
                background: viewMode === 'monitoring' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                color: viewMode === 'monitoring' ? '#ffffff' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Wrench size={13} /> Health &amp; Diagnostics
            </button>
            <button
              onClick={() => setViewMode('map')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none',
                background: viewMode === 'map' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'transparent',
                color: viewMode === 'map' ? '#ffffff' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}
            >
              <Map size={13} /> GIS Map View
            </button>
          </div>

          <button
            onClick={fetchMonitoringData} disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8,
              color: '#a5b4fc', fontSize: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Sync Hardware
          </button>
        </div>
      </div>

      {/* ── View Mode: GIS Map ── */}
      {viewMode === 'map' ? (
        <MapPage cameras={cameras} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera} detections={detections} />
      ) : (
        <>
          {/* ── KPI Summary Cards ── */}
          {monitoringData && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {/* Card 1: Total Nodes */}
              <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Camera size={14} color="#6366f1" /> Monitored Cameras
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {monitoringData.total_cameras} Nodes
                </div>
                <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 3 }}>
                  {monitoringData.status_summary?.online} Active • {monitoringData.status_summary?.online_pct}% Reachable
                </div>
              </div>

              {/* Card 2: Average Uptime */}
              <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Activity size={14} color="#10b981" /> Grid Uptime Rate
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {monitoringData.downtime_summary?.average_uptime_pct}%
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                  {monitoringData.downtime_summary?.total_downtime_hours}h Cumulative Downtime
                </div>
              </div>

              {/* Card 3: Needs Repair */}
              <div 
                onClick={() => setActionFilter(actionFilter === 'NEEDS_REPAIR' ? 'all' : 'NEEDS_REPAIR')}
                style={{ 
                  background: actionFilter === 'NEEDS_REPAIR' ? 'rgba(245,158,11,0.2)' : 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', 
                  border: `1px solid ${actionFilter === 'NEEDS_REPAIR' ? '#f59e0b' : 'rgba(245,158,11,0.3)'}`, 
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <Wrench size={14} color="#f59e0b" /> Needs Repair
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {monitoringData.action_summary?.needs_repair} Nodes
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  Lens grime / Focus / Fiber drops
                </div>
              </div>

              {/* Card 4: Needs Replacement */}
              <div 
                onClick={() => setActionFilter(actionFilter === 'NEEDS_REPLACEMENT' ? 'all' : 'NEEDS_REPLACEMENT')}
                style={{ 
                  background: actionFilter === 'NEEDS_REPLACEMENT' ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', 
                  border: `1px solid ${actionFilter === 'NEEDS_REPLACEMENT' ? '#ef4444' : 'rgba(239,68,68,0.3)'}`, 
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <AlertOctagon size={14} color="#ef4444" /> Needs Replacement
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {monitoringData.action_summary?.needs_replacement} Nodes
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  Substandard SD / Sensor burnout
                </div>
              </div>

              {/* Card 5: Offline / Unavailable */}
              <div 
                onClick={() => setActionFilter(actionFilter === 'OFFLINE' ? 'all' : 'OFFLINE')}
                style={{ 
                  background: actionFilter === 'OFFLINE' ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))', 
                  border: `1px solid ${actionFilter === 'OFFLINE' ? '#ef4444' : 'rgba(239,68,68,0.25)'}`, 
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s ease' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                  <WifiOff size={14} color="#ef4444" /> Link Downtime
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {monitoringData.status_summary?.offline} Offline
                </div>
                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>
                  Signal lost • Zero ingestion
                </div>
              </div>
            </div>
          )}

          {/* ── Action Dispatch Feedback Banner ── */}
          {actionFeedback && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.15))',
              border: '1px solid #10b981', borderRadius: 8, padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f8fafc', fontSize: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span><strong>Work Order Generated:</strong> {actionFeedback.ticketId} for {actionFeedback.camId} — {actionFeedback.msg}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={14} /></button>
            </div>
          )}

          {/* ── Filter Controls Toolbar ── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.6))',
            border: '1px solid rgba(51,65,85,0.4)', borderRadius: 12, padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
          }}>
            {/* Quick Action Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginRight: 4 }}>Filter Status:</span>
              {[
                { id: 'all', label: `All Cameras (${monitoringData?.total_cameras || 30})` },
                { id: 'NEEDS_REPAIR', label: `🔧 Repair (${monitoringData?.action_summary?.needs_repair || 0})` },
                { id: 'NEEDS_REPLACEMENT', label: `⚠️ Replace (${monitoringData?.action_summary?.needs_replacement || 0})` },
                { id: 'OFFLINE', label: `🔴 Down (${monitoringData?.status_summary?.offline || 0})` },
                { id: 'OPTIMAL', label: `🟢 Optimal (${monitoringData?.action_summary?.optimal || 0})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActionFilter(tab.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: actionFilter === tab.id ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(15,23,42,0.8)',
                    border: `1px solid ${actionFilter === tab.id ? '#6366f1' : 'rgba(148,163,184,0.15)'}`,
                    color: actionFilter === tab.id ? '#ffffff' : '#cbd5e1',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Dropdown Filters & Search */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Resolution Dropdown */}
              <select
                value={resFilter}
                onChange={e => setResFilter(e.target.value)}
                style={{
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6,
                  color: '#e2e8f0', fontSize: 11, fontWeight: 600, padding: '6px 10px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="all">All Resolutions (4K / 1080p / SD)</option>
                <option value="4K UHD">4K UHD (3840x2160)</option>
                <option value="1080p FHD">1080p Full HD (1920x1080)</option>
                <option value="720p HD">720p HD (1280x720)</option>
                <option value="Substandard SD">⚠️ Substandard SD (Legacy)</option>
              </select>

              {/* City Dropdown */}
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                style={{
                  background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6,
                  color: '#e2e8f0', fontSize: 11, fontWeight: 600, padding: '6px 10px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="all">All Gujarat Districts</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Search Box */}
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search Pole ID, Camera ID, Road..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6,
                    color: '#e2e8f0', fontSize: 11, padding: '6px 10px 6px 26px', width: 180, outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Camera Grid Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {filteredCameras.map(cam => {
              const ActionConfig = ACTION_COLORS[cam.action] || ACTION_COLORS.OPTIMAL;
              const ActionIcon = ActionConfig.icon;
              const resBadge = RES_COLORS[cam.res_category] || RES_COLORS['1080p FHD'];
              const isOffline = cam.status === 'OFFLINE';
              const isDegraded = cam.status === 'DEGRADED';

              return (
                <div
                  key={cam.camera_id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
                    border: `1px solid ${ActionConfig.border}`,
                    borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {/* Top Status & Resolution Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ 
                        width: 8, height: 8, borderRadius: '50%', 
                        background: isOffline ? '#ef4444' : isDegraded ? '#f59e0b' : '#10b981',
                        boxShadow: isOffline ? '0 0 8px #ef4444' : isDegraded ? '0 0 8px #f59e0b' : '0 0 8px #10b981'
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                        {cam.camera_id}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>• {cam.city}</span>
                    </div>

                    {/* Resolution Badge */}
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4,
                      background: resBadge.bg, color: resBadge.text, border: `1px solid ${resBadge.border}`,
                      letterSpacing: '0.02em'
                    }}>
                      {cam.resolution.split(' ')[0]} ({cam.res_category})
                    </span>
                  </div>

                  {/* Camera Name & Pole */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {cam.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                      <span>Pole: <strong style={{ color: '#94a3b8' }}>{cam.pole_id}</strong></span>
                      <span>Asset: <strong style={{ color: '#94a3b8' }}>{cam.asset_tag}</strong></span>
                    </div>
                  </div>

                  {/* Operational Telemetry Matrix */}
                  <div style={{ 
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, 
                    background: 'rgba(2,6,23,0.5)', padding: '8px 10px', borderRadius: 6, fontSize: 10 
                  }}>
                    <div>
                      <div style={{ color: '#64748b', textTransform: 'uppercase' }}>Uptime</div>
                      <div style={{ fontWeight: 800, color: cam.uptime_pct >= 95 ? '#34d399' : cam.uptime_pct >= 80 ? '#fbbf24' : '#f87171', marginTop: 2 }}>
                        {cam.uptime_pct}%
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', textTransform: 'uppercase' }}>Downtime</div>
                      <div style={{ fontWeight: 800, color: cam.downtime_hours > 50 ? '#f87171' : '#cbd5e1', marginTop: 2 }}>
                        {cam.downtime_hours}h
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', textTransform: 'uppercase' }}>Stream FPS</div>
                      <div style={{ fontWeight: 800, color: cam.fps > 20 ? '#38bdf8' : '#fbbf24', marginTop: 2 }}>
                        {cam.fps} FPS
                      </div>
                    </div>

                    <div>
                      <div style={{ color: '#64748b', textTransform: 'uppercase' }}>Ping</div>
                      <div style={{ fontWeight: 800, color: isOffline ? '#f87171' : cam.ping_ms < 50 ? '#34d399' : '#fbbf24', marginTop: 2 }}>
                        {isOffline ? 'OFFLINE' : `${cam.ping_ms}ms`}
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic & Action Box */}
                  <div style={{
                    background: ActionConfig.bg, border: `1px solid ${ActionConfig.border}`, borderRadius: 8, padding: '8px 10px',
                    display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: ActionConfig.text }}>
                      <ActionIcon size={14} />
                      <span>{cam.action_label}</span>
                      {cam.action_urgency !== 'NONE' && (
                        <span style={{ 
                          fontSize: 9, padding: '1px 5px', borderRadius: 3, marginLeft: 'auto',
                          background: cam.action_urgency === 'CRITICAL' ? '#ef4444' : '#f59e0b', color: 'white', fontWeight: 900 
                        }}>
                          {cam.action_urgency} URGENCY
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.35 }}>
                      {cam.diagnostic_reason}
                    </p>
                  </div>

                  {/* Action Buttons & Inspector */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {cam.action === 'NEEDS_REPAIR' && (
                      <button
                        onClick={() => handleDispatchTicket(cam, 'repair_work_order')}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                          background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#0f172a',
                          fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <Wrench size={12} /> Dispatch Repair Team
                      </button>
                    )}

                    {cam.action === 'NEEDS_REPLACEMENT' && (
                      <button
                        onClick={() => handleDispatchTicket(cam, 'replacement_requisition')}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6, border: 'none',
                          background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#ffffff',
                          fontSize: 11, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                        }}
                      >
                        <AlertOctagon size={12} /> Order Replacement
                      </button>
                    )}

                    <button
                      onClick={() => setInspectedCamera(cam)}
                      style={{
                        padding: '6px 12px', borderRadius: 6,
                        background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.25)',
                        color: '#f1f5f9', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, marginLeft: cam.action === 'OPTIMAL' ? 'auto' : 0
                      }}
                    >
                      <Eye size={12} /> Full Specs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCameras.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              No cameras matched your filter criteria.
            </div>
          )}

          {/* ── Inspection Modal ── */}
          {inspectedCamera && (
            <div 
              style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
              }}
              onClick={() => setInspectedCamera(null)}
            >
              <div 
                style={{
                  background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14,
                  maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 20,
                  boxShadow: '0 20px 50px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', gap: 16
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(51,65,85,0.4)', paddingBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {inspectedCamera.camera_id}
                      </span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>• {inspectedCamera.city}</span>
                      <span style={{ 
                        fontSize: 10, padding: '2px 7px', borderRadius: 4,
                        background: RES_COLORS[inspectedCamera.res_category]?.bg, 
                        color: RES_COLORS[inspectedCamera.res_category]?.text,
                        border: `1px solid ${RES_COLORS[inspectedCamera.res_category]?.border}`, fontWeight: 800
                      }}>
                        {inspectedCamera.resolution}
                      </span>
                    </div>
                    <h3 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>
                      {inspectedCamera.name}
                    </h3>
                  </div>
                  <button onClick={() => setInspectedCamera(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                {/* Video Stream Preview Frame */}
                <div style={{ width: '100%', height: 240, background: '#020617', borderRadius: 8, overflow: 'hidden', position: 'relative', border: '1px solid rgba(51,65,85,0.5)' }}>
                  <img 
                    src={`http://localhost:8000/api/video_stream/${parseInt(inspectedCamera.camera_id.replace(/\D/g, '')) || 1}`}
                    alt="Camera feed"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `http://localhost:8000/api/camera_snapshot/cam01`;
                    }}
                  />
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.8)', padding: '2px 8px', borderRadius: 4, fontSize: 10, color: '#34d399', fontWeight: 800 }}>
                    ● LIVE RTSP FEED • {inspectedCamera.fps} FPS • {inspectedCamera.bitrate_mbps} Mbps
                  </div>
                </div>

                {/* Specs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 12 }}>
                  <div style={{ background: 'rgba(30,41,59,0.5)', padding: 10, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Hardware Manufacturer &amp; Sensor</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>{inspectedCamera.vendor}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Sensor: {inspectedCamera.sensor_make}</div>
                  </div>

                  <div style={{ background: 'rgba(30,41,59,0.5)', padding: 10, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Optics &amp; Compression Codec</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>{inspectedCamera.lens}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Codec: {inspectedCamera.codec} • Sharpness: {inspectedCamera.laplacian_sharpness}</div>
                  </div>

                  <div style={{ background: 'rgba(30,41,59,0.5)', padding: 10, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Asset &amp; Physical Installation</div>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>Pole ID: {inspectedCamera.pole_id}</div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Installed: {inspectedCamera.install_date} • {inspectedCamera.warranty_status}</div>
                  </div>

                  <div style={{ background: 'rgba(30,41,59,0.5)', padding: 10, borderRadius: 8 }}>
                    <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Network &amp; Reliability History</div>
                    <div style={{ fontWeight: 700, color: inspectedCamera.uptime_pct >= 95 ? '#34d399' : '#f87171', marginTop: 2 }}>
                      {inspectedCamera.uptime_pct}% 30-Day Uptime
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                      Downtime: {inspectedCamera.downtime_hours}h • Loss: {inspectedCamera.packet_loss_pct}%
                    </div>
                  </div>
                </div>

                {/* Diagnostic Details */}
                <div style={{ 
                  background: ACTION_COLORS[inspectedCamera.action]?.bg, 
                  border: `1px solid ${ACTION_COLORS[inspectedCamera.action]?.border}`,
                  padding: 12, borderRadius: 8 
                }}>
                  <div style={{ fontWeight: 800, color: ACTION_COLORS[inspectedCamera.action]?.text, fontSize: 12, marginBottom: 4 }}>
                    {inspectedCamera.action_label} ({inspectedCamera.action_urgency} URGENCY)
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: 12, marginBottom: 4 }}>
                    <strong>Defect Diagnosis:</strong> {inspectedCamera.diagnostic_reason}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    <strong>Recommended Field Action:</strong> {inspectedCamera.recommended_action}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid rgba(51,65,85,0.4)', paddingTop: 12 }}>
                  <button 
                    onClick={() => setInspectedCamera(null)}
                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                  >
                    Close
                  </button>

                  {inspectedCamera.action === 'NEEDS_REPAIR' && (
                    <button
                      onClick={() => {
                        handleDispatchTicket(inspectedCamera, 'repair_work_order');
                        setInspectedCamera(null);
                      }}
                      style={{ padding: '8px 16px', background: '#f59e0b', color: '#0f172a', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}
                    >
                      <Wrench size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Dispatch Field Technician
                    </button>
                  )}

                  {inspectedCamera.action === 'NEEDS_REPLACEMENT' && (
                    <button
                      onClick={() => {
                        handleDispatchTicket(inspectedCamera, 'replacement_requisition');
                        setInspectedCamera(null);
                      }}
                      style={{ padding: '8px 16px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer', fontSize: 12 }}
                    >
                      <AlertOctagon size={13} style={{ display: 'inline', marginRight: 5 }} />
                      Initiate Replacement Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
