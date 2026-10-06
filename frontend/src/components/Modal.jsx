export default function Modal({ title, onClose, children }) {
  return (<div className="modal-bg" onClick={onClose}><div className="modal card" onClick={e => e.stopPropagation()}>
    <div className="between"><h3>{title}</h3><button className="btn ghost" onClick={onClose}>Close</button></div>{children}</div></div>)
}
