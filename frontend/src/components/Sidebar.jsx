import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useAuth } from '../context/AuthContext.jsx'
const links = {
  user: [['/user', 'Dashboard'], ['/user/create', 'Create PDI Report'], ['/user/reports', 'My Reports'], ['/user/profile', 'My Profile']],
  admin: [['/admin', 'Dashboard'], ['/admin/users', 'Manage Users'], ['/admin/reports', 'All PDI Reports'], ['/admin/analytics', 'Analytics'], ['/admin/settings', 'Settings']] }
export function Logo() { return <div className="logo"><img src={logo} alt="" width="84" /><span>PDI <b>CAR VISION</b></span><small>PRE DELIVERY INSPECTION</small></div> }
export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  return (<aside className={'sidebar' + (open ? ' open' : '')}><Logo />
    <nav>{links[user.role].map(([to, label]) => <NavLink key={to} to={to} end onClick={() => { onNav?.(); onClose?.() }} className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>{label}</NavLink>)}</nav></aside>)
}
