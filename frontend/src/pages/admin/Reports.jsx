import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReports, deleteReport } from '../../services/pdiApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { toast } from '../../components/Toast.jsx'
export default function Reports() {
  const [r, setR] = useState([]), [q, setQ] = useState(''), [s, setS] = useState(''), [busy, setBusy] = useState('')
  const refresh = () => getReports().then(setR).catch(e => toast(e.message, 'err'))
  useEffect(() => { refresh() }, [])
  const remove = async x => {
    if (!window.confirm(`Delete report ${x.id} (${x.vehicle})?\nIts photos will be deleted too. This can't be undone.`)) return
    setBusy(x.id)
    try { await deleteReport(x.id); toast(`Report ${x.id} deleted`); setR(list => list.filter(y => y.id !== x.id)) }
    catch (e) { toast(`Could not delete: ${e.message}`, 'err') }
    finally { setBusy('') }
  }
  const rows = r.filter(x => (x.vehicle + x.vin + x.user + x.id).toLowerCase().includes(q.toLowerCase()) && (!s || x.result === s))
  return (<div className="card"><div className="between"><h3>All PDI Reports</h3><div className="row">
    <input placeholder="Search vehicle, VIN, user, ID..." value={q} onChange={e => setQ(e.target.value)} />
    <select value={s} onChange={e => setS(e.target.value)}><option value="">All Results</option><option>PASS</option><option>PASS WITH OBSERVATIONS</option><option>FAIL</option></select></div></div>
    <table className="table"><thead><tr><th>Report ID</th><th>Vehicle</th><th>VIN</th><th>User</th><th>Branch</th><th>Date</th><th>Result</th><th /></tr></thead>
      <tbody>{rows.map(x => <tr key={x.id}><td>{x.id}</td><td>{x.vehicle}</td><td>{x.vin}</td><td>{x.user}</td><td>{x.branch}</td><td>{x.date}</td><td><StatusBadge value={x.result} /></td>
        <td><div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
          <Link className="btn ghost" to={`/admin/reports/${x.id}`}>View</Link>
          <button className="btn ghost danger" disabled={busy === x.id} onClick={() => remove(x)}>{busy === x.id ? 'Deleting...' : 'Delete'}</button>
        </div></td></tr>)}</tbody></table></div>)
}