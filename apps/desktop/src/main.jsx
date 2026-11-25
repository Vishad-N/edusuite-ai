import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { SessionProvider, resolveApiBaseUrl } from './api/session.tsx'
import { ToastProvider } from './components/ui/index.ts'
import { AppCrashed, ErrorBoundary, reportCrash } from './components/ErrorBoundary.tsx'

// Errors outside React rendering (event handlers, timers, promises) also go to error reporting
// when it is on (DN-068). Server errors (ApiError) are expected and shown to the user, so not these.
window.addEventListener('error', (e) => reportCrash(e.error ?? e.message, 'window'))
window.addEventListener('unhandledrejection', (e) => {
  if (e.reason?.name !== 'ApiError') reportCrash(e.reason, 'promise')
})

// Development-only UI gallery at #ui-gallery. `import.meta.env.DEV` is false in
// production builds, so the gallery is dropped from the bundle.
const UiGallery =
  import.meta.env.DEV && window.location.hash === '#ui-gallery'
    ? lazy(() => import('./components/ui/UiGallery.tsx').then((m) => ({ default: m.UiGallery })))
    : null

const queryClient = new QueryClient({
  defaultOptions: {
    // Errors carry the API's translated message; retry once for flaky office networks.
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

const root = createRoot(document.getElementById('root'))

if (UiGallery) {
  root.render(
    <StrictMode>
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    </StrictMode>,
  )
} else {
  resolveApiBaseUrl().then((apiBaseUrl) => {
    root.render(
      <StrictMode>
        <ErrorBoundary fallback={() => <AppCrashed />}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider apiBaseUrl={apiBaseUrl}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SessionProvider>
        </QueryClientProvider>
        </ErrorBoundary>
      </StrictMode>,
    )
  })
}
