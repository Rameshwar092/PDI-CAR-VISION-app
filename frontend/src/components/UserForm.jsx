import { useState } from 'react'
const F = [['name', 'Full Name'], ['email', 'Email', 'email'], ['empId', 'Employee ID'], ['phone', 'Phone'], ['branch', 'Branch']]
export default function UserForm({ initial = {}, lockId, showRole, onSubmit, submitLabel = 'Save' }) {
  const [v, setV] = useState({ role: 'User', status: 'Active', ...initial }), [err, setErr] = useState({})
  const go = async e => {
    e.preventDefault(); const x = {}
    F.forEach(([k]) => { if (!String(v[k] || '').trim()) x[k] = 'Required' })
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) x.email = 'Enter a valid email'
    setErr(x); if (Object.keys(x).length) return
    try { await onSubmit(v) } catch (ex) { setErr({ form: ex.message }) }
  }
  return (<form onSubmit={go} noValidate className="grid3">
    {F.map(([k, l, t]) => (<label key={k}>{l} <span className="req">*</span>
      <input type={t || 'text'} disabled={k === 'empId' && lockId} className={err[k] ? 'invalid' : ''} value={v[k] || ''} onChange={e => setV({ ...v, [k]: e.target.value })} />
      {err[k] && <span className="field-err">{err[k]}</span>}</label>))}
    {showRole && <label>Role<select value={v.role} onChange={e => setV({ ...v, role: e.target.value })}><option>User</option><option>Admin</option></select></label>}
    {err.form && <div className="err">{err.form}</div>}<div><button className="btn">{submitLabel}</button></div></form>)
}
