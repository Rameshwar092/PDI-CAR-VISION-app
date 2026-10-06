import { USE_MOCK } from '../services/api.js'

// Renders only when running against mock/localStorage data instead of a
// real backend. If you see this banner on a deployed build, VITE_USE_MOCK
// was not set to false before `npm run build` — fix that and rebuild.
export default function MockBanner() {
  if (!USE_MOCK) return null
  return (
    <div className="mock-banner">
      Demo mode — data is stored only in this browser, not a real database.
      Set VITE_USE_MOCK=false and VITE_API_URL before deploying.
    </div>
  )
}
