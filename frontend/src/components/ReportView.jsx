import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getReport, deleteReport } from '../services/pdiApi.js'
import { BASE } from '../services/api.js'
import StatusBadge from './StatusBadge.jsx'
import { SECTIONS, sectionStatus, isFlagged, isInfoItem, answerText, defectText } from './PDIForm/sections.js'
import logo from '../assets/logo.png'
import { downloadReportPdf, printReport } from '../services/reportExport.js'
import { toast } from './Toast.jsx'

// Photo URLs are stored as /uploads/... on the backend server, not on the website's own domain.
const API_ORIGIN = (() => { try { return new URL(BASE, window.location.href).origin } catch { return '' } })()
const assetUrl = src => (typeof src === 'string' && (src.startsWith('/uploads/') || src.startsWith('/api/photos/')) ? API_ORIGIN + src : src)

const tone = { PASS: 'green', 'PASS WITH OBSERVATIONS': 'amber', FAIL: 'red' }

export default function ReportView({ back, backLabel = 'Back to Reports', loader = getReport, onError }) {
  const { id } = useParams(), [r, setR] = useState(null), [loadErr, setLoadErr] = useState('')
  useEffect(() => {
    setR(null); setLoadErr('')
    loader(id).then(x => x ? setR(x) : setLoadErr('Report not found'))
      .catch(e => { setLoadErr(e.message || 'Could not load the report'); onError?.(e) })
  }, [id])
  const [busy, setBusy] = useState('')
  const nav = useNavigate()
  const isAdmin = back.startsWith('/admin')
  const handleDelete = async () => {
    if (busy || !window.confirm(`Delete report ${r.id}?\nIts photos will be deleted too. This can't be undone.`)) return
    setBusy('delete')
    try { await deleteReport(r.id); toast(`Report ${r.id} deleted`); nav(back) }
    catch (e) { toast(`Could not delete: ${e.message}`, 'err'); setBusy('') }
  }
  const handleDownloadPDF = async () => {
    const element = document.getElementById('pdi-report-content')
    if (!element || busy) return
    setBusy('pdf')
    try {
      toast(await downloadReportPdf(element, `PDI-Report-${r.id}.pdf`))
    } catch (error) {
      console.error('PDF generation failed:', error)
      toast('Unable to create the PDF. Please try again.', 'err')
    } finally { setBusy('') }
  }
  const handlePrint = async () => {
    if (busy) return
    setBusy('print')
    try { await printReport(`PDI Report ${r.id}`) }
    catch (error) { console.error('Print failed:', error); toast('Unable to open the print dialog.', 'err') }
    finally { setBusy('') }
  }
  if (loadErr) return <div className="card"><p className="err">{loadErr}</p><Link to={back}>{'\u2190'} {backLabel}</Link></div>
  if (!r) return <p className="muted">Loading report...</p>
  const d = r.data || {}, v = d.vehicle || {}, checks = d.checks || {}, other = d.other || {}, remarks = d.remarks || {}
  const sum = summarize(checks, other)
  return (<><div className="between no-print report-toolbar"><Link to={back}>{'\u2190'} {backLabel}</Link><div className="row">
    {r.status === 'Draft' && back.startsWith('/user') && <Link className="btn" to={`/user/create/${r.id}`}>Edit Draft</Link>}
    <button className="btn ghost" onClick={handlePrint} disabled={!!busy}>{busy === 'print' ? 'Opening...' : 'Print'}</button>
    <button className="btn" onClick={handleDownloadPDF} disabled={!!busy}>{busy === 'pdf' ? 'Preparing PDF...' : 'Download PDF'}</button>
    {isAdmin && <button className="btn ghost danger" onClick={handleDelete} disabled={!!busy}>{busy === 'delete' ? 'Deleting...' : 'Delete'}</button>}</div></div>
    <div className="paper report report2" id="pdi-report-content">
      <div className="rhead"><div className="rbrand"><img src={logo} alt="" width="64" /><div><small>PRE DELIVERY INSPECTION</small></div></div>
        <div className="rmeta"><h2>PDI INSPECTION REPORT</h2><div>Report No: <b>{r.id}</b> {'\u00b7'} Date: {r.date}</div><div>Inspector: {r.user}{r.branch ? ` \u00b7 ${r.branch}` : ''}</div></div></div>

      {/* Result (the inspector's choice) + numbers */}
      <div className="r2-summary">
        <div className="r2-results">{RESULTS.map(x => <div key={x} className={`r2-res ${r.result === x ? `on ${tone[x]}` : ''}`}>
          <span className="r2-box">{r.result === x ? '\u2713' : ''}</span>{x}</div>)}</div>
        <div className="r2-stat"><b>{sum.checked}</b><small>Checked</small></div>
        <div className="r2-stat ok"><b>{sum.ok}</b><small>{'\u2713'} OK</small></div>
        <div className="r2-stat flag"><b>{sum.flagged}</b><small>{'\u2691'} Flagged</small></div>
      </div>

      {/* Vehicle + customer, compact */}
      <div className="r2-info">{[['Customer', v.customerName], ['Mobile', v.customerMobile], ['PDI Date', v.pdiDate], ['Brand', v.brand],
        ['Model', v.model], ['VIN', v.vin], ['Condition', v.condition], ['Transmission', v.transmission], ['Fuel', v.fuelType],
        ['Emission', v.emission], ['MFG / REG', v.mfgReg], ['KMs Driven', v.kmsDriven]].map(([k, x]) =>
        <div key={k}><span>{k}</span><b>{x || '-'}</b></div>)}</div>

      {/* Issues found (yellow flags only) */}
      <h4>{'\u2691'} Issues Found ({sum.flagged})</h4>
      {sum.flagged === 0 ? <p className="r2-none">{'\u2713'} No defects or deficiencies were found.</p>
        : <div className="r2-issues">{sum.issues.map(group => group.items.map(([item, text]) =>
            <div key={group.key + item} className="r2-issue"><span className="r2-flag">{'\u2691'}</span>
              <span><small>{short(group.title)} {'\u203a'}</small> {item}</span><b>{text}</b></div>))}</div>}

      {/* Tyres at a glance */}
      <h4>Tyres and Wheels</h4>
      <table className="r2-table r2-tyres"><thead><tr><th>Position</th><th>Tyre Brand</th><th>Tyre Condition</th><th>Wheel / Alloy</th></tr></thead>
        <tbody>{TYRE_POSITIONS.map(([pos, mfg, cond, wheel]) => <tr key={pos}><td>{pos}</td>
          <td>{answerText(checks, 'tyres', mfg, other).join(', ') || '-'}</td>
          <Cell checks={checks} other={other} sec="tyres" item={cond} />
          <Cell checks={checks} other={other} sec="tyres" item={wheel} /></tr>)}</tbody></table>
      {remarks.tyres && <p className="r2-remark"><b>Remarks:</b> {remarks.tyres}</p>}

      {/* Full checklist in two columns (only items that were checked) */}
      <h4>Detailed Inspection Checklist</h4>
      <div className="r2-cols">{balance(SECTIONS.filter(s => s.key !== 'tyres')).map((col, ci) => <div key={ci} className="r2-col">
        {col.map(s => { const st = sectionStatus(checks, s.key, other)
          const done = s.items.filter(([item]) => answerText(checks, s.key, item, other).length)
          const missing = s.items.length - done.length
          return <div key={s.key} className="r2-sec">
            <div className="r2-sec-head"><span>{SECTIONS.indexOf(s) + 1}. {short(s.title)}</span><StatusBadge value={st} /></div>
            {done.map(([item]) => { const flagged = isFlagged(checks, s.key, item, other)
              return <div key={item} className={`r2-row ${flagged ? 'flag' : ''}`}><span className="r2-icon">{flagged ? '\u2691' : '\u2713'}</span>
                <span className="r2-item">{item}</span><span className="r2-val">{answerText(checks, s.key, item, other).join(', ')}</span></div> })}
            {missing > 0 && <div className="r2-row none">{done.length ? `+ ${missing} item(s) not checked` : 'Not checked'}</div>}
            {remarks[s.key] && <div className="r2-remark">{remarks[s.key]}</div>}
          </div> })}
      </div>)}</div>

      {/* Photos, remarks, signature */}
      {Object.keys(d.photos || {}).length > 0 && <><h4>Photos</h4><div className="photos r2-photos">
        {Object.entries(d.photos).map(([k, src]) => <figure key={k}><img src={assetUrl(src)} alt={k} crossOrigin="anonymous" /><figcaption className="small">{k}</figcaption></figure>)}</div></>}
      <div className="r2-end">
        <section><h4>Inspector Remarks</h4><p>{d.inspectorRemarks || '-'}</p></section>
        <div className="r2-sign">{d.signature ? <img src={d.signature} alt="Inspector signature" /> : <div className="sigline" />}<small>Inspector Signature</small></div>
      </div>
      <p className="r2-legend">{'\u2713'} checked, no issue {'\u00b7'} {'\u2691'} defect / deficiency found. This report reflects the condition of the vehicle at the time of inspection.</p>
    </div></>)
}

