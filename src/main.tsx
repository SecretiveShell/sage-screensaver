import './style.css'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DemoPage } from './demo-page.tsx'
import { SageAnimation } from './sage-animation.tsx'

createRoot(document.querySelector<HTMLDivElement>('#app')!).render(
  <BrowserRouter>
    <Routes>
      <Route
        path="/"
        element={(
          <main aria-label="Sage screensaver">
            <SageAnimation />
          </main>
        )}
      />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>,
)
