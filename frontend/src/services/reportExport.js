// Download / print helpers that work both in the browser and inside the Android APK.
import html2pdf from 'html2pdf.js'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const Printer = registerPlugin('Printer')
const isNative = () => Capacitor.isNativePlatform()

function pdfOptions(fileName) {
  return {
    margin: [8, 8, 10, 8],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0, windowWidth: 900 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.r2-row', '.r2-issue', '.r2-sec-head', '.r2-summary', '.r2-info', 'figure', '.r2-end', 'h4'] },
  }
}

const isCancel = e => /cancel/i.test(String(e?.message || e))

/** Save a finished PDF: browser download, or (in the APK) Documents folder + share sheet. */
async function deliverPdf(base64, fileName, browserSave) {
  if (!isNative()) {
    browserSave()
    return 'PDF downloaded'
  }
  let savedTo = ''
  try {
    try { await Filesystem.requestPermissions() } catch { /* not needed on Android 11+ */ }
    await Filesystem.writeFile({ path: `PDI Reports/${fileName}`, data: base64, directory: Directory.Documents, recursive: true })
    savedTo = `Saved to Documents/PDI Reports/${fileName}`
  } catch (e) {
    console.warn('Could not save to Documents, will share instead:', e)
  }
  const cached = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache })
  try {
    await Share.share({ title: fileName, text: 'PDI Inspection Report', files: [cached.uri], dialogTitle: 'Save or share PDI report' })
  } catch (e) {
    if (!isCancel(e)) {
      if (!savedTo) throw e
      console.warn('Share failed:', e)
    }
  }
  return savedTo || 'PDF ready'
}

/** Structured PDF built from the report data (clean A4 pages). Used by "Download PDF". */
export async function downloadStructuredPdf(report, fileName, options) {
  const { buildReportPdf } = await import('./reportPdf.js')
  const doc = await buildReportPdf(report, options)
  const dataUri = doc.output('datauristring')
  return deliverPdf(dataUri.substring(dataUri.indexOf(',') + 1), fileName, () => doc.save(fileName))
}

/** Older screenshot-based export (kept as a fallback). */
export async function downloadReportPdf(element, fileName) {
  const options = pdfOptions(fileName)
  document.body.classList.add('exporting-pdf')
  try {
    const worker = html2pdf().set(options).from(element)
    if (!isNative()) { await worker.save(); return 'PDF downloaded' }
    const dataUri = await worker.outputPdf('datauristring')
    return deliverPdf(dataUri.substring(dataUri.indexOf(',') + 1), fileName, () => {})
  } finally {
    document.body.classList.remove('exporting-pdf')
  }
}

export async function printReport(jobName = 'PDI Report') {
  if (isNative()) {
    await Printer.print({ name: jobName })
  } else {
    window.print()
  }
}