const RESULTS = ['PASS', 'PASS WITH OBSERVATIONS', 'FAIL']

/** Split sections (keeping their order) into two columns of roughly equal length. */
function balance(sections) {
  const weight = s => s.items.length + 2
  const total = sections.reduce((n, s) => n + weight(s), 0)
  let acc = 0, cut = sections.length
  for (let i = 0; i < sections.length; i++) { if (acc + weight(sections[i]) / 2 > total / 2) { cut = i; break } acc += weight(sections[i]) }
  return [sections.slice(0, cut), sections.slice(cut)]
}

const TYRE_POSITIONS = [
  ['Front Right', 'Front Right Tyre MFG', 'Front Right Tyre - Condition', 'Front Right Wheel / Alloy Condition'],
  ['Front Left', 'Front Left Tyre MFG', 'Front Left Tyre - Condition', 'Front Left Wheel / Alloy Condition'],
  ['Rear Right', 'Rear Right Tyre MFG', 'Rear Right Tyre - Condition', 'Rear Right Wheel / Alloy Condition'],
  ['Rear Left', 'Rear Left Tyre MFG', 'Rear Left Tyre - Condition', 'Rear Left Wheel / Alloy Condition'],
  ['Spare', 'Spare Tyre MFG', 'Spare Tyre - Condition', 'Spare Wheel / Alloy Condition'],
]

