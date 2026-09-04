import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tag, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, 
  Trash2, Save, RefreshCw, Eye, Database, Layers, Plus, HelpCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const CLASSES = [
  { id: 0, name: 'car', label: 'Car', key: '1', color: '#10b981' },
  { id: 1, name: 'auto', label: 'Auto', key: '2', color: '#f59e0b' },
  { id: 2, name: 'bus', label: 'Bus', key: '3', color: '#8b5cf6' },
  { id: 3, name: 'truck', label: 'Truck', key: '4', color: '#ef4444' },
  { id: 4, name: 'two_wheeler', label: 'Two Wheeler', key: '5', color: '#06b6d4' },
  { id: 5, name: 'pedestrian', label: 'Pedestrian', key: '6', color: '#ec4899' },
];

export function AnnotationStudioPage() {
  const [frames, setFrames] = useState([]);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  const [boxes, setBoxes] = useState([]);
  const [selectedBoxIdx, setSelectedBoxIdx] = useState(null);
  const [activeClassId, setActiveClassId] = useState(0); // Default 'car'
  const [split, setSplit] = useState('train');
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, annotated
  const [selectedCam, setSelectedCam] = useState('all');
  const [selectedLighting, setSelectedLighting] = useState('all');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleTelemetry, setScaleTelemetry] = useState(null);
  const [scaleDatasets, setScaleDatasets] = useState([]);
  const [isScaling, setIsScaling] = useState(false);

  // Drag-to-draw state
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState(null);

  // Load available frames & stats on mount
  useEffect(() => {
    loadFramesAndStats();
  }, []);

  const loadScaleData = async () => {
    try {
      const [tel, dsets] = await Promise.all([
        fetch(`${API_BASE}/api/scale/telemetry`).then(r => r.json()),
        fetch(`${API_BASE}/api/scale/datasets`).then(r => r.json())
      ]);
      setScaleTelemetry(tel.telemetry);
      setScaleDatasets(dsets.packages || []);
    } catch (e) {
      console.error("Scale data error:", e);
    }
  };

  const triggerActiveLearning = async () => {
    setIsScaling(true);
    try {
      await fetch(`${API_BASE}/api/scale/run_pseudo_labeler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_frames: 1500 })
      });
      setFeedbackMsg("🚀 Active Learning Scaler started in background!");
      setTimeout(() => {
        loadScaleData();
        loadFramesAndStats();
        setIsScaling(false);
      }, 3000);
    } catch (e) {
      setIsScaling(false);
    }
  };

  const loadFramesAndStats = async () => {
    try {
      const [framesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/annotation/frames?limit=5000`).then(r => r.json()),
        fetch(`${API_BASE}/api/annotation/stats`).then(r => r.json())
      ]);
      setFrames(framesRes);
      setStats(statsRes);
    } catch (err) {
      console.error("Error loading annotation data:", err);
    }
  };

  const activeFrame = frames[selectedFrameIdx] || null;

  // Load labels whenever active frame changes
  useEffect(() => {
    if (!activeFrame) return;
    setSelectedBoxIdx(null);
    fetch(`${API_BASE}/api/annotation/labels/${activeFrame.base_id}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.boxes && data.boxes.length > 0) {
          setBoxes(data.boxes);
          if (data.split) setSplit(data.split);
        } else {
          setBoxes([]);
        }
      })
      .catch(() => setBoxes([]));
  }, [activeFrame]);

  // Keyboard shortcuts (1-7 for class selection, Delete to delete box, Space for AI Assist)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= CLASSES.length) {
        setActiveClassId(num - 1);
        if (selectedBoxIdx !== null) {
          setBoxes(prev => prev.map((b, i) => i === selectedBoxIdx ? {
            ...b,
            cls_id: num - 1,
            class_name: CLASSES[num - 1].name,
            color: CLASSES[num - 1].color
          } : b));
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBoxIdx !== null) {
          deleteBox(selectedBoxIdx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBoxIdx]);

  // Drag to draw bounding box
  const handleMouseDown = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentBox({
      cls_id: activeClassId,
      class_name: CLASSES[activeClassId].name,
      color: CLASSES[activeClassId].color,
      cx: x, cy: y, w: 0, h: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const currY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const x1 = Math.min(drawStart.x, currX);
    const y1 = Math.min(drawStart.y, currY);
    const x2 = Math.max(drawStart.x, currX);
    const y2 = Math.max(drawStart.y, currY);

    const bw = x2 - x1;
    const bh = y2 - y1;
    const cx = x1 + bw / 2;
    const cy = y1 + bh / 2;

    setCurrentBox({
      cls_id: activeClassId,
      class_name: CLASSES[activeClassId].name,
      color: CLASSES[activeClassId].color,
      cx, cy, w: bw, h: bh
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentBox && currentBox.w > 0.01 && currentBox.h > 0.01) {
      setBoxes(prev => [...prev, currentBox]);
      setSelectedBoxIdx(boxes.length);
    }
    setCurrentBox(null);
  };

  // 1-Click AI Auto-Assist
  const handleAiPreAnnotate = async () => {
    if (!activeFrame) return;
    setIsAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/annotation/ai_draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_path: activeFrame.full_path, conf: 0.20 })
      }).then(r => r.json());

      if (res.boxes && res.boxes.length > 0) {
        setBoxes(res.boxes);
        setFeedbackMsg(`⚡ AI pre-populated ${res.boxes.length} candidate boxes!`);
        setTimeout(() => setFeedbackMsg(''), 3000);
      } else {
        setFeedbackMsg('No vehicles detected with confidence > 0.20');
        setTimeout(() => setFeedbackMsg(''), 3000);
      }
    } catch (err) {
      console.error("AI Assist failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Save manual annotations into YOLO dataset
  const handleSaveAndNext = async () => {
    if (!activeFrame) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/annotation/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: activeFrame.full_path,
          split: split,
          boxes: boxes
        })
      });

      // Update local frame status to annotated
      setFrames(prev => prev.map((f, i) => i === selectedFrameIdx ? { ...f, is_annotated: true } : f));
      setFeedbackMsg(`✅ Saved ${boxes.length} labels to ${split} set!`);
      setTimeout(() => setFeedbackMsg(''), 2500);

      // Refresh dataset stats
      fetch(`${API_BASE}/api/annotation/stats`).then(r => r.json()).then(setStats);

      // Advance to next frame
      if (selectedFrameIdx < frames.length - 1) {
        setSelectedFrameIdx(selectedFrameIdx + 1);
      }
    } catch (err) {
      console.error("Failed to save annotation:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBox = (idx) => {
    setBoxes(prev => prev.filter((_, i) => i !== idx));
    if (selectedBoxIdx === idx) setSelectedBoxIdx(null);
  };

  // Filter frames
  const filteredFrames = frames.filter(f => {
    if (filter === 'pending' && f.is_annotated) return false;
    if (filter === 'annotated' && !f.is_annotated) return false;
    if (selectedCam !== 'all' && f.cam_id !== selectedCam) return false;
    if (selectedLighting !== 'all' && f.lighting !== selectedLighting) return false;
    return true;
  });

  const uniqueCams = Array.from(new Set(frames.map(f => f.cam_id))).sort();
  const countDay = useMemo(() => frames.filter(f => f.lighting === 'daylight_morning_rush').length, [frames]);
  const countTwi = useMemo(() => frames.filter(f => f.lighting === 'twilight_dawn_dusk').length, [frames]);
  const countNight = useMemo(() => frames.filter(f => f.lighting === 'night_sodium_lighting').length, [frames]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 75px)', background: '#0a0d14', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── Top Summary & Stats Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(15, 23, 42, 0.95)', borderBottom: '1px solid rgba(51, 65, 85, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <Tag size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              CCTV Dataset Annotation Studio
              <span style={{ fontSize: '11px', background: '#1e293b', border: '1px solid #334155', padding: '2px 8px', borderRadius: '12px', color: '#94a3b8' }}>
                YOLOv8/v12 Active Learning
              </span>
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Manually mark Indian vehicle classes on real Gujarat Police CCTV feeds to train custom detection models
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button
            onClick={() => { setShowScaleModal(true); loadScaleData(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Sparkles size={15} />
            🚀 Active Learning Scaler
          </button>

          {stats && (
            <>
              <div style={{ background: '#1e293b', padding: '6px 14px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{stats.total_annotated_frames}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Frames Labeled</div>
              </div>
              <div style={{ background: '#1e293b', padding: '6px 14px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8' }}>{stats.train_frames} / {stats.val_frames}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Train / Val Split</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Main Studio Layout ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── 1. Left Filmstrip: Frame Browser ── */}
        <div style={{ width: '280px', borderRight: '1px solid rgba(51, 65, 85, 0.4)', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>
          
          {/* Filters */}
          <div style={{ padding: '12px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['all', 'pending', 'annotated'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1, padding: '6px', fontSize: '11px', textTransform: 'capitalize',
                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: filter === f ? '#2563eb' : '#1e293b',
                    color: filter === f ? '#fff' : '#94a3b8',
                    fontWeight: filter === f ? '600' : '400'
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                padding: '6px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none'
              }}
            >
              <option value="all">All Cameras ({frames.length} frames)</option>
              {uniqueCams.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={selectedLighting}
              onChange={(e) => setSelectedLighting(e.target.value)}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#f8fafc',
                padding: '6px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none', marginTop: '6px'
              }}
            >
              <option value="all">All Lighting Conditions ({frames.length})</option>
              <option value="daylight_morning_rush">☀️ Daylight &amp; Morning Rush ({countDay})</option>
              <option value="twilight_dawn_dusk">🌆 Twilight &amp; Dawn/Dusk ({countTwi})</option>
              <option value="night_sodium_lighting">🌙 Night Sodium &amp; Glare ({countNight})</option>
            </select>
          </div>

          {/* Frames List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {filteredFrames.map((f, idx) => {
              const originalIdx = frames.findIndex(orig => orig.base_id === f.base_id);
              const isSelected = originalIdx === selectedFrameIdx;
              return (
                <div
                  key={f.base_id}
                  onClick={() => setSelectedFrameIdx(originalIdx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px', marginBottom: '6px', borderRadius: '8px',
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent'
                  }}
                >
                  <img
                    src={`${API_BASE}/api/annotation/frame_image?path=${encodeURIComponent(f.full_path)}`}
                    alt="thumb"
                    style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', background: '#1e293b' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: isSelected ? '#60a5fa' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.cam_id.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>
                      {f.size_kb} KB {f.is_clahe ? '• CLAHE' : ''}
                    </div>
                  </div>
                  {f.is_annotated && (
                    <CheckCircle2 size={16} color="#10b981" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. Center: Interactive Drawing Canvas ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#020617', position: 'relative' }}>
          
          {/* Canvas Toolbar */}
          <div style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setSelectedFrameIdx(Math.max(0, selectedFrameIdx - 1))}
                disabled={selectedFrameIdx === 0}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', opacity: selectedFrameIdx === 0 ? 0.4 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Frame <strong style={{ color: '#f8fafc' }}>{selectedFrameIdx + 1}</strong> of {frames.length}
              </span>
              <button
                onClick={() => setSelectedFrameIdx(Math.min(frames.length - 1, selectedFrameIdx + 1))}
                disabled={selectedFrameIdx === frames.length - 1}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', opacity: selectedFrameIdx === frames.length - 1 ? 0.4 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
              {activeFrame && (
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                  {activeFrame.filename}
                </span>
              )}
            </div>

            {feedbackMsg && (
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', animation: 'fadeIn 0.2s' }}>
                {feedbackMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAiPreAnnotate}
                disabled={isAiLoading || !activeFrame}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: '600', cursor: isAiLoading ? 'wait' : 'pointer'
                }}
              >
                <Sparkles size={14} />
                {isAiLoading ? 'AI Detecting...' : '⚡ AI Pre-Annotate'}
              </button>

              <button
                onClick={() => setBoxes([])}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: '#1e293b', color: '#ef4444', border: '1px solid #334155',
                  padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                }}
              >
                <Trash2 size={14} /> Clear
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div
            ref={containerRef}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden', padding: '16px', userSelect: 'none'
            }}
          >
            {activeFrame ? (
              <div style={{ position: 'relative', display: 'inline-block', maxHeight: '100%', maxWidth: '100%' }}>
                <img
                  ref={imageRef}
                  src={`${API_BASE}/api/annotation/frame_image?path=${encodeURIComponent(activeFrame.full_path)}`}
                  alt="active CCTV frame"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  draggable={false}
                  style={{
                    maxHeight: 'calc(100vh - 220px)', maxWidth: '100%', display: 'block',
                    borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    cursor: 'crosshair'
                  }}
                />

                {/* SVG Bounding Boxes Overlay */}
                <svg
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  {/* Saved Boxes */}
                  {boxes.map((b, idx) => {
                    const x1 = (b.cx - b.w / 2) * 100;
                    const y1 = (b.cy - b.h / 2) * 100;
                    const w = b.w * 100;
                    const h = b.h * 100;
                    const isSelected = idx === selectedBoxIdx;
                    return (
                      <g key={idx}>
                        <rect
                          x={`${x1}%`}
                          y={`${y1}%`}
                          width={`${w}%`}
                          height={`${h}%`}
                          fill={`${b.color}20`}
                          stroke={b.color}
                          strokeWidth={isSelected ? '3' : '2'}
                          strokeDasharray={isSelected ? '4 2' : 'none'}
                          style={{ pointerEvents: 'all', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBoxIdx(idx);
                          }}
                        />
                        {/* Label Tag Header */}
                        <g transform={`translate(0, 0)`}>
                          <rect
                            x={`${x1}%`}
                            y={`${Math.max(0, y1 - 2.5)}%`}
                            width={`${Math.min(100, Math.max(12, b.class_name.length * 1.6))}%`}
                            height="18"
                            fill={b.color}
                            rx="2"
                          />
                          <text
                            x={`${x1 + 0.5}%`}
                            y={`${Math.max(1.8, y1 - 0.5)}%`}
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {b.class_name} {b.confidence ? `(${b.confidence})` : ''}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Actively Drawing Box */}
                  {currentBox && (
                    <rect
                      x={`${(currentBox.cx - currentBox.w / 2) * 100}%`}
                      y={`${(currentBox.cy - currentBox.h / 2) * 100}%`}
                      width={`${currentBox.w * 100}%`}
                      height={`${currentBox.h * 100}%`}
                      fill={`${currentBox.color}30`}
                      stroke={currentBox.color}
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}
                </svg>
              </div>
            ) : (
              <div style={{ color: '#64748b' }}>No frame selected</div>
            )}
          </div>
        </div>

        {/* ── 3. Right Sidebar: Class Palette & Action Panel ── */}
        <div style={{ width: '320px', borderLeft: '1px solid rgba(51, 65, 85, 0.4)', background: '#0b1120', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '14px', borderBottom: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Select Vehicle Class [1 - 7]
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {CLASSES.map((cls) => {
                const isActive = cls.id === activeClassId;
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setActiveClassId(cls.id);
                      if (selectedBoxIdx !== null) {
                        setBoxes(prev => prev.map((b, i) => i === selectedBoxIdx ? {
                          ...b,
                          cls_id: cls.id,
                          class_name: cls.name,
                          color: cls.color
                        } : b));
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: '6px',
                      background: isActive ? `${cls.color}25` : '#1e293b',
                      border: isActive ? `2px solid ${cls.color}` : '1px solid #334155',
                      color: isActive ? '#fff' : '#cbd5e1',
                      cursor: 'pointer', transition: 'all 0.1s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cls.color }} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{cls.label}</span>
                    </div>
                    <span style={{ fontSize: '10px', background: '#0f172a', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>
                      {cls.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Labeled Boxes in this Frame */}
          <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                Labels In Frame ({boxes.length})
              </span>
              {selectedBoxIdx !== null && (
                <button
                  onClick={() => deleteBox(selectedBoxIdx)}
                  style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={12} /> Delete Selected
                </button>
              )}
            </div>

            {boxes.length === 0 ? (
              <div style={{ border: '1px dashed #334155', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                Click & drag on image to mark vehicles, or click <strong>⚡ AI Pre-Annotate</strong>
              </div>
            ) : (
              boxes.map((b, idx) => {
                const isSelected = idx === selectedBoxIdx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedBoxIdx(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: '6px',
                      background: isSelected ? 'rgba(37, 99, 235, 0.2)' : '#1e293b',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: b.color }} />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc' }}>
                        #{idx + 1} {b.class_name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBox(idx); }}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Save & Export Controls */}
          <div style={{ padding: '14px', borderTop: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.8)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Split Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Target Split:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['train', 'val'].map(s => (
                  <button
                    key={s}
                    onClick={() => setSplit(s)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: 'none',
                      cursor: 'pointer', textTransform: 'uppercase', fontWeight: '700',
                      background: split === s ? '#10b981' : '#1e293b',
                      color: split === s ? '#000' : '#94a3b8'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Advance Button */}
            <button
              onClick={handleSaveAndNext}
              disabled={isSaving || boxes.length === 0}
              style={{
                width: '100%', padding: '12px', borderRadius: '8px',
                background: boxes.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#334155',
                color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700',
                cursor: boxes.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: boxes.length > 0 ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save & Next Frame ➔'}
            </button>
          </div>

        </div>

      </div>

      {/* ── Active Learning Scaler & Cluster Telemetry Modal ── */}
      {showScaleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#0f172a', border: '1px solid #334155', borderRadius: '14px',
            width: '680px', maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto',
            padding: '28px', color: '#f8fafc', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '8px', borderRadius: '8px' }}>
                  <Sparkles size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Active Learning & Cluster Scaling Hub</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Multiply dataset volume and stream throughput by 10x</span>
                </div>
              </div>
              <button
                onClick={() => setShowScaleModal(false)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
              >
                ✕ Close
              </button>
            </div>

            {/* Section 1: Active Learning Automated Scaler */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} /> 1. Automated Active Learning Pseudo-Labeler
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
                Scales your dataset from 50 manual frames to thousands of images automatically. Runs batched multi-scale inference on all harvested Gujarat CCTV snapshots, auto-labels high-confidence vehicles, and isolates uncertain cases for human review.
              </p>

              <button
                onClick={triggerActiveLearning}
                disabled={isScaling}
                style={{
                  background: isScaling ? '#334155' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: '700', cursor: isScaling ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Sparkles size={16} />
                {isScaling ? 'Running Active Learning Scaler on Apple Silicon GPU...' : '⚡ Auto-Label 1,500 CCTV Frames (1-Click)'}
              </button>
            </div>

            {/* Section 2: Dynamic Batching & Stream Decimation Telemetry */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={16} /> 2. Multi-Camera Edge Scaling Telemetry
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Compute Backend</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>Apple Silicon (MPS)</div>
                </div>
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Dynamic Batch Size</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>{scaleTelemetry?.batch_size || 6} Streams / Batch</div>
                </div>
                <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Adaptive Decimation</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8' }}>6:1 (5 FPS Infer)</div>
                </div>
              </div>
            </div>

            {/* Section 3: Generated Scaled Datasets */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={16} /> 3. Ready-to-Train Dataset Packages
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scaleDatasets.map((pkg, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '10px 14px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{pkg.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Updated: {pkg.modified}</div>
                    </div>
                    <span style={{ fontSize: '12px', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', color: '#10b981', fontWeight: '700' }}>
                      {pkg.size_mb} MB
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
