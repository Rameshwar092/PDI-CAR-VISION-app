import { useState } from 'react'
import { SECTIONS, BASIC_DETAILS, PHOTOS, emptyForm, sectionStatus, isFlagged } from './sections.js'
import StatusBadge from '../StatusBadge.jsx'
import SignaturePad from '../SignaturePad.jsx'
import MultiSelect from '../MultiSelect.jsx'
import { toast } from '../Toast.jsx'
import { compressImage } from '../../services/imageCompress.js'

export function validateVehicle(v) {
  const e = {}
  BASIC_DETAILS.forEach(f => {
    if (f.required && !String(v[f.key] || '').trim()) e[f.key] = 'Required'
    else if (f.minLength && v[f.key] && v[f.key].trim().length < f.minLength) e[f.key] = `Must be at least ${f.minLength} characters`
  })
  return e
}

export function BasicDetails({ form, set, errors = {} }) {
  return (<section className="card"><h3>Add Basic Details</h3>
    <div className="grid4">{BASIC_DETAILS.map(f => (
      <label key={f.key}><span>{f.label} <span className="req">*</span></span>
        {f.type === 'select'
          ? <select className={errors[f.key] ? 'invalid' : ''} value={form.vehicle[f.key] || ''}
              onChange={e => set({ ...form, vehicle: { ...form.vehicle, [f.key]: e.target.value } })}>
              <option value="">Select...</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
          : <input type={f.type} className={errors[f.key] ? 'invalid' : ''} value={form.vehicle[f.key] || ''}
              onChange={e => set({ ...form, vehicle: { ...form.vehicle, [f.key]: e.target.value } })} />}
        {errors[f.key] && <span className="field-err">{errors[f.key]}</span>}
      </label>))}</div></section>)
}

export function ChecklistSection({ section, form, set }) {
  return (<section className="card"><div className="between"><h3>{section.title}</h3>
    <StatusBadge value={sectionStatus(form.checks, section.key)} /></div>
    <div className="split">
      <table className="table checklist"><tbody>{section.items.map(([item, options]) => {
        const key = `${section.key}.${item}`, cur = form.checks[key] || []
        const flagged = isFlagged(form.checks, section.key, item)
        return (<tr key={key}><td>{item}</td><td>
          <MultiSelect options={options} value={cur} flagged={flagged}
            onChange={next => set({ ...form, checks: { ...form.checks, [key]: next } })} />
          {cur.includes('Other (Specify)') && (
            <input placeholder="Specify..." style={{ marginTop: 6 }} value={form.other[key] || ''}
              onChange={e => set({ ...form, other: { ...form.other, [key]: e.target.value } })} />)}
        </td></tr>) })}</tbody></table>
      {section.hasRemarks && <label>{section.title} - Remarks<textarea rows={10} placeholder="Add any notes..."
        value={form.remarks[section.key] || ''} onChange={e => set({ ...form, remarks: { ...form.remarks, [section.key]: e.target.value } })} /></label>}
    </div></section>)
}

export function Photos({ form, set }) {
  const pick = async (label, file) => {
    if (!file) return
    try { const small = await compressImage(file); set(f => ({ ...f, photos: { ...f.photos, [label]: small } })) }
    catch (e) { toast(e.message || 'Could not add that photo', 'err') }
  }
  return (<section className="card"><h3>Photos</h3><div className="photos">{PHOTOS.map(p => (
    <label key={p} className="photo">{form.photos[p] ? <img src={form.photos[p]} alt={p} /> : <div className="ph">+</div>}
      <span className="small">{p}</span><input hidden type="file" accept="image/*" onChange={e => pick(p, e.target.files[0])} /></label>))}</div></section>)
}

export function FinalResult({ form, set }) {
  return (<section className="card"><h3>Final Result</h3>
    <div className="seg big">{['PASS', 'PASS WITH OBSERVATIONS', 'FAIL'].map(r => (
      <button type="button" key={r} className={`seg-btn R-${r.replace(/ /g, '')} ${form.result === r ? 'on' : ''}`}
        onClick={() => set({ ...form, result: r })}>{r}</button>))}</div>
    <div className="grid3">
      <label>Inspector Remarks<textarea rows={3} value={form.inspectorRemarks} onChange={e => set({ ...form, inspectorRemarks: e.target.value })} /></label>
      <label>Customer Remarks<textarea rows={3} value={form.customerRemarks} onChange={e => set({ ...form, customerRemarks: e.target.value })} /></label>
      <div><span className="small muted">Inspector Signature <span className="req">*</span> (sign with mouse or finger)</span>
        <SignaturePad value={form.signature} onChange={v => set({ ...form, signature: v })} /></div>
    </div></section>)
}

export default function PDIForm({ initial, onSave, onSubmit }) {
  const [form, set] = useState(initial || emptyForm())
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('')
  const run = async (kind, fn) => { if (busy) return; setBusy(kind); try { await fn() } finally { setBusy('') } }
  const steps = ['Basic Details', ...SECTIONS.map(s => s.title), 'Photos', 'Final']
  const last = steps.length - 1
  const goto = i => { setStep(i); window.scrollTo({ top: 0 }) }
  const checkBasics = () => {
    const e = validateVehicle(form.vehicle); setErrors(e)
    if (Object.keys(e).length) { toast('Fill in the highlighted basic details', 'err'); goto(0); return false }
    return true
  }
  const next = () => { if (step === 0 && !checkBasics()) return; goto(step + 1) }
  const draft = () => { if (!form.vehicle.vin && !form.vehicle.customerName) return toast('Add a VIN or customer name to save a draft', 'err'); run('draft', () => onSave(form)) }
  const submit = e => {
    e.preventDefault()
    if (step < last) return next()
    if (!checkBasics()) return
    if (!form.signature.trim()) return toast('Draw your signature in the signature box', 'err')
    run('submit', () => onSubmit(form))
  }
  return (<form onSubmit={submit} noValidate>
    <div className="steps">{steps.map((s, i) => (
      <button type="button" key={s} disabled={i > step} onClick={() => goto(i)}
        className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
        <b>{i < step ? '\u2713' : i + 1}</b> {s}</button>))}</div>

    {step === 0 && <BasicDetails form={form} set={set} errors={errors} />}
    {step >= 1 && step <= SECTIONS.length && <ChecklistSection section={SECTIONS[step - 1]} form={form} set={set} />}
    {step === last - 1 && <Photos form={form} set={set} />}
    {step === last && <FinalResult form={form} set={set} />}

    <div className="between form-actions">
      <div className="row">
        <button type="button" className="btn ghost" disabled={step === 0} onClick={() => goto(step - 1)}>Previous</button>
        <button type="button" className="btn ghost" onClick={draft} disabled={!!busy}>{busy === 'draft' ? 'Saving...' : 'Save as Draft'}</button>
      </div>
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => { set(initial || emptyForm()); setErrors({}); goto(0) }}>Reset</button>
        <button className="btn" disabled={!!busy}>{busy === 'submit' ? 'Submitting...' : step === last ? 'Submit Report' : 'Next Step'}</button>
      </div>
    </div>
  </form>)
}