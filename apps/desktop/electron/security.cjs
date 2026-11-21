// Pure security rules for the Electron shell (plan §10, AGENT_README §7, DN-036).
// No Electron imports here, so these can be unit-tested with node:test.

/** Origin that serves the isolated motion-class player (see main.cjs). */
const MOTION_SCHEME = "edusuite-motion";
const MOTION_ORIGIN = `${MOTION_SCHEME}://player`;

/**
 * Content Security Policy for the app's own pages.
 *
 * Production: scripts only from the app bundle; network only to the API (and,
 * from Phase 3, the file host). Inline style attributes are allowed because
 * React's `style={{…}}` needs them; inline scripts are not.
 * Development: also allows Vite's dev server, its websocket and the
 * React-refresh inline preamble.
 */
function buildAppCsp({ apiOrigin, fileOrigins = [], dev = false, devServerOrigin = "http://localhost:5173", forMeta = false }) {
  const connect = ["'self'", apiOrigin, ...fileOrigins];
  const scripts = ["'self'"];
  if (dev) {
    const ws = devServerOrigin.replace(/^http/, "ws");
    connect.push(devServerOrigin, ws);
    scripts.push(devServerOrigin, "'unsafe-inline'");
  }
  return [
    "default-src 'self'",
    `script-src ${unique(scripts).join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${unique(fileOrigins).join(" ")}`.trim(),
    "font-src 'self' data:",
    `connect-src ${unique(connect).join(" ")}`,
    `frame-src ${MOTION_ORIGIN}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    // Browsers ignore frame-ancestors in a <meta> policy (and warn), so it's header-only.
    ...(forMeta ? [] : ["frame-ancestors 'none'"]),
  ].join("; ");
}

/**
 * CSP for the motion player page. It runs its own inline scripts and shows
 * screenshots as data: URLs, but may not make any network request, so a
 * malicious question text can't send anything anywhere.
 */
function buildMotionCsp() {
  return [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "img-src data: blob:",
    "font-src data:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
}

/** True if a top-level navigation stays on the app itself (no leaving to the web). */
function isAllowedNavigation(targetUrl, { appUrl, dev = false, devServerOrigin = "http://localhost:5173" }) {
  let target;
  try {
    target = new URL(targetUrl);
  } catch {
    return false;
  }
  if (dev && target.origin === new URL(devServerOrigin).origin) return true;
  const app = new URL(appUrl);
  // Packaged app: only the bundled index.html (hash routes are fine).
  return target.protocol === "file:" && app.protocol === "file:" && target.pathname === app.pathname;
}

/** Only the clipboard is granted to the page; camera, microphone, location etc. are refused. */
function isAllowedPermission(permission) {
  return permission === "clipboard-sanitized-write";
}

/** API base URL: EDUSUITE_API_URL wins; otherwise the built-in default. Must be http(s). */
function resolveApiOrigin(envValue, fallback) {
  const raw = envValue || fallback;
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("API URL must be http or https");
  return url.origin;
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

module.exports = {
  MOTION_SCHEME,
  MOTION_ORIGIN,
  buildAppCsp,
  buildMotionCsp,
  isAllowedNavigation,
  isAllowedPermission,
  resolveApiOrigin,
};
