import { useEffect, useState } from 'react'
import BarChart from '../../components/BarChart.jsx'
import { getReports, getTrend } from '../../services/pdiApi.js'
import { getUsers } from '../../services/userApi.js'
export default function Dashboard() {
  const [r, setR] = useState([]), [u, setU] = useState([]), [t, setT] = useState([])
  useEffect(() => { getReports().then(setR); getUsers().then(setU); getTrend().then(setT) }, [])
  const c = k => r.filter(x => x.result === k).length, tot = r.length || 1
  const pass = c('PASS') / tot * 100, obs = c('PASS WITH OBSERVATIONS') / tot * 100
  return (<><div className="hero"><h2>Better Inspections. Happier Customers.</h2><p>Overview of your PDI system.</p></div>
    <div className="grid4">{[['Total Users', u.length], ['Total PDI Reports', r.length], ['Pending PDI', r.filter(x => x.status === 'Draft').length], ['Completed', r.filter(x => x.status === 'Submitted').length]].map(([l, v]) => <div className="card stat" key={l}><span className="muted">{l}</span><b>{v}</b></div>)}</div>
    <div className="card"><h3>Monthly Trend</h3><BarChart data={t} /></div>
    <div className="card"><h3>Inspection Result</h3><div className="row">
      <div className="donut" style={{ background: `conic-gradient(var(--green) 0 ${pass}%, var(--amber) ${pass}% ${pass + obs}%, var(--red) ${pass + obs}% 100%)` }}><span>{r.length}</span></div>
      <ul className="legend"><li>Pass: {c('PASS')}</li><li>Pass with Observations: {c('PASS WITH OBSERVATIONS')}</li><li>Fail: {c('FAIL')}</li></ul></div></div></>)
}
