import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUsers, addUser, updateUser, deleteUser, setUserPassword } from '../../services/userApi.js'
import { useAuth } from '../../context/AuthContext.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { toast } from '../../components/Toast.jsx'

const blank = { name: '', email: '', empId: '', branch: 'Delhi', role: 'User', phone: '' }

export default function Users() {
  const { user: me } = useAuth()
  const [u, setU] = useState([]), [q, setQ] = useState('')
  const [open, setOpen] = useState(false), [f, setF] = useState(blank), [err, setErr] = useState('')
  const [pwTarget, setPwTarget] = useState(null), [pwValue, setPwValue] = useState(''), [pwErr, setPwErr] = useState('')

  const refresh = () => getUsers().then(setU)
  useEffect(() => { refresh() }, [])

  const create = async e => {
    e.preventDefault()
    if (!f.name.trim() || !f.empId.trim())
  return setErr('Name and employee ID are required')

if (!/^\S+@\S+\.\S+$/.test(f.email))
  return setErr('Enter a valid email address')

if (!f.phone.trim())
  return setErr('Phone number is required')

if (!/^\d{10}$/.test(f.phone.trim()))
  return setErr('Phone number must be exactly 10 digits')
    try {
      const created = await addUser(f)
      toast(created.tempPassword ? `${f.name} added — temp password: ${created.tempPassword}` : `${f.name} added`)
      setOpen(false); setF(blank); setErr(''); refresh()
    } catch (x) { setErr(x.message) }
  }

  const toggle = async x => { await updateUser(x.id, { status: x.status === 'Active' ? 'Inactive' : 'Active' }); toast(`${x.name} is now ${x.status === 'Active' ? 'inactive' : 'active'}`); refresh() }

  const remove = async x => {
    if (me && x.id === me.empId) return toast("You can't delete your own account", 'err')
    if (!window.confirm(`Delete ${x.name}? This can't be undone.`)) return
    try { await deleteUser(x.id); toast(`${x.name} deleted`); refresh() } catch (e) { toast(e.message, 'err') }
  }

  const savePassword = async e => {
    e.preventDefault()
    if (pwValue.trim().length < 6) return setPwErr('Password must be at least 6 characters')
    try {
      await setUserPassword(pwTarget.id, pwValue)
      toast(`Password updated for ${pwTarget.name}`)
      setPwTarget(null); setPwValue(''); setPwErr('')
    } catch (x) { setPwErr(x.message) }
  }

  const inp = (k, label, type = 'text') => <label>{label}<input type={type} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>

  return (<div className="card"><div className="between"><h3>Manage Users</h3><div className="row">
    <input style={{ maxWidth: 300 }} placeholder="Search by name, email or employee ID..." value={q} onChange={e => setQ(e.target.value)} />
    <button className="btn" onClick={() => setOpen(true)}>+ Add User</button></div></div>

    <table className="table"><thead><tr><th>Name</th><th>Email</th><th>Employee ID</th><th>Branch</th><th>Role</th><th>Status</th><th /></tr></thead>
      <tbody>{u.filter(x => (x.name + x.email + x.empId).toLowerCase().includes(q.toLowerCase())).map(x => (
        <tr key={x.id}><td>{x.name}</td><td>{x.email}</td><td>{x.empId}</td><td>{x.branch}</td><td>{x.role}</td>
          <td><StatusBadge value={x.status} /></td>
          <td className="row">
            <Link className="btn ghost" to={`/admin/users/${x.id}`}>View</Link>
            <button className="btn ghost" onClick={() => toggle(x)}>{x.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
            <button className="btn ghost" onClick={() => { setPwTarget(x); setPwValue(''); setPwErr('') }}>Set Password</button>
            <button className="btn ghost danger" disabled={me && x.id === me.empId}
              title={me && x.id === me.empId ? "You can't delete your own account" : ''}
              onClick={() => remove(x)}>Delete</button>
          </td></tr>))}</tbody></table>

    {open && <div className="modal-bg" onClick={() => setOpen(false)}><form className="modal" onClick={e => e.stopPropagation()} onSubmit={create}>
      <h3>Add User</h3>{inp('name', 'Full name')}{inp('email', 'Email', 'email')}{inp('empId', 'Employee ID')}{inp('phone', 'Phone')}
      <label>Branch<select value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })}>{['Delhi', 'Noida', 'Gurgaon', 'Faridabad'].map(b => <option key={b}>{b}</option>)}</select></label>
      <label>Role<select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}><option>User</option><option>Admin</option></select></label>
      {err && <div className="err">{err}</div>}
      <div className="row"><button className="btn">Add User</button><button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    </form></div>}

    {pwTarget && <div className="modal-bg" onClick={() => setPwTarget(null)}><form className="modal" onClick={e => e.stopPropagation()} onSubmit={savePassword}>
      <h3>Set Password — {pwTarget.name}{me && pwTarget.id === me.empId ? ' (you)' : ''}</h3>
      <label>New password<input type="password" autoFocus minLength={6} value={pwValue} onChange={e => setPwValue(e.target.value)} /></label>
      {pwErr && <div className="err">{pwErr}</div>}
      <div className="row"><button className="btn">Save Password</button><button type="button" className="btn ghost" onClick={() => setPwTarget(null)}>Cancel</button></div>
    </form></div>}
  </div>)
}
