import React, { useState } from 'react'
import { AlertTriangle, Shield, Radio, Navigation, CheckCircle2, FileText, X, Bell, Zap, Volume2, VolumeX } from 'lucide-react'

export function TacticalInterceptModal({ alert, onClose, onDispatch, onAcknowledge }) {
  const [isDispatched, setIsDispatched] = useState(alert.status === 'DISPATCHED');
  const [showFIRModal, setShowFIRModal] = useState(false);

  if (!alert) return null;

  const handleDispatch = () => {
    setIsDispatched(true);
    if (onDispatch) onDispatch(alert.alertId || alert.id);
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(5, 10, 20, 0.85)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        className="tactical-modal-content"
        style={{
          width: '90%',
          maxWidth: 680,
          background: '#0d131f',
          border: '2px solid #ef4444',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.15)',
          borderRadius: 12,
          overflow: 'hidden',
          animation: 'modal-pop 0.3s ease-out'
        }}
      >
        {/* Header with Red Strobe */}
        <div style={{ background: 'linear-gradient(90deg, #991b1b, #7f1d1d)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: 4, 
              fontSize: 11, fontWeight: 900, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 0 10px rgba(239,68,68,0.8)'
            }}>
              <AlertTriangle size={14} /> TACTICAL INTERCEPT ALERT
            </span>
            <span style={{ fontSize: 12, opacity: 0.9, fontFamily: 'var(--font-mono)' }}>
              VISWAS COMMAND ROOM • GUJARAT POLICE
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: 18 }}>
          {/* Top Plate & Reason Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {alert.severity || 'CRITICAL'} PRIORITY TARGET
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginTop: 2 }}>
                {alert.reason || 'Watchlisted Suspect Vehicle'}
              </div>
            </div>
            <div style={{ 
              background: '#f8fafc', color: '#0f172a', fontWeight: 900, padding: '6px 14px', 
              borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 18, border: '2px solid #334155',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 900, borderRight: '1.5px solid #cbd5e1', paddingRight: 6 }}>IND</span>
              <span>{alert.plate}</span>
            </div>
          </div>

          {/* Dossier Specs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CAMERA LOCATION & NODE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
                {alert.cameraName || '02 Janpath'} ({alert.city || 'Ahmedabad'})
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                Node ID: {alert.cameraId || 'CAM-002'} • Conf: {alert.confidence || 98.4}%
              </div>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>REGISTERED OWNER / VEHICLE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>
                {alert.ownerName || 'Suresh Solanki'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {alert.vehicleModel || 'Mahindra Scorpio (White)'} • Case: {alert.firNumber || 'FIR-CR-89/24'}
              </div>
            </div>
          </div>

          {/* Nearest PCR Unit Telemetry */}
          <div style={{ 
            background: isDispatched ? 'rgba(16, 185, 129, 0.12)' : 'linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(15, 23, 42, 0.6))', 
            border: isDispatched ? '1px solid #10b981' : '1px solid rgba(59, 130, 246, 0.35)', 
            borderRadius: 8, padding: '12px 16px', marginBottom: 16 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={18} style={{ color: isDispatched ? '#10b981' : '#60a5fa' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isDispatched ? '#10b981' : '#93c5fd' }}>
                  {isDispatched ? '🚨 PCR UNIT DISPATCHED & EN ROUTE' : 'TACTICAL PCR INTERCEPT UNIT'}
                </span>
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isDispatched ? '#10b981' : '#94a3b8' }}>
                {alert.pcrFrequency || 'VHF Ch 4'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  {alert.pcrUnit || 'PCR-ECHO-12'} — {alert.pcrArea || 'Ahmedabad West'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Officer: {alert.pcrOfficer || 'PSI V. K. Patel'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: isDispatched ? '#10b981' : '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                  {alert.pcrEtaMins || 3} MIN ETA
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Distance: {alert.pcrDistanceKm || 1.4} km
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                if (onAcknowledge) onAcknowledge(alert.alertId || alert.id);
                onClose();
              }}
              style={{ fontSize: 12 }}
            >
              <CheckCircle2 size={14} /> Acknowledge
            </button>
            <button 
              className="btn" 
              onClick={() => setShowFIRModal(true)}
              style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: 12 }}
            >
              <FileText size={14} /> Instant E-Challan / FIR
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleDispatch}
              disabled={isDispatched}
              style={{ 
                background: isDispatched ? '#059669' : '#dc2626', 
                border: 'none', fontSize: 13, fontWeight: 700, padding: '8px 16px',
                boxShadow: isDispatched ? 'none' : '0 0 15px rgba(220, 38, 38, 0.6)'
              }}
            >
              <Navigation size={15} /> {isDispatched ? 'Patrol Unit En Route' : `Dispatch ${alert.pcrUnit || 'PCR'} Now`}
            </button>
          </div>
        </div>
      </div>

      {/* E-Challan / FIR Modal Slip */}
      {showFIRModal && (
        <div className="modal-overlay" style={{ zIndex: 100000 }} onClick={() => setShowFIRModal(false)}>
          <div className="modal" style={{ maxWidth: 450, background: '#0f172a', border: '1px solid #38bdf8' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#1e293b' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>📋 Gujarat Police E-Challan & FIR Dossier</h3>
              <button className="detail-close" onClick={() => setShowFIRModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #334155', paddingBottom: 10, marginBottom: 10 }}>
                <strong style={{ fontSize: 14, color: '#38bdf8' }}>GUJARAT STATE TRAFFIC CONTROL</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>VISWAS AI Command & Enforcement System</div>
              </div>
              <div><strong>FIR / Challan No:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{alert.firNumber || 'ECH-GUJ-89421'}</span></div>
              <div><strong>Target Plate:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{alert.plate}</span></div>
              <div><strong>Offense Category:</strong> {alert.reason}</div>
              <div><strong>Camera Junction:</strong> {alert.cameraName} ({alert.city})</div>
              <div><strong>Time of Intercept:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Assigned PCR Unit:</strong> {alert.pcrUnit}</div>
              <div style={{ marginTop: 12, padding: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#f87171', fontWeight: 600 }}>
                ⚠️ Vehicle flagged for physical vehicle interception & officer verification at next checkpost.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowFIRModal(false)}>Print / Transmit to PCR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
