import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReports } from '../../services/pdiApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
export default function MyReports() {
  const [r, setR] = useState([]), [q, setQ] = useState('')
  useEffect(() => { getReports().then(setR) }, [])
  const rows = r.filter(x => (x.vehicle + x.vin + x.id).toLowerCase().includes(q.toLowerCase()))
  return (<div className="card"><div className="between"><h3>My Reports</h3><input style={{ maxWidth: 320 }} placeholder="Search vehicle, VIN, report ID..." value={q} onChange={e => setQ(e.target.value)} /></div>
    <table className="table"><thead><tr><th>Report ID</th><th>Vehicle</th><th>VIN</th><th>Date</th><th>Status</th><th>Result</th><th /></tr></thead>
      <tbody>{rows.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.vehicle}</td><td>{x.vin}</td><td>{x.date}</td><td><StatusBadge value={x.status} /></td><td><StatusBadge value={x.result} /></td>
        <td><Link className="btn ghost" to={x.status === 'Draft' ? `/user/create/${x.id}` : `/user/reports/${x.id}`}>{x.status === 'Draft' ? 'Edit' : 'View'}</Link></td></tr>)}</tbody></table>
    {!rows.length && <p className="muted">No reports found. Create a new PDI report to get started.</p>}</div>)
}
