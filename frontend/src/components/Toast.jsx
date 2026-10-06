import { useEffect, useState } from 'react'
export const toast = (msg, type = 'ok') => window.dispatchEvent(new CustomEvent('pdi-toast', { detail: { msg, type } }))
export default function ToastHost() {
  const [t, setT] = useState(null)
  useEffect(() => {
    const h = e => { setT(e.detail); clearTimeout(window.__pdiToast); window.__pdiToast = setTimeout(() => setT(null), 3200) }
    window.addEventListener('pdi-toast', h); return () => window.removeEventListener('pdi-toast', h)
  }, [])
  return t ? <div className={`toast ${t.type}`} role="status">{t.msg}</div> : null
}
