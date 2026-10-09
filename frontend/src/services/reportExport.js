// Download / print helpers that work both in the browser and inside the Android APK.
//
// Why this exists: inside the Android WebView, window.print() does nothing and
// <a download> links are ignored, so the APK needs native help:
//   - Download: build the PDF with html2pdf, save it to Documents/PDI Reports,
//     then open the share sheet (Save to Drive, WhatsApp, Gmail, Files...).
//   - Print: call our native "Printer" plugin (android/.../PrinterPlugin.java),
//     which opens Android's print dialog (print to a printer or Save as PDF).
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
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      // Lay the report out like a desktop/A4 page even on a narrow phone,
      // so the PDF doesn't come out as a squeezed single column.
      windowWidth: 900,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.kv', 'figure', '.sigs', '.rresult', 'h4'] },
  }
}

const isCancel = e => /cancel/i.test(String(e?.message || e))

/** Returns a short message describing where the file went. Throws on real failure. */
export async function downloadReportPdf(element, fileName) {
  const options = pdfOptions(fileName)
  document.body.classList.add('exporting-pdf')
  try {
    if (!isNative()) {
      await html2pdf().set(options).from(element).save()
      return 'PDF downloaded'
    }

    const dataUri = await html2pdf().set(options).from(element).outputPdf('datauristring')
    const base64 = dataUri.substring(dataUri.indexOf(',') + 1)

    // 1) Keep a permanent copy in the phone's Documents folder.
    let savedTo = ''
    try {
      try { await Filesystem.requestPermissions() } catch { /* not needed on Android 11+ */ }
      await Filesystem.writeFile({ path: `PDI Reports/${fileName}`, data: base64, directory: Directory.Documents, recursive: true })
      savedTo = `Saved to Documents/PDI Reports/${fileName}`
    } catch (e) {
      console.warn('Could not save to Documents, will share instead:', e)
    }

    // 2) Open the share sheet so the user can send / save it anywhere.
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
