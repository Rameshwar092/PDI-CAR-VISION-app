import { useEffect, useRef, useState } from 'react'

// A checkbox dropdown that lets the inspector tick more than one option on the same item.
export default function MultiSelect({ options, value = [], onChange, flagged, placeholder = 'Select...' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc) }
  }, [])

  const toggle = opt => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  const clear = e => { e.stopPropagation(); onChange([]) }
  const label = value.length === 0 ? placeholder : value.length <= 2 ? value.join(', ') : `${value.length} selected`

  return (<div className="mselect" ref={ref}>
    <button type="button" className={`mselect-btn ${value.length ? 'has-value' : ''} ${flagged ? 'flagged' : ''}`} onClick={() => setOpen(o => !o)}>
      <span className="mselect-label">{label}</span>
      {value.length > 0 && <span className="mselect-clear" onClick={clear} title="Clear">{'\u2715'}</span>}
      <span className="mselect-caret">{'\u25be'}</span>
    </button>
    {open && <div className="mselect-panel">
      {options.map(o => (<label key={o} className="mselect-opt">
        <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />{o}
      </label>))}
    </div>}
  </div>)
}
