import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Clock, Route, AlertTriangle, Car, Eye, ChevronRight, Compass, Gauge, Download, Shield, Navigation, ArrowRight } from 'lucide-react';

const API_BASE = '';

export function RouteReconstructionPage() {
  const [searchPlate, setSearchPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [journeyData, setJourneyData] = useState(null);
  const [recentJourneys, setRecentJourneys] = useState([]);
  const [error, setError] = useState('');
  const [activeSegment, setActiveSegment] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);

  // Fetch recent multi-camera journeys on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/route/recent_journeys?limit=15`)
      .then(r => r.json())
      .then(data => setRecentJourneys(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    if (!mapRef.current) return;

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (typeof window.L === 'undefined') {
        setTimeout(initMap, 200);
        return;
      }
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([23.03, 72.58], 11);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
      }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 16
      }).addTo(map);
      mapInstanceRef.current = map;
    };

    if (typeof window.L === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initMap, 100);
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, []);

  // Render journey on map
  useEffect(() => {
    if (!mapInstanceRef.current || !journeyData) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Clear previous markers and route
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const waypoints = journeyData.journey?.waypoints || [];
    const routeCoords = journeyData.journey?.route?.coordinates || [];

    if (waypoints.length === 0) return;

    // Draw road-snapped route polyline with animated gradient
    if (routeCoords.length > 1) {
      const polyline = L.polyline(routeCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.85,
        dashArray: '12 6',
        lineCap: 'round',
      }).addTo(map);
      routeLayerRef.current = polyline;

      // Add direction arrows along route
      const step = Math.max(1, Math.floor(routeCoords.length / 8));
      for (let i = step; i < routeCoords.length - 1; i += step) {
        const lat1 = routeCoords[i][0], lng1 = routeCoords[i][1];
        const lat2 = routeCoords[i + 1][0], lng2 = routeCoords[i + 1][1];
        const angle = Math.atan2(lat2 - lat1, lng2 - lng1) * (180 / Math.PI);
        const arrowIcon = L.divIcon({
          className: 'route-arrow-icon',
          html: `<div style="transform:rotate(${90 - angle}deg);color:#3b82f6;font-size:18px;text-shadow:0 0 6px rgba(59,130,246,0.6)">➤</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const arrowMarker = L.marker([lat1, lng1], { icon: arrowIcon, interactive: false }).addTo(map);
        markersRef.current.push(arrowMarker);
      }
    }

    // Add numbered waypoint markers
    waypoints.forEach((wp, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === waypoints.length - 1;
      const markerColor = isFirst ? '#10b981' : isLast ? '#ef4444' : '#f59e0b';
      const label = isFirst ? 'START' : isLast ? 'END' : `${idx + 1}`;
      const pulseClass = (isFirst || isLast) ? 'pulse-ring' : '';

      const icon = L.divIcon({
        className: 'route-waypoint-icon',
        html: `
          <div style="position:relative">
            <div class="${pulseClass}" style="position:absolute;top:-8px;left:-8px;width:36px;height:36px;border-radius:50%;border:2px solid ${markerColor};opacity:0.4;${(isFirst || isLast) ? 'animation:pulse-anim 2s infinite;' : ''}"></div>
            <div style="width:20px;height:20px;border-radius:50%;background:${markerColor};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;box-shadow:0 2px 8px ${markerColor}88">
              ${label}
            </div>
          </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([wp.lat, wp.lng], { icon })
        .bindPopup(`
          <div style="font-family:'Inter',sans-serif;min-width:200px">
            <div style="font-weight:700;color:${markerColor};margin-bottom:4px">${isFirst ? '🟢 FIRST SEEN' : isLast ? '🔴 LAST SEEN' : `📍 Waypoint ${idx + 1}`}</div>
            <div style="font-weight:600">${wp.camera_name}</div>
            <div style="color:#94a3b8;font-size:12px">${wp.city} • ${wp.department || ''}</div>
            <div style="margin-top:6px;font-size:11px;color:#cbd5e1">
              🕐 ${wp.timestamp ? new Date(wp.timestamp).toLocaleString('en-IN') : 'N/A'}<br/>
              🚗 ${wp.vehicle_type || ''} • ${wp.color || ''}<br/>
              📊 Confidence: ${(wp.confidence != null ? (Number(wp.confidence) <= 1 ? Number(wp.confidence) * 100 : Number(wp.confidence)).toFixed(1) : 'N/A')}%
            </div>
          </div>
        `)
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Fit map to route bounds
    const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });

  }, [journeyData]);

  const handleSearch = async (plateOverride) => {
    const plate = (plateOverride || searchPlate).trim();
    if (!plate) return;
    setLoading(true);
    setError('');
    setJourneyData(null);
    setActiveSegment(null);

    try {
      const res = await fetch(`${API_BASE}/api/route/reconstruct/${encodeURIComponent(plate)}?hours=720`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Vehicle not found');
      }
      const data = await res.json();
      setJourneyData(data);
      setSearchPlate(data.plate || plate);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportEvidence = async () => {
    if (!journeyData?.plate) return;
    try {
      const res = await fetch(`${API_BASE}/api/route/evidence_timeline/${encodeURIComponent(journeyData.plate)}?hours=720`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence_timeline_${journeyData.plate}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const summary = journeyData?.journey?.summary || {};
  const segments = journeyData?.journey?.segments || [];
  const waypoints = journeyData?.journey?.waypoints || [];
  const dwellAnalysis = journeyData?.journey?.dwell_analysis || [];
  const watchlistMatch = journeyData?.watchlist_match;
  const vahanInfo = journeyData?.vahan_info;

  return (
    <div className="route-reconstruction-page">
      <style>{`
        .route-reconstruction-page { display: grid; grid-template-columns: 420px 1fr; grid-template-rows: auto 1fr; gap: 0; height: calc(100vh - 64px); overflow: hidden; }
        .route-sidebar { grid-row: 1 / -1; display: flex; flex-direction: column; background: var(--bg-secondary, #0f172a); border-right: 1px solid rgba(255,255,255,0.06); overflow-y: auto; }
        .route-map-area { grid-column: 2; grid-row: 1 / -1; position: relative; }
        .route-map-area .leaflet-container { width: 100%; height: 100%; background: #0a0e1a; }

        .route-search-box { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .route-search-input-wrap { display: flex; gap: 8px; }
        .route-search-input-wrap input { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 14px; color: #e2e8f0; font-size: 14px; font-family: 'JetBrains Mono', monospace; letter-spacing: 1.5px; }
        .route-search-input-wrap input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .route-search-input-wrap input::placeholder { color: #475569; letter-spacing: 0.5px; }
        .route-search-btn { padding: 10px 18px; background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; transition: all 0.2s; }
        .route-search-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
        .route-search-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .route-error { padding: 12px 16px; margin: 8px 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; color: #fca5a5; font-size: 13px; }

        .route-recent { padding: 12px 16px; }
        .route-recent-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px; font-weight: 600; }
        .route-recent-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; margin-bottom: 4px; }
        .route-recent-item:hover { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.15); }
        .route-recent-plate { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #e2e8f0; font-size: 13px; letter-spacing: 1px; }
        .route-recent-meta { font-size: 11px; color: #64748b; }
        .route-recent-cameras { background: rgba(59,130,246,0.15); color: #60a5fa; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; margin-left: auto; }

        .route-watchlist-banner { margin: 8px 16px; padding: 14px 16px; background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1)); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; }
        .route-watchlist-banner .wl-title { color: #ef4444; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .route-watchlist-banner .wl-detail { color: #fca5a5; font-size: 12px; line-height: 1.6; }

        .route-vahan-card { margin: 8px 16px; padding: 12px 14px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.12); border-radius: 10px; }
        .route-vahan-card .vahan-title { color: #60a5fa; font-weight: 700; font-size: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .route-vahan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
        .route-vahan-grid .vahan-label { color: #64748b; font-size: 11px; }
        .route-vahan-grid .vahan-value { color: #cbd5e1; font-size: 12px; font-weight: 600; }

        .route-summary { padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .route-summary-title { font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .route-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .route-stat-card { padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; text-align: center; }
        .route-stat-value { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #3b82f6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .route-stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }

        .route-segments { padding: 12px 16px; flex: 1; overflow-y: auto; }
        .route-segments-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 10px; font-weight: 600; }
        .route-segment { padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; cursor: pointer; transition: all 0.2s; position: relative; }
        .route-segment:hover, .route-segment.active { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
        .route-segment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .route-segment-idx { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0; }
        .route-segment-cameras { flex: 1; font-size: 12px; color: #e2e8f0; font-weight: 600; }
        .route-segment-direction { font-size: 11px; color: #60a5fa; font-weight: 700; }
        .route-segment-metrics { display: flex; gap: 12px; font-size: 11px; color: #94a3b8; }
        .route-segment-metric { display: flex; align-items: center; gap: 4px; }

        .route-dwell { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06); }
        .route-dwell-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
        .route-dwell-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 12px; }
        .route-dwell-cam { color: #cbd5e1; font-weight: 600; }
        .route-dwell-stats { color: #64748b; font-size: 11px; }

        .route-export-btn { margin: 12px 16px; padding: 10px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); border-radius: 8px; color: #10b981; font-weight: 600; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; }
        .route-export-btn:hover { background: rgba(16,185,129,0.2); }

        .route-map-overlay { position: absolute; top: 16px; right: 16px; z-index: 800; }
        .route-map-legend { background: rgba(15,23,42,0.92); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; min-width: 180px; }
        .route-map-legend-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .route-map-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #cbd5e1; margin-bottom: 4px; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; }

        .route-cities-bar { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 800; display: flex; gap: 8px; }
        .route-city-chip { background: rgba(15,23,42,0.88); backdrop-filter: blur(8px); border: 1px solid rgba(59,130,246,0.2); border-radius: 20px; padding: 6px 14px; font-size: 11px; color: #60a5fa; font-weight: 600; display: flex; align-items: center; gap: 4px; }

        @keyframes pulse-anim { 0% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.5); opacity: 0.1; } 100% { transform: scale(1); opacity: 0.4; } }
      `}</style>

      {/* LEFT SIDEBAR */}
      <div className="route-sidebar">
        {/* Search Box */}
        <div className="route-search-box">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Route size={14} /> Multi-Camera Route Reconstruction
          </div>
          <div className="route-search-input-wrap">
            <input
              type="text"
              placeholder="GJ01AB1234"
              value={searchPlate}
              onChange={e => setSearchPlate(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="route-search-btn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> : <Search size={14} />}
              {loading ? 'Tracing...' : 'Track'}
            </button>
          </div>
        </div>

        {error && <div className="route-error"><AlertTriangle size={13} style={{ display: 'inline', marginRight: 6 }} />{error}</div>}

        {/* Watchlist Alert Banner */}
        {watchlistMatch && (
          <div className="route-watchlist-banner">
            <div className="wl-title"><Shield size={14} /> ⚠️ WATCHLIST HIT — {watchlistMatch.category || 'ALERT'}</div>
            <div className="wl-detail">
              <strong>Reason:</strong> {watchlistMatch.reason}<br />
              {watchlistMatch.fir_number && <><strong>FIR:</strong> {watchlistMatch.fir_number}<br /></>}
              {watchlistMatch.owner_name && <><strong>Owner:</strong> {watchlistMatch.owner_name}<br /></>}
              <strong>Severity:</strong> <span style={{ color: watchlistMatch.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b' }}>{watchlistMatch.severity}</span>
            </div>
          </div>
        )}

        {/* VAHAN Info Card */}
        {vahanInfo && vahanInfo.make && (
          <div className="route-vahan-card">
            <div className="vahan-title"><Car size={13} /> VAHAN Vehicle Registry</div>
            <div className="route-vahan-grid">
              <span className="vahan-label">Make</span><span className="vahan-value">{vahanInfo.make}</span>
              <span className="vahan-label">Model</span><span className="vahan-value">{vahanInfo.model}</span>
              <span className="vahan-label">Color</span><span className="vahan-value">{vahanInfo.color}</span>
              <span className="vahan-label">Fuel</span><span className="vahan-value">{vahanInfo.fuel}</span>
              <span className="vahan-label">Owner</span><span className="vahan-value">{vahanInfo.owner}</span>
              <span className="vahan-label">RTO</span><span className="vahan-value">{vahanInfo.rto}</span>
            </div>
          </div>
        )}

        {/* Journey Summary */}
        {journeyData && (
          <div className="route-summary">
            <div className="route-summary-title">
              <Navigation size={14} style={{ color: '#3b82f6' }} />
              Journey Summary — {journeyData.plate}
            </div>
            <div className="route-stats-grid">
              <div className="route-stat-card">
                <div className="route-stat-value">{summary.unique_cameras || 0}</div>
                <div className="route-stat-label">Cameras</div>
              </div>
              <div className="route-stat-card">
                <div className="route-stat-value">{summary.total_sightings || 0}</div>
                <div className="route-stat-label">Sightings</div>
              </div>
              <div className="route-stat-card">
                <div className="route-stat-value">{summary.road_distance_km || summary.straight_line_distance_km || '—'}</div>
                <div className="route-stat-label">Distance (km)</div>
              </div>
              <div className="route-stat-card">
                <div className="route-stat-value">{summary.average_speed_kmh || '—'}</div>
                <div className="route-stat-label">Avg Speed (km/h)</div>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
              <strong style={{ color: '#94a3b8' }}>First Seen:</strong> {summary.first_seen ? new Date(summary.first_seen).toLocaleString('en-IN') : '—'}<br />
              <strong style={{ color: '#94a3b8' }}>Last Seen:</strong> {summary.last_seen ? new Date(summary.last_seen).toLocaleString('en-IN') : '—'}<br />
              <strong style={{ color: '#94a3b8' }}>Cities:</strong> {(summary.cities_traversed || []).join(' → ')}
            </div>
          </div>
        )}

        {/* Travel Segments */}
        {segments.length > 0 && (
          <div className="route-segments">
            <div className="route-segments-title">Travel Segments ({segments.length})</div>
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`route-segment ${activeSegment === i ? 'active' : ''}`}
                onClick={() => setActiveSegment(i)}
              >
                <div className="route-segment-header">
                  <div className="route-segment-idx">{seg.index}</div>
                  <div className="route-segment-cameras">
                    {seg.from_camera?.split(' ').slice(1).join(' ') || seg.from_camera}
                    <ArrowRight size={11} style={{ margin: '0 4px', opacity: 0.5 }} />
                    {seg.to_camera?.split(' ').slice(1).join(' ') || seg.to_camera}
                  </div>
                  <div className="route-segment-direction">{seg.direction}</div>
                </div>
                <div className="route-segment-metrics">
                  <span className="route-segment-metric"><MapPin size={10} />{seg.straight_line_km} km</span>
                  <span className="route-segment-metric"><Clock size={10} />{seg.travel_time_mins} min</span>
                  <span className="route-segment-metric"><Gauge size={10} />{seg.estimated_speed_kmh} km/h</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dwell Time Analysis */}
        {dwellAnalysis.length > 0 && (
          <div className="route-dwell">
            <div className="route-dwell-title">Camera Dwell Analysis</div>
            {dwellAnalysis.map((d, i) => (
              <div key={i} className="route-dwell-item">
                <span className="route-dwell-cam">{d.camera_name?.split(' ').slice(1).join(' ') || d.camera_name}</span>
                <span className="route-dwell-stats">{d.sightings} sighting{d.sightings > 1 ? 's' : ''} • {d.dwell_minutes} min</span>
              </div>
            ))}
          </div>
        )}

        {/* Export Evidence Button */}
        {journeyData && (
          <button className="route-export-btn" onClick={handleExportEvidence}>
            <Download size={14} /> Export Section 65B Evidence Timeline (JSON)
          </button>
        )}

        {/* Recent Journeys (shown when no active search) */}
        {!journeyData && recentJourneys.length > 0 && (
          <div className="route-recent">
            <div className="route-recent-title">Recent Multi-Camera Vehicles</div>
            {recentJourneys.map((v, i) => (
              <div key={i} className="route-recent-item" onClick={() => { setSearchPlate(v.plate); handleSearch(v.plate); }}>
                <Car size={14} style={{ color: '#64748b' }} />
                <div>
                  <div className="route-recent-plate">{v.plate}</div>
                  <div className="route-recent-meta">{v.vehicle_type} • {v.color} • {v.total_sightings} sightings</div>
                </div>
                <div className="route-recent-cameras">{v.cameras_count} cams</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAP AREA */}
      <div className="route-map-area">
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Map Legend Overlay */}
        {journeyData && (
          <div className="route-map-overlay">
            <div className="route-map-legend">
              <div className="route-map-legend-title">Journey Legend</div>
              <div className="route-map-legend-item"><div className="legend-dot" style={{ background: '#10b981' }} /> First Sighting</div>
              <div className="route-map-legend-item"><div className="legend-dot" style={{ background: '#f59e0b' }} /> Intermediate</div>
              <div className="route-map-legend-item"><div className="legend-dot" style={{ background: '#ef4444' }} /> Last Sighting</div>
              <div className="route-map-legend-item"><div style={{ width: 20, height: 3, background: '#3b82f6', borderRadius: 2 }} /> Road Route</div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#64748b' }}>
                Route: {journeyData.journey?.route?.provider || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Cities Bar */}
        {summary.cities_traversed?.length > 0 && (
          <div className="route-cities-bar">
            {summary.cities_traversed.map((city, i) => (
              <div key={i} className="route-city-chip">
                <MapPin size={10} /> {city}
                {i < summary.cities_traversed.length - 1 && <ChevronRight size={10} style={{ marginLeft: 2 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
