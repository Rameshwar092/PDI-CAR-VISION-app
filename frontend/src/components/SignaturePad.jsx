import { useRef, useEffect } from 'react'
export default function SignaturePad({ value, onChange }) {
  const ref = useRef(null), drawing = useRef(false)
  useEffect(() => { const c = ref.current, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height)
    if (value && value.startsWith('data:')) { const i = new Image(); i.onload = () => x.drawImage(i, 0, 0); i.src = value } }, [])
  const pos = e => { const c = ref.current, r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height] }
  const down = e => { drawing.current = true; ref.current.setPointerCapture(e.pointerId); const x = ref.current.getContext('2d'), [px, py] = pos(e)
    x.strokeStyle = '#2f6fe4'; x.lineWidth = 2.5; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py) }
  const move = e => { if (!drawing.current) return; const x = ref.current.getContext('2d'), [px, py] = pos(e); x.lineTo(px, py); x.stroke() }
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL()) }
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange('') }
  return (<div><canvas ref={ref} width="420" height="120" className="sig" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
    <button type="button" className="btn ghost" onClick={clear}>Clear</button></div>)
}
