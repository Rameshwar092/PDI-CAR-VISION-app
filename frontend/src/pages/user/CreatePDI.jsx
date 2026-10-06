import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PDIForm from '../../components/PDIForm/index.jsx'
import { emptyForm } from '../../components/PDIForm/sections.js'
import { saveReport, getReport } from '../../services/pdiApi.js'
import { toast } from '../../components/Toast.jsx'
export default function CreatePDI() {
  const { id } = useParams(), nav = useNavigate(), [initial, setInitial] = useState(id ? null : emptyForm())
  useEffect(() => { if (id) getReport(id).then(r => setInitial(r ? { ...emptyForm(), ...(r.data || {}) } : emptyForm())) }, [id])
  const go = status => async d => {
    const r = await saveReport(d, status, id)
    toast(status === 'Draft' ? `Draft ${r.id} saved` : `Report ${r.id} submitted`); nav(`/user/reports/${r.id}`) }
  if (!initial) return <p className="muted">Loading draft...</p>
  return (<><h2>{id ? `Edit draft ${id}` : 'Create PDI Report'}</h2><p className="muted">Complete the inspection checklist and submit the report.</p>
    <PDIForm initial={initial} onSave={go('Draft')} onSubmit={go('Submitted')} /></>)
}
