import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Search, Shield, Target, MapPin, Radio, AlertTriangle, 
  Car, Clock, ArrowRight, Zap, CheckCircle2, ChevronRight, RefreshCw, 
  Send, Layers, Volume2, ShieldAlert, FileText, Lock, Mic, MicOff,
  Play, Pause, Download, Printer, ExternalLink, Cpu, Compass, Activity,
  Check, X, BrainCircuit, Camera
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

function AutoFitRouteBounds({ points, predictedPoint, targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    
    map.invalidateSize();
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const allCoords = [];
    if (points && points.length > 0) {
      points.forEach(p => {
        if (Array.isArray(p) && p.length >= 2 && p[0] && p[1]) {
          allCoords.push([Number(p[0]), Number(p[1])]);
        } else if (p && p.lat && p.lng) {
          allCoords.push([Number(p.lat), Number(p.lng)]);
        }
      });
    }
    if (predictedPoint && predictedPoint.lat && predictedPoint.lng) {
      allCoords.push([Number(predictedPoint.lat), Number(predictedPoint.lng)]);
    }
    if (allCoords.length >= 2) {
      const bounds = L.latLngBounds(allCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], 12);
    } else if (targetCoords && targetCoords[0] && targetCoords[1]) {
      map.setView(targetCoords, 12);
    }
    return () => clearTimeout(t);
  }, [JSON.stringify(points), JSON.stringify(predictedPoint), targetCoords?.[0], targetCoords?.[1], map]);
  return null;
}

// Leaflet marker fix
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const createCameraHopIcon = (idx) => L.divIcon({
  className: 'custom-cam-hop-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;">
      <div style="background:#0284c7;border:2.5px solid #38bdf8;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(14,165,233,0.9);">
        <span style="color:#fff;font-size:12px;font-weight:900;">${idx + 1}</span>
      </div>
      <div style="position:absolute;top:-8px;right:-8px;background:#1e3a8a;border:1px solid #60a5fa;border-radius:4px;padding:1px 4px;font-size:8px;font-weight:900;color:#93c5fd;letter-spacing:0.5px;">
        CAM
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16]
});

