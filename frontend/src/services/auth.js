import { api, USE_MOCK } from './api.js'
import { _findByEmail } from './userApi.js'

const K = 'pdi_user'
export const getSession = () => JSON.parse(localStorage.getItem(K) || 'null')

export async function login(email, password, role = 'user') {
  if (!email || !password) throw new Error('Enter your email and password')
  let u

  if (USE_MOCK) {
    // Look up the actual account by email instead of fabricating one — this
    // is the bug that made every login open "Rahul Sharma" regardless of
    // what was typed.
    const account = await _findByEmail(email)
    if (!account) throw new Error('No account found with that email')
    if (password !== account.demoPassword) throw new Error('Incorrect password')
    if (account.status === 'Inactive') throw new Error('This account has been deactivated')
    const accountRole = account.role.toLowerCase() // 'Admin'/'User' -> 'admin'/'user'
    if (accountRole !== role) {
      throw new Error(role === 'admin'
        ? 'This is a user account — use User Login instead'
        : 'This is an admin account — use Admin Login instead')
    }
    u = { id: account.id, empId: account.empId, name: account.name, email: account.email,
      branch: account.branch, role: accountRole, title: accountRole === 'admin' ? 'Administrator' : 'Inspector' }
  } else {
    const r = await api('/auth/login', { method: 'POST', body: { email, password, role } })
    localStorage.setItem('pdi_token', r.access_token)
    // Backend returns role as "Admin"/"User" (matches how it's stored and
    // displayed in Manage Users); normalize to lowercase here, once, since
    // routing/guards/sidebar everywhere else compare against 'admin'/'user'.
    u = { ...r.user, role: r.user.role.toLowerCase(),
      title: r.user.role === 'Admin' ? 'Administrator' : 'Inspector' }
  }

  localStorage.setItem(K, JSON.stringify(u))
  return u
}

export const logout = () => { localStorage.removeItem(K); localStorage.removeItem('pdi_token') }
