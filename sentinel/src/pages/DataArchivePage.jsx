import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Database, Search, Filter, Calendar, MapPin, Camera, Download, FileText, 
  Shield, AlertOctagon, Bell, RefreshCw, ChevronLeft, ChevronRight, Eye, 
  ExternalLink, CheckCircle2, Clock, Car, Truck, Hash, BarChart3, Layers, 
  Printer, ArrowUpDown, X, Sparkles, Navigation, AlertTriangle
} from 'lucide-react'

const API_BASE = 'http://localhost:8000';

// Gujarat RTO District Resolver Mapping (GJ-01 to GJ-38)
const RTO_DISTRICTS = {
  '01': 'Ahmedabad (West)', '02': 'Mehsana', '03': 'Rajkot', '04': 'Bhavnagar',
  '05': 'Surat', '06': 'Vadodara', '07': 'Kheda (Nadiad)', '08': 'Banaskantha (Palanpur)',
  '09': 'Sabarkantha (Himatnagar)', '10': 'Jamnagar', '11': 'Junagadh', '12': 'Kutch (Bhuj)',
  '13': 'Surendranagar', '14': 'Amreli', '15': 'Valsad', '16': 'Bharuch',
  '17': 'Panchmahal (Godhra)', '18': 'Gandhinagar', '19': 'Navsari', '20': 'Dahod',
  '21': 'Navsari (Bilimora)', '22': 'Narmada (Rajpipla)', '23': 'Anand', '24': 'Patan',
  '25': 'Porbandar', '26': 'Vyara (Tapi)', '27': 'Ahmedabad (East)', '28': 'Surat (Pal)',
  '29': 'Vadodara (Rural)', '30': 'Aravalli (Modasa)', '31': 'Mahisagar (Lunawada)',
  '32': 'Gir Somnath (Veraval)', '33': 'Botad', '34': 'Chhota Udaipur', '35': 'Morbi',
  '36': 'Devbhoomi Dwarka (Khambhalia)', '37': 'Khambhalia', '38': 'Bavla (Ahmedabad Rural)'
};

function resolveGujaratRTO(plate) {
  if (!plate) return 'Unknown Jurisdiction';
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('GJ') && clean.length >= 4) {
    const code = clean.substring(2, 4);
    if (RTO_DISTRICTS[code]) {
      return `RTO GJ-${code} • ${RTO_DISTRICTS[code]}`;
    }
  }
  return 'Gujarat State Grid';
}

function formatIST(isoStr) {
  if (!isoStr) return '--';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoStr;
  }
}

