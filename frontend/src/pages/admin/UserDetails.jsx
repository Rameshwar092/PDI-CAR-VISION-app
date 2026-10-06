import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getUser, updateUser } from '../../services/userApi.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import Modal from '../../components/Modal.jsx'
import UserForm from '../../components/UserForm.jsx'
import { toast } from '../../components/Toast.jsx'
export default function UserDetails() {
  const { id } = useParams(), [u, setU] = useState(null), [edit, setEdit] = useState(false)
  useEffect(() => { getUser(id).then(setU) }, [id])
  if (!u) return <p className="muted">User not found.</p>
  const toggle = async () => { setU(await updateUser(id, { status: u.status === 'Active' ? 'Inactive' : 'Active' })); toast('Status updated') }
  const save = async v => { setU(await updateUser(id, v)); setEdit(false); toast('User updated') }
  return (<div className="card"><div className="between"><Link to="/admin/users">Back to Users</Link>
    <div className="row"><button className="btn ghost" onClick={() => setEdit(true)}>Edit</button><button className="btn ghost" onClick={toggle}>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</button></div></div>
    <h2>{u.name}</h2>
    <dl className="dl">{[['Employee ID', u.empId], ['Email', u.email], ['Phone', u.phone], ['Branch', u.branch], ['Role', u.role]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      <div><dt>Status</dt><dd><StatusBadge value={u.status} /></dd></div></dl>
    {edit && <Modal title="Edit User" onClose={() => setEdit(false)}><UserForm initial={u} lockId showRole onSubmit={save} /></Modal>}</div>)
}
