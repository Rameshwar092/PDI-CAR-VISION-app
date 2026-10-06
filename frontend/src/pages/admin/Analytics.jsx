import { useEffect, useState } from 'react'
import { getReports } from '../../services/pdiApi.js'
import TrendChart, { monthly } from '../../components/TrendChart.jsx'
export default function Analytics() {
  const [r, setR] = useState([])
  useEffect(() => { getReports().then(setR) }, [])
  const done = r.filter(x => x.status === 'Submitted'), pass = done.filter(x => x.result === 'PASS').length
  const branches = [...new Set(r.map(x => x.branch))].map(b => { const l = r.filter(x => x.branch === b)
    return { b, n: l.length, p: l.filter(x => x.result === 'PASS').length, o: l.filter(x => x.result === 'PASS WITH OBSERVATIONS').length, f: l.filter(x => x.result === 'FAIL').length } })
  return (<><h2>Analytics</h2>
    <div className="grid4">{[['Total Reports', r.length], ['Submitted', done.length], ['Pass Rate', done.length ? Math.round(pass / done.length * 100) + '%' : '0%'], ['Failed', r.filter(x => x.result === 'FAIL').length]].map(([l, v]) => <div className="card stat" key={l}><span className="muted">{l}</span><b>{v}</b></div>)}</div>
    <div className="card"><h3>Reports by month</h3><TrendChart data={monthly(r)} /></div>
    <div className="card"><h3>Results by branch</h3><table className="table"><thead><tr><th>Branch</th><th>Reports</th><th>Pass</th><th>With observations</th><th>Fail</th></tr></thead>
      <tbody>{branches.map(x => <tr key={x.b}><td>{x.b}</td><td>{x.n}</td><td>{x.p}</td><td>{x.o}</td><td>{x.f}</td></tr>)}</tbody></table></div></>)
}
