import { useState, useEffect, useMemo } from 'react'
import { Search, MapPin, Clock, Car, ChevronRight, AlertTriangle, Eye, Palette, Filter, Radio, Navigation, Crosshair, Layers, RefreshCw, X, ChevronDown, Zap, Route, Camera, BarChart3, Fingerprint, Sparkles, Activity, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'

const API_BASE = 'http://localhost:8000';

// Color chip for vehicle color display
function ColorChip({ color }) {
  const colorMap = {
    'White': '#f1f5f9',
    'Blue': '#3b82f6',
    'Silver/Grey': '#94a3b8',
    'Green': '#22c55e',
    'Maroon/Dark': '#881337',
    'Red': '#ef4444',
    'Black': '#1e293b',
    'Yellow': '#eab308',
  };
  const bg = colorMap[color] || '#64748b';
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#e2e8f0',
      background: 'rgba(30,41,59,0.7)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(148,163,184,0.15)'
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: bg, border: '1px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
      {color || 'Unknown'}
    </span>
  );
}

// Indian-style plate badge
function PlateBadge({ plate, size = 'normal' }) {
  const fontSize = size === 'large' ? 14 : 11;
  return (
    <div style={{ 
      background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: size === 'large' ? '3px 10px' : '2px 7px', 
      borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize, border: '1.5px solid #334155',
      display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: 0.5
    }}>
      <span style={{ fontSize: size === 'large' ? 9 : 8, color: '#1d4ed8', fontWeight: 900 }}>IND</span>
      <span>{plate}</span>
    </div>
  );
}