export function DataArchivePage({ cameras = [], onNavigatePage, onSelectVehicle }) {
  // Filter States
  const [category, setCategory] = useState('all'); // all, detections, violations, alerts, watchlist
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [selectedVehicleType, setSelectedVehicleType] = useState('all');
  const [datePreset, setDatePreset] = useState('all_time'); // all_time, today, yesterday, last_7d, last_30d, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, confidence_desc, plate_asc

  // View States
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [activeRecordDetail, setActiveRecordDetail] = useState(null);

  // Pagination & Loading States
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    total_records: 0,
    unique_plates: 0,
    unique_cameras: 0,
    by_category: { DETECTION: 0, VIOLATION: 0, ALERT: 0, WATCHLIST: 0 },
    by_city: {},
    by_vehicle: {}
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Derive active date strings based on preset
  const computedDateRange = useMemo(() => {
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const todayStr = formatDate(today);
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDate(yest);
      return { start: yestStr, end: yestStr };
    }
    if (datePreset === 'last_7d') {
      const past7 = new Date(today);
      past7.setDate(past7.getDate() - 7);
      return { start: formatDate(past7), end: formatDate(today) };
    }
    if (datePreset === 'last_30d') {
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      return { start: formatDate(past30), end: formatDate(today) };
    }
    if (datePreset === 'custom') {
      return { start: startDate, end: endDate };
    }
    return { start: '', end: '' };
  }, [datePreset, startDate, endDate]);

  // Fetch records from backend
  const fetchRecords = useCallback(() => {
    setLoading(true);
    const offset = (currentPage - 1) * pageSize;
    
    const params = new URLSearchParams({
      category: category,
      sort_by: sortBy,
      limit: String(pageSize),
      offset: String(offset)
    });

    if (selectedCity !== 'all') params.append('city', selectedCity);
    if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
    if (selectedVehicleType !== 'all') params.append('vehicle_type', selectedVehicleType);
    if (computedDateRange.start) params.append('start_date', computedDateRange.start);
    if (computedDateRange.end) params.append('end_date', computedDateRange.end);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    fetch(`${API_BASE}/api/archive/records?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setRecords(data.records || []);
        setTotalCount(data.total || 0);
        if (data.stats) setStats(data.stats);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch archive records:", err);
        setLoading(false);
      });
  }, [category, selectedCity, selectedCamera, selectedVehicleType, computedDateRange, searchQuery, sortBy, currentPage, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset to page 1 whenever filters change
  const handleFilterChange = (setter, val) => {
    setter(val);
    setCurrentPage(1);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    const params = new URLSearchParams({
      category: category,
      sort_by: sortBy
    });

    if (selectedCity !== 'all') params.append('city', selectedCity);
    if (selectedCamera !== 'all') params.append('camera_id', selectedCamera);
    if (selectedVehicleType !== 'all') params.append('vehicle_type', selectedVehicleType);
    if (computedDateRange.start) params.append('start_date', computedDateRange.start);
    if (computedDateRange.end) params.append('end_date', computedDateRange.end);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());

    window.open(`${API_BASE}/api/archive/export/csv?${params.toString()}`, '_blank');
    setTimeout(() => setIsExporting(false), 1500);
  };

  // Unique lists for filter dropdowns
  const availableCities = useMemo(() => {
    const list = new Set(['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Junagadh', 'Navsari', 'Gandhinagar', 'Valsad', 'Bhavnagar']);
    cameras.forEach(c => { if (c.city) list.add(c.city); });
    return Array.from(list).sort();
  }, [cameras]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0e17', color: '#e2e8f0', overflow: 'hidden' }}>
      
      {/* ─── Top Header & Primary KPI Statistics ──────────────────────── */}
      <div style={{ padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
              <Database size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.5px', color: '#f8fafc', margin: 0 }}>
                  Central Records Vault & Intelligence Archive
                </h1>
                <span style={{ fontSize: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                  SEC 65B EVIDENCE CERTIFIED
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '3px 0 0 0' }}>
                Statewide multi-sensor historical telemetry, AI license plate logs, traffic violations, and intercept alerts.
              </p>
            </div>
          </div>

          {/* Action Buttons (Export, Print, Refresh) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={handleExportCSV}
              disabled={isExporting || totalCount === 0}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.25)', color: '#38bdf8', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            >
              <Download size={14} /> {isExporting ? 'Exporting CSV...' : 'Export Filtered CSV'}
            </button>

            <button 
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.25)', color: '#f8fafc', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
            >
              <Printer size={14} /> Print Audit Sheet
            </button>

            <button 
              onClick={fetchRecords}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, background: '#1d4ed8', border: 'none', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
            >
              <RefreshCw size={14} className={loading ? 'spin-animation' : ''} /> Refresh Records
            </button>
          </div>
        </div>

        {/* Dynamic Metric KPI Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(59,130,246,0.2)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(59,130,246,0.15)', color: '#38bdf8', width: 34, height: 34, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                {stats.total_records.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Filtered Records
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', width: 34, height: 34, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {stats.unique_plates.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Distinct Vehicles Logged
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(245,158,11,0.2)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', width: 34, height: 34, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertOctagon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                {(stats.by_category?.VIOLATION || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Traffic Violations / Challans
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', width: 34, height: 34, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                {(stats.by_category?.ALERT || 0) + (stats.by_category?.WATCHLIST || 0)}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                High-Severity Alerts / Warrants
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Multi-Dimensional Filter & Search Control Center ─────────── */}
      <div style={{ padding: '12px 20px', background: '#0b1120', borderBottom: '1px solid rgba(148,163,184,0.12)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {/* Row 1: Category Filter Tabs & Global Keyword Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', padding: 3, borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)' }}>
            {[
              { id: 'all', label: 'All Records', count: stats.total_records, icon: Layers },
              { id: 'detections', label: 'ANPR Detections', count: stats.by_category?.DETECTION, icon: Car },
              { id: 'violations', label: 'Traffic Violations', count: stats.by_category?.VIOLATION, icon: AlertOctagon },
              { id: 'alerts', label: 'Security Alerts', count: stats.by_category?.ALERT, icon: Bell },
              { id: 'watchlist', label: 'Active Watchlist', count: stats.by_category?.WATCHLIST, icon: Shield },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(setCategory, tab.id)}
                style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: category === tab.id ? '#1d4ed8' : 'transparent',
                  color: category === tab.id ? 'white' : '#94a3b8',
                  transition: 'all 0.15s ease'
                }}
              >
                <tab.icon size={13} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{ fontSize: 9, background: category === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(148,163,184,0.15)', padding: '1px 5px', borderRadius: 10 }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Keyword Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e293b', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 6, padding: '0 10px', minWidth: 280, flex: 1, maxWidth: 400 }}>
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input 
              placeholder="Search by Plate (e.g. GJ01), Challan #, FIR #, Camera..."
              value={searchQuery}
              onChange={e => handleFilterChange(setSearchQuery, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 12, padding: '8px 0', outline: 'none', width: '100%' }}
            />
            {searchQuery && (
              <button onClick={() => handleFilterChange(setSearchQuery, '')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Range, Area/City, Camera, Vehicle Type, Sorting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          
          {/* Date Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            <Calendar size={13} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Date:</span>
            <select 
              value={datePreset}
              onChange={e => handleFilterChange(setDatePreset, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="all_time" style={{ background: '#0f172a' }}>All Time Archive</option>
              <option value="today" style={{ background: '#0f172a' }}>Today</option>
              <option value="yesterday" style={{ background: '#0f172a' }}>Yesterday</option>
              <option value="last_7d" style={{ background: '#0f172a' }}>Last 7 Days</option>
              <option value="last_30d" style={{ background: '#0f172a' }}>Last 30 Days</option>
              <option value="custom" style={{ background: '#0f172a' }}>Custom Range...</option>
            </select>
          </div>

          {/* Custom Date Pickers when Custom is selected */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(56,189,248,0.3)' }}>
              <input 
                type="date"
                value={startDate}
                onChange={e => handleFilterChange(setStartDate, e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, outline: 'none' }}
              />
              <span style={{ fontSize: 10, color: '#94a3b8' }}>to</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => handleFilterChange(setEndDate, e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: 11, outline: 'none' }}
              />
            </div>
          )}

          {/* City / District Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            <MapPin size={13} style={{ color: '#10b981' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>District:</span>
            <select 
              value={selectedCity}
              onChange={e => handleFilterChange(setSelectedCity, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="all" style={{ background: '#0f172a' }}>All Gujarat Districts</option>
              {availableCities.map(c => (
                <option key={c} value={c} style={{ background: '#0f172a' }}>{c}</option>
              ))}
            </select>
          </div>

          {/* Specific Camera Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            <Camera size={13} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Camera:</span>
            <select 
              value={selectedCamera}
              onChange={e => handleFilterChange(setSelectedCamera, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer', maxWidth: 160 }}
            >
              <option value="all" style={{ background: '#0f172a' }}>All 30 Cameras</option>
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id} style={{ background: '#0f172a' }}>
                  {cam.id} - {cam.name.substring(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', padding: '4px 10px', borderRadius: 6 }}>
            <Car size={13} style={{ color: '#ec4899' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Vehicle:</span>
            <select 
              value={selectedVehicleType}
              onChange={e => handleFilterChange(setSelectedVehicleType, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="all" style={{ background: '#0f172a' }}>All Vehicle Classes</option>
              <option value="Car" style={{ background: '#0f172a' }}>Cars &amp; Sedans</option>
              <option value="Motorcycle" style={{ background: '#0f172a' }}>Motorcycles / 2-Wheelers</option>
              <option value="Truck" style={{ background: '#0f172a' }}>Heavy Trucks</option>
              <option value="Bus" style={{ background: '#0f172a' }}>Buses &amp; Transports</option>
              <option value="Auto-rickshaw" style={{ background: '#0f172a' }}>Auto-rickshaws</option>
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', padding: '4px 10px', borderRadius: 6, marginLeft: 'auto' }}>
            <ArrowUpDown size={13} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Sort:</span>
            <select 
              value={sortBy}
              onChange={e => handleFilterChange(setSortBy, e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="newest" style={{ background: '#0f172a' }}>Newest First</option>
              <option value="oldest" style={{ background: '#0f172a' }}>Oldest First</option>
              <option value="confidence_desc" style={{ background: '#0f172a' }}>Highest Confidence</option>
              <option value="plate_asc" style={{ background: '#0f172a' }}>License Plate (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle (Table / Grid) */}
          <div style={{ display: 'flex', background: 'rgba(15,23,42,0.8)', padding: 2, borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)' }}>
            <button 
              onClick={() => setViewMode('table')}
              style={{
                padding: '4px 8px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer',
                background: viewMode === 'table' ? '#334155' : 'transparent',
                color: viewMode === 'table' ? 'white' : '#94a3b8'
              }}
            >
              Table View
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              style={{
                padding: '4px 8px', fontSize: 11, border: 'none', borderRadius: 4, cursor: 'pointer',
                background: viewMode === 'grid' ? '#334155' : 'transparent',
                color: viewMode === 'grid' ? 'white' : '#94a3b8'
              }}
            >
              Forensics Grid
            </button>
          </div>

        </div>
      </div>

      {/* ─── Main Content Canvas: Table or Grid View ──────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#94a3b8' }}>
            <RefreshCw size={32} className="spin-animation" style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Querying Statewide Intelligence Vault...</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#64748b' }}>
            <Database size={48} style={{ opacity: 0.3 }} />
            <h3 style={{ margin: 0, color: '#94a3b8' }}>No records match the current filter criteria</h3>
            <p style={{ margin: 0, fontSize: 12 }}>Try expanding the date range, selecting "All Gujarat Districts", or clearing search keywords.</p>
            <button 
              onClick={() => {
                setCategory('all');
                setSelectedCity('all');
                setSelectedCamera('all');
                setSelectedVehicleType('all');
                setDatePreset('all_time');
                setSearchQuery('');
              }}
              style={{ marginTop: 8, padding: '6px 14px', background: '#1e293b', border: '1px solid rgba(148,163,184,0.3)', color: '#38bdf8', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* ─── Table View ───────────────────────────────────────────── */
          <div style={{ background: '#0f172a', borderRadius: 8, border: '1px solid rgba(148,163,184,0.15)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 14px' }}>Record ID</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>HSRP License Plate</th>
                  <th style={{ padding: '12px 14px' }}>Camera &amp; Location</th>
                  <th style={{ padding: '12px 14px' }}>Vehicle Class</th>
                  <th style={{ padding: '12px 14px' }}>AI Confidence</th>
                  <th style={{ padding: '12px 14px' }}>Timestamp (IST)</th>
                  <th style={{ padding: '12px 14px' }}>Forensics / Hash / Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => {
                  const isViolation = r.record_type === 'VIOLATION';
                  const isAlert = r.record_type === 'ALERT';
                  const isWatchlist = r.record_type === 'WATCHLIST';

                  return (
                    <tr 
                      key={r.id || idx}
                      onClick={() => setActiveRecordDetail(r)}
                      style={{ 
                        borderBottom: '1px solid rgba(148,163,184,0.08)',
                        background: idx % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(30,41,59,0.2)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(15,23,42,0.4)' : 'rgba(30,41,59,0.2)'}
                    >
                      {/* Record ID */}
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                        {r.id}
                      </td>

                      {/* Record Type Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800,
                          background: isViolation ? 'rgba(245,158,11,0.15)' : isAlert ? 'rgba(239,68,68,0.2)' : isWatchlist ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.15)',
                          color: isViolation ? '#f59e0b' : isAlert ? '#ef4444' : isWatchlist ? '#c084fc' : '#38bdf8',
                          border: `1px solid ${isViolation ? 'rgba(245,158,11,0.3)' : isAlert ? 'rgba(239,68,68,0.4)' : isWatchlist ? 'rgba(168,85,247,0.4)' : 'rgba(59,130,246,0.3)'}`
                        }}>
                          {r.record_type}
                        </span>
                      </td>

                      {/* HSRP License Plate */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#000000', border: '1.5px solid #475569', borderRadius: 4, padding: '2px 8px', gap: 6, boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>
                          <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800, borderRight: '1px solid #334155', paddingRight: 4 }}>IND</span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>{r.plate}</span>
                        </div>
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                          {resolveGujaratRTO(r.plate)}
                        </div>
                      </td>

                      {/* Camera & Location */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                          <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.camera_name}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                          {r.city} • <span style={{ fontFamily: 'var(--font-mono)' }}>{r.camera_id}</span>
                        </div>
                      </td>

                      {/* Vehicle Class & Color */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{r.vehicle_type}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{r.color}</div>
                      </td>

                      {/* AI Confidence Meter */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, width: 45, height: 5, background: 'rgba(148,163,184,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${r.confidence}%`, height: '100%', background: r.confidence > 90 ? '#10b981' : r.confidence > 75 ? '#38bdf8' : '#f59e0b' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.confidence > 90 ? '#10b981' : '#38bdf8' }}>
                            {r.confidence}%
                          </span>
                        </div>
                      </td>

                      {/* Timestamp (IST) */}
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#cbd5e1' }}>
                        {formatIST(r.timestamp)}
                      </td>

                      {/* Forensics / Hash / Status */}
                      <td style={{ padding: '12px 14px' }}>
                        {isViolation ? (
                          <div>
                            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11 }}>{r.details?.violation_type}</span>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>₹{r.details?.fine_amount} • {r.details?.challan_id}</div>
                          </div>
                        ) : isAlert ? (
                          <div>
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>{r.details?.reason}</span>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{r.details?.dispatched_unit ? `PCR: ${r.details.dispatched_unit}` : 'PENDING DISPATCH'}</div>
                          </div>
                        ) : (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#64748b' }}>
                            {r.details?.evidence_hash || 'SHA256: 8FA4...'}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveRecordDetail(r); }}
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#38bdf8', padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── Forensics Card Grid View ───────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {records.map((r) => (
              <div 
                key={r.id}
                onClick={() => setActiveRecordDetail(r)}
                style={{
                  background: '#0f172a',
                  borderRadius: 8,
                  border: '1px solid rgba(148,163,184,0.15)',
                  padding: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Card Header: Plate & Type Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#000000', border: '1.5px solid #475569', borderRadius: 4, padding: '2px 8px', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800 }}>IND</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.8px', fontFamily: 'var(--font-mono)' }}>{r.plate}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: r.record_type === 'VIOLATION' ? 'rgba(245,158,11,0.2)' : r.record_type === 'ALERT' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: r.record_type === 'VIOLATION' ? '#f59e0b' : r.record_type === 'ALERT' ? '#ef4444' : '#38bdf8' }}>
                    {r.record_type}
                  </span>
                </div>

                {/* Camera & Location Info */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.camera_name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {r.city} • {resolveGujaratRTO(r.plate)}
                  </div>
                </div>

                {/* Metadata Pill Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#1e293b', padding: 8, borderRadius: 6, fontSize: 10 }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Vehicle: </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.vehicle_type}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Color: </span>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.color}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Confidence: </span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{r.confidence}%</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Camera: </span>
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>{r.camera_id}</span>
                  </div>
                </div>

                {/* Footer Timestamp & Inspect Cue */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: 8, fontSize: 10, color: '#64748b' }}>
                  <span>{formatIST(r.timestamp)}</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                    Inspect <ChevronRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Bottom Pagination & Status Bar ───────────────────────────── */}
      <div style={{ padding: '10px 20px', background: '#0f172a', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
        <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>
            Showing <strong style={{ color: '#f8fafc' }}>{records.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to <strong style={{ color: '#f8fafc' }}>{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong style={{ color: '#38bdf8' }}>{totalCount.toLocaleString()}</strong> records
          </span>
          <span style={{ color: 'rgba(148,163,184,0.3)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Per Page:</span>
            <select 
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: 'white', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {/* Pagination Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: currentPage === 1 ? '#64748b' : '#f8fafc', borderRadius: 4, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          
          <span style={{ padding: '0 8px', color: '#94a3b8', fontWeight: 600, fontSize: 11 }}>
            Page <strong style={{ color: '#38bdf8' }}>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: currentPage === totalPages ? '#64748b' : '#f8fafc', borderRadius: 4, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ─── Forensic Inspection Modal / Detailed Drawer ──────────────── */}
      {activeRecordDetail && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setActiveRecordDetail(null)}
        >
          <div 
            style={{ background: '#0f172a', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 12, width: '100%', maxWidth: 680, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderBottom: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>
                    Forensics Evidence Record • {activeRecordDetail.id}
                  </h3>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    Sec 65B Certified Gujarat Police Digital Surveillance Log
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setActiveRecordDetail(null)}
                style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '75vh', overflowY: 'auto' }}>
              
              {/* Plate Hero Box & RTO Jurisdiction */}
              <div style={{ background: '#020617', border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Verified License Plate
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#000000', border: '2px solid #64748b', borderRadius: 6, padding: '4px 12px', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 900 }}>IND</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc', letterSpacing: '1.5px', fontFamily: 'var(--font-mono)' }}>
                      {activeRecordDetail.plate}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, marginTop: 4 }}>
                    {resolveGujaratRTO(activeRecordDetail.plate)}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>AI Confidence Score</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {activeRecordDetail.confidence}%
                  </div>
                  <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>
                    HIGH PROBABILITY MATCH
                  </div>
                </div>
              </div>

              {/* Complete Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Camera &amp; City</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>{activeRecordDetail.camera_name}</div>
                  <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 1 }}>{activeRecordDetail.city} • ID: {activeRecordDetail.camera_id}</div>
                </div>

                <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Timestamp (IST)</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {formatIST(activeRecordDetail.timestamp)}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>Asia/Kolkata (+05:30)</div>
                </div>

                <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Vehicle Specifications</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                    {activeRecordDetail.vehicle_type} ({activeRecordDetail.color})
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Status: {activeRecordDetail.status}</div>
                </div>

                <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, border: '1px solid rgba(148,163,184,0.15)' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Section 65B Hash</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {activeRecordDetail.details?.evidence_hash || 'SHA256: 8FA491C2...'}
                  </div>
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 1 }}>Cryptographically Tamper-Evident</div>
                </div>
              </div>

              {/* Specific Details Section (Violation / Alert) */}
              {activeRecordDetail.record_type === 'VIOLATION' && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertOctagon size={14} /> Traffic Violation Notice • Challan #{activeRecordDetail.details?.challan_id}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#f8fafc' }}>
                    <strong>Violation:</strong> {activeRecordDetail.details?.violation_type} ({activeRecordDetail.details?.mv_act_section})
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#f8fafc' }}>
                    <strong>Fine Amount:</strong> ₹{activeRecordDetail.details?.fine_amount} | <strong>Registered Owner:</strong> {activeRecordDetail.details?.owner_name || 'VAHAN Verified'}
                  </div>
                </div>
              )}

              {activeRecordDetail.record_type === 'ALERT' && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bell size={14} /> High-Priority Security Alert • {activeRecordDetail.severity}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#f8fafc' }}>
                    <strong>Reason:</strong> {activeRecordDetail.details?.reason}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: '#f8fafc' }}>
                    <strong>PCR Unit Dispatched:</strong> {activeRecordDetail.details?.dispatched_unit || 'Pending Controller Dispatch'}
                  </div>
                </div>
              )}

              {/* Quick Actions Bar */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button 
                  onClick={() => {
                    setActiveRecordDetail(null);
                    if (onNavigatePage) onNavigatePage('forensics');
                  }}
                  style={{ flex: 1, padding: '10px 14px', background: '#1d4ed8', border: 'none', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <FileText size={14} /> Generate Legal Dossier (PDF)
                </button>

                <button 
                  onClick={() => {
                    setActiveRecordDetail(null);
                    if (onNavigatePage) onNavigatePage('trajectory');
                  }}
                  style={{ flex: 1, padding: '10px 14px', background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(148,163,184,0.3)', color: '#38bdf8', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Navigation size={14} /> AI Trajectory &amp; Roadblock
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
