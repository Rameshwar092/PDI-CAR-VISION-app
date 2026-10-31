// Builds the PDI report PDF directly from the report data (real text + tables),
// instead of screenshotting the page. Clean A4 page breaks, small file, selectable text.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SECTIONS, sectionStatus, isFlagged, isInfoItem, answerText, defectText } from '../components/PDIForm/sections.js'

const BLUE = [23, 64, 170]
const NAVY = [11, 27, 62]
const GREEN = [25, 163, 98]
const AMBER = [228, 161, 27]
const AMBER_BG = [255, 248, 230]
const AMBER_TEXT = [122, 79, 0]
const RED = [224, 67, 63]
const GREY = [110, 116, 128]
const LINE = [226, 231, 238]
const RESULTS = ['PASS', 'PASS WITH OBSERVATIONS', 'FAIL']
const RESULT_COLOR = { PASS: GREEN, 'PASS WITH OBSERVATIONS': AMBER, FAIL: RED }
const M = 10 // page margin (mm)

// jsPDF's built-in fonts only cover basic Latin: replace characters they can't draw.
const clean = v => String(v ?? '').replace(/\u20B9/g, 'Rs.').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, '').trim()
const short = title => title.replace(/ (Inspection|Checks|Assessment|and General Functionality).*$/i, '').replace(/^Comprehensive /, '')

/** Load an image URL (or data URL) as a data URL, resized so the PDF stays small. */
async function loadImage(src, maxPx = 700, format = 'image/jpeg') {
  if (!src) return null
  try {
    let url = src
    if (!src.startsWith('data:')) {
      const res = await fetch(src, { mode: 'cors' })
      if (!res.ok) return null
      url = URL.createObjectURL(await res.blob())
    }
    const img = await new Promise((resolve, reject) => {
      const i = new Image(); i.crossOrigin = 'anonymous'
      i.onload = () => resolve(i); i.onerror = reject; i.src = url
    })
    const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = c.getContext('2d')
    if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) }
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return { data: c.toDataURL(format, 0.82), w: c.width, h: c.height }
  } catch {
    return null
  }
}

function tick(doc, x, y, color = GREEN) {
  doc.setDrawColor(...color); doc.setLineWidth(0.5)
  doc.line(x, y, x + 1.1, y + 1.2); doc.line(x + 1.1, y + 1.2, x + 3, y - 1.2)
}
function flag(doc, x, y, color = AMBER) {
  doc.setDrawColor(...color); doc.setFillColor(...color); doc.setLineWidth(0.4)
  doc.line(x, y - 1.6, x, y + 1.6)
  doc.triangle(x, y - 1.6, x + 2.8, y - 0.9, x, y - 0.1, 'F')
}

/** Make sure `need` mm are free on the page; otherwise start a new page. */
function ensure(doc, y, need) {
  const bottom = doc.internal.pageSize.getHeight() - 14
  if (y + need > bottom) { doc.addPage(); return M + 4 }
  return y
}

function heading(doc, text, y) {
  y = ensure(doc, y, 12)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLUE)
  doc.text(text, M, y + 4)
  doc.setDrawColor(...BLUE); doc.setLineWidth(0.5); doc.line(M, y + 5.6, doc.internal.pageSize.getWidth() - M, y + 5.6)
  return y + 8.5
}

