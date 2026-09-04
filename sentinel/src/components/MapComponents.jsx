import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, Search, X, Video, MapPin, Shield, Clock, Wifi, WifiOff, Wrench } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const statusColors = { online: '#10b981', offline: '#ef4444', maintenance: '#f59e0b' };
const statusIcons = { online: Wifi, offline: WifiOff, maintenance: Wrench };

// Safe accessors — department can be { name, color } or a plain string
const getDeptName = (c) => typeof c.department === 'object' ? c.department?.name : (c.department || 'Unknown');
const getDeptColor = (c) => typeof c.department === 'object' ? c.department?.color : '#64748b';

function CameraDetailFeed({ camera }) {
  const camNum = camera.stream_num || parseInt(String(camera.id).replace(/\D/g, '')) || 1;
  const camId = `cam${String(camNum).padStart(2, '0')}`;
  const [useSnapshot, setUseSnapshot] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="detail-video-placeholder" style={{ position: 'relative', overflow: 'hidden', height: 210, background: '#09090b', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      {/* Real Local CCTV Stream with Live AI or Snapshot Fallback - ZERO Cloud Login */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}>
        {useSnapshot || streamError ? (
          <img 
            key={`snap-${camId}-${reloadKey}`}
            src={`http://localhost:8000/api/camera_snapshot/${camId}?t=${reloadKey}`}
            alt={`${camera.name} CCTV Snapshot`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <img 
            key={`stream-${camNum}-${reloadKey}`}
            src={`http://localhost:8000/api/real_speed_stream?camera_id=${camNum}&t=${reloadKey}`}
            alt={`${camera.name} Live CCTV Feed`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setStreamError(true)}
          />
        )}
      </div>

      {/* Top Left Live Indicator */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: 8,
        background: 'rgba(18, 18, 21, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 4,
        padding: '2px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        zIndex: 10
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: streamError || useSnapshot ? '#f59e0b' : '#ef4444', animation: 'pulse-dot 1s infinite' }} />
        <span style={{ color: '#f4f4f5', fontSize: 9, fontWeight: 800, letterSpacing: '0.4px' }}>
          {useSnapshot || streamError ? 'CCTV SNAPSHOT' : 'LIVE STREAM'}
        </span>
      </div>

      {/* Top Right Quick Controls */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 4,
        zIndex: 10
      }}>
        <button
          onClick={() => { setUseSnapshot(!useSnapshot); setStreamError(false); }}
          title={useSnapshot ? "Switch to Live AI Stream" : "Switch to Latest Snapshot"}
          style={{
            background: 'rgba(18, 18, 21, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#38bdf8',
            fontSize: 8.5,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          {useSnapshot ? '⚡ Live Feed' : '📸 Snapshot'}
        </button>
      </div>

      {/* Bottom Camera Label Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(9, 9, 11, 0.92) 0%, rgba(9, 9, 11, 0.3) 70%, transparent 100%)',
        padding: '6px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#f4f4f5', fontSize: 10, fontWeight: 700 }}>{camera.name}</span>
          <span style={{ color: '#a1a1aa', fontSize: 8.5 }}>{camera.city} • RLVD ANPR Active</span>
        </div>
        <span style={{ color: '#34d399', fontSize: 8.5, fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1px 5px', borderRadius: 3 }}>
          25.0 FPS
        </span>
      </div>
    </div>
  );
}

function createCameraIcon(camera, isSelected) {
  const status = camera.status || 'online';
  const color = statusColors[status] || '#10b981';
  const size = isSelected ? 22 : 16;
  const border = isSelected ? '3px solid #38bdf8' : `2.5px solid ${color}`;
  const glow = isSelected ? '0 0 14px #38bdf8' : `0 0 8px ${color}88`;

  return L.divIcon({
    className: 'cctv-pin',
    html: `
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:#09090b;border:${border};display:flex;align-items:center;justify-content:center;box-shadow:${glow};cursor:pointer;transition:transform 0.15s ease;">
        <span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createSightingIcon(index, total) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const color = isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6';
  const label = isFirst ? 'S' : isLast ? 'E' : (index + 1);
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:12px;box-shadow:0 2px 10px ${color}66;border:2px solid white">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ bounds }) {
  const map = useMap();
  if (bounds && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }
  return null;
}

function MapController({ selectedCamera, cityFilter, cameras }) {
  const map = useMap();
  
  // City focal coordinates
  const cityFocusCoords = {
    'Ahmedabad': { center: [23.0450, 72.5600], zoom: 12 },
    'Gandhinagar': { center: [23.2100, 72.6450], zoom: 13 },
    'Surat': { center: [21.1750, 72.8200], zoom: 13 },
    'Vadodara': { center: [22.3200, 73.1900], zoom: 13 },
    'Rajkot': { center: [22.2950, 70.7850], zoom: 13 },
    'Bhavnagar': { center: [21.7650, 72.1550], zoom: 13 },
    'Jamnagar': { center: [22.4600, 70.0500], zoom: 13 },
    'Devbhumi Dwarka': { center: [22.3000, 69.0200], zoom: 11 },
    'Gir Somnath': { center: [20.8950, 70.3850], zoom: 12 },
    'Junagadh': { center: [21.5270, 70.4780], zoom: 13 },
    'Dahod': { center: [22.8398, 74.2562], zoom: 13 },
    'Valsad': { center: [20.4500, 72.9000], zoom: 11 },
    'Kutch': { center: [23.1500, 70.0000], zoom: 11 },
  };

  useMemo(() => {
    if (!map) return;
    if (selectedCamera && selectedCamera.lat && selectedCamera.lng) {
      map.flyTo([selectedCamera.lat, selectedCamera.lng], 15, { duration: 1.2 });
    } else if (cityFilter !== 'all' && cityFocusCoords[cityFilter]) {
      const { center, zoom } = cityFocusCoords[cityFilter];
      map.flyTo(center, zoom, { duration: 1.0 });
    } else if (cityFilter === 'all' && (!selectedCamera)) {
      map.flyTo([22.35, 71.8], 7.5, { duration: 1.0 });
    }
  }, [selectedCamera, cityFilter, map]);

  return null;
}

export function MapPage({ cameras, selectedCamera, setSelectedCamera, detections }) {
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const departments = [...new Set(cameras.map(c => getDeptName(c)))];
  const cities = [...new Set(cameras.map(c => c.city || 'Other'))].sort();

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => {
      if (deptFilter !== 'all' && getDeptName(c) !== deptFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (cityFilter !== 'all' && (c.city || '') !== cityFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.id.toLowerCase().includes(searchTerm.toLowerCase()) && !c.city.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [cameras, deptFilter, statusFilter, cityFilter, searchTerm]);

  const onlineCt = cameras.filter(c => c.status === 'online').length;
  const offlineCt = cameras.filter(c => c.status === 'offline').length;
  const maintCt = cameras.filter(c => c.status === 'maintenance').length;

  return (
    <div className="map-page">
      <div className="map-toolbar">
        {/* City / District Quick Focus */}
        <div className="filter-group">
          <span className="filter-label" style={{ color: '#38bdf8', fontWeight: 800 }}>📍 District</span>
          <select 
            className="filter-select" 
            value={cityFilter} 
            onChange={e => {
              setCityFilter(e.target.value);
              setSelectedCamera(null);
            }}
            style={{ border: '1px solid rgba(56,189,248,0.4)', background: '#111827', color: '#38bdf8', fontWeight: 700 }}
          >
            <option value="all">🌐 All Gujarat (33 Districts Overview)</option>
            {cities.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Department</span>
          <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Status</span>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div className="map-search">
          <Search />
          <input placeholder="Search junctions, corridors, camera IDs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSearchTerm('')} />}
        </div>

        <div className="toolbar-stats">
          <span className="toolbar-stat"><span className="stat-dot green" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> <strong>{onlineCt}</strong> Online</span>
          <span className="toolbar-stat"><span className="stat-dot red" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span> <strong>{offlineCt}</strong> Offline</span>
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer center={[22.35, 71.8]} zoom={7.5} style={{ height: '100%', width: '100%' }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController selectedCamera={selectedCamera} cityFilter={cityFilter} cameras={cameras} />
          
          {filteredCameras.map(cam => (
            <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={createCameraIcon(cam, selectedCamera?.id === cam.id)}
              eventHandlers={{ click: () => setSelectedCamera(cam) }}>
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, color: '#f8fafc', background: '#09090b', padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
                  <span style={{ color: '#38bdf8', marginRight: 6 }}>{cam.id}</span>
                  <span>{cam.name}</span>
                </div>
              </Tooltip>
              <Popup className="camera-popup">
                <div className="popup-content">
                  <div className="popup-header">
                    <h3>{cam.name}</h3>
                    <span className={`popup-status ${cam.status}`}>{cam.status}</span>
                  </div>
                  <div className="popup-meta">
                    <div className="popup-meta-row"><span className="label">ID</span><span className="value">{cam.id}</span></div>
                    <div className="popup-meta-row"><span className="label">Dept</span><span className="value">{getDeptName(cam)}</span></div>
                    <div className="popup-meta-row"><span className="label">District</span><span className="value" style={{ fontWeight: 700, color: '#38bdf8' }}>{cam.city}</span></div>
                    <div className="popup-meta-row"><span className="label">GPS Coords</span><span className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{cam.lat.toFixed(4)}°N, {cam.lng.toFixed(4)}°E</span></div>
                  </div>
                  <div className="popup-actions">
                    <button className="popup-btn primary" onClick={() => setSelectedCamera(cam)}>View Live Telemetry</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {selectedCamera && (
          <div className="camera-detail-panel">
            <div className="detail-header">
              <h2>{selectedCamera.name}</h2>
              <button className="detail-close" onClick={() => setSelectedCamera(null)}><X size={18} /></button>
            </div>
            <div className="detail-body">
              <CameraDetailFeed camera={selectedCamera} />

              <div className="detail-section">
                <h4>Camera & Geolocation Registry</h4>
                <div className="detail-grid">
                  <div className="detail-item"><div className="label">Camera ID</div><div className="value">{selectedCamera.id}</div></div>
                  <div className="detail-item"><div className="label">Status</div><div className="value" style={{ color: statusColors[selectedCamera.status] }}>{selectedCamera.status.toUpperCase()}</div></div>
                  <div className="detail-item"><div className="label">District / Range</div><div className="value" style={{ fontWeight: 800, color: '#38bdf8' }}>{selectedCamera.city}</div></div>
                  <div className="detail-item"><div className="label">Department</div><div className="value">{getDeptName(selectedCamera)}</div></div>
                  <div className="detail-item"><div className="label">GPS Latitude</div><div className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{selectedCamera.lat?.toFixed(5)}° N</div></div>
                  <div className="detail-item"><div className="label">GPS Longitude</div><div className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{selectedCamera.lng?.toFixed(5)}° E</div></div>
                  <div className="detail-item"><div className="label">Resolution</div><div className="value">{selectedCamera.resolution || '1080p'}</div></div>
                  <div className="detail-item"><div className="label">Protocol</div><div className="value">{selectedCamera.protocol || 'RTSP'}</div></div>
                  <div className="detail-item"><div className="label">Storage</div><div className="value">{selectedCamera.storage || 'Cloud'}</div></div>
                  <div className="detail-item"><div className="label">Retention</div><div className="value">{selectedCamera.retentionDays || 30} days</div></div>
                  <div className="detail-item"><div className="label">IP Address</div><div className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{selectedCamera.ip || '—'}</div></div>
                  <div className="detail-item"><div className="label">Installed</div><div className="value">{selectedCamera.installDate || '—'}</div></div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Recent ANPR Detections</h4>
                {detections.filter(d => d.cameraId === selectedCamera.id).slice(0, 5).map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{d.plate}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{d.confidence}%</span>
                  </div>
                ))}
                {detections.filter(d => d.cameraId === selectedCamera.id).length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No recent detections</p>
                )}
              </div>

              <div className="detail-section">
                <h4>Location</h4>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedCamera.lat.toFixed(6)}, {selectedCamera.lng.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VehicleSearchMap({ sightings }) {
  if (!sightings || sightings.length === 0) return null;
  const bounds = sightings.map(s => [s.lat, s.lng]);
  const routeCoords = sightings.map(s => [s.lat, s.lng]);

  return (
    <MapContainer center={bounds[0]} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bounds={bounds} />
      {routeCoords.length > 1 && (
        <Polyline positions={routeCoords} pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8, 6', opacity: 0.7 }} />
      )}
      {sightings.map((s, i) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={createSightingIcon(i, sightings.length)}>
          <Popup>
            <div style={{ fontFamily: 'Inter, sans-serif', color: '#f1f5f9' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.plate}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.cameraName}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.city}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginTop: 4 }}>
                {new Date(s.timestamp).toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                Confidence: {s.confidence}%
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
