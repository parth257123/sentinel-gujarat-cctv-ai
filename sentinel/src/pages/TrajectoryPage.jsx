import React, { useState, useEffect } from 'react';
import { 
  Search, Navigation, Crosshair, Target, Shield, Radio, MapPin, Clock, 
  Car, ChevronRight, AlertTriangle, Zap, Route, RefreshCw, CheckCircle2, 
  XCircle, Compass, Gauge, Layers, ShieldAlert, ArrowRight, Lock,
  Building2, Phone, Siren, Activity, PhoneCall, Check, Filter,
  CheckCircle, RadioTower, Truck, HeartPulse, Send, AlertOctagon
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = 'http://localhost:8000';

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.invalidateSize();
      map.setView(center, 13, { animate: true });
    }
  }, [center?.[0], center?.[1], map]);
  return null;
}

// Precision SVG Tactical Markers (No Cartoon Emojis)
const createVehicleTargetIcon = () => L.divIcon({
  className: 'tactical-target-marker',
  html: `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:rgba(239,68,68,0.25);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#991b1b);border:2px solid #fecaca;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(239,68,68,0.9);z-index:2;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="22" y1="12" x2="18" y2="12"></line>
          <line x1="6" y1="12" x2="2" y2="12"></line>
          <line x1="12" y1="6" x2="12" y2="2"></line>
          <line x1="12" y1="22" x2="12" y2="18"></line>
        </svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const createPoliceStationIcon = (isAlerted, index) => L.divIcon({
  className: 'tactical-station-marker',
  html: `
    <div style="background:${isAlerted ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#1e3a8a,#2563eb)'};border:2px solid ${isAlerted ? '#6ee7b7' : '#93c5fd'};border-radius:8px;padding:3px 7px;display:flex;align-items:center;gap:5px;box-shadow:0 0 14px ${isAlerted ? 'rgba(16,185,129,0.8)' : 'rgba(37,99,235,0.7)'};white-space:nowrap;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
      <span style="color:#fff;font-size:10px;font-weight:900;font-family:monospace;letter-spacing:0.5px;">PS-${index + 1}</span>
    </div>
  `,
  iconSize: [60, 26],
  iconAnchor: [30, 13]
});

const createTollBarrierIcon = (isLocked) => L.divIcon({
  className: 'tactical-toll-marker',
  html: `
    <div style="background:${isLocked ? '#dc2626' : '#d97706'};border:1.5px solid ${isLocked ? '#f87171' : '#fcd34d'};border-radius:6px;padding:3px 6px;display:flex;align-items:center;gap:4px;box-shadow:0 0 12px ${isLocked ? 'rgba(239,68,68,0.8)' : 'rgba(217,119,6,0.6)'};white-space:nowrap;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span style="color:#fff;font-size:9px;font-weight:800;">TOLL</span>
    </div>
  `,
  iconSize: [52, 22],
  iconAnchor: [26, 11]
});

const createTraumaCenterIcon = () => L.divIcon({
  className: 'tactical-trauma-marker',
  html: `
    <div style="background:#047857;border:1.5px solid #6ee7b7;border-radius:6px;padding:3px 6px;display:flex;align-items:center;gap:4px;box-shadow:0 0 12px rgba(16,185,129,0.6);white-space:nowrap;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
      <span style="color:#fff;font-size:9px;font-weight:800;">MED</span>
    </div>
  `,
  iconSize: [52, 22],
  iconAnchor: [26, 11]
});

const createPcrPatrolIcon = (isDispatched) => L.divIcon({
  className: 'tactical-pcr-marker',
  html: `
    <div style="background:${isDispatched ? '#059669' : '#0284c7'};border:1.5px solid ${isDispatched ? '#6ee7b7' : '#7dd3fc'};border-radius:6px;padding:3px 6px;display:flex;align-items:center;gap:4px;box-shadow:0 0 12px ${isDispatched ? 'rgba(16,185,129,0.8)' : 'rgba(2,132,199,0.6)'};white-space:nowrap;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
        <circle cx="7" cy="17" r="2"></circle>
        <circle cx="17" cy="17" r="2"></circle>
      </svg>
      <span style="color:#fff;font-size:9px;font-weight:800;">PCR</span>
    </div>
  `,
  iconSize: [52, 22],
  iconAnchor: [26, 11]
});

function PlateBadge({ plate, size = 'normal' }) {
  const fs = size === 'large' ? 14 : 12;
  return (
    <div style={{ background: '#0f172a', color: '#f8fafc', fontWeight: 800, padding: size === 'large' ? '5px 12px' : '2px 8px', borderRadius: 6, fontFamily: 'monospace', fontSize: fs, border: '1.5px solid #475569', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
      <span style={{ fontSize: size === 'large' ? 9 : 8, background: '#1d4ed8', color: '#fff', padding: '1px 4px', borderRadius: 2, fontWeight: 900 }}>IND</span>
      <span>{plate}</span>
    </div>
  );
}

export function TrajectoryPage() {
  const [plateQuery, setPlateQuery] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [recentDetections, setRecentDetections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'POLICE' | 'TOLL' | 'TRAUMA' | 'PCR'
  const [alertedStations, setAlertedStations] = useState(new Set());
  const [lockedTolls, setLockedTolls] = useState(new Set());
  const [dispatchedPCRs, setDispatchedPCRs] = useState(new Set());
  const [alertingId, setAlertingId] = useState(null);

  // Load live recent detections on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/archive/records?category=detections&sort_by=newest&limit=6`)
      .then(r => r.json())
      .then(data => {
        if (data.records && data.records.length > 0) {
          setRecentDetections(data.records);
          const firstPlate = data.records[0].plate;
          setPlateQuery(firstPlate);
          predictPlate(firstPlate);
        }
      })
      .catch(() => {
        setPlateQuery('GJ-01-DJ-5574');
        predictPlate('GJ-01-DJ-5574');
      });
  }, []);

  const predictPlate = (plateToPredict) => {
    const query = plateToPredict || plateQuery;
    if (!query.trim()) return;
    setLoading(true);
    setPrediction(null);
    setAlertedStations(new Set());
    setLockedTolls(new Set());
    setDispatchedPCRs(new Set());

    fetch(`${API_BASE}/api/trajectory/predict/${encodeURIComponent(query.trim())}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setPrediction(data);
        setLoading(false);
      })
      .catch(() => {
        setPrediction({ error: true });
        setLoading(false);
      });
  };

  const handlePredict = () => predictPlate(plateQuery);

  const handleAlertStation = (station) => {
    if (!prediction) return;
    setAlertingId(station.id);

    fetch(`${API_BASE}/api/tactical/alert_station`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stationName: station.name,
        plate: prediction.plate,
        sho: station.sho,
      })
    })
      .then(r => r.json())
      .then(() => {
        setAlertedStations(prev => new Set([...prev, station.id]));
        setAlertingId(null);
      })
      .catch(() => setAlertingId(null));
  };

  const handleLockToll = (tollId) => {
    setLockedTolls(prev => new Set([...prev, tollId]));
  };

  const handleDispatchPCR = (pcrUnit) => {
    setDispatchedPCRs(prev => new Set([...prev, pcrUnit]));
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handlePredict(); };

  const pred = prediction?.prediction;
  const infra = pred?.nearby_infrastructure;
  const lastPos = pred?.lastKnownPosition || { lat: 23.03, lng: 72.58 };
  const targetCoords = [lastPos.lat || 23.03, lastPos.lng || 72.58];

  const policeStations = infra?.police_stations || [];
  const tollChokepoints = infra?.toll_chokepoints || [];
  const traumaCenters = infra?.trauma_centers || [];
  const pcrVans = infra?.pcr_vans || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 24px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Header Banner - Executive Defense Terminal Style */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: '14px 20px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: 7, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Siren size={18} color="#60a5fa" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                Sector Command &amp; Police Infrastructure Grid
              </h1>
              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>
                GUJARAT C4i GRID
              </span>
            </div>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: 11 }}>
              Real-time proximity mapping &amp; tactical dispatch to nearest Police Thanas, Highway FASTag barriers, Trauma Centers, and PCR Units.
            </p>
          </div>
        </div>

        {infra && (
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ background: '#18181b', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Police Thanas</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f4f4f5' }}>{policeStations.length}</div>
            </div>
            <div style={{ background: '#18181b', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>FASTag Barriers</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f4f4f5' }}>{tollChokepoints.length}</div>
            </div>
            <div style={{ background: '#18181b', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Trauma Care</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f4f4f5' }}>{traumaCenters.length}</div>
            </div>
            <div style={{ background: '#18181b', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Active PCRs</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#f4f4f5' }}>{pcrVans.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Target Plate Query & Live CCTV Sighting Strip */}
      <div style={{
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            borderRadius: 8,
            padding: '0 12px'
          }}>
            <Crosshair size={15} color="#71717a" />
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter suspect vehicle license plate (e.g. GJ-01-DJ-5574)..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f4f4f5',
                fontSize: 13,
                padding: '9px 0',
                fontWeight: 700,
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            />
          </div>
          <button
            onClick={handlePredict}
            disabled={loading}
            style={{
              background: '#f4f4f5',
              color: '#09090b',
              border: '1px solid #ffffff',
              borderRadius: 8,
              padding: '0 18px',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: '38px',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? <RefreshCw size={13} className="spin-animation" /> : <Target size={13} />}
            {loading ? 'Scanning...' : 'Scan Grid'}
          </button>
        </div>

        {/* Live Active CCTV Sightings Bar */}
        {recentDetections.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recent Sightings:
            </span>
            {recentDetections.map((d, idx) => (
              <button
                key={idx}
                onClick={() => { setPlateQuery(d.plate); predictPlate(d.plate); }}
                style={{
                  background: plateQuery === d.plate ? '#27272a' : '#18181b',
                  border: plateQuery === d.plate ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  color: plateQuery === d.plate ? '#f4f4f5' : '#a1a1aa',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {d.plate} ({d.city})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Main Results Display */}
      {pred && !prediction.error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Target Telemetry & Nearest Thana Strip */}
          <div style={{
            background: '#121215',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PlateBadge plate={prediction.plate} size="large" />
              <div>
                <div style={{ fontSize: 11, color: '#71717a' }}>
                  {prediction.color} {prediction.vehicleType} • Sighted at <strong style={{ color: '#a1a1aa' }}>{pred.lastKnownPosition?.cameraName} ({pred.lastKnownPosition?.city})</strong>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#f4f4f5', marginTop: 2, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span>
                    <Building2 size={13} color="#a1a1aa" style={{ display: 'inline', marginRight: 4 }} />
                    Nearest Police Station: <strong style={{ color: '#f4f4f5' }}>{pred.primary_police_station?.name} ({pred.primary_police_station?.distance_km} km • ETA {pred.primary_police_station?.eta_mins}m)</strong>
                  </span>
                  <span>
                    <Phone size={13} color="#34d399" style={{ display: 'inline', marginRight: 4 }} />
                    SHO: <strong style={{ color: '#34d399' }}>{pred.primary_police_station?.phone}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div>
              {pred.primary_police_station && (
                <button
                  onClick={() => handleAlertStation(pred.primary_police_station)}
                  disabled={alertedStations.has(pred.primary_police_station.id) || alertingId === pred.primary_police_station.id}
                  style={{
                    background: alertedStations.has(pred.primary_police_station.id) ? 'rgba(16, 185, 129, 0.15)' : '#18181b',
                    color: alertedStations.has(pred.primary_police_station.id) ? '#34d399' : '#f4f4f5',
                    border: alertedStations.has(pred.primary_police_station.id) ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    padding: '7px 14px',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: alertedStations.has(pred.primary_police_station.id) ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {alertingId === pred.primary_police_station.id ? (
                    <RefreshCw size={12} className="spin-animation" />
                  ) : alertedStations.has(pred.primary_police_station.id) ? (
                    <CheckCircle size={12} />
                  ) : (
                    <Send size={12} />
                  )}
                  {alertedStations.has(pred.primary_police_station.id) ? 'DISPATCH CONFIRMED' : 'TRANSMIT APB TO THANA'}
                </button>
              )}
            </div>
          </div>

          {/* 4. Tactical GIS Map + Sector Infrastructure Dispatch Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 480px', gap: 14 }}>
            
            {/* Left: CartoDB Dark Tactical Map */}
            <div style={{
              background: '#0a0e17',
              border: '1px solid rgba(51, 65, 85, 0.8)',
              borderRadius: 14,
              height: '520px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
            }}>
              {/* Tactical Category Filter Overlay */}
              <div style={{
                position: 'absolute',
                top: 10,
                left: 55,
                zIndex: 1000,
                background: 'rgba(15, 23, 42, 0.94)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(51, 65, 85, 0.8)',
                borderRadius: 24,
                padding: '3px',
                display: 'flex',
                gap: 3
              }}>
                {[
                  { key: 'ALL', label: 'All Sector Points', count: (policeStations.length + tollChokepoints.length + traumaCenters.length + pcrVans.length) },
                  { key: 'POLICE', label: 'Police Thanas', count: policeStations.length },
                  { key: 'TOLL', label: 'FASTag Tolls', count: tollChokepoints.length },
                  { key: 'TRAUMA', label: 'Trauma Care', count: traumaCenters.length },
                  { key: 'PCR', label: 'PCR Patrols', count: pcrVans.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    style={{
                      background: activeCategory === tab.key ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'transparent',
                      color: activeCategory === tab.key ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: 20,
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 8, fontSize: 9 }}>{tab.count}</span>
                  </button>
                ))}
              </div>

              <MapContainer 
                center={targetCoords} 
                zoom={12} 
                style={{ width: '100%', height: '100%' }}
              >
                <MapRecenter center={targetCoords} />
                
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Tactical Perimeter Radar Ranges */}
                <Circle 
                  center={targetCoords} 
                  radius={3000} 
                  pathOptions={{ color: '#38bdf8', weight: 1.5, dashArray: '4, 6', fillColor: '#38bdf8', fillOpacity: 0.04 }} 
                />
                <Circle 
                  center={targetCoords} 
                  radius={8000} 
                  pathOptions={{ color: '#f59e0b', weight: 1.5, dashArray: '4, 6', fillColor: '#f59e0b', fillOpacity: 0.02 }} 
                />

                {/* Target Sighting Marker */}
                <Marker position={targetCoords} icon={createVehicleTargetIcon()}>
                  <Popup>
                    <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, fontSize: 12 }}>
                      <strong style={{ color: '#f87171' }}>TARGET SIGHTING: {prediction.plate}</strong><br />
                      Vehicle: {prediction.color} {prediction.vehicleType}<br />
                      Camera: {pred.lastKnownPosition?.cameraName}<br />
                      District: {pred.lastKnownPosition?.city}
                    </div>
                  </Popup>
                </Marker>

                {/* Police Station Markers */}
                {(activeCategory === 'ALL' || activeCategory === 'POLICE') && policeStations.map((ps, idx) => {
                  const isAlerted = alertedStations.has(ps.id);
                  return (
                    <Marker key={ps.id} position={[ps.lat, ps.lng]} icon={createPoliceStationIcon(isAlerted, idx)}>
                      <Popup>
                        <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, fontSize: 12 }}>
                          <strong style={{ color: '#60a5fa' }}>{ps.name}</strong><br />
                          SHO: {ps.sho}<br />
                          Phone: <a href={`tel:${ps.phone}`} style={{ color: '#34d399' }}>{ps.phone}</a><br />
                          Distance: <strong>{ps.distance_km} km (ETA {ps.eta_mins}m)</strong><br />
                          Status: <strong style={{ color: isAlerted ? '#34d399' : '#94a3b8' }}>{isAlerted ? 'APB DISPATCHED' : 'Standing By'}</strong>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Toll Barrier Markers */}
                {(activeCategory === 'ALL' || activeCategory === 'TOLL') && tollChokepoints.map((cp) => {
                  const isLocked = lockedTolls.has(cp.id);
                  return (
                    <Marker key={cp.id} position={[cp.lat, cp.lng]} icon={createTollBarrierIcon(isLocked)}>
                      <Popup>
                        <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, fontSize: 12 }}>
                          <strong style={{ color: '#f59e0b' }}>{cp.name}</strong><br />
                          Distance: <strong>{cp.distance_km} km (ETA {cp.eta_mins}m)</strong><br />
                          FASTag Status: <strong style={{ color: isLocked ? '#ef4444' : '#34d399' }}>{isLocked ? 'BARRIER SEALED' : 'Open'}</strong>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Trauma Center Markers */}
                {(activeCategory === 'ALL' || activeCategory === 'TRAUMA') && traumaCenters.map((em) => (
                  <Marker key={em.id} position={[em.lat, em.lng]} icon={createTraumaCenterIcon()}>
                    <Popup>
                      <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, fontSize: 12 }}>
                        <strong style={{ color: '#10b981' }}>{em.name}</strong><br />
                        Emergency Desk: {em.emergency_contact}<br />
                        Distance: <strong>{em.distance_km} km (Ambulance ETA {em.ambulance_eta_mins}m)</strong>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* PCR Patrol Cruiser Markers */}
                {(activeCategory === 'ALL' || activeCategory === 'PCR') && pcrVans.map((pcr) => {
                  const isDispatched = dispatchedPCRs.has(pcr.unit);
                  return (
                    <Marker key={pcr.unit} position={[pcr.lat, pcr.lng]} icon={createPcrPatrolIcon(isDispatched)}>
                      <Popup>
                        <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, fontSize: 12 }}>
                          <strong style={{ color: '#38bdf8' }}>{pcr.unit} ({pcr.callsign})</strong><br />
                          Officer: {pcr.officer}<br />
                          VHF Frequency: <strong>{pcr.frequency}</strong><br />
                          Distance: <strong>{pcr.distance_km} km</strong><br />
                          Status: <strong style={{ color: isDispatched ? '#34d399' : '#94a3b8' }}>{isDispatched ? 'DISPATCHED' : pcr.status}</strong>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Right: Tactical Points Cards & Action Dispatcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '520px', overflowY: 'auto', paddingRight: 4 }}>
              
              {/* 1. Nearest Police Stations (Thanas) */}
              <div style={{
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Shield size={13} color="#a1a1aa" /> Sector Police Stations ({policeStations.length})
                  </span>
                  <span style={{ fontSize: 9, color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {alertedStations.size} Dispatched
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {policeStations.map((ps, idx) => {
                    const isAlerted = alertedStations.has(ps.id);
                    const isAlerting = alertingId === ps.id;

                    return (
                      <div 
                        key={ps.id}
                        style={{
                          background: isAlerted ? 'rgba(16, 185, 129, 0.08)' : '#18181b',
                          border: isAlerted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ background: '#27272a', color: '#f4f4f5', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3 }}>
                              PS #{idx + 1}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5' }}>{ps.name}</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: 3 }}>
                            {ps.distance_km} km • ETA {ps.eta_mins}m
                          </span>
                        </div>

                        <div style={{ fontSize: 10, color: '#71717a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>SHO: <strong style={{ color: '#d4d4d8' }}>{ps.sho}</strong></span>
                          <span><Phone size={9} style={{ display: 'inline', marginRight: 3, color: '#34d399' }} /> <span style={{ color: '#d4d4d8' }}>{ps.phone}</span></span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                          <span style={{ fontSize: 9, color: '#52525b' }}>{ps.jurisdiction}</span>
                          
                          <button
                            onClick={() => handleAlertStation(ps)}
                            disabled={isAlerted || isAlerting}
                            style={{
                              background: isAlerted ? 'rgba(16, 185, 129, 0.15)' : '#27272a',
                              color: isAlerted ? '#34d399' : '#f4f4f5',
                              border: isAlerted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              padding: '3px 8px',
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: isAlerted ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isAlerting ? <RefreshCw size={9} className="spin-animation" /> : isAlerted ? <Check size={9} /> : <Send size={9} />}
                            {isAlerted ? 'DISPATCHED' : 'Transmit APB'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Toll Barriers */}
              <div style={{
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} color="#a1a1aa" /> Highway FASTag Barriers ({tollChokepoints.length})
                  </span>
                  <span style={{ fontSize: 9, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {lockedTolls.size} Sealed
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tollChokepoints.map((cp) => {
                    const isLocked = lockedTolls.has(cp.id);

                    return (
                      <div 
                        key={cp.id}
                        style={{
                          background: isLocked ? 'rgba(244, 63, 94, 0.1)' : '#18181b',
                          border: isLocked ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5' }}>{cp.name}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#a1a1aa', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: 3 }}>
                            {cp.distance_km} km • ETA {cp.eta_mins}m
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#71717a' }}>
                          <span>Highway: <strong style={{ color: '#d4d4d8' }}>{cp.highway}</strong></span>
                          <button
                            onClick={() => handleToggleToll(cp)}
                            style={{
                              background: isLocked ? 'rgba(244, 63, 94, 0.2)' : '#27272a',
                              color: isLocked ? '#fb7185' : '#f4f4f5',
                              border: isLocked ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isLocked ? 'BARRIER SEALED' : 'Seal FASTag'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Nearest Active PCR Patrols */}
              <div style={{
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Radio size={13} color="#a1a1aa" /> Active PCR Patrol Cruisers ({pcrVans.length})
                  </span>
                  <span style={{ fontSize: 9, color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                    {dispatchedPCRs.size} En Route
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pcrVans.map((pcr) => {
                    const isDispatched = dispatchedPCRs.has(pcr.unit);

                    return (
                      <div 
                        key={pcr.unit}
                        style={{
                          background: isDispatched ? 'rgba(16, 185, 129, 0.08)' : '#18181b',
                          border: isDispatched ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5' }}>
                            {pcr.unit} ({pcr.callsign})
                          </div>
                          <div style={{ fontSize: 10, color: '#71717a' }}>
                            {pcr.officer} • {pcr.frequency} • {pcr.distance_km} km
                          </div>
                        </div>

                        <button
                          onClick={() => handleDispatchPCR(pcr.unit)}
                          disabled={isDispatched}
                          style={{
                            background: isDispatched ? 'rgba(16, 185, 129, 0.15)' : '#27272a',
                            color: isDispatched ? '#34d399' : '#f4f4f5',
                            border: isDispatched ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 4,
                            padding: '3px 8px',
                            fontSize: 9,
                            fontWeight: 700,
                            cursor: isDispatched ? 'default' : 'pointer'
                          }}
                        >
                          {isDispatched ? 'Dispatched' : 'Dispatch Unit'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Emergency Trauma Centers */}
              <div style={{
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={13} color="#a1a1aa" /> Emergency Trauma Care ({traumaCenters.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {traumaCenters.map((em) => (
                    <div 
                      key={em.id}
                      style={{
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#f4f4f5' }}>{em.name}</div>
                        <div style={{ fontSize: 10, color: '#71717a' }}>Desk: {em.emergency_contact} • {em.distance_km} km</div>
                      </div>

                      <span style={{ fontSize: 9, color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        ETA {em.ambulance_eta_mins}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <RefreshCw size={28} className="spin-animation" color="#38bdf8" />
          <h3 style={{ margin: '12px 0 4px', color: '#f8fafc', fontSize: 15 }}>Scanning Gujarat Sector Infrastructure...</h3>
          <p style={{ color: '#94a3b8', fontSize: 12 }}>Correlating nearest Police Thanas, Highway FASTag barriers, Trauma Centers, and PCR Units...</p>
        </div>
      )}

    </div>
  );
}
