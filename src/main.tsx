import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from "react-router-dom"
import { Provider } from "@/components/ui/provider"
import './index.css'
import App from './App.tsx'

// #region debug-point A:bootstrap-errors
const __debugReport = (hypothesisId: string, msg: string, data: Record<string, unknown> = {}) => {
  fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "homepage-white-screen",
      runId: "pre-fix",
      hypothesisId,
      location: "src/main.tsx",
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {})
}

window.addEventListener("error", (event) => {
  __debugReport("A", "window error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error instanceof Error ? event.error.stack : null,
  })
})

window.addEventListener("unhandledrejection", (event) => {
  __debugReport("B", "unhandled rejection", {
    reason:
      event.reason instanceof Error
        ? { message: event.reason.message, stack: event.reason.stack }
        : String(event.reason),
  })
})

__debugReport("A", "entry bootstrap", {
  href: window.location.href,
  hash: window.location.hash,
  userAgent: navigator.userAgent,
})
// #endregion

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>
  </StrictMode>,
)
