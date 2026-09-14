/**
 * CctvRegistryPage.jsx — Statewide CCTV Asset Registry & GIS Mapping Platform
 * ==============================================================================
 * A unified registry portal featuring four interactive tabs:
 * 1. GIS Map Explorer (Leaflet)
 * 2. Onboarding Studio (Manual + Bulk CSV/JSON)
 * 3. Gap-Analysis & Audit Center (Mandatory)
 * 4. Asset Directory & Audit Trail
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MapPin, Plus, Upload, Download, Search, Filter, Layers,
  AlertTriangle, Shield, Activity, Database, FileText, Printer,
  ChevronDown, ChevronUp, X, Check, RefreshCw, Eye, Building2,
  Radio, HardDrive, Clock, Wifi, WifiOff, Camera, Crosshair,
  BarChart3, PieChart, TrendingUp, MapPinOff, Wrench, Zap
} from 'lucide-react';

const API = '';

// ─── Department color coding ─────────────────────────────────────────────────
const DEPT_COLORS = {
  'Ahmedabad Municipal Corp (AMC)': '#3b82f6',
  'Surat Municipal Corp (SMC)': '#8b5cf6',
  'Vadodara Municipal Corp (VMC)': '#06b6d4',
  'Rajkot Municipal Corp (RMC)': '#14b8a6',
  'Gujarat State Police': '#ef4444',
  'GSRTC Transport': '#f59e0b',
  'Gujarat Maritime Board': '#0ea5e9',
  'RTO & State Highways': '#f97316',
  'Education & Institutional': '#10b981',
  'Smart City SPV': '#6366f1',
  'Revenue Department': '#84cc16',
  'Forest Department': '#22c55e',
};

const STATUS_COLORS = {
  'ONLINE': '#10b981',
  'OFFLINE': '#ef4444',
  'MAINTENANCE': '#f59e0b',
  'DEGRADED': '#f97316',
};

const CAMERA_TYPE_ICONS = {
  'PTZ': '🎯', 'Fixed Bullet': '📷', 'Dome': '🔘', 'ANPR RLVD': '🔍',
  '360 Fisheye': '🌐', 'Thermal': '🌡️',
};

const DEPARTMENTS = [
  'Ahmedabad Municipal Corp (AMC)', 'Surat Municipal Corp (SMC)',
  'Vadodara Municipal Corp (VMC)', 'Rajkot Municipal Corp (RMC)',
  'Gujarat State Police', 'GSRTC Transport', 'Gujarat Maritime Board',
  'RTO & State Highways', 'Education & Institutional',
];

const CAMERA_TYPES = ['PTZ', 'Fixed Bullet', 'Dome', 'ANPR RLVD', '360 Fisheye', 'Thermal'];
const STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE', 'DEGRADED'];
const RESOLUTIONS = ['4K UHD', '5MP', '1080p', '720p'];
const CONNECTIVITY = ['Optical Fiber', '4G/5G Cellular', 'P2P RF', 'GSWAN'];
const STORAGE_TYPES = ['Edge NVR', 'Central SAN', 'Local DVR', 'SD Card'];
const MOUNT_TYPES = ['Pole', 'Mast', 'Gantry', 'Building', 'Underpass'];
const OWNERSHIP = ['Government Owned', 'PPP', 'Smart City SPV', 'Leased'];


// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CctvRegistryPage() {
  const [activeTab, setActiveTab] = useState('map');
  const [cameras, setCameras] = useState([]);
  const [stats, setStats] = useState(null);
  const [gapReport, setGapReport] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDept) params.set('department', filterDept);
      if (filterType) params.set('camera_type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (filterCity) params.set('city', filterCity);
      if (searchQuery) params.set('search', searchQuery);

      const [camRes, statsRes] = await Promise.all([
        fetch(`${API}/api/registry/cameras?${params}`),
        fetch(`${API}/api/registry/stats`),
      ]);
      setCameras(await camRes.json());
      setStats(await statsRes.json());
    } catch (e) { console.error('Registry load error:', e); }
    setLoading(false);
  }, [filterDept, filterType, filterStatus, filterCity, searchQuery]);

  const loadGapAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/registry/gap_analysis`);
      setGapReport(await res.json());
    } catch (e) { console.error('Gap analysis error:', e); }
  }, []);

  const loadAuditTrail = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/registry/audit_trail?limit=300`);
      setAuditTrail(await res.json());
    } catch (e) { console.error('Audit trail error:', e); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (activeTab === 'gap') loadGapAnalysis(); }, [activeTab, loadGapAnalysis]);
  useEffect(() => { if (activeTab === 'directory') loadAuditTrail(); }, [activeTab, loadAuditTrail]);

  const tabs = [
    { id: 'map', label: 'GIS Map Explorer', icon: MapPin },
    { id: 'onboard', label: 'Onboarding Studio', icon: Plus },
    { id: 'gap', label: 'Gap-Analysis & Audit', icon: AlertTriangle },
    { id: 'directory', label: 'Asset Directory', icon: Database },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* ─── KPI Banner ────────────────────────────────────────────── */}
      {stats && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10, padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(30,30,50,0.95), rgba(20,20,40,0.98))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <KPICard icon={Camera} label="Total Cameras" value={stats.total_cameras} color="#3b82f6" />
          <KPICard icon={Activity} label="Online" value={stats.status.online} color="#10b981" />
          <KPICard icon={WifiOff} label="Offline" value={stats.status.offline} color="#ef4444" />
          <KPICard icon={Wrench} label="Maintenance" value={stats.status.maintenance} color="#f59e0b" />
          <KPICard icon={Clock} label="Avg Retention" value={`${stats.avg_retention_days}d`} color="#8b5cf6" />
          <KPICard icon={Building2} label="Departments" value={Object.keys(stats.by_department).length} color="#06b6d4" />
        </div>
      )}

      {/* ─── Tab Bar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'rgba(20,20,35,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '10px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: activeTab === t.id
                ? 'linear-gradient(180deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))'
                : 'transparent',
              borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              borderBottom: activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === t.id ? '#93c5fd' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'map' && (
          <GISMapTab
            cameras={cameras} selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            filterDept={filterDept} setFilterDept={setFilterDept}
            filterType={filterType} setFilterType={setFilterType}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterCity={filterCity} setFilterCity={setFilterCity}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'onboard' && (
          <OnboardingTab onRefresh={loadData} />
        )}
        {activeTab === 'gap' && (
          <GapAnalysisTab report={gapReport} stats={stats} onRefresh={loadGapAnalysis} />
        )}
        {activeTab === 'directory' && (
          <DirectoryTab
            cameras={cameras} auditTrail={auditTrail}
            filterDept={filterDept} setFilterDept={setFilterDept}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            onRefresh={() => { loadData(); loadAuditTrail(); }}
          />
        )}
      </div>

      {/* ─── Camera Detail Modal ────────────────────────────────────── */}
      {selectedCamera && (
        <CameraDetailModal camera={selectedCamera} onClose={() => setSelectedCamera(null)} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: GIS MAP EXPLORER
// ═══════════════════════════════════════════════════════════════════════════════

function GISMapTab({ cameras, selectedCamera, setSelectedCamera,
  filterDept, setFilterDept, filterType, setFilterType,
  filterStatus, setFilterStatus, filterCity, setFilterCity,
  searchQuery, setSearchQuery }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const circlesRef = useRef([]);
  const [showCoverage, setShowCoverage] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return;

    // Load Leaflet CSS if not present
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || mapInstanceRef.current) return;
      const L = window.L;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([22.5, 71.5], 7);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri, DeLorme, NAVTEQ',
        maxZoom: 16,
      }).addTo(map);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 16,
      }).addTo(map);

      mapInstanceRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initMap, 100);
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Update markers when cameras change
  useEffect(() => {
    if (!mapReady || !markersRef.current || !window.L) return;
    const L = window.L;
    markersRef.current.clearLayers();

    // Clear coverage circles
    circlesRef.current.forEach(c => c.remove());
    circlesRef.current = [];

    cameras.forEach(cam => {
      const color = DEPT_COLORS[cam.department] || '#6b7280';
      const statusColor = STATUS_COLORS[cam.status] || '#6b7280';

      const icon = L.divIcon({
        className: 'registry-marker',
        html: `<div style="
          width: 14px; height: 14px; border-radius: 50%;
          background: ${color}; border: 2px solid ${statusColor};
          box-shadow: 0 0 8px ${color}66;
          cursor: pointer;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const marker = L.marker([cam.latitude, cam.longitude], { icon })
        .bindTooltip(`<b>${cam.name}</b><br/>${cam.department}<br/>Status: ${cam.status}`, {
          direction: 'top', offset: [0, -10], className: 'registry-tooltip',
        })
        .on('click', () => setSelectedCamera(cam));

      markersRef.current.addLayer(marker);

      // Coverage circle
      if (showCoverage) {
        const circle = L.circle([cam.latitude, cam.longitude], {
          radius: cam.coverage_radius_meters || 80,
          color: color, fillColor: color,
          fillOpacity: 0.08, weight: 1, opacity: 0.3,
        }).addTo(mapInstanceRef.current);
        circlesRef.current.push(circle);
      }
    });
  }, [cameras, mapReady, showCoverage, setSelectedCamera]);

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Filter Sidebar */}
      <div style={{
        width: 260, padding: 14, overflowY: 'auto',
        background: 'rgba(15,15,30,0.98)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={14} /> Layer Controls
        </div>

        <input
          placeholder="🔍 Search cameras..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={inputStyle}
        />

        <FilterSelect label="Department" value={filterDept} onChange={setFilterDept}
          options={DEPARTMENTS} colors={DEPT_COLORS} />
        <FilterSelect label="Camera Type" value={filterType} onChange={setFilterType}
          options={CAMERA_TYPES} />
        <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}
          options={STATUSES} colors={STATUS_COLORS} />
        <FilterInput label="City" value={filterCity} onChange={setFilterCity} placeholder="e.g. Ahmedabad" />

        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
          padding: '8px 10px', borderRadius: 6,
          background: showCoverage ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${showCoverage ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          <input type="checkbox" checked={showCoverage} onChange={e => setShowCoverage(e.target.checked)}
            style={{ accentColor: '#3b82f6' }} />
          <Crosshair size={13} /> Coverage Radii
        </label>

        {/* Legend */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
            Department Legend
          </div>
          {Object.entries(DEPT_COLORS).slice(0, 9).map(([dept, color]) => (
            <div key={dept} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {dept.replace(/\s*\(.*\)/, '')}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Showing {cameras.length} cameras
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: ONBOARDING STUDIO
// ═══════════════════════════════════════════════════════════════════════════════

function OnboardingTab({ onRefresh }) {
  const [mode, setMode] = useState('manual');
  const [formData, setFormData] = useState({
    camera_id: '', name: '', department: DEPARTMENTS[0],
    latitude: '', longitude: '', ownership_model: 'Government Owned',
    district: '', city: '', taluka: '', ward_zone: '', landmark: '',
    coverage_radius_meters: 80, mount_type: 'Pole',
    camera_type: 'Fixed Bullet', make_model: '', resolution: '1080p',
    ip_address: '', mac_address: '', rtsp_url: '',
    connectivity_type: 'Optical Fiber', bandwidth_mbps: 10,
    storage_type: 'Edge NVR', storage_capacity_tb: 2,
    retention_days: 30, power_backup_hrs: 4,
    status: 'ONLINE', installation_date: '', amc_vendor: '',
    warranty_expiry_date: '', last_audit_date: '', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // Bulk import state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch(`${API}/api/registry/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitResult({ success: true, message: `✅ Camera ${formData.camera_id} onboarded successfully!` });
        onRefresh();
      } else {
        setSubmitResult({ success: false, message: `❌ ${data.detail || 'Onboard failed'}` });
      }
    } catch (e) {
      setSubmitResult({ success: false, message: `❌ Network error: ${e.message}` });
    }
    setSubmitting(false);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setUploading(true);
    setBulkResult(null);
    try {
      const form = new FormData();
      form.append('file', bulkFile);
      const res = await fetch(`${API}/api/registry/bulk_import`, { method: 'POST', body: form });
      const data = await res.json();
      setBulkResult(data);
      if (data.imported > 0) onRefresh();
    } catch (e) {
      setBulkResult({ imported: 0, errors: [{ row: 0, message: e.message }], total: 0 });
    }
    setUploading(false);
  };

  const handleDownloadTemplate = () => {
    window.open(`${API}/api/registry/template`, '_blank');
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setMode('manual')} style={mode === 'manual' ? tabBtnActiveStyle : tabBtnStyle}>
          <Plus size={14} /> Manual Onboarding
        </button>
        <button onClick={() => setMode('bulk')} style={mode === 'bulk' ? tabBtnActiveStyle : tabBtnStyle}>
          <Upload size={14} /> Bulk CSV / JSON Import
        </button>
      </div>

      {mode === 'manual' ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ color: '#93c5fd', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
            Manual Asset Onboarding
          </h3>

          {/* Step 1: Identification */}
          <SectionHeader title="1. Identification" />
          <div style={formGridStyle}>
            <FormField label="Camera ID *" value={formData.camera_id} onChange={v => handleFieldChange('camera_id', v)} placeholder="GJ-AMC-WZ-001" />
            <FormField label="Camera Name *" value={formData.name} onChange={v => handleFieldChange('name', v)} placeholder="Riverside Junction Cam-1" />
            <FormSelect label="Department *" value={formData.department} onChange={v => handleFieldChange('department', v)} options={DEPARTMENTS} />
            <FormSelect label="Ownership" value={formData.ownership_model} onChange={v => handleFieldChange('ownership_model', v)} options={OWNERSHIP} />
          </div>

          {/* Step 2: Location / GIS */}
          <SectionHeader title="2. Spatial / GIS Location" />
          <div style={formGridStyle}>
            <FormField label="Latitude *" value={formData.latitude} onChange={v => handleFieldChange('latitude', v)} placeholder="23.0225" type="number" />
            <FormField label="Longitude *" value={formData.longitude} onChange={v => handleFieldChange('longitude', v)} placeholder="72.5714" type="number" />
            <FormField label="District" value={formData.district} onChange={v => handleFieldChange('district', v)} placeholder="Ahmedabad" />
            <FormField label="City" value={formData.city} onChange={v => handleFieldChange('city', v)} placeholder="Ahmedabad" />
            <FormField label="Taluka" value={formData.taluka} onChange={v => handleFieldChange('taluka', v)} placeholder="City" />
            <FormField label="Ward / Zone" value={formData.ward_zone} onChange={v => handleFieldChange('ward_zone', v)} placeholder="West Zone" />
            <FormField label="Landmark" value={formData.landmark} onChange={v => handleFieldChange('landmark', v)} placeholder="Near Main Junction" />
            <FormField label="Coverage Radius (m)" value={formData.coverage_radius_meters} onChange={v => handleFieldChange('coverage_radius_meters', v)} type="number" />
            <FormSelect label="Mount Type" value={formData.mount_type} onChange={v => handleFieldChange('mount_type', v)} options={MOUNT_TYPES} />
          </div>

          {/* Step 3: Technical */}
          <SectionHeader title="3. Technical Hardware" />
          <div style={formGridStyle}>
            <FormSelect label="Camera Type" value={formData.camera_type} onChange={v => handleFieldChange('camera_type', v)} options={CAMERA_TYPES} />
            <FormField label="Make / Model" value={formData.make_model} onChange={v => handleFieldChange('make_model', v)} placeholder="Hikvision DS-2CD2T46G2" />
            <FormSelect label="Resolution" value={formData.resolution} onChange={v => handleFieldChange('resolution', v)} options={RESOLUTIONS} />
            <FormField label="IP Address" value={formData.ip_address} onChange={v => handleFieldChange('ip_address', v)} placeholder="10.0.1.101" />
            <FormField label="MAC Address" value={formData.mac_address} onChange={v => handleFieldChange('mac_address', v)} placeholder="AA:BB:CC:DD:EE:01" />
          </div>

          {/* Step 4: Infrastructure */}
          <SectionHeader title="4. Infrastructure & Storage" />
          <div style={formGridStyle}>
            <FormSelect label="Connectivity" value={formData.connectivity_type} onChange={v => handleFieldChange('connectivity_type', v)} options={CONNECTIVITY} />
            <FormField label="Bandwidth (Mbps)" value={formData.bandwidth_mbps} onChange={v => handleFieldChange('bandwidth_mbps', v)} type="number" />
            <FormSelect label="Storage Type" value={formData.storage_type} onChange={v => handleFieldChange('storage_type', v)} options={STORAGE_TYPES} />
            <FormField label="Storage (TB)" value={formData.storage_capacity_tb} onChange={v => handleFieldChange('storage_capacity_tb', v)} type="number" />
            <FormField label="Retention (days)" value={formData.retention_days} onChange={v => handleFieldChange('retention_days', v)} type="number" />
            <FormField label="Power Backup (hrs)" value={formData.power_backup_hrs} onChange={v => handleFieldChange('power_backup_hrs', v)} type="number" />
          </div>

          {/* Step 5: Lifecycle */}
          <SectionHeader title="5. Health & Lifecycle" />
          <div style={formGridStyle}>
            <FormSelect label="Status" value={formData.status} onChange={v => handleFieldChange('status', v)} options={STATUSES} />
            <FormField label="Installation Date" value={formData.installation_date} onChange={v => handleFieldChange('installation_date', v)} type="date" />
            <FormField label="AMC Vendor" value={formData.amc_vendor} onChange={v => handleFieldChange('amc_vendor', v)} placeholder="ABC Security Solutions" />
            <FormField label="Warranty Expiry" value={formData.warranty_expiry_date} onChange={v => handleFieldChange('warranty_expiry_date', v)} type="date" />
            <FormField label="Last Audit Date" value={formData.last_audit_date} onChange={v => handleFieldChange('last_audit_date', v)} type="date" />
          </div>

          <div style={{ marginTop: 6 }}>
            <FormField label="Notes" value={formData.notes} onChange={v => handleFieldChange('notes', v)} placeholder="Additional notes..." multiline />
          </div>

          {submitResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 6, marginTop: 14,
              background: submitResult.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: submitResult.success ? '#10b981' : '#ef4444', fontSize: 13,
              border: `1px solid ${submitResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              {submitResult.message}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting} style={{
            marginTop: 18, padding: '10px 24px', borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            opacity: submitting ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Plus size={15} />
            {submitting ? 'Onboarding...' : 'Onboard Camera Asset'}
          </button>
        </div>
      ) : (
        /* ─── Bulk Import Mode ─────────────────────────────────────── */
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ color: '#93c5fd', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Bulk CSV / JSON Importer
          </h3>

          <button onClick={handleDownloadTemplate} style={{
            padding: '8px 16px', borderRadius: 6,
            background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
            border: '1px solid rgba(139,92,246,0.3)', cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
          }}>
            <Download size={13} /> Download CSV Template
          </button>

          <div
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            onDrop={e => { e.preventDefault(); setBulkFile(e.dataTransfer.files[0]); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            style={{
              border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10,
              padding: 40, textAlign: 'center', cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onClick={() => document.getElementById('bulk-file-input').click()}
          >
            <Upload size={32} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 8 }} />
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              {bulkFile ? `📄 ${bulkFile.name} (${(bulkFile.size / 1024).toFixed(1)} KB)` : 'Drag & drop CSV or JSON file here, or click to browse'}
            </div>
            <input id="bulk-file-input" type="file" accept=".csv,.json" style={{ display: 'none' }}
              onChange={e => setBulkFile(e.target.files[0])} />
          </div>

          {bulkFile && (
            <button onClick={handleBulkUpload} disabled={uploading} style={{
              marginTop: 16, padding: '10px 24px', borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              opacity: uploading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Upload size={15} />
              {uploading ? 'Importing...' : 'Import File'}
            </button>
          )}

          {bulkResult && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 8,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#93c5fd', marginBottom: 8 }}>
                Import Results
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <span style={{ color: '#10b981' }}>✅ Imported: {bulkResult.imported}</span>
                <span style={{ color: '#ef4444' }}>❌ Errors: {bulkResult.errors?.length || 0}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total: {bulkResult.total}</span>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                  {bulkResult.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#fca5a5', padding: '3px 0' }}>
                      Row {err.row}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: GAP ANALYSIS & AUDIT CENTER
// ═══════════════════════════════════════════════════════════════════════════════

function GapAnalysisTab({ report, stats, onRefresh }) {
  if (!report) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
        <div>Loading Gap-Analysis Report...</div>
      </div>
    );
  }

  const { health_score, risk_summary, uncovered_zones, ageing_infrastructure, retention_violations, connectivity_issues, priority_actions, expired_warranty } = report;

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ color: '#93c5fd', fontSize: 16, fontWeight: 700, margin: 0 }}>
            Infrastructure Gap-Analysis Report
          </h3>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            Generated: {new Date(report.generated_at).toLocaleString()} • {report.total_cameras} cameras analysed
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onRefresh} style={smallBtnStyle}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => window.print()} style={smallBtnStyle}>
            <Printer size={12} /> Print Report
          </button>
        </div>
      </div>

      {/* Health Score + Risk Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 20,
      }}>
        {/* Health Score Circle */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20,
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `conic-gradient(
              ${health_score >= 70 ? '#10b981' : health_score >= 40 ? '#f59e0b' : '#ef4444'} ${health_score * 3.6}deg,
              rgba(255,255,255,0.06) 0deg
            )`,
            position: 'relative',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(15,15,30,0.98)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700,
              color: health_score >= 70 ? '#10b981' : health_score >= 40 ? '#f59e0b' : '#ef4444',
            }}>
              {health_score}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            Infrastructure Health
          </div>
        </div>

        {/* Risk Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <RiskCard label="Critical" count={risk_summary.critical} color="#ef4444" icon={AlertTriangle} />
          <RiskCard label="High" count={risk_summary.high} color="#f59e0b" icon={Shield} />
          <RiskCard label="Medium" count={risk_summary.medium} color="#f97316" icon={Activity} />
          <RiskCard label="Low" count={risk_summary.low} color="#10b981" icon={Check} />
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <MetricCard
          icon={MapPinOff} label="Uncovered High-Risk Zones"
          value={uncovered_zones.length} color="#ef4444"
          sub="Zones without camera coverage"
        />
        <MetricCard
          icon={Clock} label="Ageing Equipment (>4 Years)"
          value={ageing_infrastructure.length} color="#f59e0b"
          sub="Cameras needing upgrade/replacement"
        />
        <MetricCard
          icon={HardDrive} label="Storage Violations (<30 Days)"
          value={retention_violations.length} color="#8b5cf6"
          sub="Non-compliant with BSA 2023 §65B"
        />
        <MetricCard
          icon={WifiOff} label="Network Vulnerabilities"
          value={connectivity_issues.length} color="#f97316"
          sub="Offline / degraded / bottleneck cameras"
        />
      </div>

      {/* Priority Actions */}
      {priority_actions.length > 0 && (
        <CollapsibleSection title="Priority Procurement & Remediation Actions" defaultOpen={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priority_actions.map((action, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${action.risk_level === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <div style={{
                  padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: action.risk_level === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: action.risk_level === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  whiteSpace: 'nowrap',
                }}>
                  P{action.priority}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{action.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{action.details}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                    Category: {action.category} • Est. cameras: {action.estimated_cameras}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Uncovered Zones */}
      {uncovered_zones.length > 0 && (
        <CollapsibleSection title={`Uncovered High-Risk Zones (${uncovered_zones.length})`} defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {uncovered_zones.map((zone, i) => (
              <div key={i} style={{
                padding: 10, borderRadius: 8,
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>{zone.zone_name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  Type: {zone.zone_type} • ({zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)})
                </div>
                <div style={{ fontSize: 10, color: '#f87171', marginTop: 3 }}>{zone.recommendation}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Ageing Infrastructure */}
      {ageing_infrastructure.length > 0 && (
        <CollapsibleSection title={`Ageing Infrastructure (${ageing_infrastructure.length})`} defaultOpen={false}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Camera ID', 'Name', 'Department', 'City', 'Age (Yrs)', 'Resolution', 'Risk', 'Action'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ageing_infrastructure.map((cam, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{cam.camera_id}</td>
                  <td style={tdStyle}>{cam.name}</td>
                  <td style={tdStyle}>{cam.department}</td>
                  <td style={tdStyle}>{cam.city}</td>
                  <td style={tdStyle}>{cam.age_years ?? '—'}</td>
                  <td style={tdStyle}>{cam.resolution}</td>
                  <td style={tdStyle}><RiskBadge level={cam.risk} /></td>
                  <td style={{ ...tdStyle, fontSize: 10 }}>{cam.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>
      )}

      {/* Retention Violations */}
      {retention_violations.length > 0 && (
        <CollapsibleSection title={`Retention Compliance Violations (${retention_violations.length})`} defaultOpen={false}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Camera ID', 'Name', 'City', 'Retention', 'Storage', 'Capacity', 'Risk'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retention_violations.map((cam, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{cam.camera_id}</td>
                  <td style={tdStyle}>{cam.name}</td>
                  <td style={tdStyle}>{cam.city}</td>
                  <td style={tdStyle}>{cam.retention_days} days</td>
                  <td style={tdStyle}>{cam.storage_type}</td>
                  <td style={tdStyle}>{cam.storage_capacity_tb} TB</td>
                  <td style={tdStyle}><RiskBadge level={cam.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>
      )}

      {/* Connectivity Issues */}
      {connectivity_issues.length > 0 && (
        <CollapsibleSection title={`Connectivity & Network Issues (${connectivity_issues.length})`} defaultOpen={false}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Camera ID', 'Name', 'City', 'Status', 'Connectivity', 'Bandwidth', 'Risk'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {connectivity_issues.map((cam, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{cam.camera_id}</td>
                  <td style={tdStyle}>{cam.name}</td>
                  <td style={tdStyle}>{cam.city}</td>
                  <td style={tdStyle}><StatusBadge status={cam.status} /></td>
                  <td style={tdStyle}>{cam.connectivity_type}</td>
                  <td style={tdStyle}>{cam.bandwidth_mbps} Mbps</td>
                  <td style={tdStyle}><RiskBadge level={cam.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CollapsibleSection>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4: ASSET DIRECTORY & AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════════════════════

function DirectoryTab({ cameras, auditTrail, filterDept, setFilterDept,
  filterStatus, setFilterStatus, searchQuery, setSearchQuery, onRefresh }) {
  const [view, setView] = useState('table');

  const handleExport = (format) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (filterDept) params.set('department', filterDept);
    if (filterStatus) params.set('status', filterStatus);
    window.open(`${API}/api/registry/export?${params}`, '_blank');
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Controls */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="🔍 Search by ID, name, landmark..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: 260 }}
          />
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={selectStyle}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => handleExport('csv')} style={smallBtnStyle}>
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => handleExport('geojson')} style={smallBtnStyle}>
            <Download size={12} /> Export GeoJSON
          </button>
          <button onClick={onRefresh} style={smallBtnStyle}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setView('table')} style={view === 'table' ? tabBtnActiveStyle : tabBtnStyle}>
          <Database size={13} /> Asset Table ({cameras.length})
        </button>
        <button onClick={() => setView('audit')} style={view === 'audit' ? tabBtnActiveStyle : tabBtnStyle}>
          <FileText size={13} /> Audit Trail ({auditTrail.length})
        </button>
      </div>

      {view === 'table' ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {['Camera ID', 'Name', 'Department', 'City', 'Type', 'Resolution', 'Status', 'Connectivity', 'Retention', 'Installed'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cameras.map((cam, i) => (
                <tr key={i} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: '#93c5fd' }}>{cam.camera_id}</td>
                  <td style={tdStyle}>{cam.name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: DEPT_COLORS[cam.department] || '#6b7280' }} />
                      {cam.department.replace(/\s*\(.*\)/, '')}
                    </span>
                  </td>
                  <td style={tdStyle}>{cam.city}</td>
                  <td style={tdStyle}>{CAMERA_TYPE_ICONS[cam.camera_type] || '📷'} {cam.camera_type}</td>
                  <td style={tdStyle}>{cam.resolution}</td>
                  <td style={tdStyle}><StatusBadge status={cam.status} /></td>
                  <td style={tdStyle}>{cam.connectivity_type}</td>
                  <td style={tdStyle}>{cam.retention_days}d</td>
                  <td style={{ ...tdStyle, fontSize: 10 }}>{cam.installation_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── Audit Trail View ─────────────────────────────────────── */
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {auditTrail.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '8px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}>
              <div style={{
                padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                background: entry.action === 'ONBOARDED' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                color: entry.action === 'ONBOARDED' ? '#10b981' : '#93c5fd',
                whiteSpace: 'nowrap',
              }}>
                {entry.action}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#93c5fd' }}>{entry.camera_id}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginLeft: 8 }}>{entry.details}</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                {entry.performed_by}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
                {new Date(entry.timestamp).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function CameraDetailModal({ camera, onClose }) {
  const c = camera;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 620, maxHeight: '80vh', overflowY: 'auto',
        background: 'linear-gradient(135deg, rgba(20,20,40,0.99), rgba(15,15,35,0.99))',
        borderRadius: 14, padding: 24,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{c.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <code style={{ fontSize: 11, color: '#93c5fd', background: 'rgba(59,130,246,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                {c.camera_id}
              </code>
              <StatusBadge status={c.status} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DetailField label="Department" value={c.department} />
          <DetailField label="Ownership" value={c.ownership_model} />
          <DetailField label="Location" value={`${c.latitude?.toFixed(5)}, ${c.longitude?.toFixed(5)}`} />
          <DetailField label="City / District" value={`${c.city}, ${c.district}`} />
          <DetailField label="Ward / Zone" value={c.ward_zone} />
          <DetailField label="Landmark" value={c.landmark} />
          <DetailField label="Camera Type" value={`${CAMERA_TYPE_ICONS[c.camera_type] || ''} ${c.camera_type}`} />
          <DetailField label="Make / Model" value={c.make_model} />
          <DetailField label="Resolution" value={c.resolution} />
          <DetailField label="Mount Type" value={c.mount_type} />
          <DetailField label="IP Address" value={c.ip_address} />
          <DetailField label="MAC Address" value={c.mac_address} />
          <DetailField label="Connectivity" value={c.connectivity_type} />
          <DetailField label="Bandwidth" value={`${c.bandwidth_mbps} Mbps`} />
          <DetailField label="Storage Type" value={c.storage_type} />
          <DetailField label="Storage Capacity" value={`${c.storage_capacity_tb} TB`} />
          <DetailField label="Retention" value={`${c.retention_days} days`} />
          <DetailField label="Power Backup" value={`${c.power_backup_hrs} hrs`} />
          <DetailField label="Coverage Radius" value={`${c.coverage_radius_meters} m`} />
          <DetailField label="Installed" value={c.installation_date || '—'} />
          <DetailField label="AMC Vendor" value={c.amc_vendor} />
          <DetailField label="Warranty Expires" value={c.warranty_expiry_date || '—'} />
          <DetailField label="Last Audit" value={c.last_audit_date || '—'} />
        </div>

        {c.notes && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            <strong>Notes:</strong> {c.notes}
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.2 }}>{label}</div>
      </div>
    </div>
  );
}

function RiskCard({ label, count, color, icon: Icon }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: `${color}08`, border: `1px solid ${color}20`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <Icon size={20} style={{ color, marginBottom: 6 }} />
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#6b7280';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {status}
    </span>
  );
}

function RiskBadge({ level }) {
  const colors = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#f97316', LOW: '#10b981' };
  const color = colors[level] || '#6b7280';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: `${color}18`, color,
    }}>
      {level}
    </span>
  );
}

function DetailField({ label, value }) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>{value || '—'}</div>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      marginBottom: 14, borderRadius: 10,
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#93c5fd', fontSize: 13, fontWeight: 600,
      }}>
        {title}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
      textTransform: 'uppercase', letterSpacing: 1,
      padding: '14px 0 6px', borderBottom: '1px solid rgba(255,255,255,0.05)',
      marginBottom: 10,
    }}>
      {title}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', multiline }) {
  const style = {
    ...inputStyle,
    width: '100%',
    ...(multiline ? { minHeight: 60 } : {}),
  };
  return (
    <div>
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, colors }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
        <option value="">All {label}s</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const inputStyle = {
  padding: '7px 10px', borderRadius: 6, fontSize: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e2e8f0', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const selectStyle = {
  padding: '7px 10px', borderRadius: 6, fontSize: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#e2e8f0', outline: 'none',
  boxSizing: 'border-box',
};

const formGridStyle = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 10, marginBottom: 6,
};

const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: 11,
};

const thStyle = {
  textAlign: 'left', padding: '8px 10px',
  color: 'rgba(255,255,255,0.5)', fontWeight: 600,
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '6px 10px', color: 'rgba(255,255,255,0.7)',
  borderBottom: '1px solid rgba(255,255,255,0.03)',
  whiteSpace: 'nowrap',
};

const smallBtnStyle = {
  padding: '6px 12px', borderRadius: 6, fontSize: 11,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 5,
};

const tabBtnStyle = {
  padding: '7px 14px', borderRadius: 6, fontSize: 12,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};

const tabBtnActiveStyle = {
  ...tabBtnStyle,
  background: 'rgba(59,130,246,0.12)',
  border: '1px solid rgba(59,130,246,0.3)',
  color: '#93c5fd',
};
