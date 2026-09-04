import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { TrendingUp, Camera, AlertTriangle, Activity, CheckCircle2, RefreshCw, HardDrive, Database, Gauge, Eye, Shield, Layers, Zap, BarChart3, Clock, MapPin } from 'lucide-react'

const API_BASE = 'http://localhost:8000';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
const GRADIENT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'];

const StatCard = ({ icon: Icon, label, value, sub, color = '#3b82f6', gradient }) => (
  <div style={{
    background: gradient || 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
    border: `1px solid ${color}22`, borderRadius: 14, padding: '18px 20px',
    position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
  }}>
    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${color}08` }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ background: `${color}18`, padding: 6, borderRadius: 8, display: 'flex' }}>
        <Icon size={15} color={color} />
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>{sub}</div>}
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, color = '#3b82f6' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <div style={{ background: `${color}15`, padding: 8, borderRadius: 10, display: 'flex' }}>
      <Icon size={18} color={color} />
    </div>
    <div>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{title}</h3>
      {subtitle && <span style={{ fontSize: 11, color: '#64748b' }}>{subtitle}</span>}
    </div>
  </div>
);

const ChartCard = ({ children, style = {} }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.6))',
    border: '1px solid rgba(51,65,85,0.4)', borderRadius: 14, padding: '18px 20px',
    ...style,
  }}>
    {children}
  </div>
);

const tooltipStyle = {
  background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 10, color: '#f1f5f9', fontSize: 12, backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export function AnalyticsPage({ cameras, detections, alerts, watchlist }) {
  const onlineCt = cameras.filter(c => c.status === 'online').length;
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/analytics`)
      .then(res => res.json())
      .then(data => {
        setApiData(data);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(err => {
        console.log('Analytics fetch error:', err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (!apiData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #334155', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading analytics from 77,000+ detections...</p>
      </div>
    );
  }

  const hourlyData = apiData.hourlyTraffic || [];
  const vehicleTypes = apiData.vehicleTypes || [];
  const topPlates = apiData.topPlates || [];
  const districtData = apiData.districtBreakdown || [];
  const cameraRankings = apiData.cameraRankings || [];
  const speedDistribution = apiData.speedDistribution || [];
  const confidenceHistogram = apiData.confidenceHistogram || [];
  const dailyTrend = apiData.dailyTrend || [];
  const dataCollection = apiData.dataCollection || {};
  const maxPlateCount = topPlates.length > 0 ? topPlates[0].count : 1;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={22} color="#6366f1" /> Surveillance Analytics Command
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
            Real-time intelligence from {apiData.totalDetections.toLocaleString()} plate detections across {cameras.length} Gujarat Police cameras
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(30,41,59,0.6)', padding: '4px 10px', borderRadius: 6 }}>
              <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAnalytics} disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#a5b4fc',
              fontSize: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard icon={Eye} label="Total Detections" value={apiData.totalDetections.toLocaleString()} sub={<><Activity size={10} /> From real ANPR scans</>} color="#6366f1" />
        <StatCard icon={Shield} label="Unique Plates" value={apiData.uniquePlates.toLocaleString()} sub={<><CheckCircle2 size={10} /> Gujarat RTO validated</>} color="#10b981" />
        <StatCard icon={Gauge} label="Avg Confidence" value={apiData.avgConfidence} sub={<><TrendingUp size={10} /> {apiData.highConfRate} above 80%</>} color="#f59e0b" />
        <StatCard icon={Camera} label="Live Cameras" value={`${onlineCt} / ${cameras.length}`} sub={<><CheckCircle2 size={10} /> Active feeds</>} color="#06b6d4" />
        <StatCard icon={HardDrive} label="Data Harvested" value={`${dataCollection.totalFrames?.toLocaleString() || 0}`} sub={<><Database size={10} /> {dataCollection.sizeGB || 0} GB on disk</>} color="#ec4899" />
      </div>

      {/* ── Row 2: Model Info Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
        border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 20px',
        marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
      }}>
        {[
          { label: 'Active Model', value: 'YOLOv12 (80-epoch)', color: '#38bdf8' },
          { label: 'Deblur Engine', value: 'LiteNAFNet (109 FPS)', color: '#10b981' },
          { label: 'Avg Sharpness', value: `${apiData.avgSharpness} (Laplacian)`, color: '#f59e0b' },
          { label: 'Enhancement', value: 'CLAHE + 1280p HD', color: '#a855f7' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginTop: 3 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Main Charts — Hourly Traffic + Vehicle Classification ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 20 }}>
        <ChartCard>
          <SectionHeader icon={BarChart3} title="Detection Volume (24-Hour Profile)" subtitle="Real timestamps from ANPR database" color="#6366f1" />
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} interval={2} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="detections" stroke="#6366f1" strokeWidth={2.5} fill="url(#hourlyGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No hourly data</div>
          )}
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={Layers} title="Vehicle Classification" subtitle="AI-classified breakdown" color="#10b981" />
          {vehicleTypes.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={vehicleTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={40} paddingAngle={3} strokeWidth={0}>
                    {vehicleTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px', marginTop: 6 }}>
                {vehicleTypes.map((t, i) => (
                  <span key={t.name} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    <strong style={{ color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.value.toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No data</div>
          )}
        </ChartCard>
      </div>

      {/* ── Row 4: Camera Rankings + Confidence Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <ChartCard>
          <SectionHeader icon={Camera} title="Top Performing Cameras" subtitle="By total plate detections" color="#06b6d4" />
          {cameraRankings.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cameraRankings} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis dataKey="camera" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="detections" radius={[0, 6, 6, 0]}>
                  {cameraRankings.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No camera data</div>
          )}
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={Gauge} title="OCR Confidence Distribution" subtitle="Detection quality histogram" color="#f59e0b" />
          {confidenceHistogram.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={confidenceHistogram}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {confidenceHistogram.map((entry, i) => (
                    <Cell key={i} fill={entry.range.includes('80') ? '#10b981' : entry.range.includes('60') ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No confidence data</div>
          )}
        </ChartCard>
      </div>

      {/* ── Row 5: Top Plates + District Distribution ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 20 }}>
        <ChartCard>
          <SectionHeader icon={Eye} title="Most Frequently Detected Vehicles" subtitle="High-repeat sightings across cameras" color="#ec4899" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPlates.map((p, i) => (
              <div key={p.plate} style={{
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 12px',
                background: i === 0 ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                borderRadius: 8, border: i === 0 ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < 3 ? COLORS[i] + '20' : '#1e293b', color: i < 3 ? COLORS[i] : '#64748b',
                  fontSize: 11, fontWeight: 800,
                }}>
                  {i + 1}
                </span>
                <div style={{
                  background: '#f8fafc', color: '#0f172a', fontWeight: 800, padding: '3px 10px',
                  borderRadius: 5, fontFamily: 'var(--font-mono)', fontSize: 12,
                  border: '1.5px solid #475569', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: 8, color: '#1d4ed8', fontWeight: 900, letterSpacing: 0.5 }}>IND</span>
                  {p.plate}
                </div>
                <span style={{ fontSize: 11, color: '#64748b', flex: 1, textAlign: 'right' }}>{p.lastCamera}</span>
                <div style={{ width: 70, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (p.count / maxPlateCount) * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})`, borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#e2e8f0', fontWeight: 700, fontSize: 12, width: 30, textAlign: 'right' }}>{p.count}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={MapPin} title="Gujarat RTO Regional Distribution" subtitle="Plate-based district intelligence" color="#8b5cf6" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {districtData.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, color: '#94a3b8' }}>{d.name}</span>
                <div style={{ width: 80, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(d.count / districtData[0].count) * 100}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#e2e8f0', width: 40, textAlign: 'right', fontSize: 12 }}>{d.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 6: Data Collection Progress + Daily Trend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard>
          <SectionHeader icon={HardDrive} title="Live Data Collection Progress" subtitle="Frames harvested from 30 cameras" color="#ec4899" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Frames</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ec4899', fontFamily: 'var(--font-mono)' }}>{dataCollection.totalFrames?.toLocaleString() || 0}</div>
            </div>
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Disk Usage</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1', fontFamily: 'var(--font-mono)' }}>{dataCollection.sizeGB || 0} GB</div>
            </div>
          </div>
          {(dataCollection.cameraFrameCounts || []).length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dataCollection.cameraFrameCounts} margin={{ left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="camera" tick={{ fill: '#64748b', fontSize: 9 }} angle={-45} textAnchor="end" height={50} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="frames" radius={[4, 4, 0, 0]}>
                  {(dataCollection.cameraFrameCounts || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionHeader icon={TrendingUp} title="Daily Detection Trend" subtitle="Multi-day detection volume" color="#10b981" />
          {dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="detections" stroke="#10b981" strokeWidth={2.5} fill="url(#dailyGradient)" dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No daily trend data yet</div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
