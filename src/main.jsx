import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Shows what went wrong instead of an empty white page if the app crashes while rendering.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Thrive crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontSize: 18, marginBottom: 12 }}>Что-то пошло не так / Something went wrong</div>
          <div style={{ opacity: 0.75, marginBottom: 16 }}>Обновите страницу. Если ошибка повторяется, пришлите этот текст.</div>
          <code style={{ display: 'block', whiteSpace: 'pre-wrap', opacity: 0.6, fontSize: 12 }}>{String(this.state.error?.stack || this.state.error).slice(0, 600)}</code>
          <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 75, border: '1px solid #fff', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
            Обновить / Reload
          </button>
        </div>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
