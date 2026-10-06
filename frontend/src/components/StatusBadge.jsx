const cls = { PASS: 'green', Submitted: 'green', Active: 'green', 'All OK': 'green',
  'PASS WITH OBSERVATIONS': 'amber', Draft: 'amber', FAIL: 'red', Inactive: 'red' }
export default function StatusBadge({ value }) {
  if (!value || value === '-') return <span className="muted">-</span>
  const tone = cls[value] || (value.endsWith('flagged') ? 'amber' : 'amber')
  return <span className={`badge ${tone}`}>{value}</span>
}
