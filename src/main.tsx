import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from "react-router-dom"
import { Provider } from "@/components/ui/provider"
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>,
)
