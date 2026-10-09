// Public "Get your PDI report" page: customer signs in with mobile number + OTP.
// The customer token is kept in sessionStorage (cleared when the tab closes) and
// is completely separate from the staff login token.
import { BASE, USE_MOCK } from './api.js'
import { getReports, getReport } from './pdiApi.js'

const TOKEN = 'pdi_customer_token'
export const DEMO_OTP = '123456'
export const DEMO_MOBILE = '9876543210'

const store = {
  get: () => { try { return sessionStorage.getItem(TOKEN) } catch { return null } },
  set: v => { try { sessionStorage.setItem(TOKEN, v) } catch { /* private mode */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN) } catch { /* ignore */ } },
}
export const hasCustomerSession = () => !!store.get()
export const customerLogout = () => store.clear()

export const cleanMobile = raw => {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return d
}
export const isValidMobile = m => /^[6-9]\d{9}$/.test(m)

async function call(path, { method = 'GET', body, auth } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) headers.Authorization = `Bearer ${store.get()}`
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && auth) store.clear()
  if (!res.ok) {
    const err = new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong. Please try again.')
    err.status = res.status
    throw err
  }
  return data
}

// ---------- mock mode (no backend): OTP is always 123456 ----------
const mockMobile = () => (store.get() || '').replace('mock:', '')
const mockMine = async () => {
  const m = mockMobile()
  return (await getReports()).filter(r => r.status === 'Submitted' &&
    (cleanMobile(r.data?.vehicle?.customerMobile) === m || (m === DEMO_MOBILE && !r.data)))
}

export async function requestOtp(mobile) {
  if (USE_MOCK) return { message: `Demo mode: use OTP ${DEMO_OTP}`, mobile, resendIn: 30, expiresIn: 300 }
  return call('/customer/otp/request', { method: 'POST', body: { mobile } })
}

export async function verifyOtp(mobile, otp) {
  if (USE_MOCK) {
    if (otp !== DEMO_OTP) throw new Error('Incorrect OTP. 4 attempts left.')
    store.set(`mock:${mobile}`)
    return { mobile }
  }
  const r = await call('/customer/otp/verify', { method: 'POST', body: { mobile, otp } })
  store.set(r.access_token)
  return r
}

export async function getMyReports() {
  if (USE_MOCK) return mockMine()
  return call('/customer/reports', { auth: true })
}

export async function getMyReport(id) {
  if (USE_MOCK) {
    if (!(await mockMine()).some(r => r.id === id)) throw Object.assign(new Error('Report not found'), { status: 404 })
    return getReport(id)
  }
  return call(`/customer/reports/${encodeURIComponent(id)}`, { auth: true })
}
