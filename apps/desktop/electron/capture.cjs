// PNG export of a design shown in the app (thumbnails, posters; DN-072).
// The page sends the element's HTML and the app's CSS; the main process renders it in a
// hidden offscreen window at the exact target size and saves a PNG. That window has
// JavaScript off and may load nothing but its own file and data: URLs, so text staff typed
// can't run or fetch anything. Pure functions here; Electron wiring is in main.cjs.

const MAX_HTML = 20 * 1024 * 1024;
const MAX_CSS = 5 * 1024 * 1024;
const MIN_SIDE = 16;
const MAX_SIDE = 4096;

const isInt = (n) => Number.isInteger(n) && n >= MIN_SIDE && n <= MAX_SIDE;
/** A plain CSS colour only (it goes into a style block). */
const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\([0-9.,\s%]+\))$/i;

/** Checks and normalises a capture request from the page; throws on anything odd. */
function validateCaptureRequest(req) {
  if (!req || typeof req !== "object") throw new Error("invalid capture request");
  const { html, css, width, height, sourceWidth, sourceHeight, fileName, background } = req;
  if (typeof html !== "string" || html.length === 0 || html.length > MAX_HTML) throw new Error("invalid capture html");
  if (typeof css !== "string" || css.length > MAX_CSS) throw new Error("invalid capture css");
  if (!isInt(width) || !isInt(height)) throw new Error("invalid capture size");
  if (!(typeof sourceWidth === "number" && sourceWidth > 0 && sourceWidth <= MAX_SIDE)) throw new Error("invalid source size");
  if (!(typeof sourceHeight === "number" && sourceHeight > 0 && sourceHeight <= MAX_SIDE)) throw new Error("invalid source size");
  const base = String(fileName || "image").replace(/\.png$/i, "");
  const bg = typeof background === "string" && COLOUR.test(background.trim()) ? background.trim() : "#ffffff";
  return { html, css, width, height, sourceWidth, sourceHeight, background: bg, fileName: `${base}.png` };
}

/** The page the hidden window renders: the element scaled with CSS zoom so text stays sharp. */
function buildCapturePage({ html, css, width, height, sourceWidth, sourceHeight, background = "#ffffff" }) {
  const zoom = width / sourceWidth;
  // A design must never close its own <style> block.
  const safeCss = css.replace(/<\/style/gi, "<\\/style");
  return `<!doctype html>
<html lang="hi"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">
<style>${safeCss}</style>
<style>
html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:${background}}
#edusuite-capture{width:${sourceWidth}px;height:${sourceHeight}px;zoom:${zoom}}
#edusuite-capture>*{width:100%!important;height:100%!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important;aspect-ratio:auto!important;transition:none!important}
</style></head>
<body><div id="edusuite-capture">${html}</div></body></html>`;
}

module.exports = { validateCaptureRequest, buildCapturePage, MAX_SIDE };
