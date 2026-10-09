import { useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import Login from '../pages/Login.jsx'
import UDash from '../pages/user/Dashboard.jsx'
import Profile from '../pages/user/Profile.jsx'
import CreatePDI from '../pages/user/CreatePDI.jsx'
import MyReports from '../pages/user/MyReports.jsx'
import ViewReport from '../pages/user/ViewReport.jsx'
import ADash from '../pages/admin/Dashboard.jsx'
import Users from '../pages/admin/Users.jsx'
import UserDetails from '../pages/admin/UserDetails.jsx'
import Reports from '../pages/admin/Reports.jsx'
import Analytics from '../pages/admin/Analytics.jsx'
import Settings from '../pages/admin/Settings.jsx'
import ReportDetails from '../pages/admin/ReportDetails.jsx'
function Guard({ role }) {
  const { user } = useAuth(), [open, setOpen] = useState(false)
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/user'} replace />
  return <div className={`shell ${open ? 'menu-open' : ''}`}><Sidebar open={open} onNav={() => setOpen(false)} />{open && <div className="scrim" onClick={() => setOpen(false)} />}
    <div className="main"><Navbar onMenu={() => setOpen(!open)} /><main className="content"><Outlet /></main></div></div>
}
export default function AppRoutes() {
  const { user } = useAuth()
  return (<Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/user" element={<Guard role="user" />}>
      <Route index element={<UDash />} /><Route path="profile" element={<Profile />} /><Route path="create" element={<CreatePDI />} /><Route path="create/:id" element={<CreatePDI />} />
      <Route path="reports" element={<MyReports />} /><Route path="reports/:id" element={<ViewReport />} /></Route>
    <Route path="/admin" element={<Guard role="admin" />}>
      <Route index element={<ADash />} /><Route path="users" element={<Users />} /><Route path="users/:id" element={<UserDetails />} />
      <Route path="reports" element={<Reports />} /><Route path="analytics" element={<Analytics />} /><Route path="settings" element={<Settings />} /><Route path="reports/:id" element={<ReportDetails />} /></Route>
    <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/user') : '/login'} replace />} />
  </Routes>)
}