export function VehicleSearchPage({ cameras, detections }) {
  // Search state: 'plate' | 'appearance' | 'deep_reid'
  const [searchMode, setSearchMode] = useState('plate');
  const [plateQuery, setPlateQuery] = useState('GJ-18-DJ-7419');
  const [colorFilter, setColorFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  
  // Real live crops & Deep Re-ID state
  const [liveCrops, setLiveCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [reidMatchResult, setReidMatchResult] = useState(null);
  const [reidMatching, setReidMatching] = useState(false);
  const [autoRefreshCrops, setAutoRefreshCrops] = useState(false);

  // Results state for plate & appearance
  const [searchResults, setSearchResults] = useState(null);
  const [trackingResult, setTrackingResult] = useState(null);
  const [similarVehicles, setSimilarVehicles] = useState(null);
  const [reidStats, setReidStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  
  // Load live crops safely
  const fetchLiveCrops = () => {
    fetch(`${API_BASE}/api/reid/live_crops?limit=16`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLiveCrops(data);
          if (!selectedCrop && data.length > 0) {
            setSelectedCrop(data[0]);
          }
        }
      })
      .catch(() => {});
  };

  // Load ReID stats & initial plate search on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/reid/stats`)
      .then(r => r.json())
      .then(setReidStats)
      .catch(() => {});
      
    fetchLiveCrops();
  }, []);

  // Run deep vector Re-ID match on selected vehicle crop
  const handleRunReidMatch = (targetDetection) => {
    if (!targetDetection?.id) return;
    setReidMatching(true);
    setReidMatchResult(null);
    
    fetch(`${API_BASE}/api/reid/match/${targetDetection.id}?threshold=0.45`)
      .then(r => r.json())
      .then(data => {
        setReidMatchResult(data);
        setReidMatching(false);
      })
      .catch(err => {
        console.error("ReID Match error:", err);
        setReidMatching(false);
      });
  };
  
  // Handle plate search + cross-camera tracking
  const handlePlateSearch = () => {
    if (!plateQuery.trim()) return;
    setLoading(true);
    setSearchResults(null);
    setTrackingResult(null);
    setSimilarVehicles(null);
    setSelectedVehicle(null);
    
    const queryTerm = plateQuery.trim();
    
    Promise.all([
      fetch(`${API_BASE}/api/reid/search?plate=${encodeURIComponent(queryTerm)}&limit=200`).then(r => r.json()),
      fetch(`${API_BASE}/api/reid/track/${encodeURIComponent(queryTerm)}`).then(r => r.json()),
    ]).then(([results, tracking]) => {
      setSearchResults(results);
      setTrackingResult(tracking);
      
      if (tracking.color || tracking.vehicleType) {
        fetch(`${API_BASE}/api/reid/similar?color=${encodeURIComponent(tracking.color || '')}&vehicle_type=${encodeURIComponent(tracking.vehicleType || '')}&exclude_plate=${encodeURIComponent(queryTerm)}&limit=20`)
          .then(r => r.json())
          .then(setSimilarVehicles);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  // Handle appearance-based search
  const handleAppearanceSearch = () => {
    setLoading(true);
    setSearchResults(null);
    setTrackingResult(null);
    setSimilarVehicles(null);
    setSelectedVehicle(null);
    
    const params = new URLSearchParams();
    if (colorFilter) params.set('color', colorFilter);
    if (typeFilter) params.set('vehicle_type', typeFilter);
    if (cameraFilter) params.set('camera_id', cameraFilter);
    params.set('limit', '200');
    
    fetch(`${API_BASE}/api/reid/search?${params}`)
      .then(r => r.json())
      .then(results => {
        setSearchResults(results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Track a specific plate from appearance results
  const handleTrackPlate = (plate) => {
    setPlateQuery(plate);
    setSearchMode('plate');
    setLoading(true);
    setTrackingResult(null);
    setSimilarVehicles(null);
    
    const queryTerm = plate.trim();
    
    Promise.all([
      fetch(`${API_BASE}/api/reid/search?plate=${encodeURIComponent(queryTerm)}&limit=200`).then(r => r.json()),
      fetch(`${API_BASE}/api/reid/track/${encodeURIComponent(queryTerm)}`).then(r => r.json()),
    ]).then(([results, tracking]) => {
      setSearchResults(results);
      setTrackingResult(tracking);
      if (tracking.color || tracking.vehicleType) {
        fetch(`${API_BASE}/api/reid/similar?color=${encodeURIComponent(tracking.color || '')}&vehicle_type=${encodeURIComponent(tracking.vehicleType || '')}&exclude_plate=${encodeURIComponent(queryTerm)}&limit=20`)
          .then(r => r.json())
          .then(setSimilarVehicles);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const handleKeyDown = (e) => { 
    if (e.key === 'Enter') { 
      if (searchMode === 'plate') handlePlateSearch();
      else if (searchMode === 'appearance') handleAppearanceSearch();
    } 
  };

  const cameraOptions = useMemo(() => {
    return cameras.filter(c => c.status === 'online').map(c => ({ id: c.id, name: c.name }));
  }, [cameras]);

  return (
    <div className="vehicle-search-page" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 32 }}>
      
      {/* Hero Header */}
      <div className="search-hero" style={{ textAlign: 'center', padding: '16px 0 6px' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          Vehicle Search &amp; Cross-Camera Tracking
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          Search by license plate, vehicle type, or color. Trace routes across multiple camera junctions.
        </p>
      </div>

      {/* ReID Stats Strip */}
      {reidStats && (
        <div className="reid-stats-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="stat-card mini">
            <div className="stat-label">TOTAL INFERENCES</div>
            <div className="stat-number" style={{ color: '#38bdf8' }}>{reidStats.totalInferences?.toLocaleString()}</div>
            <div className="stat-change positive"><Activity size={12} /> Live Apple MPS GPU</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-label">VECTOR EMBEDDINGS</div>
            <div className="stat-number" style={{ color: '#34d399' }}>{reidStats.totalEmbeddings?.toLocaleString()}</div>
            <div className="stat-change positive"><Fingerprint size={12} /> 1024-d Deep Vectors</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-label">ACTIVE CAMERAS</div>
            <div className="stat-number" style={{ color: '#fbbf24' }}>{reidStats.camerasOnline}</div>
            <div className="stat-change positive"><Camera size={12} /> Gujarat Police Grid</div>
          </div>
          <div className="stat-card mini">
            <div className="stat-label">COLOR SIGNATURES</div>
            <div className="stat-number" style={{ color: '#a78bfa' }}>{reidStats.colorBreakdown?.length}</div>
            <div className="stat-change positive"><Palette size={12} /> Lab/HSV Invariant</div>
          </div>
        </div>
      )}

      {/* Main Navigation Mode Tabs */}
      <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', padding: 6, display: 'flex', gap: 6 }}>
        <button 
          onClick={() => setSearchMode('plate')}
          style={{ 
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13,
            background: searchMode === 'plate' ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' : 'transparent',
            color: searchMode === 'plate' ? 'white' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
            boxShadow: searchMode === 'plate' ? '0 4px 12px rgba(29,78,216,0.3)' : 'none'
          }}
        >
          <Search size={16} /> 🔍 Registration Plate Trail Search
        </button>
        <button 
          onClick={() => setSearchMode('appearance')}
          style={{ 
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13,
            background: searchMode === 'appearance' ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)' : 'transparent',
            color: searchMode === 'appearance' ? 'white' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
            boxShadow: searchMode === 'appearance' ? '0 4px 12px rgba(124,58,237,0.3)' : 'none'
          }}
        >
          <Eye size={16} /> 🎨 Visual Attribute Query
        </button>
        <button 
          onClick={() => setSearchMode('deep_reid')}
          style={{ 
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13,
            background: searchMode === 'deep_reid' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
            color: searchMode === 'deep_reid' ? 'white' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
            boxShadow: searchMode === 'deep_reid' ? '0 4px 12px rgba(2,132,199,0.3)' : 'none'
          }}
        >
          <Fingerprint size={16} /> 🧬 Deep Vector Re-ID Matcher
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 1: GENUINE DEEP VECTOR RE-ID MATCHER
          ═══════════════════════════════════════════════════════════════════ */}
      {searchMode === 'deep_reid' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Top Panel: Live Target Selector & Inspection Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(360px, 1.8fr)', gap: 16 }}>
            
            {/* Target Selected Inspection Box */}
            <div style={{ 
              background: 'linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8))', 
              border: '1px solid rgba(56,189,248,0.3)', borderRadius: 12, padding: 18,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase' }}>
                  <Crosshair size={14} /> Query Target Vehicle (Anchor)
                </span>
                <span style={{ fontSize: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                  ID #{selectedCrop?.id || '---'}
                </span>
              </div>

              {selectedCrop ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Vehicle Crop Photo */}
                    <div style={{ 
                      width: 140, height: 110, background: '#020617', borderRadius: 8, overflow: 'hidden', 
                      border: '1.5px solid rgba(56,189,248,0.4)', flexShrink: 0, position: 'relative' 
                    }}>
                      {selectedCrop.snapshotUrl ? (
                        <img 
                          src={selectedCrop.snapshotUrl} 
                          alt="Crop" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <Car size={32} />
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.8)', padding: '1px 5px', borderRadius: 3, fontSize: 9, fontWeight: 800, color: '#10b981' }}>
                        LIVE CROP
                      </div>
                    </div>

                    {/* Metadata */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <PlateBadge plate={selectedCrop.plate} size="large" />
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                        <ColorChip color={selectedCrop.color} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{selectedCrop.vehicleType}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Camera size={12} style={{ color: '#38bdf8' }} /> {selectedCrop.cameraName}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {selectedCrop.timestamp ? new Date(selectedCrop.timestamp).toLocaleTimeString() : 'Recent'}
                      </div>
                    </div>
                  </div>

                  {/* 1024-d Vector Visualizer Barcode */}
                  <div style={{ background: 'rgba(2,6,23,0.8)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>1024-d Deep Feature Vector Signature</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>MobileNetV3 (MPS)</span>
                    </div>
                    {/* Visual Barcode */}
                    <div style={{ display: 'flex', gap: 2, height: 16, alignItems: 'flex-end', background: 'rgba(15,23,42,0.8)', padding: 2, borderRadius: 3 }}>
                      {(selectedCrop.embeddingPreview || [-0.02, 0.05, -0.01, 0.08, -0.04, 0.03, 0.06, -0.02]).map((val, i) => (
                        <div 
                          key={i} 
                          style={{ 
                            flex: 1, 
                            height: `${Math.max(15, Math.min(100, Math.abs(val) * 1200))}%`, 
                            background: val >= 0 ? '#38bdf8' : '#818cf8',
                            borderRadius: 1
                          }} 
                          title={`Feature dim[${i}]: ${val}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action Match Button */}
                  <button 
                    onClick={() => handleRunReidMatch(selectedCrop)}
                    disabled={reidMatching}
                    style={{ 
                      width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: 'white', fontWeight: 800, fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 16px rgba(2,132,199,0.4)', transition: 'all 0.2s'
                    }}
                  >
                    {reidMatching ? (
                      <><RefreshCw size={16} className="spinning" /> Computing Cosine Vector Matrix Across 30 Cameras...</>
                    ) : (
                      <><Fingerprint size={17} /> 🧬 Run Deep Visual Re-ID Match Across 30 Cameras</>
                    )}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  Select a live vehicle crop from the gallery
                </div>
              )}
            </div>

            {/* Live Camera Vehicle Crop Gallery */}
            <div style={{ 
              background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: 16,
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={15} style={{ color: '#10b981' }} /> Live Video Ingestion Crop Stream
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button 
                    onClick={() => setAutoRefreshCrops(!autoRefreshCrops)}
                    style={{ 
                      background: autoRefreshCrops ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)', 
                      border: `1px solid ${autoRefreshCrops ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.2)'}`,
                      borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, 
                      color: autoRefreshCrops ? '#10b981' : '#94a3b8', cursor: 'pointer' 
                    }}
                  >
                    {autoRefreshCrops ? '● AUTO-SYNC ON' : '○ PAUSED'}
                  </button>
                  <button 
                    onClick={fetchLiveCrops}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    title="Refresh now"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {/* Grid of live crops */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 8, 
                maxHeight: 290, overflowY: 'auto', paddingRight: 4 
              }}>
                {liveCrops.map(crop => {
                  const isSelected = selectedCrop?.id === crop.id;
                  return (
                    <div 
                      key={crop.id}
                      onClick={() => {
                        setSelectedCrop(crop);
                        handleRunReidMatch(crop);
                      }}
                      style={{ 
                        background: isSelected ? 'rgba(2,132,199,0.2)' : 'rgba(15,23,42,0.7)',
                        border: `1.5px solid ${isSelected ? '#38bdf8' : 'rgba(148,163,184,0.12)'}`,
                        borderRadius: 8, padding: 6, cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', gap: 4
                      }}
                    >
                      {/* Image */}
                      <div style={{ width: '100%', height: 60, background: '#020617', borderRadius: 4, overflow: 'hidden' }}>
                        {crop.snapshotUrl ? (
                          <img 
                            src={crop.snapshotUrl} 
                            alt="Crop" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <Car size={18} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {crop.plate}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#94a3b8' }}>
                        <span>{crop.color}</span>
                        <span style={{ color: '#38bdf8' }}>{crop.cameraId}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              RE-ID VECTOR MATCH RESULTS PANEL
              ════════════════════════════════════════════════════════════════ */}
          {reidMatchResult && (
            <div style={{ 
              background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 12, padding: 18,
              display: 'flex', flexDirection: 'column', gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Fingerprint size={18} style={{ color: '#38bdf8' }} />
                    Cross-Camera Visual Match Results
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>
                    Evaluated against <strong style={{ color: '#38bdf8' }}>{reidMatchResult.totalEvaluated}</strong> detections in database • Found <strong style={{ color: '#10b981' }}>{reidMatchResult.totalMatches}</strong> visual matches across Gujarat network
                  </p>
                </div>
                <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 10px', borderRadius: 6, fontWeight: 800 }}>
                  ✓ COSINE SIMILARITY VECTOR ENGINE ACTIVE
                </span>
              </div>

              {/* Match Cards List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {reidMatchResult.matches.map((match, idx) => {
                  const isVeryHigh = match.matchScore >= 85;
                  const isCrossCamera = match.cameraId !== reidMatchResult.target?.cameraId;
                  return (
                    <div 
                      key={match.id}
                      style={{ 
                        background: 'rgba(15,23,42,0.7)', 
                        border: `1.5px solid ${isVeryHigh ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.12)'}`,
                        borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
                        boxShadow: isVeryHigh ? '0 4px 16px rgba(2,132,199,0.15)' : 'none'
                      }}
                    >
                      {/* Top Match Bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ 
                            fontSize: 10, fontWeight: 900, 
                            background: idx === 0 ? '#0284c7' : 'rgba(51,65,85,0.8)', 
                            color: 'white', padding: '2px 7px', borderRadius: 4 
                          }}>
                            #{idx + 1} MATCH
                          </span>
                          {isCrossCamera && (
                            <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(168,85,247,0.2)', color: '#c084fc', padding: '2px 6px', borderRadius: 4 }}>
                              CROSS-CAMERA SIGHTING
                            </span>
                          )}
                        </div>
                        {/* Similarity Score */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: isVeryHigh ? '#38bdf8' : '#10b981', fontFamily: 'var(--font-mono)' }}>
                            {match.matchScore}%
                          </span>
                          <span style={{ fontSize: 9, color: '#64748b', display: 'block' }}>
                            cos: {match.rawCosine}
                          </span>
                        </div>
                      </div>

                      {/* Photo & Specs */}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ width: 90, height: 70, background: '#020617', borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(148,163,184,0.2)' }}>
                          {match.snapshotUrl ? (
                            <img src={match.snapshotUrl} alt="Match crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Car size={24} /></div>
                          )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <PlateBadge plate={match.plate} />
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <ColorChip color={match.color} />
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>{match.vehicleType}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} /> {match.timestamp ? new Date(match.timestamp).toLocaleTimeString() : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Spatial & Kinematic Telemetry */}
                      <div style={{ background: 'rgba(2,6,23,0.5)', padding: '6px 10px', borderRadius: 6, fontSize: 10, display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                        <div>
                          <Camera size={11} style={{ display: 'inline', marginRight: 4, color: '#38bdf8' }} />
                          <strong style={{ color: '#f1f5f9' }}>{match.cameraName}</strong> ({match.city})
                        </div>
                        {match.distanceKm > 0 && (
                          <div style={{ color: '#10b981', fontWeight: 700 }}>
                            {match.distanceKm} km away
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 2: PLATE NUMBER REGISTRATION SEARCH
          ═══════════════════════════════════════════════════════════════════ */}
      {searchMode === 'plate' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input 
                  placeholder="Enter registration plate (e.g. GJ 06 GH 3963, GJ 01, etc.)"
                  value={plateQuery}
                  onChange={e => setPlateQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{ 
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(15,23,42,0.8)', color: 'white', fontSize: 14, fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase', letterSpacing: 1
                  }}
                />
              </div>
              <button className="btn btn-primary" onClick={handlePlateSearch} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Crosshair size={15} /> Track & Identify
              </button>
            </div>

            {/* Quick search chips */}
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginRight: 4 }}>Verified Multi-Camera Trails:</span>
              {[
                { label: 'GJ-18-DJ-7419 (3 Sightings across Districts)', plate: 'GJ-18-DJ-7419' },
                { label: 'GJ-27-FM-2272 (Ahmedabad ➔ Navsari)', plate: 'GJ-27-FM-2272' },
                { label: 'GJ-01-BR-1038 (Ahmedabad ➔ Junagadh)', plate: 'GJ-01-BR-1038' },
                { label: 'GJ-03-EK-5683 (Junagadh Grid)', plate: 'GJ-03-EK-5683' }
              ].map(item => (
                <button 
                  key={item.plate} 
                  onClick={() => handleTrackPlate(item.plate)} 
                  style={{ 
                    background: 'rgba(59,130,246,0.15)', 
                    border: '1px solid rgba(59,130,246,0.4)', 
                    borderRadius: 6, 
                    padding: '4px 10px', 
                    fontSize: 11, 
                    color: '#93c5fd', 
                    cursor: 'pointer', 
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline & Trail */}
          {trackingResult && trackingResult.timeline && trackingResult.timeline.length > 0 && (
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', padding: 18 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Route size={16} style={{ color: '#38bdf8' }} /> Cross-Camera Movement Timeline ({trackingResult.timeline.length} sightings)
              </h3>
              
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #10b981)', borderRadius: 1 }} />
                {trackingResult.timeline.map((entry, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: idx < trackingResult.timeline.length - 1 ? 16 : 0, position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%',
                      background: idx === 0 ? '#3b82f6' : idx === trackingResult.timeline.length - 1 ? '#10b981' : '#8b5cf6',
                      border: '2px solid rgba(15,23,42,0.9)', zIndex: 2 
                    }} />
                    
                    <div style={{ flex: 1, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Camera size={13} style={{ color: '#38bdf8' }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{entry.cameraName}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>• {entry.city}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                          <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <PlateBadge plate={entry.plate} />
                        <ColorChip color={entry.color} />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{entry.vehicleType}</span>
                        <span style={{ fontSize: 11, color: '#10b981', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>{entry.confidence?.toFixed(1)}% conf</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODE 3: VISUAL ATTRIBUTE QUERY
          ═══════════════════════════════════════════════════════════════════ */}
      {searchMode === 'appearance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', padding: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Vehicle Color</label>
                <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} className="filter-select" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }}>
                  <option value="">All Colors</option>
                  {(reidStats?.colorBreakdown || []).map(c => (
                    <option key={c.color} value={c.color}>{c.color} ({c.count})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Vehicle Type</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-select" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }}>
                  <option value="">All Types</option>
                  {(reidStats?.typeBreakdown || []).map(t => (
                    <option key={t.type} value={t.type}>{t.type} ({t.count})</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, display: 'block', textTransform: 'uppercase' }}>Camera</label>
                <select value={cameraFilter} onChange={e => setCameraFilter(e.target.value)} className="filter-select" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, color: 'white' }}>
                  <option value="">All 30 Cameras</option>
                  {cameraOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleAppearanceSearch} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', border: 'none' }}>
                  <Eye size={14} /> Search
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {searchResults && (
            <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, border: '1px solid rgba(148,163,184,0.15)', padding: 18 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} style={{ color: '#a78bfa' }} /> Visual Appearance Match Results ({searchResults.length} found)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {searchResults.map(det => (
                  <div key={det.id} style={{ 
                    background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 8, 
                    padding: '12px 14px', cursor: 'pointer'
                  }}
                  onClick={() => handleTrackPlate(det.plate)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <PlateBadge plate={det.plate} />
                      <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'var(--font-mono)' }}>{det.confidence?.toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <ColorChip color={det.color} />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{det.vehicleType}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Camera size={10} /> {det.cameraId}
                      <span style={{ marginLeft: 'auto' }}>{det.timestamp ? new Date(det.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
