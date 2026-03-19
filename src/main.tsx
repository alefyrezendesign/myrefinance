import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { FinanceProvider } from './context/FinanceContext'
import './styles/global.css' // Import global css here

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <FinanceProvider>
        <App />
      </FinanceProvider>
    </AuthProvider>
  </React.StrictMode>,
)
