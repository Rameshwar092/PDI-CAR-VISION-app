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
    try {
      const r = await saveReport(d, status, id)
      toast(status === 'Draft' ? `Draft ${r.id} saved` : `Report ${r.id} submitted`); nav(`/user/reports/${r.id}`)
    } catch (e) {
      console.error('Save failed:', e)
      if (e.reportId) {
        // The report itself was saved; only some photos failed. Don't create a duplicate on retry.
        toast(`Report ${e.reportId} saved, but ${e.message}`, 'err')
        nav(status === 'Draft' ? `/user/create/${e.reportId}` : `/user/reports/${e.reportId}`)
      } else {
        toast(e.message === 'Failed to fetch'
          ? 'Could not reach the server. Check your internet and try again.'
          : `Could not ${status === 'Draft' ? 'save' : 'submit'}: ${e.message}`, 'err')
      }
    }
  }
  if (!initial) return <p className="muted">Loading draft...</p>
  return (<><h2>{id ? `Edit draft ${id}` : 'Create PDI Report'}</h2><p className="muted">Complete the inspection checklist and submit the report.</p>
    <PDIForm initial={initial} onSave={go('Draft')} onSubmit={go('Submitted')} /></>)
}