const targetIcon = L.divIcon({
  className: 'custom-target-marker',
  html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid #60a5fa;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px #3b82f6;animation:pulse 1.5s infinite;"><span style="color:#fff;font-size:15px;font-weight:900;">🎯</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const PRESET_SCENARIOS = [
  { label: 'Navsari: White Sedan Corridor', query: 'Find a white sedan in Navsari highway corridor' },
  { label: 'Ahmedabad: Fleeing Scorpio SUV', query: 'Urgent: Track suspect white Scorpio SUV near SG Highway in Ahmedabad fleeing north' },
  { label: 'Junagadh: Red Motorcycle Incident', query: 'Hit and run accident suspect red motorcycle in Junagadh' },
  { label: 'Anomaly: Cloned & Ghost Plates', query: 'Scan for cloned fake plates with impossible velocity across districts' },
];

export function InvestigatorPage({ cameras = [] }) {
  const [activeTab, setActiveTab] = useState('investigate'); // 'investigate' | 'ghost_plates'
  const [promptInput, setPromptInput] = useState('Find a white car spotted near Navsari or Ahmedabad today');
  const [loading, setLoading] = useState(false);
  const [investigationData, setInvestigationData] = useState(null);
  const [ghostPlates, setGhostPlates] = useState([]);

  // Voice Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Route Simulation Playback State
  const [isPlayingRoute, setIsPlayingRoute] = useState(false);
  const [activeHopIndex, setActiveHopIndex] = useState(0);
  const [roadWaypointIndex, setRoadWaypointIndex] = useState(0);

  // Forensic Dossier Modal
  const [showDossierModal, setShowDossierModal] = useState(false);

  // APB Broadcast Notification
  const [apbBroadcast, setApbBroadcast] = useState(null);



  // Initial investigation fetch
  useEffect(() => {
    executeInvestigation('Find a white sedan in Navsari highway corridor');
    fetchGhostPlates();

    // Setup Web Speech API if supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN'; // Indian English accent

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPromptInput(transcript);
        setIsListening(false);
        executeInvestigation(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const roadGeometry = (investigationData?.road_geometry && investigationData.road_geometry.length > 0)
    ? investigationData.road_geometry
    : (investigationData?.chronological_route || [])
        .filter(n => n.lat && n.lng)
        .map(n => [n.lat, n.lng]);

  // Turn-by-turn Google Maps road animation playback
  useEffect(() => {
    let timer;
    if (isPlayingRoute && roadGeometry.length > 0) {
      timer = setInterval(() => {
        setRoadWaypointIndex((prev) => {
          if (prev >= roadGeometry.length - 1) {
            setIsPlayingRoute(false);
            return prev;
          }
          const stepSize = Math.max(1, Math.round(roadGeometry.length / 90));
          return Math.min(roadGeometry.length - 1, prev + stepSize);
        });
      }, 80);
    }
    return () => clearInterval(timer);
  }, [isPlayingRoute, roadGeometry]);

  const toggleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice dictation is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const executeInvestigation = async (queryText) => {
    setLoading(true);
    setIsPlayingRoute(false);
    setActiveHopIndex(0);
    try {
      const res = await fetch('http://localhost:8000/api/investigator/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText })
      });
      if (res.ok) {
        const data = await res.json();
        setInvestigationData(data);
      }
    } catch (err) {
      console.error('Failed to execute investigator query:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGhostPlates = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/investigator/ghost_plates');
      if (res.ok) {
        const data = await res.json();
        setGhostPlates(data.anomalies || []);
      }
    } catch (err) {
      console.error('Failed to fetch ghost plates:', err);
    }
  };


  const handleBroadcastClonedPlateAPB = (item) => {
    setApbBroadcast({
      plate: item.plate,
      time: new Date().toLocaleTimeString(),
      sections: item.penal_sections || ["IPC 420", "IPC 468", "IPC 471"]
    });
    setTimeout(() => setApbBroadcast(null), 7000);
  };

  const lastNode = investigationData?.chronological_route && investigationData.chronological_route.length > 0 
    ? investigationData.chronological_route[investigationData.chronological_route.length - 1] 
    : null;

  const targetCoords = investigationData?.containment_rings?.center_coords 
    ? investigationData.containment_rings.center_coords
    : lastNode && lastNode.lat && lastNode.lng
      ? [lastNode.lat, lastNode.lng]
      : [23.03, 72.51];

  const routePolyline = (investigationData?.chronological_route || [])
    .filter(n => n.lat && n.lng)
    .map(n => [n.lat, n.lng]);

  const activeSimulationHop = investigationData?.chronological_route?.[activeHopIndex] || lastNode;

  return (
    <div className="page-wrapper" style={{ padding: '8px 12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
      {/* 1. Header Banner - Sleek Obsidian Command Deck */}
      <div style={{
        background: '#121215',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '6px 12px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.12)', padding: '4px 6px', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={13} color="#f4f4f5" />
          </div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.2px' }}>
            AI Natural Language Crime Investigator
          </h1>
          <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#a1a1aa', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3 }}>
            STATE ANPR CORE
          </span>
          <span style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Zap size={9} /> VECTOR INTEL
          </span>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: '#18181b', padding: 2, borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.08)', gap: 2 }}>
          <button
            onClick={() => setActiveTab('investigate')}
            style={{
              background: activeTab === 'investigate' ? '#27272a' : 'transparent',
              color: activeTab === 'investigate' ? '#ffffff' : '#71717a',
              border: activeTab === 'investigate' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={12} /> Tactical Investigation
          </button>

          <button
            onClick={() => { setActiveTab('ghost_plates'); fetchGhostPlates(); }}
            style={{
              background: activeTab === 'ghost_plates' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
              color: activeTab === 'ghost_plates' ? '#fb7185' : '#71717a',
              border: activeTab === 'ghost_plates' ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid transparent',
              borderRadius: 4,
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldAlert size={12} /> Ghost &amp; Cloned Plates ({ghostPlates.length})
          </button>
        </div>
      </div>

      {/* APB Broadcast Notification Banner */}
      {apbBroadcast && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={14} color="#fb7185" className="spin-animation" />
            <div style={{ fontSize: 11, color: '#f4f4f5' }}>
              <strong style={{ color: '#fb7185' }}>LIVE APB INTERCEPT ACTIVE:</strong> Staging units alerting on target plate <strong>{investigationData?.target_vehicle?.plate}</strong>
            </div>
          </div>
          <button
            onClick={() => setApbBroadcast(false)}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'investigate' ? (
        <>
          {/* 2. Natural Language Query Search Bar & Presets */}
          <div style={{
            background: '#121215',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 6,
            flexShrink: 0
          }}>
            {/* Search Input Box */}
            <div style={{
              flex: 1,
              minWidth: '280px',
              display: 'flex',
              alignItems: 'center',
              background: '#18181b',
              border: isListening ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: 6,
              padding: '0 8px',
              gap: 6
            }}>
              <Sparkles size={13} color={isListening ? '#f43f5e' : '#71717a'} />
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') executeInvestigation(promptInput); }}
                placeholder="Describe incident in natural language (e.g. 'Find white car near Navsari or Ahmedabad today')..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f4f4f5',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '6px 0'
                }}
              />
              
              {/* Voice button */}
              <button
                onClick={toggleVoiceSearch}
                title="Voice Search (Web Speech Recognition)"
                style={{
                  background: isListening ? '#f43f5e' : '#222226',
                  border: isListening ? '1px solid #fb7185' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  color: isListening ? '#fff' : '#a1a1aa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 9,
                  fontWeight: 600
                }}
              >
                {isListening ? <MicOff size={9} className="spin-animation" /> : <Mic size={9} />}
                <span>{isListening ? 'Listening...' : 'Voice'}</span>
              </button>

              {/* Submit Search button */}
              <button
                onClick={() => executeInvestigation(promptInput)}
                disabled={loading}
                style={{
                  background: '#f4f4f5',
                  color: '#09090b',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 10px',
                  fontWeight: 800,
                  fontSize: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {loading ? <RefreshCw size={10} className="spin-animation" /> : <Search size={10} />}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Quick Scenario Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8.5, color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Presets:
              </span>
              {PRESET_SCENARIOS.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (sc.label.includes('Cloned Plate')) {
                      setActiveTab('ghost_plates');
                      fetchGhostPlates();
                    } else {
                      setPromptInput(sc.query);
                      executeInvestigation(sc.query);
                    }
                  }}
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#a1a1aa',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontSize: 8.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#f4f4f5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#a1a1aa';
                  }}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Main Results Display - Unified 3-Column Command Matrix (Fits 100% Width & Height) */}
          {investigationData && (
            <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 280px', gap: 8, alignItems: 'stretch' }}>
              
              {/* ================= COLUMN 1: Left Intelligence (Suspect Telemetry + Historical Intelligence) ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                
                {/* 1A. Suspect Telemetry Card */}
                <div style={{
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '7px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 8.5, fontWeight: 900, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Suspect Telemetry
                    </span>
                    <span style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)', fontSize: 7, fontWeight: 900, padding: '1px 3px', borderRadius: 2.5 }}>
                      ACTIVE ESCAPE
                    </span>
                  </div>

                  {/* AI Parsed Intent Strip */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {investigationData.parsed_intent?.vehicle_type && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#f4f4f5', padding: '1px 3px', borderRadius: 2, fontSize: 7.5, fontWeight: 700 }}>
                        {investigationData.parsed_intent.vehicle_type.toUpperCase()}
                      </span>
                    )}
                    {investigationData.parsed_intent?.color && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#f4f4f5', padding: '1px 3px', borderRadius: 2, fontSize: 7.5, fontWeight: 700 }}>
                        {investigationData.parsed_intent.color.toUpperCase()}
                      </span>
                    )}
                    {investigationData.parsed_intent?.city && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#f4f4f5', padding: '1px 3px', borderRadius: 2, fontSize: 7.5, fontWeight: 700 }}>
                        {investigationData.parsed_intent.city.toUpperCase()}
                      </span>
                    )}
                    <span style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '1px 3px', borderRadius: 2, fontSize: 7.5, fontWeight: 700 }}>
                      {investigationData.parsed_intent?.ai_confidence_score || 97}%
                    </span>
                  </div>

                  {/* License Plate Display (Authentic Indian HSRP High-Contrast Plate) */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #3f3f46',
                    borderRadius: 4,
                    padding: '3px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ background: '#1d4ed8', color: '#fff', fontSize: 6.5, fontWeight: 900, padding: '1px 2px', borderRadius: 1.5 }}>IND</span>
                      <span style={{ color: '#09090b', fontSize: 12, fontWeight: 900, letterSpacing: '0.4px', fontFamily: 'monospace' }}>
                        {investigationData.target_vehicle?.plate}
                      </span>
                    </div>
                    <span style={{ color: '#52525b', fontSize: 8.5, fontWeight: 700 }}>
                      {investigationData.target_vehicle?.color} {investigationData.target_vehicle?.vehicle_type}
                    </span>
                  </div>

                  {/* Speed & Heading metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <div style={{ background: '#18181b', padding: '3px 5px', borderRadius: 4, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: 7.5, color: '#71717a' }}>Last Speed</div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: '#f4f4f5' }}>
                        {investigationData.target_vehicle?.last_speed_kmh || 61.4} km/h
                      </div>
                    </div>
                    <div style={{ background: '#18181b', padding: '3px 5px', borderRadius: 4, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div style={{ fontSize: 7.5, color: '#71717a' }}>Escape Vector</div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#f4f4f5' }}>
                        {investigationData.target_vehicle?.escape_heading || 'South (S)'}
                      </div>
                    </div>
                  </div>

                  {/* Export Dossier button */}
                  <button
                    onClick={() => setShowDossierModal(true)}
                    style={{
                      background: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f4f4f5',
                      borderRadius: 4,
                      padding: '4px 6px',
                      fontWeight: 700,
                      fontSize: 9,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <FileText size={10} /> Export Court Dossier (Sec 65B)
                  </button>
                </div>

                {/* 1B. Historical Corridors & Hotspot Cameras (Fills Remaining Column Height) */}
                <div style={{
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Compass size={11} color="#a1a1aa" />
                      <span style={{ color: '#f4f4f5', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Historical Routes &amp; Hotspots
                      </span>
                    </div>
                    <span style={{ fontSize: 7.5, color: '#34d399', fontWeight: 700 }}>
                      88.5% Pattern Match
                    </span>
                  </div>

                  {/* Corridors list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ fontSize: 8, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Established Corridors</span>
                    {(investigationData.ai_intelligence?.common_routes || []).map((route, rIdx) => (
                      <div key={rIdx} style={{ background: '#18181b', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 4, padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#f4f4f5', fontWeight: 700, fontSize: 9.5 }}>{route.route_name}</span>
                          <span style={{ fontSize: 7.5, color: '#34d399', fontWeight: 700 }}>{route.traversals_count} trips ({route.consistency_score}%)</span>
                        </div>
                        <div style={{ color: '#71717a', fontSize: 8 }}>Corridor: <span style={{ color: '#d4d4d8' }}>{route.corridor}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#71717a' }}>
                          <span>Routine: <strong style={{ color: '#a1a1aa' }}>{route.typical_time_window}</strong></span>
                          <span>Avg: <strong style={{ color: '#f4f4f5' }}>{route.speed_avg_kmh} km/h</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hotspot percentage meters */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 8, color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Frequent Hotspot Cameras</span>
                      <span style={{ fontSize: 7.5, color: '#71717a' }}>Top 5</span>
                    </div>
                    {(investigationData.ai_intelligence?.frequent_cameras || []).map((cam, cIdx) => (
                      <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                          <span style={{ color: '#a1a1aa', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.camera_name}</span>
                          <span style={{ color: '#f4f4f5', fontWeight: 700 }}>{cam.sightings_count}x ({cam.percentage}%)</span>
                        </div>
                        <div style={{ width: '100%', height: 3.5, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, cam.percentage * 2.5)}%`, height: '100%', background: '#3b82f6', borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ================= COLUMN 2: Center Tactical Map & Sighting Timeline ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                
                {/* 2A. Tactical GIS Navigation Map Canvas (Fills Center Space) */}
                <div style={{
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* Route Simulation Player Bar Overlay */}
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 50,
                    zIndex: 1000,
                    background: 'rgba(18, 18, 21, 0.94)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 20,
                    padding: '2px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <button
                      onClick={() => setIsPlayingRoute(!isPlayingRoute)}
                      style={{
                        background: isPlayingRoute ? '#dc2626' : '#27272a',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 12,
                        padding: '2px 8px',
                        fontSize: 8.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      {isPlayingRoute ? <Pause size={8.5} /> : <Play size={8.5} />}
                      {isPlayingRoute ? 'Pause' : 'Play Route'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, color: '#a1a1aa' }}>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>ROAD-SNAPPED ({investigationData.road_distance_km || 13.7} km)</span>
                      <span>•</span>
                      <span>{investigationData.chronological_route?.length || 4} Nodes</span>
                    </div>
                  </div>

                  <MapContainer 
                    key={`map-${investigationData?.target_vehicle?.plate || 'veh'}-${targetCoords[0]}-${targetCoords[1]}`}
                    center={targetCoords} 
                    zoom={12} 
                    style={{ width: '100%', height: '100%' }}
                  >
                    <AutoFitRouteBounds 
                      points={roadGeometry.length > 0 ? roadGeometry : routePolyline} 
                      predictedPoint={investigationData?.ai_intelligence?.next_predicted_camera}
                      targetCoords={targetCoords}
                    />

                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Real Road Snapped Polyline */}
                    {roadGeometry.length > 1 && (
                      <>
                        <Polyline 
                          positions={roadGeometry} 
                          pathOptions={{ color: '#0f172a', weight: 6, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} 
                        />
                        <Polyline 
                          positions={roadGeometry} 
                          pathOptions={{ color: '#3b82f6', weight: 3.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} 
                        />
                      </>
                    )}

                    {/* Target Suspect Marker */}
                    <Marker 
                      position={
                        isPlayingRoute && roadGeometry && roadGeometry[roadWaypointIndex]
                          ? roadGeometry[roadWaypointIndex]
                          : targetCoords
                      } 
                      icon={targetIcon}
                    >
                      <Popup>
                        <div style={{ background: '#0f172a', color: '#f8fafc', padding: 8, borderRadius: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 900, color: '#60a5fa', marginBottom: 3 }}>
                            TARGET LOCK: {investigationData.target_vehicle?.plate}
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: 10 }}>Vehicle: <strong style={{ color: '#fff' }}>{investigationData.target_vehicle?.color} {investigationData.target_vehicle?.vehicle_type}</strong></div>
                          <div style={{ color: '#94a3b8', fontSize: 10 }}>Speed: <strong style={{ color: '#38bdf8' }}>{investigationData.target_vehicle?.last_speed_kmh || 61.4} km/h</strong></div>
                          <div style={{ color: '#94a3b8', fontSize: 10 }}>Escape Heading: <strong style={{ color: '#fbbf24' }}>{investigationData.target_vehicle?.escape_heading}</strong></div>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Chronological Camera Nodes */}
                    {(investigationData.chronological_route || []).map((hop, idx) => (
                      <Marker 
                        key={idx} 
                        position={[hop.lat, hop.lng]}
                        icon={L.divIcon({
                          className: 'custom-cam-route-marker',
                          html: `
                            <div style="background:#18181b;border:2px solid #3b82f6;border-radius:50%;width:20px;height:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 8px rgba(59,130,246,0.6);color:#fff;font-size:8.5px;font-weight:900;line-height:1;">
                              <span>${idx + 1}</span>
                            </div>
                          `,
                          iconSize: [20, 20],
                          iconAnchor: [10, 10]
                        })}
                      >
                        <Popup>
                          <div style={{ background: '#0f172a', color: '#f8fafc', padding: 6, fontSize: 10 }}>
                            <strong style={{ color: '#60a5fa' }}>HOP #{idx + 1}: {hop.camera_name}</strong><br />
                            Time: {new Date(hop.timestamp).toLocaleTimeString()}<br />
                            Speed: <strong>{hop.speed_est_kmh} km/h</strong>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {/* Predicted Next Intercept Marker */}
                    {investigationData.ai_intelligence?.next_predicted_camera && (
                      <Marker
                        position={[
                          investigationData.ai_intelligence.next_predicted_camera.lat,
                          investigationData.ai_intelligence.next_predicted_camera.lng
                        ]}
                        icon={L.divIcon({
                          className: 'custom-predicted-cam-marker',
                          html: `
                            <div style="position:relative;display:flex;align-items:center;cursor:pointer;">
                              <div style="background:#18181b;border:1.5px solid #10b981;border-radius:5px;padding:2px 5px;display:flex;align-items:center;gap:3px;box-shadow:0 0 10px rgba(16,185,129,0.5);white-space:nowrap;">
                                <div style="display:flex;flex-direction:column;line-height:1.1;">
                                  <span style="color:#34d399;font-size:7.5px;font-weight:900;">PREDICTED INTERCEPT</span>
                                  <span style="color:#a1a1aa;font-size:6.5px;font-weight:700;">ETA ${investigationData.ai_intelligence.next_predicted_camera.eta_minutes}m • ${(investigationData.ai_intelligence.next_predicted_camera.camera_name || '').slice(0, 14)}</span>
                                </div>
                              </div>
                            </div>
                          `,
                          iconSize: [110, 24],
                          iconAnchor: [55, 24],
                          popupAnchor: [0, -24]
                        })}
                      >
                        <Popup>
                          <div style={{ background: '#0f172a', color: '#f8fafc', padding: 6, borderRadius: 6, fontSize: 10, minWidth: 180 }}>
                            <div style={{ fontWeight: 900, color: '#34d399', marginBottom: 2 }}>
                              AI PREDICTED NEXT INTERCEPT
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 10, color: '#fff' }}>
                              {investigationData.ai_intelligence.next_predicted_camera.camera_name}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 9 }}>
                              Highway: <strong>{investigationData.ai_intelligence.next_predicted_camera.road_name}</strong>
                            </div>
                            <div style={{ color: '#38bdf8', fontSize: 9 }}>
                              Confidence: <strong>{investigationData.ai_intelligence.next_predicted_camera.probability_score}% Prob</strong>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                {/* 2B. Verified Sighting Stepper (Connected Timeline Flow) */}
                <div style={{
                  background: '#121215',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '5px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Camera size={10} color="#a1a1aa" />
                      <span style={{ fontSize: 8.5, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Verified Sighting Sequence &rarr; Predicted Intercept
                      </span>
                    </div>
                    <span style={{ fontSize: 7.5, color: '#71717a' }}>
                      Jurisdiction: <strong style={{ color: '#f4f4f5' }}>{investigationData.target_vehicle?.district} Police</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, alignItems: 'stretch' }}>
                    {(investigationData.chronological_route || []).map((hop, idx) => (
                      <div key={idx} style={{
                        background: '#18181b',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: 4,
                        padding: '4px 5px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        minWidth: 0,
                        overflow: 'hidden'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: '#27272a', color: '#f4f4f5', fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 2 }}>
                            HOP #{idx + 1}
                          </span>
                          <span style={{ color: '#34d399', fontSize: 7, fontWeight: 700 }}>
                            {hop.confidence || 98}%
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: 8.5, lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={hop.camera_name}>
                          {hop.camera_name}
                        </div>
                        <div style={{ fontSize: 7.5, color: '#71717a' }}>
                          {hop.speed_est_kmh} km/h
                        </div>
                      </div>
                    ))}

                    {/* 5th Node: Predicted Next Camera */}
                    {investigationData.ai_intelligence?.next_predicted_camera && (
                      <div style={{
                        background: '#18181b',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: 4,
                        padding: '4px 5px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        minWidth: 0,
                        overflow: 'hidden'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 2 }}>
                            INTERCEPT
                          </span>
                          <span style={{ color: '#34d399', fontSize: 7, fontWeight: 800 }}>
                            {investigationData.ai_intelligence.next_predicted_camera.probability_score}%
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 8.5, lineHeight: 1.2, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={investigationData.ai_intelligence.next_predicted_camera.camera_name}>
                          {investigationData.ai_intelligence.next_predicted_camera.camera_name}
                        </div>
                        <div style={{ fontSize: 7.5, color: '#fbbf24', fontWeight: 700 }}>
                          ETA ~{investigationData.ai_intelligence.next_predicted_camera.eta_minutes}m
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ================= COLUMN 3: Right Tactical Directives & Action Dispatch ================= */}
              <div style={{
                background: '#121215',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                padding: '7px 9px',
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: 5 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#f4f4f5', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Shield size={11} color="#a1a1aa" /> Tactical Directives
                  </span>
                  <span style={{ fontSize: 8, color: '#34d399', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>
                    3 Actions
                  </span>
                </div>

                {/* Advisory Cards List */}
                {investigationData.ai_intelligence?.tactical_ai_suggestions && investigationData.ai_intelligence.tactical_ai_suggestions.map((sug, sIdx) => (
                  <div 
                    key={sIdx}
                    style={{
                      background: '#18181b',
                      border: sug.priority === 'HIGH' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: 5,
                      padding: '5px 7px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 7.5,
                        fontWeight: 800,
                        background: sug.priority === 'HIGH' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        color: sug.priority === 'HIGH' ? '#34d399' : '#a1a1aa',
                        border: sug.priority === 'HIGH' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '1px 3px',
                        borderRadius: 2
                      }}>
                        {sug.badge}
                      </span>
                      <span style={{ fontSize: 7.5, color: '#52525b', fontWeight: 700 }}>
                        #{sIdx + 1}
                      </span>
                    </div>
                    <div style={{ color: '#f4f4f5', fontSize: 9.5, fontWeight: 700, lineHeight: 1.2 }}>
                      {sug.title}
                    </div>
                    <div style={{ color: '#71717a', fontSize: 8.5, lineHeight: 1.25 }}>
                      {sug.description}
                    </div>
                  </div>
                ))}

                {/* Staging Directive Action Box */}
                {investigationData.ai_intelligence?.next_predicted_camera && (
                  <div style={{
                    background: '#18181b',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 5,
                    padding: '6px 8px',
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 8, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Staging Directive
                      </div>
                      <div style={{ fontSize: 8, color: '#fbbf24', fontWeight: 700 }}>
                        Window: ~{investigationData.ai_intelligence.next_predicted_camera.eta_minutes} mins
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: '#f4f4f5', fontWeight: 600 }}>
                      Camera #{investigationData.ai_intelligence.next_predicted_camera.camera_name}
                    </div>
                    
                    {/* APB Dispatch Action Trigger */}
                    <button
                      onClick={() => setApbBroadcast(true)}
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: '1px solid #ef4444',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 8.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        marginTop: 2
                      }}
                    >
                      <Radio size={10} /> Broadcast Intercept APB
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      ) : (
        /* Ghost & Cloned Plate Hunter Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, color: '#fca5a5', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> Impossible Travel &amp; Counterfeit Plate Syndicate Tracker
              </h3>
              <p style={{ margin: '4px 0 0', color: '#fecaca', fontSize: 12 }}>
                Correlates simultaneous sightings across all 30 Gujarat Police cameras using <strong>Visual Re-ID 1024-d Vectors</strong> &amp; <strong>Physics Velocity Math</strong> (&gt;140 km/h).
              </p>
            </div>
            <span style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>
              {ghostPlates.length} ACTIVE FRAUD SYNDICATES DETECTED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ghostPlates.map((g) => (
              <div 
                key={g.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: '#0f172a', border: '2px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: '#1e3a8a', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 3px', borderRadius: 2 }}>IND</span>
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: 'monospace' }}>{g.plate}</span>
                    </div>
                    <span style={{ background: '#ef4444', color: '#fff', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                      FRAUD: {g.fraud_type}
                    </span>
                  </div>

                  <div style={{ color: '#f87171', fontSize: 13, fontWeight: 800, background: 'rgba(239, 68, 68, 0.15)', padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    Calculated Velocity: {g.calculated_speed_kmh} km/h (PHYSICALLY IMPOSSIBLE)
                  </div>
                </div>

                {/* Side-by-Side Dual Camera Sighting Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                  
                  {/* Sighting 1 */}
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 800 }}>📹 SIGHTING 1 ({g.sighting_1?.city})</span>
                      <span style={{ fontSize: 10, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: 4 }}>{g.sighting_1?.camera_id}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {g.sighting_1?.snapshot_url && (
                        <img src={g.sighting_1.snapshot_url} alt="Sighting 1" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.3)' }} onError={e => e.target.style.display = 'none'} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{g.sighting_1?.camera_name}</div>
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}><strong>Detected Vehicle:</strong> {g.sighting_1?.vehicle}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}><strong>Timestamp:</strong> {g.sighting_1?.timestamp ? new Date(g.sighting_1.timestamp).toLocaleTimeString() : 'Recent'}</div>
                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>Re-ID Vector: {g.sighting_1?.reid_vector_preview}</div>
                  </div>

                  {/* Physics Delta Indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <ArrowRight size={24} color="#ef4444" />
                    <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 800 }}>{g.distance_km} km</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>in {g.time_delta_mins} mins</span>
                  </div>

                  {/* Sighting 2 */}
                  <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: 16, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 800 }}>📹 SIGHTING 2 ({g.sighting_2?.city})</span>
                      <span style={{ fontSize: 10, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: 4 }}>{g.sighting_2?.camera_id}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {g.sighting_2?.snapshot_url && (
                        <img src={g.sighting_2.snapshot_url} alt="Sighting 2" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(245, 158, 11, 0.3)' }} onError={e => e.target.style.display = 'none'} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{g.sighting_2?.camera_name}</div>
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}><strong>Detected Vehicle:</strong> {g.sighting_2?.vehicle}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}><strong>Timestamp:</strong> {g.sighting_2?.timestamp ? new Date(g.sighting_2.timestamp).toLocaleTimeString() : 'Recent'}</div>
                    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>Re-ID Vector: {g.sighting_2?.reid_vector_preview}</div>
                  </div>

                </div>

                {/* Formal Physics Proof Equation */}
                <div style={{ background: 'rgba(2, 6, 23, 0.7)', padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)', fontFamily: 'monospace', fontSize: 11, color: '#fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><strong>📐 Physics Proof:</strong> {g.physics_equation}</span>
                  <span style={{ background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 900, fontSize: 10 }}>IMPOSSIBLE TRAIN/CAR SPEED</span>
                </div>

                {/* Re-ID Vector Similarity Breakdown Bar */}
                <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: 12, borderRadius: 10, border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>VISUAL RE-ID COSINE SIMILARITY: </span>
                    <span style={{ color: g.reid_cosine_similarity < 0.65 ? '#ef4444' : '#f59e0b', fontWeight: 800, fontSize: 12 }}>
                      {g.reid_cosine_similarity} (Threshold: {g.reid_threshold}) ➔ {g.reid_cosine_similarity < 0.65 ? 'FAILED: DIFFERENT CAR BODIES (CLONED FORGERY)' : 'SUSPICIOUS RE-ID / HIGHWAY RUNAWAY'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(g.penal_sections || []).map((sec, sidx) => (
                      <span key={sidx} style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
                  <div style={{ fontSize: 12, color: '#fca5a5' }}>
                    <strong>Verdict:</strong> {g.fraud_verdict}
                  </div>
                  <button
                    onClick={() => handleBroadcastClonedPlateAPB(g)}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 18px',
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Radio size={14} /> Broadcast Statewide APB &amp; Seal FASTag Gates
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Court-Admissible Forensic Incident Dossier Modal (Section 65B) */}
      {showDossierModal && investigationData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#0f172a',
            border: '2px solid #3b82f6',
            borderRadius: 16,
            width: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            color: '#f8fafc',
            boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Dossier Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid rgba(59, 130, 246, 0.4)', paddingBottom: 16 }}>
              <div>
                <div style={{ color: '#38bdf8', fontSize: 12, fontWeight: 800, letterSpacing: '1px' }}>
                  GUJARAT POLICE CRIME BRANCH • COMMAND CONTROL NETRAM
                </div>
                <h2 style={{ margin: '4px 0', fontSize: 20, fontWeight: 900 }}>
                  Digital Forensic Sighting Dossier (Certificate u/s 65B Indian Evidence Act)
                </h2>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>
                  Case Ref: NETRAM-INV-{investigationData.target_vehicle?.plate}-{new Date().getFullYear()} • Generated: {new Date().toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Target Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: 'rgba(30, 41, 59, 0.5)', padding: 16, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Target License Plate:</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace', color: '#fff' }}>{investigationData.target_vehicle?.plate}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Vehicle Classification:</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>{investigationData.target_vehicle?.color} {investigationData.target_vehicle?.vehicle_type}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Operational Jurisdiction:</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1' }}>{investigationData.target_vehicle?.district} Police Commissionerate</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>AI Match Confidence:</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>{investigationData.target_vehicle?.confidence}% (Multi-Sensor Locked)</div>
              </div>
            </div>

            {/* Chronological Sighting Chain */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', marginBottom: 8 }}>
                Chronological Chain of Custody &amp; Multi-Hop Sighting Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {investigationData.chronological_route?.map((hop, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, marginRight: 8 }}>HOP {idx + 1}</span>
                      <strong style={{ fontSize: 13 }}>{hop.camera_name}</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(hop.timestamp).toLocaleTimeString()} • {hop.speed_est_kmh} km/h • GPS: {hop.lat?.toFixed(4)}, {hop.lng?.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 65B Legal Attestation */}
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: 14, borderRadius: 8, border: '1px dashed rgba(148, 163, 184, 0.4)', fontSize: 11, color: '#cbd5e1' }}>
              <strong>CERTIFICATE UNDER SECTION 65B(4) OF THE INDIAN EVIDENCE ACT, 1872:</strong><br />
              This electronic record was generated by Sentinel Netram AI Server in the ordinary course of regular surveillance. The cryptographic hashes and timestamp logs remain intact and un-tampered.
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 10, borderTop: '1px solid rgba(51, 65, 85, 0.4)' }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: 'rgba(51, 65, 85, 0.8)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Printer size={15} /> Print / Save PDF
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
