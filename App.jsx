import { useState, useMemo, useEffect, useRef } from 'react'
import { Map, Video, Search, Shield, Bell, BarChart3, Settings, Camera, Cpu, Radio } from 'lucide-react'
import { MapPage } from './components/MapComponents'
import { VehicleSearchPage } from './pages/VehicleSearchPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { AlertsPage } from './pages/AlertsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { generateWatchlist } from './data/sampleData'

const API_BASE = 'http://localhost:8000';

function VideoWallPage({ cameras }) {
  const [gridSize, setGridSize] = useState('3x3');
  const onlineCams = cameras.filter(c => c.status === 'online');
  const gridCams = onlineCams.slice(0, gridSize === '2x2' ? 4 : gridSize === '3x3' ? 9 : 16);

  return (
    <div className="video-wall-page">
      <div className="video-wall-toolbar">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginRight: 8 }}>Video Wall</span>
        <div className="grid-selector">
          {['2x2', '3x3', '4x4'].map(s => (
            <button key={s} className={`grid-btn ${gridSize === s ? 'active' : ''}`} onClick={() => setGridSize(s)}>{s}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          Showing {gridCams.length} of {onlineCams.length} online cameras
        </span>
      </div>
      <div className={`video-grid grid-${gridSize}`}>
        {gridCams.map((cam, idx) => {
          // Shard across localhost aliases to bypass browser 6-connection HTTP/1.1 limit
          const hosts = ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://0.0.0.0:8000'];
          const host = hosts[idx % hosts.length];
          return (
            <div key={cam.id} className="video-cell">
              <div className="video-cell-feed">
                <img 
                  src={`${host}/video_feed/${cam.id}`} 
                  alt={`${cam.id} Feed`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              <div className="simulated-feed" style={{ display: 'none' }}>
                <Video size={24} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cam.id} — Connecting...</span>
              </div>
              <div style={{ position: 'absolute', top: 6, left: 6, background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'white', animation: 'pulse-dot 1s ease infinite' }}></span> LIVE
              </div>
              <div style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>
                {cam.name} • {cam.city}
              </div>
              <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                {cam.resolution} • {cam.vendor}
              </div>
            </div>
            <div className="video-cell-footer">
              <span className="cam-name">{cam.name}</span>
              <div className="cam-status">
                <span className="cam-status-dot" style={{ background: '#10b981' }}></span>
                <span style={{ color: '#10b981', fontSize: 10 }}>LIVE</span>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('map');
  const [selectedCamera, setSelectedCamera] = useState(null);

  // ─── Camera State (from backend) ──────────────────────────────────
  const [cameras, setCameras] = useState([]);
  const [camerasLoaded, setCamerasLoaded] = useState(false);
  
  useEffect(() => {
    fetch(`${API_BASE}/api/cameras`)
      .then(res => res.json())
      .then(data => {
        // The backend now returns the full data shape that MapComponents expects
        setCameras(data);
        setCamerasLoaded(true);
      })
      .catch(err => {
        console.error("Could not fetch cameras from backend:", err);
        // If backend is down, import fallback data
        import('./data/sampleData').then(mod => {
          setCameras(mod.generateCameras());
          setCamerasLoaded(true);
        });
      });
  }, []);

  // ─── Watchlist, Detections, Alerts ────────────────────────────────
  const [watchlist, setWatchlist] = useState(() => generateWatchlist());
  const [detections, setDetections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  // ─── WebSocket Connection ─────────────────────────────────────────
  useEffect(() => {
    let ws;
    let reconnectTimer;
    
    function connect() {
      ws = new WebSocket(`ws://localhost:8000/ws`);
      
      ws.onopen = () => {
        console.log('[Sentinel] WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3s
        reconnectTimer = setTimeout(connect, 3000);
      };
      
      ws.onerror = () => {
        ws.close();
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_detection') {
          const det = msg.data;
          setDetections(prev => [det, ...prev].slice(0, 500));
          
          // Check watchlist match
          const watchPlates = watchlist.map(w => w.plate.replace(/\s/g, '').toUpperCase());
          const normPlate = det.plate.replace(/\s/g, '').toUpperCase();
          
          if (watchPlates.includes(normPlate)) {
            const cam = cameras.find(c => c.id === det.cameraId);
            const wEntry = watchlist.find(w => w.plate.replace(/\s/g, '').toUpperCase() === normPlate);
            
            setAlerts(prev => [{
              id: Date.now(),
              title: `Watchlist Match: ${det.plate}`,
              description: `${wEntry?.reason || 'Watchlisted vehicle'} detected at ${cam?.name || det.cameraId} (${cam?.city || 'Unknown'})`,
              priority: wEntry?.priority || 'medium',
              plate: det.plate,
              cameraId: det.cameraId,
              cameraName: cam?.name || det.cameraId,
              confidence: det.confidence,
              timestamp: det.timestamp,
              acknowledged: false,
            }, ...prev].slice(0, 50));
          }
        }
      };
    }
    
    connect();
    
    // Fetch historical detections
    fetch(`${API_BASE}/detections?limit=100`)
      .then(res => res.json())
      .then(data => {
        setDetections(data.map(d => ({
          id: d.id,
          plate: d.plate,
          cameraId: d.camera_id,
          confidence: d.confidence,
          vehicleType: d.vehicle_type,
          timestamp: d.timestamp
        })));
      })
      .catch(() => {});

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [watchlist, cameras]);

  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;
  const onlineCameras = cameras.filter(c => c.status === 'online').length;

  const navItems = [
    { id: 'map', label: 'Camera Map', icon: Map },
    { id: 'videowall', label: 'Video Wall', icon: Video },
    { id: 'search', label: 'Vehicle Search', icon: Search },
    { id: 'watchlist', label: 'Watchlist', icon: Shield },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlerts || null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const pageLabels = {
    map: 'Camera Map — GIS Registry',
    videowall: 'Video Wall — Live Feeds',
    search: 'Vehicle Tracking — ANPR Search',
    watchlist: 'Watchlist — Cross-Reference Database',
    alerts: 'Real-Time Alerts',
    analytics: 'Analytics Dashboard',
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <div className="sidebar-title">
            <h1>SENTINEL</h1>
            <span>Gujarat CCTV Integration</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Monitoring</div>
          {navItems.slice(0, 2).map(item => (
            <a key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <item.icon size={18} />
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}

          <div className="nav-section-label">Intelligence</div>
          {navItems.slice(2, 5).map(item => (
            <a key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <item.icon size={18} />
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}

          <div className="nav-section-label">Reports</div>
          {navItems.slice(5).map(item => (
            <a key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            System Active — {cameras.length} cameras registered
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <h2 className="header-title">{pageLabels[activePage]}</h2>
          </div>
          <div className="header-right">
            <div className="header-stat">
              <Camera size={13} />
              <span className="stat-dot green"></span>
              <span className="stat-value">{onlineCameras}</span> online
            </div>
            <div className="header-stat">
              <Cpu size={13} />
              ANPR <span className="stat-value" style={{ color: isConnected ? 'var(--accent-secondary)' : 'var(--accent-danger)' }}>
                {isConnected ? 'Active' : 'Offline'}
              </span>
            </div>
            <div className="header-stat" style={{ cursor: 'pointer' }} onClick={() => setActivePage('alerts')}>
              <Bell size={13} />
              {unreadAlerts > 0 ? (
                <span className="stat-value" style={{ color: 'var(--accent-danger)' }}>{unreadAlerts}</span>
              ) : (
                <span className="stat-value">0</span>
              )}
              alerts
            </div>
          </div>
        </header>

        <div className="page-container">
          {activePage === 'map' && <MapPage cameras={cameras} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera} detections={detections} />}
          {activePage === 'videowall' && <VideoWallPage cameras={cameras} />}
          {activePage === 'search' && <VehicleSearchPage cameras={cameras} detections={detections} />}
          {activePage === 'watchlist' && <WatchlistPage watchlist={watchlist} setWatchlist={setWatchlist} />}
          {activePage === 'alerts' && <AlertsPage alerts={alerts} setAlerts={setAlerts} />}
          {activePage === 'analytics' && <AnalyticsPage cameras={cameras} detections={detections} alerts={alerts} watchlist={watchlist} />}
        </div>
      </div>
    </div>
  );
}
