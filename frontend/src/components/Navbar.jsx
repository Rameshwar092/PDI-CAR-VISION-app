import { useAuth } from '../context/AuthContext.jsx'
export default function Navbar({ onMenu }) {
  const { user, logout } = useAuth()
  return (<header className="navbar">
    <div className="row nav-left">
      <button className="burger btn ghost" onClick={onMenu} aria-label="Open menu">{'☰'}</button>
      <div className="nav-title"><strong>Welcome back, {user.name}</strong>
        <div className="muted small hide-sm">Here's what's happening with your PDI inspections.</div></div>
    </div>
    <div className="row nav-right"><div className="avatar">{user.name[0]}</div>
      <div className="hide-sm"><div>{user.name}</div><div className="muted small">{user.title}</div></div>
      <button className="btn ghost" onClick={logout}>Logout</button></div></header>)
}
