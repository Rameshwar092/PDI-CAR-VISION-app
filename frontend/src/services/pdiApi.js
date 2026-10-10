import { api, BASE, USE_MOCK } from './api.js'

// ---------------------------------------------------------------------
// Mock mode (USE_MOCK = true in api.js): everything lives in localStorage.
// Real mode: calls the FastAPI + MongoDB Atlas backend. Report documents
// stay tiny (checklist answers + text) — photos are uploaded separately
// as files and only their URL is stored in the report, which is why a
// report with photos doesn't come anywhere near MongoDB's 16MB document
// limit. See backend/app/services/storage.py.
// ---------------------------------------------------------------------

const K = 'pdi_reports'
const seed = [
  ['PDI-0012', 'Hyundai Creta', 'XXXXXXXXX1234', 'Rahul Sharma', 'Delhi', '2025-09-26', 'Submitted', 'PASS'],
  ['PDI-0011', 'Tata Nexon', 'XXXXXXXXX5678', 'Rahul Sharma', 'Noida', '2025-09-24', 'Draft', '-'],
  ['PDI-0010', 'Maruti Baleno', 'XXXXXXXXX9012', 'Amit Verma', 'Gurgaon', '2025-09-22', 'Submitted', 'PASS WITH OBSERVATIONS'],
  ['PDI-0009', 'Mahindra XUV700', 'XXXXXXXXX3456', 'Neha Gupta', 'Delhi', '2025-09-18', 'Submitted', 'FAIL'],
].map(([id, vehicle, vin, user, branch, date, status, result]) => ({ id, vehicle, vin, user, branch, date, status, result }))
const load = () => JSON.parse(localStorage.getItem(K) || 'null') || seed

export async function getReports() {
  if (USE_MOCK) return load()
  return api('/pdi')
}

export async function getReport(id) {
  if (USE_MOCK) return load().find(r => r.id === id)
  return api(`/pdi/${id}`)
}

// Trend is derived from whatever getReports() returns, so it works the same in mock or real mode.
export async function getTrend() {
  const r = await getReports()
  const base = [['Apr', 18, 4], ['May', 22, 5], ['Jun', 25, 3], ['Jul', 21, 6], ['Aug', 28, 4]]
  if (!r.length) return base.map(([label, a, b]) => ({ label, a, b }))
  const latest = r.map(x => x.date.slice(0, 7)).sort().pop(), inMonth = r.filter(x => x.date.startsWith(latest))
  const label = new Date(latest + '-01').toLocaleString('en', { month: 'short' })
  return [...base, [label, inMonth.filter(x => x.status === 'Submitted').length, inMonth.filter(x => x.status === 'Draft').length]]
    .map(([label, a, b]) => ({ label, a, b }))
}

async function uploadPhoto(reportId, label, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob()
  const form = new FormData()
  form.append('label', label)
  form.append('file', blob, `${label}.jpg`)
  const token = localStorage.getItem('pdi_token')
  const res = await fetch(`${BASE}/pdi/${reportId}/photos`, {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
  })
  if (!res.ok) {
    if (res.status === 413) throw new Error('photo is too large')
    throw new Error((await res.json().catch(() => ({}))).detail || `upload failed (${res.status})`)
  }
  return res.json() // { label, url, report }
}

export async function saveReport(data, status, existingId) {
  if (USE_MOCK) {
    const all = load(), id = existingId || `PDI-${String(all.length + 13).padStart(4, '0')}`, v = data.vehicle || {}
    const r = { id, vehicle: `${v.brand || ''} ${v.model || ''}`.trim() || 'Unknown', vin: v.vin || '-', user: 'Rahul Sharma', branch: 'Delhi',
      date: new Date().toISOString().slice(0, 10), status, result: status === 'Draft' ? '-' : data.result, data }
    localStorage.setItem(K, JSON.stringify([r, ...all.filter(x => x.id !== id)]))
    return r
  }

  // Real backend: save everything except any still-unuploaded (data:) photo
  // values first, to get/confirm a report id, then upload each new photo.
  const pendingPhotos = Object.entries(data.photos || {}).filter(([, v]) => v.startsWith('data:'))
  const knownPhotos = Object.fromEntries(Object.entries(data.photos || {}).filter(([, v]) => !v.startsWith('data:')))
  const body = { ...data, photos: knownPhotos, status }
  const qs = existingId ? `?report_id=${existingId}` : ''
  let report = await api(`/pdi${qs}`, { method: 'POST', body })

  const failed = []
  for (const [label, dataUrl] of pendingPhotos) {
    try {
      const result = await uploadPhoto(report.id, label, dataUrl)
      report = result.report
    } catch (e) {
      failed.push(`${label} (${e.message})`)
    }
  }
  if (failed.length) {
    throw Object.assign(new Error(`${failed.length} photo${failed.length > 1 ? 's' : ''} failed to upload: ${failed.join(', ')}`),
      { reportId: report.id })
  }
  return report
}