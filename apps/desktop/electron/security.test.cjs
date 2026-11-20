const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAppCsp,
  buildMotionCsp,
  isAllowedNavigation,
  isAllowedPermission,
  resolveApiOrigin,
} = require("./security.cjs");

const directive = (csp, name) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

test("production CSP allows scripts only from the app and network only to the API", () => {
  const csp = buildAppCsp({ apiOrigin: "https://api.example.in" });
  assert.equal(directive(csp, "script-src"), "script-src 'self'");
  assert.equal(directive(csp, "connect-src"), "connect-src 'self' https://api.example.in");
  assert.doesNotMatch(directive(csp, "script-src"), /unsafe/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-src edusuite-motion:\/\/player/);
});

test("development CSP adds the Vite dev server and its websocket", () => {
  const csp = buildAppCsp({ apiOrigin: "http://localhost:3000", dev: true });
  assert.match(directive(csp, "connect-src"), /ws:\/\/localhost:5173/);
  assert.match(directive(csp, "script-src"), /http:\/\/localhost:5173/);
});

test("the motion player may run its scripts but reach no network", () => {
  const csp = buildMotionCsp();
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /default-src 'none'/);
  assert.doesNotMatch(csp, /https?:/);
});

test("navigation can't leave the app", () => {
  const appUrl = "file:///C:/Program%20Files/EduSuite/resources/app.asar/dist/index.html";
  assert.equal(isAllowedNavigation(`${appUrl}#/users`, { appUrl }), true);
  assert.equal(isAllowedNavigation("https://evil.example", { appUrl }), false);
  assert.equal(isAllowedNavigation("file:///C:/Windows/system32/x.html", { appUrl }), false);
  assert.equal(isAllowedNavigation("http://localhost:5173/#/x", { appUrl }), false, "dev server only in dev");
  assert.equal(isAllowedNavigation("http://localhost:5173/#/x", { appUrl, dev: true }), true);
  assert.equal(isAllowedNavigation("not a url", { appUrl }), false);
});

test("only the clipboard permission is granted", () => {
  assert.equal(isAllowedPermission("clipboard-sanitized-write"), true);
  for (const p of ["media", "geolocation", "notifications", "openExternal", "clipboard-read"]) {
    assert.equal(isAllowedPermission(p), false, p);
  }
});

test("API URL comes from the environment and must be http(s)", () => {
  assert.equal(resolveApiOrigin(undefined, "http://localhost:3000"), "http://localhost:3000");
  assert.equal(resolveApiOrigin("https://api.example.in/api/v1", "x"), "https://api.example.in");
  assert.throws(() => resolveApiOrigin("file:///etc/passwd", "x"));
});
