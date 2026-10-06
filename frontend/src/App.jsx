import AppRoutes from './routes/AppRoutes.jsx'
import ToastHost from './components/Toast.jsx'
import MockBanner from './components/MockBanner.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <MockBanner />
      <AppRoutes />
      <ToastHost />
    </ErrorBoundary>
  )
}
