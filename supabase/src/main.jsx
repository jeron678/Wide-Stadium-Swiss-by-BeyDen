import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicAuthGate from './PublicAuthGate.jsx'

const root = createRoot(document.getElementById('root'))
root.render(
  <StrictMode>
    <PublicAuthGate><App /></PublicAuthGate>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered:', registration.scope)
      })
      .catch(error => {
        console.warn('Service Worker registration failed:', error)
      })
  })
}
