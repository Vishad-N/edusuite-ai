import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Development-only UI gallery at #ui-gallery. `import.meta.env.DEV` is false in
// production builds, so the gallery is dropped from the bundle.
const UiGallery =
  import.meta.env.DEV && window.location.hash === '#ui-gallery'
    ? lazy(() => import('./components/ui/UiGallery.tsx').then((m) => ({ default: m.UiGallery })))
    : null

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {UiGallery ? (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