const short = title => title.replace(/ (Inspection|Checks|Assessment|and General Functionality).*$/i, '').replace(/^Comprehensive /, '')

/** One answer cell: green tick, yellow flag, or "not checked". */
function Cell({ checks, other, sec, item }) {
  const text = answerText(checks, sec, item, other)
  if (!text.length) return <td className="r2-ans none">{'\u2013'} Not checked</td>
  const flagged = isFlagged(checks, sec, item, other)
  return <td className={`r2-ans ${flagged ? 'flag' : 'ok'}`}><span className="r2-icon">{flagged ? '\u2691' : '\u2713'}</span>{text.join(', ')}</td>
}

/** Counts and the grouped list of issues for the summary. */
function summarize(checks, other) {
  let checked = 0, flagged = 0
  const issues = []
  SECTIONS.forEach(s => {
    const items = []
    s.items.forEach(([item]) => {
      if (isInfoItem(s.key, item)) return
      if (!answerText(checks, s.key, item, other).length) return
      checked++
      if (isFlagged(checks, s.key, item, other)) { flagged++; items.push([item, defectText(checks, s.key, item, other).join(', ')]) }
    })
    if (items.length) issues.push({ key: s.key, title: s.title, items })
  })
  return { checked, flagged, ok: checked - flagged, issues }
}