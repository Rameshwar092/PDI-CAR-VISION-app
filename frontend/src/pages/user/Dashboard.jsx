import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReports } from '../../services/pdiApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
export default function Dashboard() {
  const [r, setR] = useState([])
  useEffect(() => { getReports().then(setR) }, [])
  const sub = r.filter(x => x.status === 'Submitted').length
  const stats = [['Total Reports', r.length], ['Draft Reports', r.length - sub], ['Submitted Reports', sub], ['Passed', r.filter(x => x.result === 'PASS').length]]
  return (<>
    <div className="hero"><h2>Drive with Confidence</h2><p>Every inspection ensures a safer tomorrow.</p><Link className="btn" to="/user/create">+ Create New PDI Report</Link></div>
    <div className="grid4">{stats.map(([l, v]) => <div className="card stat" key={l}><span className="muted">{l}</span><b>{v}</b></div>)}</div>
    <div className="card"><div className="between"><h3>Recent PDI Reports</h3><Link to="/user/reports">View All</Link></div>
      <table className="table"><thead><tr><th>Report ID</th><th>Vehicle</th><th>Date</th><th>Status</th><th>Result</th><th /></tr></thead>
        <tbody>{r.slice(0, 5).map(x => <tr key={x.id}><td>{x.id}</td><td>{x.vehicle}</td><td>{x.date}</td><td><StatusBadge value={x.status} /></td><td><StatusBadge value={x.result} /></td>
          <td><Link className="btn ghost" to={x.status === 'Draft' ? `/user/create/${x.id}` : `/user/reports/${x.id}`}>{x.status === 'Draft' ? 'Edit' : 'View'}</Link></td></tr>)}</tbody></table></div></>)
}
