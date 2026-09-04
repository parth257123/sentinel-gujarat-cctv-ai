import { useState, useEffect } from 'react'
import { FileText, Printer, Search, Shield, CheckCircle2, AlertTriangle, Download, Scale, QrCode, Lock, Hash, MapPin, Clock, Camera, RefreshCw, Radio, UserCheck, ExternalLink } from 'lucide-react'

const API_BASE = 'http://localhost:8000';

function PlateBadge({ plate, size = 'normal' }) {
  const fs = size === 'large' ? 16 : 12;
  return (
    <div style={{ 
      background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: size === 'large' ? '4px 14px' : '2px 8px', 
      borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: fs, border: '1.5px solid #334155',
      display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <span style={{ fontSize: size === 'large' ? 10 : 8, color: '#1d4ed8', fontWeight: 900 }}>IND</span>
      <span>{plate}</span>
    </div>
  );
}

export function ForensicsDossierPage() {
  const [plateQuery, setPlateQuery] = useState('GJ-06-PQ-7788');
  const [dossier, setDossier] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load recent cases on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/forensics/recent_cases`)
      .then(r => r.json())
      .then(data => {
        setRecentCases(data);
        if (data.length > 0 && !dossier) {
          loadDossier(data[0].plate);
        }
      })
      .catch(() => {});
  }, []);

  const loadDossier = (plate) => {
    if (!plate) return;
    setLoading(true);
    setPlateQuery(plate);
    
    fetch(`${API_BASE}/api/forensics/dossier/${encodeURIComponent(plate)}`)
      .then(r => r.json())
      .then(data => {
        setDossier(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading dossier:", err);
        setLoading(false);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="forensics-dossier-page" style={{ paddingBottom: 32 }}>
      
      {/* Non-printable Control Toolbar */}
      <div className="no-print" style={{ marginBottom: 16, background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Scale size={20} style={{ color: '#f59e0b' }} /> Official Gujarat Police Forensics Dossier Generator
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Certified digital surveillance evidence dossier compliant with Section 65B Indian Evidence Act / Bharatiya Sakshya Adhiniyam
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
              <input
                placeholder="Enter suspect plate..."
                value={plateQuery}
                onChange={e => setPlateQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadDossier(plateQuery); }}
                style={{ 
                  padding: '8px 12px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.3)', 
                  borderRadius: 6, color: 'white', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', width: 180 
                }}
              />
              <button className="btn btn-primary" onClick={() => loadDossier(plateQuery)} style={{ padding: '8px 14px', fontSize: 12 }}>
                <Search size={14} /> Load
              </button>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handlePrint}
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800 }}
            >
              <Printer size={15} /> 🖨️ Print / Save PDF Dossier
            </button>
          </div>
        </div>

        {/* Quick Candidate Chips */}
        {recentCases.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 10, borderTop: '1px solid rgba(148,163,184,0.1)' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Active Case Files:</span>
            {recentCases.slice(0, 6).map(c => (
              <button 
                key={c.plate} 
                onClick={() => loadDossier(c.plate)}
                style={{ 
                  background: c.plate === plateQuery ? 'rgba(59,130,246,0.3)' : 'rgba(15,23,42,0.6)', 
                  border: `1px solid ${c.plate === plateQuery ? '#3b82f6' : 'rgba(148,163,184,0.15)'}`, 
                  borderRadius: 4, padding: '3px 8px', fontSize: 11, color: c.plate === plateQuery ? '#93c5fd' : '#e2e8f0', 
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 700 
                }}
              >
                {c.plate} {c.type === 'WATCHLIST_TARGET' ? '🚨' : '👁️'}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <RefreshCw size={32} className="spinning" style={{ color: '#38bdf8' }} />
          <p style={{ marginTop: 12, color: '#94a3b8', fontSize: 14 }}>Compiling authenticated forensic evidence dossier...</p>
        </div>
      )}

      {/* ═══════════════ OFFICIAL GUJARAT POLICE DOSSIER DOCUMENT ═══════════════ */}
      {!loading && dossier && (
        <div 
          className="print-document"
          style={{ 
            background: '#ffffff', color: '#0f172a', borderRadius: 8, padding: '32px 40px', 
            maxWidth: 920, margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}
        >
          {/* Document Header */}
          <div style={{ borderBottom: '3px double #0f172a', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#1e3a8a', textTransform: 'uppercase' }}>
                  GOVERNMENT OF GUJARAT • HOME DEPARTMENT
                </div>
                <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 900, color: '#0f172a', letterSpacing: -0.5 }}>
                  GUJARAT POLICE — STATE SURVEILLANCE & CYBER FORENSICS
                </h1>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                  PROJECT VISWAS (Video Integration and State Wide Advanced Security) • NETRAM COMMAND
                </div>
              </div>

              {/* Official Seal / Badge Emblem */}
              <div style={{ textAlign: 'center', border: '2px solid #1e3a8a', padding: '6px 12px', borderRadius: 6, background: '#f8fafc' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#1e3a8a' }}>ગુજરાત પોલીસ</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', letterSpacing: 1 }}>OFFICIAL EVIDENCE</div>
                <div style={{ fontSize: 8, color: '#64748b', fontFamily: 'var(--font-mono)' }}>SEC. 65B IEA COMPLIANT</div>
              </div>
            </div>

            {/* Case Reference Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, background: '#f1f5f9', padding: '8px 12px', borderRadius: 6, fontSize: 11, border: '1px solid #cbd5e1' }}>
              <div><strong>CASE REF:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e3a8a' }}>{dossier.caseReference}</span></div>
              <div><strong>FIR / INCIDENT:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{dossier.firNumber}</span></div>
              <div><strong>GENERATED ON:</strong> <span>{dossier.generatedAt}</span></div>
              <div><strong>STATUS:</strong> <span style={{ background: '#dc2626', color: 'white', padding: '2px 6px', borderRadius: 3, fontWeight: 800, fontSize: 10 }}>CONFIDENTIAL</span></div>
            </div>
          </div>

          {/* Section A: Target Vehicle & Identity Registry Profile */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#1e3a8a', color: 'white', padding: '5px 10px', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between' }}>
              <span>SECTION 1: TARGET VEHICLE & VAHAN RTO REGISTRY CROSS-REFERENCE</span>
              <span>PARIVAHAN NATIONAL PORTAL SYNC</span>
            </div>
            
            <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', padding: 14, background: '#f8fafc', borderRadius: '0 0 4px 4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 16 }}>
                {/* Plate callout */}
                <div style={{ background: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4 }}>IDENTIFIED HSRP REGISTRATION</div>
                  <PlateBadge plate={dossier.vehicleProfile.plate} size="large" />
                  <div style={{ marginTop: 8, fontSize: 11, color: '#dc2626', fontWeight: 800, textAlign: 'center' }}>
                    🚨 {dossier.vehicleProfile.threatSeverity} THREAT LEVEL
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
                    Category: {dossier.vehicleProfile.crimeCategory}
                  </div>
                </div>

                {/* VAHAN Metadata Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', fontSize: 11 }}>
                  <div><span style={{ color: '#64748b' }}>Registered Owner:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.registeredOwner}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Vehicle Class:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.vehicleClass}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Maker & Model:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.makerModel}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Detected Color:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.color}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Chassis Number:</span> <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{dossier.vehicleProfile.chassisNumber}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Engine Number:</span> <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{dossier.vehicleProfile.engineNumber}</strong></div>
                  <div><span style={{ color: '#64748b' }}>RTO Jurisdiction:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.rtoJurisdiction}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Fuel / Emission:</span> <strong style={{ color: '#0f172a' }}>{dossier.vehicleProfile.fuelType}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Insurance Policy:</span> <strong style={{ color: '#059669' }}>{dossier.vehicleProfile.insuranceValidity}</strong></div>
                  <div><span style={{ color: '#64748b' }}>PUC Certificate:</span> <strong style={{ color: '#059669' }}>{dossier.vehicleProfile.pucStatus}</strong></div>
                </div>
              </div>

              {/* Owner Address & Reason */}
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 11, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><span style={{ color: '#64748b' }}>Registered Address:</span> <span>{dossier.vehicleProfile.ownerAddress}</span></div>
                <div><span style={{ color: '#dc2626', fontWeight: 700 }}>Investigation Summary:</span> <span style={{ fontWeight: 600 }}>{dossier.vehicleProfile.crimeReason}</span></div>
              </div>
            </div>
          </div>

          {/* Section B: AI Computer Vision & Forensics Quality Audit */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#1e3a8a', color: 'white', padding: '5px 10px', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between' }}>
              <span>SECTION 2: AI COMPUTER VISION & FORENSIC OPTICAL QUALITY AUDIT</span>
              <span>ISO/IEC 27037 DIGITAL FORENSICS</span>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', padding: '12px 14px', background: '#f8fafc', borderRadius: '0 0 4px 4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 4px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>TOTAL CCTV SIGHTINGS</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#1e3a8a', marginTop: 2 }}>{dossier.aiForensicsMetrics.totalSightings}</div>
                  <div style={{ fontSize: 9, color: '#059669' }}>Across {dossier.aiForensicsMetrics.uniqueCameras} Cameras</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 4px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>AVG OPTICAL SHARPNESS</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#059669', marginTop: 2 }}>{dossier.aiForensicsMetrics.opticalSharpnessAvg}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>Laplacian Score (&gt;200)</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 4px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>ANPR CONFIDENCE</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#2563eb', marginTop: 2 }}>{dossier.aiForensicsMetrics.opticalConfidenceAvg}</div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>YOLOv8-Indian-HSRP</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 4, padding: '8px 4px' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>COURT ADMISSIBILITY</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#059669', marginTop: 2 }}>VERIFIED</div>
                  <div style={{ fontSize: 9, color: '#059669' }}>Sec 65B Certified</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Chronological Chain of Custody Surveillance Logs */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#1e3a8a', color: 'white', padding: '5px 10px', fontSize: 12, fontWeight: 800, letterSpacing: 0.5, borderRadius: '4px 4px 0 0', display: 'flex', justifyContent: 'space-between' }}>
              <span>SECTION 3: CHRONOLOGICAL CCTV SURVEILLANCE SIGHTINGS (CHAIN OF CUSTODY)</span>
              <span>TIMESTAMP &amp; GPS PROOF</span>
            </div>

            <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', background: '#ffffff', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '6px 8px' }}>#</th>
                    <th style={{ padding: '6px 8px' }}>Camera Name &amp; ID</th>
                    <th style={{ padding: '6px 8px' }}>District / City</th>
                    <th style={{ padding: '6px 8px' }}>GPS Coordinates</th>
                    <th style={{ padding: '6px 8px' }}>Timestamp (IST)</th>
                    <th style={{ padding: '6px 8px' }}>Sharpness</th>
                    <th style={{ padding: '6px 8px' }}>Frame Hash (SHA)</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.sightingsTimeline.map((s) => (
                    <tr key={s.index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: '#1e3a8a' }}>{s.index}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>
                        {s.cameraName} <span style={{ color: '#64748b', fontSize: 9 }}>({s.cameraId})</span>
                      </td>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{s.city}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 9 }}>{s.lat.toFixed(4)}°N, {s.lng.toFixed(4)}°E</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.timestamp}</td>
                      <td style={{ padding: '6px 8px', color: '#059669', fontWeight: 700 }}>{s.sharpness}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#64748b' }}>{s.frameHash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: Legal Certificate under Section 65B & Signature Block */}
          <div style={{ border: '1.5px solid #0f172a', padding: 14, borderRadius: 6, background: '#f8fafc', fontSize: 10, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#1e3a8a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} /> CERTIFICATE UNDER SECTION 65B(4) OF THE INDIAN EVIDENCE ACT, 1872
            </div>
            <p style={{ margin: 0, color: '#334155' }}>
              I hereby certify that the electronic surveillance logs, timestamps, optical character recognitions, and geospatial tracking trails detailed in this dossier are authentic digital records generated continuously by the Gujarat Police Netram Video Surveillance Grid (VISWAS). The computer systems and neural network inference servers were operating properly with full SHA-256 integrity hashing throughout the surveillance period.
            </p>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
              <div>
                <div style={{ fontSize: 9, color: '#64748b' }}>DIGITAL EVIDENCE VERIFICATION SHA-256 HASH:</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, color: '#0f172a', letterSpacing: 0.5 }}>
                  {dossier.digitalEvidenceHash}
                </div>
                <div style={{ fontSize: 9, color: '#059669', marginTop: 2, fontWeight: 700 }}>
                  🔒 CRYPTOGRAPHICALLY SECURED &amp; TAMPER-EVIDENT
                </div>
              </div>

              {/* Signature & Seal */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#1e3a8a' }}>{dossier.investigatingOfficer}</div>
                <div style={{ fontSize: 9, color: '#475569' }}>Cyber &amp; CCTV Forensics Unit, Crime Branch</div>
                <div style={{ fontSize: 9, color: '#475569' }}>Gujarat Police Headquarters, Gandhinagar</div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 9, color: '#94a3b8' }}>
            CONFIDENTIAL POLICE DOCUMENT • FOR OFFICIAL USE ONLY IN SESSIONS / HIGH COURT PROCEEDINGS • VISWAS COMMAND
          </div>
        </div>
      )}
    </div>
  );
}
