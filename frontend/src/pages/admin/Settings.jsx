import { useState } from 'react'
import { toast } from '../../components/Toast.jsx'
const K = 'pdi_settings', def = { company: 'PDI Car Vision', branch: 'Delhi', requirePhotos: true }
export default function Settings() {
  const [s, setS] = useState({ ...def, ...JSON.parse(localStorage.getItem(K) || '{}') })
  const save = e => { e.preventDefault(); localStorage.setItem(K, JSON.stringify(s)); toast('Settings saved') }
  return (<form className="card" onSubmit={save}><h3>Settings</h3><div className="grid3">
    <label>Company name<input value={s.company} onChange={e => setS({ ...s, company: e.target.value })} /></label>
    <label>Default branch<input value={s.branch} onChange={e => setS({ ...s, branch: e.target.value })} /></label></div>
    <label className="row"><input type="checkbox" style={{ width: 'auto' }} checked={s.requirePhotos} onChange={e => setS({ ...s, requirePhotos: e.target.checked })} />Require photos before submitting a report</label>
    <button className="btn" style={{ marginTop: 12 }}>Save settings</button></form>)
}