export async function buildReportPdf(r, { assetUrl = s => s, logoSrc } = {}) {
  const d = r.data || {}, v = d.vehicle || {}, checks = d.checks || {}, other = d.other || {}, remarks = d.remarks || {}
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const W = doc.internal.pageSize.getWidth()
  const CW = W - 2 * M

  // Summary numbers
  let checked = 0, flagged = 0
  const issues = []
  SECTIONS.forEach(s => s.items.forEach(([item]) => {
    if (isInfoItem(s.key, item) || !answerText(checks, s.key, item, other).length) return
    checked++
    if (isFlagged(checks, s.key, item, other)) { flagged++; issues.push([short(s.title), item, defectText(checks, s.key, item, other).join(', ')]) }
  }))

  // ---------- Header band ----------
  doc.setFillColor(...BLUE); doc.rect(0, 0, W, 24, 'F')
  const logo = await loadImage(logoSrc, 360, 'image/png')
  if (logo) { const h = 15, w = h * logo.w / logo.h; doc.addImage(logo.data, 'PNG', M, 4.5, w, h) }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('PDI INSPECTION REPORT', W - M, 10, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(clean(`Report No: ${r.id}   |   Date: ${r.date || '-'}`), W - M, 15.5, { align: 'right' })
  doc.text(clean(`Inspector: ${r.user || '-'}${r.branch ? `   |   ${r.branch}` : ''}`), W - M, 20, { align: 'right' })

  // ---------- Result + numbers ----------
  let y = 29
  const resW = 78
  RESULTS.forEach((res, i) => {
    const on = r.result === res, by = y + i * 7.3
    if (on) { doc.setFillColor(...RESULT_COLOR[res]); doc.roundedRect(M, by, resW, 6.3, 1.2, 1.2, 'F') }
    else { doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.roundedRect(M, by, resW, 6.3, 1.2, 1.2, 'S') }
    doc.setDrawColor(on ? 255 : 160); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.3)
    doc.rect(M + 2.5, by + 1.6, 3.2, 3.2, 'FD')
    if (on) tick(doc, M + 2.8, by + 3.3, NAVY)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
    doc.setTextColor(...(on ? (res === 'PASS WITH OBSERVATIONS' ? [17, 17, 17] : [255, 255, 255]) : GREY))
    doc.text(res, M + 8, by + 4.3)
  })
  const stats = [[checked, 'CHECKED', NAVY, [243, 246, 251]], [checked - flagged, 'OK', GREEN, [239, 250, 244]], [flagged, 'FLAGGED', [183, 121, 31], AMBER_BG]]
  const sw = (CW - resW - 3 * 3) / 3
  stats.forEach(([n, label, color, bg], i) => {
    const sx = M + resW + 3 + i * (sw + 3)
    doc.setFillColor(...bg); doc.setDrawColor(...LINE); doc.roundedRect(sx, y, sw, 21, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...color)
    doc.text(String(n), sx + sw / 2, y + 11, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY)
    doc.text(label, sx + sw / 2, y + 16.5, { align: 'center' })
  })
  y += 25

  // ---------- Vehicle + customer ----------
  const info = [['Customer', v.customerName], ['Mobile', v.customerMobile], ['PDI Date', v.pdiDate], ['Brand', v.brand],
    ['Model', v.model], ['VIN', v.vin], ['Condition', v.condition], ['Transmission', v.transmission],
    ['Fuel', v.fuelType], ['Emission', v.emission], ['MFG / REG', v.mfgReg], ['KMs Driven', v.kmsDriven]]
  const infoRows = []
  for (let i = 0; i < info.length; i += 4) infoRows.push(info.slice(i, i + 4).map(([k, x]) => `${k.toUpperCase()}\n${clean(x) || '-'}`))
  autoTable(doc, {
    startY: y, margin: { left: M, right: M }, body: infoRows, theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: { top: 1.6, bottom: 1.6, left: 2.5, right: 2 }, lineColor: LINE, lineWidth: 0.2, textColor: [20, 20, 20], fontStyle: 'bold' },
    didParseCell: c => { c.cell.styles.minCellHeight = 10 },
    willDrawCell: c => {
      const [label, ...rest] = String(c.cell.raw).split('\n')
      c.cell.text = []
      c.cell._label = label; c.cell._value = rest.join(' ')
    },
    didDrawCell: c => {
      const { x, y: cy } = c.cell
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GREY)
      doc.text(c.cell._label || '', x + 2.5, cy + 3.6)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
      doc.text(doc.splitTextToSize(c.cell._value || '-', c.cell.width - 4)[0], x + 2.5, cy + 7.8)
    },
  })
  y = doc.lastAutoTable.finalY + 3

  // ---------- Issues found ----------
  y = heading(doc, `Issues Found (${flagged})`, y)
  if (!issues.length) {
    doc.setFillColor(239, 250, 244); doc.setDrawColor(191, 230, 210); doc.roundedRect(M, y, CW, 8, 1.2, 1.2, 'FD')
    tick(doc, M + 3, y + 4.2)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(19, 122, 73)
    doc.text('No defects or deficiencies were found.', M + 8, y + 5.3)
    y += 11
  } else {
    autoTable(doc, {
      startY: y, margin: { left: M, right: M }, theme: 'grid',
      head: [['', 'Section', 'Item', 'Finding']],
      body: issues.map(([sec, item, text]) => ['', clean(sec), clean(item), clean(text)]),
      headStyles: { fillColor: [255, 243, 214], textColor: AMBER_TEXT, fontSize: 7.5 },
      styles: { fontSize: 8.5, cellPadding: 1.6, lineColor: [246, 227, 180], lineWidth: 0.2, fillColor: [255, 253, 246] },
      columnStyles: { 0: { cellWidth: 6 }, 1: { cellWidth: 42, textColor: [138, 109, 47], fontSize: 7.5 }, 3: { fontStyle: 'bold', textColor: AMBER_TEXT } },
      didDrawCell: c => { if (c.section === 'body' && c.column.index === 0) flag(doc, c.cell.x + 2, c.cell.y + c.cell.height / 2) },
    })
    y = doc.lastAutoTable.finalY + 3
  }

  // ---------- Tyres ----------
  const TYRES = [['Front Right', 'Front Right Tyre MFG', 'Front Right Tyre - Condition', 'Front Right Wheel / Alloy Condition'],
    ['Front Left', 'Front Left Tyre MFG', 'Front Left Tyre - Condition', 'Front Left Wheel / Alloy Condition'],
    ['Rear Right', 'Rear Right Tyre MFG', 'Rear Right Tyre - Condition', 'Rear Right Wheel / Alloy Condition'],
    ['Rear Left', 'Rear Left Tyre MFG', 'Rear Left Tyre - Condition', 'Rear Left Wheel / Alloy Condition'],
    ['Spare', 'Spare Tyre MFG', 'Spare Tyre - Condition', 'Spare Wheel / Alloy Condition']]
  const ans = item => { const t = answerText(checks, 'tyres', item, other); return t.length ? { text: clean(t.join(', ')), kind: isFlagged(checks, 'tyres', item, other) ? 'flag' : 'ok' } : { text: 'Not checked', kind: 'none' } }
  y = heading(doc, `${SECTIONS.findIndex(x => x.key === 'tyres') + 1}. Tyres and Wheels`, y)
  autoTable(doc, {
    startY: y, margin: { left: M, right: M }, theme: 'grid',
    head: [['Position', 'Tyre Brand', 'Tyre Condition', 'Wheel / Alloy']],
    body: TYRES.map(([pos, mfg, cond, wheel]) => [pos, clean(answerText(checks, 'tyres', mfg, other).join(', ')) || '-', ans(cond), ans(wheel)]),
    headStyles: { fillColor: [243, 246, 251], textColor: [85, 85, 85], fontSize: 7.5 },
    styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: LINE, lineWidth: 0.2 },
    didParseCell: c => {
      const raw = c.cell.raw
      if (c.section === 'body' && raw && typeof raw === 'object') {
        c.cell.text = [raw.text]; c.cell.styles.cellPadding = { top: 1.5, bottom: 1.5, left: 6, right: 1.5 }
        if (raw.kind === 'flag') { c.cell.styles.fillColor = AMBER_BG; c.cell.styles.textColor = AMBER_TEXT; c.cell.styles.fontStyle = 'bold' }
        if (raw.kind === 'none') c.cell.styles.textColor = [150, 150, 150]
      }
    },
    didDrawCell: c => {
      const raw = c.cell.raw
      if (c.section === 'body' && raw && typeof raw === 'object') {
        const cy = c.cell.y + c.cell.height / 2
        if (raw.kind === 'ok') tick(doc, c.cell.x + 1.8, cy)
        if (raw.kind === 'flag') flag(doc, c.cell.x + 2.2, cy)
      }
    },
  })
  y = doc.lastAutoTable.finalY + 1
  if (remarks.tyres) y = remarkLine(doc, remarks.tyres, y)
  y += 2

  // ---------- Detailed checklist (two items per row) ----------
  y = heading(doc, 'Detailed Inspection Checklist', y)
  const colW = CW / 2
  SECTIONS.forEach((s, si) => {
    if (s.key === 'tyres') return
    const st = sectionStatus(checks, s.key, other)
    const body = []
    const done = s.items.filter(([item]) => answerText(checks, s.key, item, other).length)
    const cells = done.map(([item]) => {
      const fl = isFlagged(checks, s.key, item, other)
      return [{ content: clean(item), kind: fl ? 'flag' : 'ok', role: 'item' }, { content: clean(answerText(checks, s.key, item, other).join(', ')), kind: fl ? 'flag' : 'ok', role: 'val' }]
    })
    for (let i = 0; i < cells.length; i += 2) body.push([...cells[i], ...(cells[i + 1] || [{ content: '' }, { content: '' }])])
    const missing = s.items.length - done.length
    if (missing) body.push([{ content: done.length ? `+ ${missing} item(s) not checked` : 'Not checked', colSpan: 4, kind: 'note' }])
    if (remarks[s.key]) body.push([{ content: `Remarks: ${clean(remarks[s.key])}`, colSpan: 4, kind: 'remark' }])
    // keep the section title together with at least its first rows
    y = ensure(doc, y, 7 + Math.min(body.length, 3) * 4.6)
    autoTable(doc, {
      startY: y, margin: { left: M, right: M, bottom: 14, top: M + 4 }, theme: 'plain', showHead: 'everyPage', rowPageBreak: 'avoid',
      head: [[{ content: `${si + 1}. ${clean(short(s.title))}`, colSpan: 4, kind: 'head', status: st }]],
      body,
      headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.3, cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 } },
      styles: { fontSize: 7.6, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }, textColor: [40, 40, 40], lineColor: [240, 242, 246], lineWidth: { bottom: 0.15 } },
      columnStyles: { 0: { cellWidth: colW * 0.55 }, 1: { cellWidth: colW * 0.45, halign: 'right' }, 2: { cellWidth: colW * 0.55 }, 3: { cellWidth: colW * 0.45, halign: 'right' } },
      didParseCell: c => {
        const raw = c.cell.raw || {}
        if (c.section === 'head') return
        if (raw.kind === 'note') Object.assign(c.cell.styles, { textColor: [150, 150, 150], fontStyle: 'italic', halign: 'left' })
        else if (raw.kind === 'remark') Object.assign(c.cell.styles, { fillColor: [248, 250, 252], fontStyle: 'italic', textColor: [60, 60, 60], halign: 'left' })
        else if (raw.role === 'item') {
          c.cell.styles.cellPadding = { top: 1, bottom: 1, left: 5.5, right: 1 }
          if (raw.kind === 'flag') c.cell.styles.fillColor = AMBER_BG
        } else if (raw.role === 'val' && raw.kind === 'flag') Object.assign(c.cell.styles, { fillColor: AMBER_BG, textColor: AMBER_TEXT, fontStyle: 'bold' })
      },
      didDrawCell: c => {
        const raw = c.cell.raw || {}
        if (c.section === 'head') {
          const ok = raw.status === 'All OK', label = raw.status || ''
          doc.setFontSize(7); doc.setFont('helvetica', 'bold')
          const tw = doc.getTextWidth(label) + 4
          const bx = c.cell.x + c.cell.width - tw - 2, by = c.cell.y + 1.3, bh = c.cell.height - 2.6
          doc.setFillColor(...(ok ? GREEN : AMBER)); doc.roundedRect(bx, by, tw, bh, 0.8, 0.8, 'F')
          doc.setTextColor(...(ok ? [255, 255, 255] : [17, 17, 17])); doc.text(label, bx + 2, by + bh / 2 + 1.1)
        } else if (raw.role === 'item') {
          const cy = c.cell.y + c.cell.height / 2
          if (raw.kind === 'flag') flag(doc, c.cell.x + 2, cy); else tick(doc, c.cell.x + 1.3, cy)
        }
      },
    })
    y = doc.lastAutoTable.finalY + 2.5
  })
  y += 1.5

  // ---------- Photos ----------
  const photos = Object.entries(d.photos || {})
  if (photos.length) {
    const loaded = (await Promise.all(photos.map(async ([label, src]) => [label, await loadImage(assetUrl(src), 700)]))).filter(([, img]) => img)
    if (loaded.length) {
      y = heading(doc, 'Photos', y)
      const cols = 5, gap = 3, pw = (CW - gap * (cols - 1)) / cols, ph = pw * 0.75
      loaded.forEach(([label, img], i) => {
        if (i % cols === 0) { y = ensure(doc, y, ph + 6) }
        const x = M + (i % cols) * (pw + gap)
        const boxRatio = pw / ph, imgRatio = img.w / img.h
        let dw = pw, dh = ph, dx = x, dy = y
        if (imgRatio > boxRatio) { dw = ph * imgRatio; dx = x - (dw - pw) / 2 } else { dh = pw / imgRatio; dy = y - (dh - ph) / 2 }
        doc.saveGraphicsState?.()
        doc.rect(x, y, pw, ph, null); doc.clip?.(); doc.discardPath?.()
        doc.addImage(img.data, 'JPEG', dx, dy, dw, dh)
        doc.restoreGraphicsState?.()
        doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.rect(x, y, pw, ph)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(...GREY)
        doc.text(clean(label), x, y + ph + 3)
        if (i % cols === cols - 1 || i === loaded.length - 1) y += ph + 6
      })
      y += 1
    }
  }

  // ---------- Remarks + signature ----------
  const remarkLines = doc.splitTextToSize(clean(d.inspectorRemarks) || '-', CW * 0.62)
  y = ensure(doc, y, Math.max(26, remarkLines.length * 4 + 14))
  y = heading(doc, 'Inspector Remarks', y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(remarkLines, M, y + 3)
  const sig = d.signature ? await loadImage(d.signature, 500, 'image/png') : null
  const sx = M + CW * 0.68, sw2 = CW * 0.32
  if (sig) { const h = 14, w = Math.min(sw2, h * sig.w / sig.h); doc.addImage(sig.data, 'PNG', sx, y - 4, w, h) }
  doc.setDrawColor(60); doc.setLineWidth(0.3); doc.line(sx, y + 11, sx + sw2, y + 11)
  doc.setFontSize(7.5); doc.setTextColor(...GREY); doc.text('Inspector Signature', sx, y + 14.5)

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages(), H = doc.internal.pageSize.getHeight()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, H - 10, W - M, H - 10)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY)
    doc.text('Tick = checked, no issue   |   Flag = defect / deficiency found   |   Condition at the time of inspection.', M, H - 6)
    doc.text(clean(`PDI CarVision  |  ${r.id}  |  Page ${p} of ${pages}`), W - M, H - 6, { align: 'right' })
  }
  return doc
}

function remarkLine(doc, text, y) {
  const W = doc.internal.pageSize.getWidth()
  const lines = doc.splitTextToSize(`Remarks: ${clean(text)}`, W - 2 * M - 6)
  y = ensure(doc, y, lines.length * 3.6 + 3)
  doc.setFillColor(248, 250, 252); doc.rect(M, y, W - 2 * M, lines.length * 3.6 + 2.4, 'F')
  doc.setFillColor(...BLUE); doc.rect(M, y, 0.8, lines.length * 3.6 + 2.4, 'F')
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.8); doc.setTextColor(60, 60, 60)
  doc.text(lines, M + 3, y + 3.4)
  return y + lines.length * 3.6 + 3
}