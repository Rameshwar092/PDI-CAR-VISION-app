import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getReport } from '../services/pdiApi.js'
import StatusBadge from './StatusBadge.jsx'
import { SECTIONS, sectionStatus, isFlagged } from './PDIForm/sections.js'
import logo from '../assets/logo.svg'
const tone = { PASS: 'green', 'PASS WITH OBSERVATIONS': 'amber', FAIL: 'red' }

export default function ReportView({ back }) {
  const { id } = useParams(), [r, setR] = useState(null)
  useEffect(() => { getReport(id).then(setR) }, [id])
  if (!r) return <p className="muted">Loading report...</p>
  const d = r.data || {}, v = d.vehicle || {}, checks = d.checks || {}, other = d.other || {}
  const findings = []
  SECTIONS.forEach(s => s.items.forEach(([item]) => { if (isFlagged(checks, s.key, item)) {
    const key = `${s.key}.${item}`, vals = checks[key] || []
    const display = vals.map(val => (val === 'Other (Specify)' && other[key]) ? other[key] : val).join(', ')
    findings.push([`${s.title} \u203a ${item}`, display]) } }))
  const row = (k, x) => <div key={k} className="kv"><span>{k}</span><b>{x || '-'}</b></div>
  return (<><div className="between no-print"><Link to={back}>Back to Reports</Link><div className="row">
    {r.status === 'Draft' && back.startsWith('/user') && <Link className="btn" to={`/user/create/${r.id}`}>Edit Draft</Link>}
    <button className="btn ghost" onClick={() => window.print()}>Print</button><button className="btn" onClick={() => window.print()}>Download PDF</button></div></div>
    <div className="paper report">
      <div className="rhead"><div className="rbrand"><img src={logo} alt="" width="70" /><div><b>PDI CAR VISION</b><small>PRE DELIVERY INSPECTION</small></div></div>
        <div className="rmeta"><h2>PDI INSPECTION REPORT</h2><div>Report No: <b>{r.id}</b></div><div>Date: {r.date}</div><div>Inspector: {r.user}</div></div></div>
      <div className="rgrid">
        <section><h4>Vehicle Information</h4>
          {[['Brand', v.brand], ['Model', v.model], ['VIN', v.vin], ['Condition', v.condition], ['Transmission', v.transmission],
            ['Fuel Type', v.fuelType], ['Emission', v.emission], ['MFG / REG', v.mfgReg], ['KMs Driven', v.kmsDriven]].map(([k, x]) => row(k, x))}</section>
        <section><h4>Inspection Details</h4>
          {[['Inspector', r.user], ['Branch', r.branch], ['PDI Date', v.pdiDate], ['Customer', v.customerName],
            ['Customer Mobile', v.customerMobile], ['Status', r.status]].map(([k, x]) => row(k, x))}</section>
      </div>
      <h4>Inspection Summary</h4>
      <table className="table"><tbody>{SECTIONS.map(s => <tr key={s.key}><td>{s.title}</td><td><StatusBadge value={sectionStatus(checks, s.key)} /></td>
        <td className="small">{(d.remarks || {})[s.key] || ''}</td></tr>)}</tbody></table>
      {findings.length > 0 && <><h4>Flagged Items</h4><table className="table"><tbody>
        {findings.map(([k, x]) => <tr key={k}><td>{k}</td><td><span className="badge amber">{x}</span></td></tr>)}</tbody></table></>}
      {Object.keys(d.photos || {}).length > 0 && <><h4>Photos</h4><div className="photos">
        {Object.entries(d.photos).map(([k, src]) => <figure key={k}><img src={src} alt={k} /><figcaption className="small">{k}</figcaption></figure>)}</div></>}
      <h4>Final Result</h4><div className={`rresult ${tone[r.result] || ''}`}>{r.result === '-' ? 'Not yet submitted' : r.result}</div>
      <div className="rgrid"><section><h4>Inspector Remarks</h4><p>{d.inspectorRemarks || '-'}</p></section>
        <section><h4>Customer Remarks</h4><p>{d.customerRemarks || '-'}</p></section></div>
      <div className="rgrid sigs"><div>{d.signature ? <img src={d.signature} alt="Inspector signature" /> : <div className="sigline" />}<small>Inspector Signature</small></div>
        <div><div className="sigline" /><small>Customer Signature</small></div></div>
    </div></>)
}
