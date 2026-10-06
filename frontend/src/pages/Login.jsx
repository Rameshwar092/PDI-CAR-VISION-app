import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Logo } from '../components/Sidebar.jsx'
export default function Login() {
  const { login } = useAuth(), nav = useNavigate()
  const [role, setRole] = useState('user'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [show, setShow] = useState(false), [err, setErr] = useState('')
  const submit = async e => { e.preventDefault(); try { const u = await login(email, pw, role); nav(u.role === 'admin' ? '/admin' : '/user') } catch (x) { setErr(x.message) } }
  return (<div className="login"><div className="login-hero"><Logo /><h1>Drive with Confidence</h1><p>Comprehensive vehicle inspection for a better tomorrow.</p></div>
    <form className="login-card" onSubmit={submit}><h2>Welcome Back</h2><p className="muted">Sign in to your account</p>
      <div className="seg big">{['user', 'admin'].map(r => <button type="button" key={r} className={`seg-btn ${role === r ? 'on yellow' : ''}`} onClick={() => setRole(r)}>{r === 'user' ? 'User Login' : 'Admin Login'}</button>)}</div>
      <label>Email Address<input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Password<div className="row"><input type={show ? 'text' : 'password'} placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} />
        <button type="button" className="btn ghost" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>
      {err && <div className="err">{err}</div>}<button className="btn wide">Login</button></form></div>)
}
