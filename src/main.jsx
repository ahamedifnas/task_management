import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.jsx'

// Register PWA Service Worker
registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('✅ PWA Registered', registration)
  },
  onRegisterError(error) {
    console.error('❌ PWA Registration Error', error)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)