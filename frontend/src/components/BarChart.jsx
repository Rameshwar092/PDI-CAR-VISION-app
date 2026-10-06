export default function BarChart({ data }) {
  const max = Math.max(4, ...data.flatMap(d => [d.a, d.b])), H = 160, W = 520, bw = 18, gap = (W - 50) / data.length
  return (<div><svg viewBox={`0 0 ${W} ${H + 28}`} className="chart" role="img" aria-label="Completed and pending reports per month">
    {[0, .5, 1].map(t => <g key={t}><line x1="32" x2={W} y1={H - H * t} y2={H - H * t} stroke="#1f3352" /><text x="0" y={H - H * t + 4} fill="#64748b" fontSize="10">{Math.round(max * t)}</text></g>)}
    {data.map((d, i) => { const x = 44 + i * gap; return (<g key={d.label}>
      <rect x={x} y={H - d.a / max * H} width={bw} height={d.a / max * H} fill="#1fa463" rx="2" />
      <rect x={x + bw + 4} y={H - d.b / max * H} width={bw} height={d.b / max * H} fill="#2f6fe4" rx="2" />
      <text x={x + bw} y={H + 18} textAnchor="middle" fill="#64748b" fontSize="11">{d.label}</text></g>) })}</svg>
    <div className="row small muted"><span><i className="dot" style={{ background: '#1fa463' }} /> Completed</span><span><i className="dot" style={{ background: '#2f6fe4' }} /> Pending</span></div></div>)
}
