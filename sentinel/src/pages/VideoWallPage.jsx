import { useState, useMemo, useEffect, useRef } from 'react'
import { 
  Video, Maximize2, Minimize2, Camera, Search, ZoomIn, ZoomOut, Check, Sliders, 
  ChevronDown, X, Maximize, RefreshCw, Cpu, Eye, Sparkles, Play, Pause, AlertTriangle
} from 'lucide-react'

// Enhanced Camera Player with AI Stream Toggle, Optical Filters, Digital Zoom & Snapshot
function VideoWallCell({ 
  cam, onSwapCamera, allCameras, isFocused, onToggleFocus, gridSize, 
  globalAiMode, onPromoteToMaster, isMasterSlot, streamSource = 'local', customRtspUrl = '' 
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [cellAiMode, setCellAiMode] = useState(null); // null inherits globalAiMode
  const [filterMode, setFilterMode] = useState('normal'); // 'normal', 'night', 'sharpen', 'thermal'
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Exact 1:1 mapping: Camera ID / stream_num maps directly to its specific camera feed
  const camNum = cam.stream_num || parseInt(String(cam.id).replace(/\D/g, '')) || 1;
  const isCompact = gridSize === '4x4' || (gridSize === '1+5' && !isMasterSlot);

  // Use cell override if set, otherwise use global AI toggle
  const isAiActive = cellAiMode !== null ? cellAiMode : globalAiMode;

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleSnapshot = (e) => {
    e.stopPropagation();
    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 1200);
  };

  const handleReconnect = (e) => {
    e.stopPropagation();
    setReloadKey(k => k + 1);
  };

  const toggleAiMode = (e) => {
    e.stopPropagation();
    setCellAiMode(prev => prev === null ? !globalAiMode : !prev);
  };

  const filterStyle = useMemo(() => {
    switch (filterMode) {
      case 'night':
        return 'brightness(1.35) contrast(1.25) saturate(1.4)';
      case 'sharpen':
        return 'contrast(1.6) saturate(1.2) drop-shadow(0 0 1px #3b82f6)';
      case 'thermal':
        return 'invert(0.9) hue-rotate(180deg) contrast(1.4)';
      default:
        return 'none';
    }
  }, [filterMode]);

  const filteredCams = allCameras.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic traffic density badge
  const trafficDensity = useMemo(() => {
    const hash = (camNum * 17) % 100;
    if (hash > 70) return { label: 'Heavy Flow', color: '#ef4444', count: 68 + (camNum % 20) };
    if (hash > 30) return { label: 'Moderate', color: '#f59e0b', count: 34 + (camNum % 15) };
    return { label: 'Free Flow', color: '#10b981', count: 12 + (camNum % 8) };
  }, [camNum]);

  return (
    <div 
      className="video-cell"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowFilterMenu(false); }}
      style={{
        position: 'relative',
        background: '#09090b',
        borderRadius: 6,
        overflow: 'hidden',
        border: isFocused ? '2px solid #3b82f6' : isMasterSlot ? '2px solid rgba(59,130,246,0.5)' : isHovered ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        boxShadow: isFocused ? '0 0 25px rgba(59,130,246,0.35)' : isMasterSlot ? '0 0 20px rgba(59,130,246,0.15)' : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      {/* Top Telemetry Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isCompact ? '3px 6px' : '6px 10px',
        background: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 20, minHeight: isCompact ? 24 : 32
      }}>
        {/* Left: Camera Name, ID & Slot Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          {isMasterSlot && (
            <span style={{
              fontSize: 8.5, fontWeight: 900, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: 'white', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em'
            }}>
              MASTER
            </span>
          )}
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsSwapping(!isSwapping)}
              style={{
                background: 'transparent', border: 'none', color: '#f4f4f5',
                fontSize: isCompact ? 9.5 : 11, fontWeight: 700, display: 'flex',
                alignItems: 'center', gap: 4, cursor: 'pointer', padding: 0,
                maxWidth: isCompact ? 110 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}
              title="Click to swap camera"
            >
              <span style={{ color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>{cam.id}</span>
              <span>{cam.name}</span>
              <ChevronDown size={11} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>

            {/* Quick Swap Dropdown */}
            {isSwapping && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 220,
                background: '#121215', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6,
                boxShadow: '0 10px 30px rgba(0,0,0,0.95)', zIndex: 100, padding: 6,
                maxHeight: 240, overflowY: 'auto'
              }} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Search cameras..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '4px 8px', background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                    color: '#f4f4f5', fontSize: 10, marginBottom: 4, outline: 'none'
                  }}
                  autoFocus
                />
                {allCameras
                  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.id.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 8)
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => { onSwapCamera(c); setIsSwapping(false); }}
                      style={{
                        padding: '4px 6px', fontSize: 10, cursor: 'pointer', borderRadius: 3,
                        color: c.id === cam.id ? '#60a5fa' : '#a1a1aa',
                        background: c.id === cam.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{c.id} {c.name}</span>
                      <span style={{ fontSize: 8.5, color: '#71717a' }}>{c.city}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Forensic Controls & Optical Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* AI Neural Toggle per cell */}
          <button
            onClick={(e) => { e.stopPropagation(); setCellAiMode(prev => prev === null ? !globalAiMode : !prev); }}
            title={isAiActive ? "AI Speed & ANPR Active (Click for Raw)" : "Raw Video Stream (Click for AI)"}
            style={{
              padding: '2px 5px', fontSize: 9, fontWeight: 800, borderRadius: 3,
              background: isAiActive ? 'rgba(59,130,246,0.2)' : '#18181b',
              border: `1px solid ${isAiActive ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
              color: isAiActive ? '#60a5fa' : '#a1a1aa',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
            }}
          >
            <Cpu size={isCompact ? 9 : 11} />
            {!isCompact && (isAiActive ? 'AI ON' : 'RAW')}
          </button>

          {/* Optical Filters Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
              title="Optical Enhancement Filters"
              style={{ background: filterMode !== 'normal' ? 'rgba(16,185,129,0.2)' : '#18181b', border: `1px solid ${filterMode !== 'normal' ? '#10b981' : 'rgba(255,255,255,0.1)'}`, borderRadius: 3, color: filterMode !== 'normal' ? '#34d399' : '#a1a1aa', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Sparkles size={isCompact ? 9 : 11} />
            </button>

            {showFilterMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 140,
                background: '#121215', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 6,
                boxShadow: '0 10px 30px rgba(0,0,0,0.95)', zIndex: 100, padding: 4
              }} onClick={e => e.stopPropagation()}>
                {[
                  { id: 'normal', label: 'Standard Normal' },
                  { id: 'night', label: '🌙 Night-Vision Boost' },
                  { id: 'sharpen', label: '🔍 High-Contrast' },
                  { id: 'thermal', label: '🔥 Thermal Invert' }
                ].map(f => (
                  <div
                    key={f.id}
                    onClick={() => { setFilterMode(f.id); setShowFilterMenu(false); }}
                    style={{
                      padding: '4px 8px', fontSize: 10, cursor: 'pointer', borderRadius: 3,
                      background: filterMode === f.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                      color: filterMode === f.id ? '#60a5fa' : '#f4f4f5',
                      fontWeight: filterMode === f.id ? 700 : 500
                    }}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setReloadKey(k => k + 1); }}
            title="Reload Video Stream"
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: '#a1a1aa', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <RefreshCw size={isCompact ? 9 : 11} />
          </button>

          <button 
            onClick={handleZoomIn}
            title="Digital Zoom In (up to 3x)"
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: '#a1a1aa', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ZoomIn size={isCompact ? 9 : 11} />
          </button>

          <button 
            onClick={handleSnapshot}
            title="Capture Forensic Snapshot"
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: '#a1a1aa', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Camera size={isCompact ? 9 : 11} />
          </button>

          {/* Promote to Master Button for side feeds */}
          {!isMasterSlot && gridSize === '1+5' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPromoteToMaster(cam); }}
              title="Promote to Master Screen"
              style={{ background: '#18181b', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 3, color: '#60a5fa', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <Eye size={isCompact ? 9 : 11} />
            </button>
          )}

          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFocus(); }}
            title={isFocused ? "Restore Grid" : "Focus Fullscreen"}
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: isFocused ? '#60a5fa' : '#f4f4f5', width: isCompact ? 18 : 22, height: isCompact ? 18 : 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {isFocused ? <Minimize2 size={isCompact ? 9 : 11} /> : <Maximize2 size={isCompact ? 9 : 11} />}
          </button>
        </div>
      </div>

      {/* Video Stream Player Container */}
      <div style={{ 
        flex: 1, position: 'relative', overflow: 'hidden', background: '#000000',
        width: '100%', height: '100%', minHeight: 0
      }}>
        {/* Flash Effect on Snapshot */}
        {snapshotTaken && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
            zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ background: '#18181b', color: '#34d399', padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={12} /> SNAPSHOT CAPTURED
            </div>
          </div>
        )}

        {/* Video Player Display: Renders AI Stream, Cloud Feed, Live Webcam or Raw CCTV */}
        <div style={{
          position: 'absolute',
          top: streamSource === 'cloud' ? '-15%' : '0%',
          left: streamSource === 'cloud' ? '-4%' : '0%',
          width: streamSource === 'cloud' ? '108%' : '100%',
          height: streamSource === 'cloud' ? '132%' : '100%',
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center',
          filter: filterStyle,
          transition: 'transform 0.2s ease-out, filter 0.2s ease'
        }}>
          {streamSource === 'cloud' ? (
            <img 
              key={`cloud-img-${cam.id}-${camNum}-${reloadKey}`}
              src={`http://localhost:8000/api/camera_snapshot/cam${String(camNum).padStart(2, '0')}?t=${reloadKey}`}
              alt={`${cam.name} Live Gujarat CCTV`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.target.src = `http://localhost:8000/api/real_speed_stream?camera_id=${camNum}&t=${reloadKey}`;
              }}
            />
          ) : streamSource === 'webcam' ? (
            <img 
              key={`webcam-${reloadKey}`}
              src={`http://localhost:8000/api/real_speed_stream?camera_id=webcam&t=${reloadKey}`}
              alt="Live Field Camera"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : streamSource === 'rtsp' ? (
            <img 
              key={`rtsp-${reloadKey}`}
              src={`http://localhost:8000/api/real_speed_stream?camera_id=${encodeURIComponent(customRtspUrl)}&t=${reloadKey}`}
              alt="Live IP Camera"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : isAiActive ? (
            <img 
              key={`ai-stream-${cam.id}-${camNum}-${reloadKey}`}
              src={`http://localhost:8000/api/real_speed_stream?camera_id=${camNum}&t=${reloadKey}`}
              alt={`${cam.name} AI Neural Stream`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <video 
              key={`video-${cam.id}-${camNum}-${reloadKey}`}
              src={`http://localhost:8000/api/video_stream/${camNum}`}
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
            />
          )}
        </div>

        {/* Bottom Telemetry Overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'linear-gradient(to top, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.4) 70%, transparent 100%)',
          padding: isCompact ? '2px 6px' : '4px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ background: '#ef4444', color: 'white', fontSize: isCompact ? 8 : 9, fontWeight: 800, padding: isCompact ? '1px 4px' : '1px 5px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'white', animation: 'pulse-dot 1s ease infinite' }}></span> LIVE
            </div>
            
            <span style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px black' }}>
              {isAiActive ? '⚡ YOLOv12 + ANPR' : `${cam.city} • 25 FPS`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Live Traffic Density */}
            <div style={{ 
              fontSize: isCompact ? 7.5 : 9, 
              color: trafficDensity.color, 
              background: 'rgba(0,0,0,0.6)', 
              border: `1px solid ${trafficDensity.color}40`,
              padding: '1px 5px', 
              borderRadius: 3, 
              fontWeight: 700 
            }}>
              ● {trafficDensity.label} ({trafficDensity.count} vpm)
            </div>

            {!isCompact && (
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', textShadow: '0 1px 2px black' }}>
                {cam.lat ? `${cam.lat.toFixed(3)}°N, ${cam.lng.toFixed(3)}°E` : 'GIS SYNCED'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoWallPage({ cameras }) {
  // Available Presets
  const presets = useMemo(() => [
    { id: 'all_auto', name: 'All 30 Cameras Grid', city: 'ALL' },
    { id: 'ahmedabad', name: 'Ahmedabad Central (10 Cams)', city: 'Ahmedabad' },
    { id: 'junagadh', name: 'Junagadh Corridor (6 Cams)', city: 'Junagadh' },
    { id: 'navsari', name: 'Navsari Highway (12 Cams)', city: 'Navsari' },
    { id: 'rajkot', name: 'Rajkot Transport Hub (2 Cams)', city: 'Rajkot' },
  ], []);

  const [activePreset, setActivePreset] = useState('all_auto');
  const [gridSize, setGridSize] = useState('1+5'); // '1+5', '2x2', '3x3', '4x4', '1x1'
  const [streamSource, setStreamSource] = useState('local'); // 'local', 'cloud', 'webcam', 'rtsp'
  const [customRtspUrl, setCustomRtspUrl] = useState('rtsp://');
  const [isRtspModalOpen, setIsRtspModalOpen] = useState(false);
  const [gridSlots, setGridSlots] = useState([]);
  const [focusedCameraId, setFocusedCameraId] = useState(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [globalAiMode, setGlobalAiMode] = useState(false); // Default to clean distinct video feeds
  const [isAutoPatrol, setIsAutoPatrol] = useState(false);
  const [patrolProgress, setPatrolProgress] = useState(0);
  const patrolTimerRef = useRef(null);

  // Initialize camera slots based on active preset
  useEffect(() => {
    if (activePreset === 'all_auto') {
      setGridSlots(cameras.map(c => c.id));
    } else {
      const p = presets.find(x => x.id === activePreset);
      if (p) {
        const filtered = cameras.filter(c => c.city === p.city);
        setGridSlots(filtered.map(c => c.id));
      }
    }
  }, [activePreset, cameras]);

  // Auto-patrol carousel mode: Automatically rotates camera slots every 8 seconds
  useEffect(() => {
    if (!isAutoPatrol) {
      clearInterval(patrolTimerRef.current);
      setPatrolProgress(0);
      return;
    }

    const intervalMs = 100;
    const totalMs = 8000;
    let elapsed = 0;

    patrolTimerRef.current = setInterval(() => {
      elapsed += intervalMs;
      setPatrolProgress((elapsed / totalMs) * 100);

      if (elapsed >= totalMs) {
        elapsed = 0;
        setPatrolProgress(0);
        // Rotate slots forward by 1
        setGridSlots(prev => {
          if (prev.length <= 1) return prev;
          const [first, ...rest] = prev;
          return [...rest, first];
        });
      }
    }, intervalMs);

    return () => clearInterval(patrolTimerRef.current);
  }, [isAutoPatrol]);

  // Determine how many cameras to display
  const countMap = { '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16, '1+5': 5 };
  const maxCount = countMap[gridSize] || 5;

  const displayedCameras = useMemo(() => {
    if (focusedCameraId) {
      const foc = cameras.find(c => c.id === focusedCameraId);
      return foc ? [{ ...foc, slotIndex: 0 }] : [];
    }

    const effectiveSlots = gridSlots.length > 0 ? gridSlots : cameras.map(c => c.id);
    const slotsToDisplay = effectiveSlots.slice(0, maxCount);

    return slotsToDisplay.map((camId, idx) => {
      const found = cameras.find(c => c.id === camId);
      return found ? { ...found, slotIndex: idx } : { id: camId, name: `Slot ${idx + 1}`, status: 'offline', slotIndex: idx };
    });
  }, [focusedCameraId, gridSlots, maxCount, cameras]);

  // Smart swap
  const handleSwapSlot = (slotIndex, newCam) => {
    setGridSlots(prev => {
      const current = prev.length > 0 ? [...prev] : cameras.map(c => c.id);
      const next = [...current];
      while (next.length <= slotIndex) {
        next.push(cameras[next.length % cameras.length]?.id || newCam.id);
      }
      
      const oldCamId = next[slotIndex];
      const existingIndex = next.findIndex((id, idx) => id === newCam.id && idx !== slotIndex);
      if (existingIndex !== -1 && existingIndex < maxCount) {
        next[existingIndex] = oldCamId;
      }
      
      next[slotIndex] = newCam.id;
      return next;
    });
  };

  // Promote camera to Master slot (Slot #0) in 1+5 mode
  const handlePromoteToMaster = (targetCam) => {
    setGridSlots(prev => {
      const current = prev.length > 0 ? [...prev] : cameras.map(c => c.id);
      const remaining = current.filter(id => id !== targetCam.id);
      return [targetCam.id, ...remaining];
    });
  };

  const handleToggleSelectCamera = (camId) => {
    setGridSlots(prev => {
      const current = prev.length > 0 ? [...prev] : cameras.map(c => c.id);
      if (current.includes(camId)) {
        return current.filter(id => id !== camId);
      } else {
        return [...current, camId];
      }
    });
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const modalFilteredCams = cameras.filter(c => 
    c.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
    c.city.toLowerCase().includes(modalSearch.toLowerCase()) ||
    c.id.toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="video-wall-page">
      
      {/* Control Toolbar */}
      <div className="video-wall-toolbar">
        {/* Model 2 Specification Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', padding: '4px 9px', borderRadius: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7' }}></span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#c084fc', letterSpacing: '0.5px' }}>MODEL 2: UNIFIED VIEWING & DIRECT INGESTION GATEWAY</span>
        </div>

        {/* Left: District / Corridor Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Video size={13} style={{ color: '#71717a' }} /> Preset:
          </span>
          <select 
            value={activePreset} 
            onChange={e => { setActivePreset(e.target.value); setFocusedCameraId(null); }}
            style={{ padding: '4px 8px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f4f4f5', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            {presets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Stream Source Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 800 }}>MODEL 2 SOURCE:</span>
          <select 
            value={streamSource} 
            onChange={e => {
              if (e.target.value === 'rtsp') {
                setIsRtspModalOpen(true);
              }
              setStreamSource(e.target.value);
            }}
            style={{ 
              padding: '5px 10px', 
              background: '#18181b', 
              border: '1px solid rgba(168,85,247,0.4)', 
              borderRadius: 6, 
              color: streamSource === 'webcam' ? '#34d399' : '#f4f4f5', 
              fontSize: 11, 
              fontWeight: 700, 
              outline: 'none', 
              cursor: 'pointer' 
            }}
          >
            <option value="local">🏛️ All 26 Gujarat Depts (Home, RTO, Civil Supplies, GSRTC)</option>
            <option value="webcam">🎥 Live Physical Camera (Device 0 / FaceTime / USB)</option>
            <option value="rtsp">🔗 Custom Live RTSP Ingestion (Direct TCP / Zero VMS Disruption)</option>
          </select>
        </div>

        {/* Center: Grid Layout Matrix Selector */}
        {!focusedCameraId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600 }}>Layout:</span>
            <div className="grid-selector">
              {[
                { id: '1+5', label: '👑 1+5 Master' },
                { id: '2x2', label: '2×2 (4 Feeds)' },
                { id: '3x3', label: '3×3 (9 Feeds)' },
                { id: '4x4', label: '4×4 (16 Feeds)' },
                { id: '1x1', label: '1×1 Focus' },
              ].map(s => (
                <button 
                  key={s.id} 
                  className={`grid-btn ${gridSize === s.id ? 'active' : ''}`} 
                  onClick={() => setGridSize(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Global AI Toggle, Auto-Patrol, Select & Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Global AI Stream Toggle */}
          <button 
            onClick={() => setGlobalAiMode(!globalAiMode)}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: globalAiMode ? 'rgba(59,130,246,0.15)' : '#18181b',
              border: `1px solid ${globalAiMode ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
              color: globalAiMode ? '#60a5fa' : '#a1a1aa',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            <Cpu size={13} /> {globalAiMode ? 'AI Analytics: ALL' : 'Raw CCTV: ALL'}
          </button>

          {/* Auto Patrol / Tour Button */}
          <button 
            onClick={() => setIsAutoPatrol(!isAutoPatrol)}
            style={{
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: isAutoPatrol ? 'rgba(16,185,129,0.15)' : '#18181b',
              border: `1px solid ${isAutoPatrol ? '#10b981' : 'rgba(255,255,255,0.12)'}`,
              color: isAutoPatrol ? '#34d399' : '#a1a1aa',
              borderRadius: 6,
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isAutoPatrol ? <Pause size={12} /> : <Play size={12} />}
            {isAutoPatrol ? 'Patrol ON' : 'Auto-Patrol'}
            {isAutoPatrol && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, height: 2, background: '#10b981',
                width: `${patrolProgress}%`, transition: 'width 0.1s linear'
              }} />
            )}
          </button>

          {focusedCameraId ? (
            <button 
              onClick={() => setFocusedCameraId(null)}
              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}
            >
              <Minimize2 size={12} /> Exit Focus
            </button>
          ) : (
            <button 
              onClick={() => setIsCustomModalOpen(true)}
              style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5, border: '1px solid rgba(255,255,255,0.1)', background: '#18181b', color: '#f4f4f5', borderRadius: 5, fontWeight: 600, cursor: 'pointer' }}
            >
              <Sliders size={12} style={{ color: '#a1a1aa' }} /> Select Cameras ({gridSlots.length}/{cameras.length})
            </button>
          )}

          <span style={{ fontSize: 10, color: '#34d399', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '3px 7px', borderRadius: 4, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#34d399' }}></span>
            {displayedCameras.length} Feeds Active
          </span>

          <button
            onClick={toggleBrowserFullscreen}
            title="Toggle Control Room Fullscreen"
            style={{ padding: '4px 6px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Maximize size={12} />
          </button>
        </div>
      </div>

      {/* Grid Layout Canvas */}
      <div 
        className={`video-grid ${focusedCameraId || gridSize === '1x1' ? 'grid-1x1' : gridSize === '2x2' ? 'grid-2x2' : gridSize === '3x3' ? 'grid-3x3' : gridSize === '4x4' ? 'grid-4x4' : 'grid-1p5'}`}
      >
        {displayedCameras.map((cam, idx) => (
          <VideoWallCell
            key={focusedCameraId ? 'focused-cell' : `slot-${cam.slotIndex ?? idx}-${cam.id}`}
            cam={cam}
            allCameras={cameras}
            onSwapCamera={(newCam) => handleSwapSlot(cam.slotIndex ?? idx, newCam)}
            isFocused={focusedCameraId === cam.id}
            onToggleFocus={() => setFocusedCameraId(focusedCameraId === cam.id ? null : cam.id)}
            gridSize={focusedCameraId ? '1x1' : gridSize}
            globalAiMode={globalAiMode}
            onPromoteToMaster={handlePromoteToMaster}
            isMasterSlot={gridSize === '1+5' && idx === 0}
            streamSource={streamSource}
            customRtspUrl={customRtspUrl}
          />
        ))}

        {displayedCameras.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: '#71717a' }}>
            <Video size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3 style={{ color: '#f4f4f5' }}>No Cameras Selected in Video Wall</h3>
            <p style={{ fontSize: 12, marginTop: 4 }}>Click "Select Cameras" above to choose which cameras to monitor.</p>
            <button onClick={() => setGridSlots(cameras.map(c => c.id))} style={{ marginTop: 12, fontSize: 11, padding: '6px 14px', background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
              Reset to All 30 Cameras
            </button>
          </div>
        )}
      </div>

      {/* Custom Camera Picker Modal */}
      {isCustomModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCustomModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 640, background: '#121215', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sliders size={15} style={{ color: '#a1a1aa' }} /> Video Wall Stream Selector
                </h3>
                <span style={{ fontSize: 11, color: '#71717a' }}>Select which cameras to stream simultaneously on the surveillance grid</span>
              </div>
              <button className="detail-close" onClick={() => setIsCustomModalOpen(false)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ padding: 14 }}>
              {/* Search & Bulk Select */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                  <input
                    placeholder="Search camera name, district, or ID..."
                    value={modalSearch}
                    onChange={e => setModalSearch(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px 6px 30px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f4f4f5', fontSize: 11, outline: 'none' }}
                  />
                </div>
                <button 
                  onClick={() => setGridSlots(cameras.map(c => c.id))}
                  style={{ fontSize: 10, padding: '4px 10px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#f4f4f5', cursor: 'pointer' }}
                >
                  Select All
                </button>
                <button 
                  onClick={() => setGridSlots([])}
                  style={{ fontSize: 10, padding: '4px 10px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#a1a1aa', cursor: 'pointer' }}
                >
                  Clear
                </button>
              </div>

              {/* Camera Checkbox Grid */}
              <div style={{ maxHeight: 300, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, paddingRight: 4 }}>
                {modalFilteredCams.map(cam => {
                  const isChecked = gridSlots.includes(cam.id);
                  return (
                    <div 
                      key={cam.id}
                      onClick={() => handleToggleSelectCamera(cam.id)}
                      style={{
                        padding: '6px 8px',
                        background: isChecked ? '#18181b' : '#121215',
                        border: `1px solid ${isChecked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 5,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.15s'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {}} 
                        style={{ accentColor: '#3b82f6', width: 13, height: 13, pointerEvents: 'none' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isChecked ? '#f4f4f5' : '#a1a1aa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ color: '#60a5fa', marginRight: 4 }}>{cam.id}</span>
                          {cam.name}
                        </div>
                        <div style={{ fontSize: 9, color: '#71717a' }}>{cam.city}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#a1a1aa', fontWeight: 600 }}>
                {gridSlots.length} of {cameras.length} cameras active
              </span>
              <button 
                onClick={() => setIsCustomModalOpen(false)}
                style={{ padding: '6px 14px', fontSize: 11, background: '#f4f4f5', color: '#09090b', border: 'none', borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}
              >
                Apply Feeds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom RTSP Stream URL Modal */}
      {isRtspModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRtspModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 500, background: '#121215', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Video size={15} style={{ color: '#3b82f6' }} /> Live RTSP / IP Camera Ingest
                </h3>
                <span style={{ fontSize: 11, color: '#71717a' }}>Enter any live RTSP, WebRTC, or HTTP camera stream URL for real-time AI</span>
              </div>
              <button className="detail-close" onClick={() => setIsRtspModalOpen(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>
                Live Stream URL (RTSP / HTTP / HLS)
              </label>
              <input
                type="text"
                value={customRtspUrl}
                onChange={e => setCustomRtspUrl(e.target.value)}
                placeholder="rtsp://<host>:8554/stream/1"
                style={{ width: '100%', padding: '8px 12px', background: '#18181b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#f4f4f5', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)' }}
              />
              <p style={{ fontSize: 10, color: '#71717a', marginTop: 8, lineHeight: 1.4 }}>
                💡 <strong>Tip for judges/demo:</strong> You can connect live junction cameras, CCTV IP streams, or use <code>webcam</code> mode for physical camera demonstration.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button 
                onClick={() => setIsRtspModalOpen(false)}
                style={{ padding: '6px 14px', fontSize: 11, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}
              >
                Connect Live Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
