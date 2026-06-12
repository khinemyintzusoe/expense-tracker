import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { HouseholdProvider } from './context/HouseholdContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <HouseholdProvider>
        <App />
      </HouseholdProvider>
    </BrowserRouter>
  </StrictMode>,
)
