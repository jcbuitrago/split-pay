import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BillProvider } from './context/BillContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BillProvider>
      <App />
    </BillProvider>
  </StrictMode>,
)
