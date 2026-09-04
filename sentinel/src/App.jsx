import { useState, useMemo, useEffect, useRef } from 'react'
import { Map, Video, Search, Shield, Bell, BarChart3, Settings, Camera, Cpu, Radio, Target, FileText, AlertOctagon, ChevronLeft, ChevronRight, Menu, Database, Sparkles, Siren, Fingerprint, Route, Tag } from 'lucide-react'
import { MapPage } from './components/MapComponents'
import { VideoWallPage } from './pages/VideoWallPage'
import { VehicleSearchPage } from './pages/VehicleSearchPage'
import { ViolationsPage } from './pages/ViolationsPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { AlertsPage } from './pages/AlertsPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { TrajectoryPage } from './pages/TrajectoryPage'
import { InvestigatorPage } from './pages/InvestigatorPage'
import { ForensicsDossierPage } from './pages/ForensicsDossierPage'
import { DataArchivePage } from './pages/DataArchivePage'
import { AnnotationStudioPage } from './pages/AnnotationStudioPage'
import { TacticalInterceptModal } from './components/TacticalInterceptModal'
import { generateWatchlist } from './data/sampleData'

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [activePage, setActivePage] = useState('annotation');
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeInterceptModal, setActiveInterceptModal] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // ─── Camera State (from backend) ──────────────────────────────────
  const [cameras, setCameras] = useState([]);
  const [camerasLoaded, setCamerasLoaded] = useState(false);
  
  useEffect(() => {
    fetch(`${API_BASE}/api/cameras`)
      .then(res => res.json())
      .then(data => {
        setCameras(data);
        setCamerasLoaded(true);
      })
      .catch(err => {
        console.error("Could not fetch cameras from backend:", err);
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

  // Fetch initial watchlist & alerts from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/watchlist`)
      .then(res => res.json())
      .then(data => { if (data && data.length > 0) setWatchlist(data); })
      .catch(() => {});

    fetch(`${API_BASE}/api/alerts`)
      .then(res => res.json())
      .then(data => { if (data && data.length > 0) setAlerts(data); })
      .catch(() => {});
  }, []);

  // Handler for dispatching PCR from modal or alerts page
  const handleDispatchPCR = (alertId, pcrUnit) => {
    fetch(`${API_BASE}/api/alerts/${alertId}/dispatch?pcr_unit=${encodeURIComponent(pcrUnit)}`, { method: 'POST' })
      .then(res => res.json())
      .then(updatedAlert => {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'DISPATCHED', dispatched_unit: pcrUnit } : a));
        if (activeInterceptModal && activeInterceptModal.id === alertId) {
          setActiveInterceptModal(prev => ({ ...prev, status: 'DISPATCHED', dispatched_unit: pcrUnit }));
        }
      })
      .catch(err => console.error("Error dispatching PCR:", err));
  };

  // Handler for acknowledging alert
  const handleAcknowledgeAlert = (alertId) => {
    fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, { method: 'POST' })
      .then(res => res.json())
      .then(updatedAlert => {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: 1 } : a));
        if (activeInterceptModal && activeInterceptModal.id === alertId) {
          setActiveInterceptModal(null);
        }
      })
      .catch(err => console.error("Error acknowledging alert:", err));
  };

  // WebSocket Live Connection
  useEffect(() => {
    let ws;
    let reconnectTimer;
    
    function connect() {
      ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        setIsConnected(true);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };
      
      ws.onerror = () => {
        setIsConnected(false);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'new_detection') {
            const d = data.data;
            setDetections(prev => [{
              id: d.id,
              plate: d.plate,
              cameraId: d.cameraId,
              confidence: d.confidence,
              vehicleType: d.vehicleType,
              color: d.color,
              timestamp: d.timestamp
            }, ...prev.slice(0, 499)]);
          }
          
          if (data.type === 'watchlist_intercept') {
            const newAlert = data.data;
            setAlerts(prev => [newAlert, ...prev]);
            setActiveInterceptModal(newAlert);
          }

          if (data.type === 'new_alert') {
            const newAlert = data.data;
            setAlerts(prev => [newAlert, ...prev]);
          }
        } catch (e) {
          console.error("Failed to parse WS message", e);
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
  }, []);

  const unreadAlerts = alerts.filter(a => !a.acknowledged).length;
  const onlineCameras = cameras.filter(c => c.status === 'online').length;

  const navItems = [
    { id: 'map', label: 'Camera Registry & GIS Map', icon: Map },
    { id: 'videowall', label: 'Video Wall', icon: Video },
    { id: 'search', label: 'Vehicle Search & Tracking', icon: Search },
    { id: 'violations', label: 'Traffic Violations', icon: AlertOctagon },
    { id: 'trajectory', label: '3D Trajectory & Intercept', icon: Route },
    { id: 'investigator', label: 'Operation Netram Copilot', icon: Sparkles, badge: 'AI' },
    { id: 'watchlist', label: 'Watchlist & Lookouts', icon: Shield },
    { id: 'alerts', label: 'Intercept Alerts', icon: Bell, badge: unreadAlerts || null },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'forensics', label: 'Section 65B Dossier', icon: FileText },
    { id: 'archive', label: 'Forensic Archive', icon: Database },
    { id: 'annotation', label: 'Annotation Studio', icon: Tag, badge: 'AI' },
  ];

  const pageLabels = {
    map: 'Camera Registry & GIS Map',
    videowall: 'Unified Video Wall',
    search: 'Vehicle Search & Cross-Camera Tracking',
    violations: 'Traffic Violations & e-Challan Enforcement',
    trajectory: 'Tactical 3D Vehicle Trajectory & Intercept Network',
    investigator: 'Operation Netram-Lock — AI Natural Language Copilot',
    watchlist: 'Watchlist & Lookout Database',
    alerts: 'Intercept Alerts & Dispatch',
    analytics: 'Surveillance Analytics & Predictive Traffic Grid',
    annotation: 'Gujarat Police CCTV Dataset Annotation Studio (YOLOv8/v12 Active Learning)',
    forensics: 'Section 65B BSA 2023 Electronic Evidence Dossier',
    archive: 'Statewide Forensic Surveillance Evidence Archive',
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {isSidebarCollapsed ? (
            <button 
              className="sidebar-logo-collapsed-btn"
              onClick={() => setIsSidebarCollapsed(false)}
              title="Click to Expand Sidebar"
            >
              <div className="sidebar-logo">S</div>
            </button>
          ) : (
            <>
              <div className="sidebar-brand">
                <div className="sidebar-logo">S</div>
                <div className="sidebar-title">
                  <h1>SENTINEL C4i</h1>
                  <span>Gujarat Police Command Grid</span>
                </div>
              </div>
              <button 
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Monitoring &amp; Enforcement</div>
          {navItems.slice(0, 4).map(item => (
            <a 
              key={item.id} 
              className={`nav-item ${activePage === item.id ? 'active' : ''}`} 
              onClick={() => setActivePage(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span className="nav-item-text">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </a>
          ))}

          <div className="nav-section-label">Intelligence &amp; Tactical AI</div>
          {navItems.slice(4, 9).map(item => (
            <a 
              key={item.id} 
              className={`nav-item ${activePage === item.id ? 'active' : ''}`} 
              onClick={() => setActivePage(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span className="nav-item-text">{item.label}</span>
              {item.badge && <span className="nav-badge" style={{ background: item.id === 'investigator' ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : undefined }}>{item.badge}</span>}
            </a>
          ))}

          <div className="nav-section-label">Reports &amp; Legal Forensics</div>
          {navItems.slice(9).map(item => (
            <a 
              key={item.id} 
              className={`nav-item ${activePage === item.id ? 'active' : ''}`} 
              onClick={() => setActivePage(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span className="nav-item-text">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"></span>
            <span className="status-text">System Active — {cameras.length} cameras registered</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isSidebarCollapsed && (
              <button 
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expand Sidebar"
              >
                <Menu size={15} />
              </button>
            )}
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
          {activePage === 'violations' && <ViolationsPage cameras={cameras} />}
          {activePage === 'trajectory' && <TrajectoryPage />}
          {activePage === 'investigator' && <InvestigatorPage />}
          {activePage === 'watchlist' && <WatchlistPage watchlist={watchlist} setWatchlist={setWatchlist} onOpenAlertModal={(a) => setActiveInterceptModal(a)} />}
          {activePage === 'alerts' && <AlertsPage alerts={alerts} setAlerts={setAlerts} onOpenAlertModal={(a) => setActiveInterceptModal(a)} />}
          {activePage === 'analytics' && <AnalyticsPage cameras={cameras} detections={detections} alerts={alerts} watchlist={watchlist} />}
          {activePage === 'forensics' && <ForensicsDossierPage />}
          {activePage === 'archive' && <DataArchivePage />}
          {activePage === 'annotation' && <AnnotationStudioPage />}
        </div>
      </div>

      {/* Emergency Tactical Watchlist Intercept HUD Modal */}
      {activeInterceptModal && (
        <TacticalInterceptModal 
          alert={activeInterceptModal} 
          onClose={() => setActiveInterceptModal(null)} 
          onDispatch={handleDispatchPCR} 
          onAcknowledge={handleAcknowledgeAlert} 
        />
      )}
    </div>
  );
}
