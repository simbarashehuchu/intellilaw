import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      richColors
      theme="dark"
      toastOptions={{
        style: {
          background: '#111827',
          border: '1px solid #1e2d4a',
          color: '#c8d5e8',
        },
      }}
    />
  </StrictMode>,
)
