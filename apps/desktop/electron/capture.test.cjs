// node --test electron/capture.test.cjs (DN-072)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateCaptureRequest, buildCapturePage } = require("./capture.cjs");

const ok = { html: "<div>x</div>", css: ".a{}", width: 1280, height: 720, sourceWidth: 640, sourceHeight: 360, fileName: "thumb" };

test("valid requests are normalised", () => {
  const r = validateCaptureRequest(ok);
  assert.equal(r.fileName, "thumb.png");
  assert.equal(validateCaptureRequest({ ...ok, fileName: "a.PNG" }).fileName, "a.png");
});

test("the backdrop is a plain colour or white", () => {
  assert.equal(validateCaptureRequest({ ...ok, background: "rgb(15, 23, 42)" }).background, "rgb(15, 23, 42)");
  assert.equal(validateCaptureRequest({ ...ok, background: "red;}</style><script>" }).background, "#ffffff");
  assert.match(buildCapturePage(validateCaptureRequest({ ...ok, background: "#0b1324" })), /background:#0b1324\}/);
});

test("odd requests are refused", () => {
  for (const bad of [null, "x", { ...ok, html: "" }, { ...ok, width: 1280.5 }, { ...ok, height: 99999 }, { ...ok, css: 5 }, { ...ok, sourceWidth: 0 }, { ...ok, width: "1280" }]) {
    assert.throws(() => validateCaptureRequest(bad));
  }
});

test("the page scales the design, allows no scripts or network, and css can't escape its block", () => {
  const page = buildCapturePage(validateCaptureRequest({ ...ok, css: "a{}</style><script>alert(1)</script>" }));
  assert.match(page, /zoom:2\}/);
  assert.match(page, /default-src 'none'; img-src data:/);
  assert.ok(!page.includes("</style><script>"));
  assert.match(page, /width:1280px;height:720px/);
});
