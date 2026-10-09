import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Sidebar.jsx'
import ReportView from '../../components/ReportView.jsx'
import { USE_MOCK } from '../../services/api.js'
import {
  requestOtp, verifyOtp, getMyReports, getMyReport, hasCustomerSession, customerLogout,
  cleanMobile, isValidMobile, DEMO_OTP, DEMO_MOBILE,
} from '../../services/customerApi.js'

const tone = { PASS: 'green', 'PASS WITH OBSERVATIONS': 'amber', FAIL: 'red' }

function Shell({ children, onLogout }) {
  return (<div className="cust">
    <header className="cust-top">
      <Link to="/get-report" className="cust-brand"><Logo /></Link>
      {onLogout && <button className="btn ghost" onClick={onLogout}>Sign out</button>}
    </header>
    <main className="cust-main">{children}</main>
    <footer className="cust-foot muted small">Your report is shown only after verifying the mobile number given at the time of inspection.</footer>
  </div>)
}

/** /get-report : mobile -> OTP -> list of the customer's reports */
export default function GetReport() {
  const nav = useNavigate(), [params] = useSearchParams()
  const [step, setStep] = useState(hasCustomerSession() ? 'list' : 'mobile')
  const [mobile, setMobile] = useState(cleanMobile(params.get('mobile') || ''))
  const [otp, setOtp] = useState('')
  const [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [wait, setWait] = useState(0)
  const [reports, setReports] = useState(null)
  const otpRef = useRef(null)

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t) }, [wait])
  useEffect(() => { if (step === 'otp') otpRef.current?.focus() }, [step])
  useEffect(() => {
    if (step !== 'list') return
    setReports(null)
    getMyReports().then(setReports).catch(e => {
      if (e.status === 401) { setStep('mobile'); setErr(e.message) } else setErr(e.message)
    })
  }, [step])

  const sendOtp = async e => {
    e?.preventDefault(); setErr(''); setMsg('')
    const m = cleanMobile(mobile)
    if (!isValidMobile(m)) return setErr('Enter a valid 10-digit mobile number')
    setBusy(true)
    try {
      const r = await requestOtp(m)
      setMobile(m); setMsg(r.message); setWait(r.resendIn || 30); setOtp(''); setStep('otp')
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  const checkOtp = async e => {
    e.preventDefault(); setErr('')
    if (!/^\d{6}$/.test(otp)) return setErr('Enter the 6-digit OTP')
    setBusy(true)
    try { await verifyOtp(mobile, otp); setMsg(''); setStep('list') }
    catch (x) { setErr(x.message); setOtp('') } finally { setBusy(false) }
  }

  const logout = () => { customerLogout(); setReports(null); setOtp(''); setMsg(''); setErr(''); setStep('mobile') }

  if (step === 'list') {
    return (<Shell onLogout={logout}>
      <section className="card cust-card wide">
        <h2>Your PDI Reports</h2>
        {err && <p className="err">{err}</p>}
        {!reports && !err && <p className="muted">Loading your reports...</p>}
        {reports && reports.length === 0 && <p className="muted">No submitted PDI report is linked to this mobile number yet.
          If your car's inspection was done recently, please check again later or contact your dealer.</p>}
        {reports && reports.length > 0 && <ul className="cust-list">{reports.map(r => (
          <li key={r.id}><button className="cust-item" onClick={() => nav(`/get-report/${encodeURIComponent(r.id)}`)}>
            <div><b>{r.vehicle}</b><div className="muted small">Report {r.id} · {r.date}{r.vin && r.vin !== '-' ? ` · VIN ${r.vin}` : ''}</div></div>
            <span className={`badge ${tone[r.result] || ''}`}>{r.result}</span>
            <span className="cust-go" aria-hidden="true">{'›'}</span>
          </button></li>))}</ul>}
      </section>
    </Shell>)
  }

  return (<Shell>
    <section className="card cust-card">
      <h2>Get your PDI Report</h2>
      {step === 'mobile' && <form onSubmit={sendOtp} className="cust-form" noValidate>
        <p className="muted">Enter the mobile number you gave at the time of your car's inspection. We'll send you a one-time password (OTP).</p>
        <label>Mobile number
          <div className="cust-phone"><span>+91</span>
            <input type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={14} placeholder="10-digit mobile number"
              value={mobile} onChange={e => setMobile(e.target.value.replace(/[^\d\s+-]/g, ''))} autoFocus /></div></label>
        {err && <div className="err">{err}</div>}
        <button className="btn wide" disabled={busy}>{busy ? 'Sending OTP...' : 'Get OTP'}</button>
        {USE_MOCK && <p className="muted small">Demo mode: try {DEMO_MOBILE}, OTP {DEMO_OTP}.</p>}
      </form>}

      {step === 'otp' && <form onSubmit={checkOtp} className="cust-form" noValidate>
        <p className="muted">{msg || 'OTP sent.'}</p>
        <p className="small">Sent to <b>+91 {mobile.slice(0, 2)}XXXXXX{mobile.slice(-2)}</b> · <button type="button" className="linkbtn" onClick={() => { setStep('mobile'); setErr('') }}>Change number</button></p>
        <label>Enter OTP
          <input ref={otpRef} className="otp-input" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            placeholder="______" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
        {err && <div className="err">{err}</div>}
        <button className="btn wide" disabled={busy || otp.length !== 6}>{busy ? 'Verifying...' : 'Verify & View Report'}</button>
        <p className="small muted cust-resend">Didn't get it? {wait > 0
          ? <>Resend in {wait}s</>
          : <button type="button" className="linkbtn" onClick={sendOtp} disabled={busy}>Resend OTP</button>}</p>
      </form>}
    </section>
  </Shell>)
}

/** /get-report/:id : one report, only after OTP */
export function CustomerReport() {
  const nav = useNavigate()
  if (!hasCustomerSession()) return <Navigate to="/get-report" replace />
  const logout = () => { customerLogout(); nav('/get-report') }
  return (<Shell onLogout={logout}>
    <div className="cust-report">
      <ReportView back="/get-report" backLabel="All my reports" loader={getMyReport}
        onError={e => { if (e.status === 401) nav('/get-report') }} />
    </div>
  </Shell>)
}
