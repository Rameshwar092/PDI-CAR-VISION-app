// Production checklist: set VITE_USE_MOCK=false and VITE_API_URL to your
// deployed backend in frontend/.env before building for production.
// A visible banner (see src/components/MockBanner.jsx, rendered in App.jsx)
// appears whenever mock mode is on, specifically so this can't be shipped
// silently — if you deploy and the banner shows up, mock mode is still on.
export const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export async function api(path, opts = {}) {
  const token = localStorage.getItem('pdi_token')
  const res = await fetch(BASE + path, { ...opts,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Request failed')
  if (res.status === 204) return null
  return res.json()
}
