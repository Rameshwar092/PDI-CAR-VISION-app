import { api, USE_MOCK } from './api.js'

const K = 'pdi_users'

// Mock-only demo accounts. demoPassword exists ONLY in mock mode, purely so
// the login screen can validate against a real account instead of faking
// one — it is never used, read, or needed once USE_MOCK is false, since the
// real backend hashes and checks passwords itself (see backend/app/security.py).
const seed = [
  // name, email, empId, branch, role, status, demoPassword
  ['Admin User', 'admin@pdicarvision.com', 'EMP000', 'Head Office', 'Admin', 'Active', 'ChangeMe123!'],
  ['Rahul Sharma', 'rahul@pdicarvision.com', 'EMP001', 'Delhi', 'User', 'Active', 'Demo@123'],
  ['Amit Kumar', 'amit@pdicarvision.com', 'EMP002', 'Noida', 'User', 'Active', 'Demo@123'],
  ['Priya Singh', 'priya@pdicarvision.com', 'EMP003', 'Gurgaon', 'User', 'Active', 'Demo@123'],
  ['Neha Gupta', 'neha@pdicarvision.com', 'EMP004', 'Faridabad', 'Admin', 'Inactive', 'Demo@123'],
].map(([name, email, empId, branch, role, status, demoPassword]) =>
  ({ id: empId, name, email, empId, branch, role, status, phone: '+91 98765 43210', demoPassword }))

const load = () => JSON.parse(localStorage.getItem(K) || 'null') || seed
const save = u => localStorage.setItem(K, JSON.stringify(u))

export async function getUsers() {
  if (USE_MOCK) return load()
  return api('/users')
}

export async function getUser(id) {
  if (USE_MOCK) return load().find(u => u.id === id)
  return api(`/users/${id}`)
}

export async function getProfile() {
  if (USE_MOCK) return load()[0]
  return api('/users/me')
}

// Used only by the mock login lookup in auth.js — never exposed in any UI.
export async function _findByEmail(email) {
  return load().find(u => u.email.toLowerCase() === email.toLowerCase())
}

export async function addUser(u) {
  if (USE_MOCK) {
    const all = load()
    if (all.some(x => x.email.toLowerCase() === u.email.toLowerCase())) throw new Error('A user with this email already exists')
    if (all.some(x => x.empId === u.empId)) throw new Error('This employee ID is already in use')
    const tempPassword = `${u.empId}@PDI${new Date().getFullYear()}`
    const n = { ...u, id: u.empId, status: 'Active', phone: u.phone || '-', demoPassword: tempPassword }
    save([...all, n]); return { ...n, tempPassword }
  }
  // Real backend requires a password for a new account; generate a temporary
  // one the admin can pass on, since the Add User form only collects the
  // profile fields.
  const tempPassword = u.password || `${u.empId}@PDI${new Date().getFullYear()}`
  const created = await api('/users', { method: 'POST', body: { ...u, password: tempPassword } })
  return { ...created, tempPassword } // shown once to the admin; never stored or re-fetchable
}

export async function updateUser(id, patch) {
  if (USE_MOCK) {
    const all = load().map(u => (u.id === id ? { ...u, ...patch } : u))
    save(all); return all.find(u => u.id === id)
  }
  return api(`/users/${id}`, { method: 'PATCH', body: patch })
}

// Admin-only: set any user's password, including the admin's own.
export async function setUserPassword(id, newPassword) {
  if (USE_MOCK) {
    const all = load().map(u => (u.id === id ? { ...u, demoPassword: newPassword } : u))
    save(all); return { ok: true }
  }
  return api(`/users/${id}/password`, { method: 'PATCH', body: { newPassword } })
}

// Admin-only: remove a user. An admin can't delete their own account.
export async function deleteUser(id) {
  if (USE_MOCK) {
    const all = load().filter(u => u.id !== id)
    save(all); return { ok: true }
  }
  await api(`/users/${id}`, { method: 'DELETE' })
  return { ok: true }
}
