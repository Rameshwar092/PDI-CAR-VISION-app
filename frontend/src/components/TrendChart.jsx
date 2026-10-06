export const monthly = reports => {
  const m = {}
  reports.forEach(r => { const k = r.date.slice(0, 7); m[k] = m[k] || { label: k, completed: 0, pending: 0 }; r.status === 'Submitted' ? m[k].completed++ : m[k].pending++ })
  return Object.values(m).sort((a, b) => a.label.localeCompare(b.label)).slice(-6)
}
export default function TrendChart({ data }) {
  if (!data.length) return <p className="muted">No reports yet. Submitted and draft reports appear here by month.</p>
  const max = Math.max(1, ...data.flatMap(d => [d.completed, d.pending])), W = 600, H = 220, step = (W - 50) / data.length, y = v => H - 30 - (v / max) * (H - 60)
  return (<><svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Monthly reports">
    {[0, .5, 1].map(t => <g key={t}><line x1="40" x2={W} y1={y(max * t)} y2={y(max * t)} stroke="#d7e3f3" /><text x="30" y={y(max * t) + 4} fill="#64748b" fontSize="11" textAnchor="end">{Math.round(max * t)}</text></g>)}
    {data.map((d, i) => { const x = 50 + i * step + step / 2 - 20; return <g key={d.label}>
      <rect x={x} y={y(d.completed)} width="18" height={H - 30 - y(d.completed)} fill="#2f6fe4" rx="2" />
      <rect x={x + 22} y={y(d.pending)} width="18" height={H - 30 - y(d.pending)} fill="#3b82f6" rx="2" />
      <text x={x + 20} y={H - 10} fill="#64748b" fontSize="11" textAnchor="middle">{d.label}</text></g> })}</svg>
    <div className="row small"><span style={{ color: '#2f6fe4' }}>■ Completed</span><span style={{ color: '#3b82f6' }}>■ Pending</span></div></>)
}
