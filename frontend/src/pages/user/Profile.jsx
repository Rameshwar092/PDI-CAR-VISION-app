import { useEffect, useState } from 'react'
import { getProfile, updateUser } from '../../services/userApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { toast } from '../../components/Toast.jsx'
export default function Profile() {
  const [p, setP] = useState(null), [edit, setEdit] = useState(false), [f, setF] = useState({})
  useEffect(() => { getProfile().then(setP) }, [])
  if (!p) return null
  const start = () => { setF({ name: p.name, phone: p.phone, branch: p.branch }); setEdit(true) }
  const save = async e => { e.preventDefault(); if (!f.name.trim()) return toast('Name is required', 'err')
    setP(await updateUser(p.id, f)); setEdit(false); toast('Profile updated') }
  return (<div className="card"><div className="between"><h3>My Profile</h3>{!edit && <button className="btn ghost" onClick={start}>Edit Profile</button>}</div>
    <div className="row"><div className="avatar big">{p.name[0]}</div><div><h2>{p.name}</h2><span className="muted">Inspector</span></div></div>
    {edit ? <form className="grid3" onSubmit={save}>
      <label>Full name<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Phone<input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></label>
      <label>Branch<input value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })} /></label>
      <div className="row"><button className="btn">Save changes</button><button type="button" className="btn ghost" onClick={() => setEdit(false)}>Cancel</button></div></form>
    : <dl className="dl">{[['Employee ID', p.empId], ['Email', p.email], ['Phone', p.phone], ['Branch', p.branch], ['Role', p.role]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      <div><dt>Account Status</dt><dd><StatusBadge value={p.status} /></dd></div></dl>}</div>)
}
