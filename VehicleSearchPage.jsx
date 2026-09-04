import { useState, useMemo } from 'react'
import { Search, MapPin, Clock, Car, ChevronRight, AlertTriangle } from 'lucide-react'
import { VehicleSearchMap } from '../components/MapComponents'
import { searchVehicle, VAHAN_DB } from '../data/sampleData'

export function VehicleSearchPage({ cameras, detections }) {
  const [query, setQuery] = useState('');
  const [sightings, setSightings] = useState(null);
  const [selectedSighting, setSelectedSighting] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState(null);

  const handleSearch = () => {
    if (!query.trim()) return;
    const results = searchVehicle(query, cameras, detections);
    setSightings(results);
    setSelectedSighting(null);
    const norm = query.replace(/\s/g, '').toUpperCase();
    setVehicleInfo(VAHAN_DB[norm] || null);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="vehicle-search-page">
      <div className="search-hero">
        <h2>🔍 Vehicle Tracking & Route Reconstruction</h2>
        <p>Search any vehicle registration number to trace its movement across all integrated cameras</p>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            placeholder="Enter vehicle number (e.g. GJ 01 AB 1234)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="search-btn" onClick={handleSearch}>
          <Search size={16} /> Track Vehicle
        </button>
      </div>

      {sightings !== null && (
        <>
          {vehicleInfo && (
            <div style={{ maxWidth: 600, margin: '0 auto 16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>VAHAN Database Match</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  ['Owner', vehicleInfo.owner],
                  ['Vehicle', vehicleInfo.vehicle],
                  ['Color', vehicleInfo.color],
                  ['Year', vehicleInfo.year],
                  ['RC Valid', vehicleInfo.rcValid],
                  ['Insurance', vehicleInfo.insurance],
                ].map(([label, val]) => (
                  <div key={label} style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sightings.length === 0 ? (
            <div className="empty-state">
              <AlertTriangle size={40} />
              <h3>No Sightings Found</h3>
              <p>Vehicle "{query.toUpperCase()}" was not detected by any integrated camera in the current timeframe.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Found <strong style={{ color: 'var(--accent-primary)' }}>{sightings.length}</strong> sightings across <strong style={{ color: 'var(--accent-primary)' }}>{new Set(sightings.map(s => s.cameraId)).size}</strong> cameras
              </div>
              <div className="search-results">
                <div className="search-results-list">
                  {sightings.map((s, i) => (
                    <div key={s.id} className={`sighting-card ${selectedSighting?.id === s.id ? 'active' : ''}`} onClick={() => setSelectedSighting(s)}>
                      <div className="sighting-thumbnail">
                        <Car size={24} />
                      </div>
                      <div className="sighting-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="plate">{s.plate}</span>
                          <span style={{ fontSize: 10, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>
                            {s.color || 'Vehicle'}
                          </span>
                          <span style={{ fontSize: 9, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                            ⚡ SR Enhanced
                          </span>
                        </div>
                        <div className="camera-name">
                          <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                          {s.cameraName} — {s.city}
                        </div>
                        <div className="timestamp">
                          <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {new Date(s.timestamp).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <button 
                            style={{ 
                              background: 'transparent', 
                              border: '1px solid var(--border-color)', 
                              color: 'var(--accent-primary)', 
                              fontSize: 10, 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              alert(`[ReID Engine] Tracing vehicle fingerprint (${s.color} ${s.vehicleType || 'Car'}) across all 30 Gujarat Police cameras. Cosine similarity threshold: 0.70`);
                            }}
                          >
                            🔍 ReID Visual Match
                          </button>
                        </div>
                      </div>
                      <span className={`sighting-confidence ${parseFloat(s.confidence) > 90 ? 'high' : 'medium'}`}>
                        {s.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="search-results-map">
                  <VehicleSearchMap sightings={sightings} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {sightings === null && (
        <div className="empty-state" style={{ flex: 1 }}>
          <Car size={48} />
          <h3>Enter a Vehicle Registration Number</h3>
          <p>Try searching: <strong style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => { setQuery('GJ 01 AB 1234'); }}>GJ 01 AB 1234</strong> or <strong style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => { setQuery('GJ 01 XX 9999'); }}>GJ 01 XX 9999</strong></p>
        </div>
      )}
    </div>
  );
}
