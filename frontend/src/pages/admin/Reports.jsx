import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReports } from '../../services/pdiApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
export default function Reports() {
  const [r, setR] = useState([]), [q, setQ] = useState(''), [s, setS] = useState('')
  useEffect(() => { getReports().then(setR) }, [])
  const rows = r.filter(x => (x.vehicle + x.vin + x.user).toLowerCase().includes(q.toLowerCase()) && (!s || x.result === s))
  return (<div className="card"><div className="between"><h3>All PDI Reports</h3><div className="row">
    <input placeholder="Search vehicle, VIN, user..." value={q} onChange={e => setQ(e.target.value)} />
    <select value={s} onChange={e => setS(e.target.value)}><option value="">All Results</option><option>PASS</option><option>PASS WITH OBSERVATIONS</option><option>FAIL</option></select></div></div>
    <table className="table"><thead><tr><th>Report ID</th><th>Vehicle</th><th>VIN</th><th>User</th><th>Branch</th><th>Date</th><th>Result</th><th /></tr></thead>
      <tbody>{rows.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.vehicle}</td><td>{x.vin}</td><td>{x.user}</td><td>{x.branch}</td><td>{x.date}</td><td><StatusBadge value={x.result} /></td>
        <td><Link className="btn ghost" to={`/admin/reports/${x.id}`}>View</Link></td></tr>)}</tbody></table></div>)
}
