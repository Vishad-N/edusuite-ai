import { createRequire } from 'node:module'
import { defaultClientConditions, defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const require = createRequire(import.meta.url)
const { buildAppCsp, resolveApiOrigin } = require('./electron/security.cjs')

/**
 * Writes the Content Security Policy into index.html (DN-036). The packaged
 * app loads from file://, where Electron can't add response headers, so the
 * policy has to be a <meta> tag. Builds get the strict policy; `vite` dev gets
 * the dev-server additions.
 */
function contentSecurityPolicy() {
  let dev = false
  const apiOrigin = () => resolveApiOrigin(process.env.EDUSUITE_API_URL, 'http://localhost:3000')
  return {
    name: 'edusuite-csp',
    configResolved(config) {
      dev = config.command === 'serve'
    },
    transformIndexHtml(html) {
      const csp = buildAppCsp({
        apiOrigin: apiOrigin(),
        // Presigned uploads go straight to storage, and images load from it (DN-040).
        fileOrigins: [resolveApiOrigin(process.env.EDUSUITE_FILES_URL, 'http://localhost:3900')],
        dev,
        forMeta: true,
      })
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
    },
    // The main process reads the same API address from here, so a packaged app
    // can only talk to the server it was built for (DN-062).
    generateBundle() {
      // Error reporting (DN-068): only when the build is given a DSN.
      const sentryDsn = process.env.EDUSUITE_SENTRY_DSN || undefined
      this.emitFile({ type: 'asset', fileName: 'app-config.json', source: JSON.stringify({ apiOrigin: apiOrigin(), sentryDsn }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  // Use @edusuite/shared's TypeScript source directly (no separate build step).
  resolve: { conditions: ['source', ...defaultClientConditions] },
})
