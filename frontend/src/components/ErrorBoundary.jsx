import { Component } from 'react'

// Without this, any unexpected render error anywhere in the app crashes to
// a blank white screen with nothing in the UI telling the person what
// happened. This catches it and shows a recoverable message instead.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#64748b' }}>Try reloading the page. If this keeps happening, contact support.</p>
          <button className="btn" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
