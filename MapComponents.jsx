import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, Search, X, Video, MapPin, Shield, Clock, Wifi, WifiOff, Wrench } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

const statusColors = { online: '#10b981', offline: '#ef4444', maintenance: '#f59e0b' };
const statusIcons = { online: Wifi, offline: WifiOff, maintenance: Wrench };

// Safe accessors — department can be { name, color } or a plain string
const getDeptName = (c) => typeof c.department === 'object' ? c.department?.name : (c.department || 'Unknown');
const getDeptColor = (c) => typeof c.department === 'object' ? c.department?.color : '#64748b';

function createCameraIcon(status, deptColor) {
  const color = statusColors[status] || '#64748b';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color}22;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;transition:transform 0.15s"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
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

export function MapPage({ cameras, selectedCamera, setSelectedCamera, detections }) {
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const departments = [...new Set(cameras.map(c => getDeptName(c)))];

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => {
      if (deptFilter !== 'all' && getDeptName(c) !== deptFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase()) && !c.id.toLowerCase().includes(searchTerm.toLowerCase()) && !c.city.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [cameras, deptFilter, statusFilter, searchTerm]);

  const onlineCt = cameras.filter(c => c.status === 'online').length;
  const offlineCt = cameras.filter(c => c.status === 'offline').length;
  const maintCt = cameras.filter(c => c.status === 'maintenance').length;

  return (
    <div className="map-page">
      <div className="map-toolbar">
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
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="map-search">
          <Search />
          <input placeholder="Search cameras by name, ID, or city..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searchTerm && <X style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSearchTerm('')} />}
        </div>
        <div className="toolbar-stats">
          <span className="toolbar-stat"><span className="stat-dot green" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> <strong>{onlineCt}</strong> Online</span>
          <span className="toolbar-stat"><span className="stat-dot yellow" style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span> <strong>{maintCt}</strong> Maint</span>
          <span className="toolbar-stat"><span className="stat-dot red" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span> <strong>{offlineCt}</strong> Offline</span>
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer center={[22.3, 72.0]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredCameras.map(cam => (
            <Marker key={cam.id} position={[cam.lat, cam.lng]} icon={createCameraIcon(cam.status, getDeptColor(cam))}
              eventHandlers={{ click: () => setSelectedCamera(cam) }}>
              <Popup className="camera-popup">
                <div className="popup-content">
                  <div className="popup-header">
                    <h3>{cam.name}</h3>
                    <span className={`popup-status ${cam.status}`}>{cam.status}</span>
                  </div>
                  <div className="popup-meta">
                    <div className="popup-meta-row"><span className="label">ID</span><span className="value">{cam.id}</span></div>
                    <div className="popup-meta-row"><span className="label">Dept</span><span className="value">{getDeptName(cam)}</span></div>
                    <div className="popup-meta-row"><span className="label">Type</span><span className="value">{cam.type} • {cam.vendor || 'N/A'}</span></div>
                    <div className="popup-meta-row"><span className="label">City</span><span className="value">{cam.city}</span></div>
                  </div>
                  <div className="popup-actions">
                    <button className="popup-btn primary" onClick={() => setSelectedCamera(cam)}>View Details</button>
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
              <div className="detail-video-placeholder" style={{ position: 'relative', overflow: 'hidden' }}>
                <img 
                  src={`http://localhost:8000/video_feed/${selectedCamera.id}`} 
                  alt="Live Feed"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling && e.target.nextElementSibling.classList.contains('live-badge')) {
                      // skip live-badge, show the fallback div
                    }
                  }}
                />
                <div className="live-badge" style={{ zIndex: 10 }}><span className="live-badge-dot"></span> LIVE</div>
              </div>

              <div className="detail-section">
                <h4>Camera Information</h4>
                <div className="detail-grid">
                  <div className="detail-item"><div className="label">Camera ID</div><div className="value">{selectedCamera.id}</div></div>
                  <div className="detail-item"><div className="label">Status</div><div className="value" style={{ color: statusColors[selectedCamera.status] }}>{selectedCamera.status.toUpperCase()}</div></div>
                  <div className="detail-item"><div className="label">Department</div><div className="value">{getDeptName(selectedCamera)}</div></div>
                  <div className="detail-item"><div className="label">City</div><div className="value">{selectedCamera.city}</div></div>
                  <div className="detail-item"><div className="label">Type</div><div className="value">{selectedCamera.type}</div></div>
                  <div className="detail-item"><div className="label">Vendor</div><div className="value">{selectedCamera.vendor || 'N/A'}</div></div>
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
