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
  return {
    name: 'edusuite-csp',
    configResolved(config) {
      dev = config.command === 'serve'
    },
    transformIndexHtml(html) {
      const csp = buildAppCsp({
        apiOrigin: resolveApiOrigin(process.env.EDUSUITE_API_URL, 'http://localhost:3000'),
        dev,
        forMeta: true,
      })
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      )
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
