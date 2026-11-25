/**
 * Saves a design on screen (YouTube thumbnail, poster) as a PNG at an exact size (DN-072).
 * The element's HTML and the app's CSS go to the main process, which renders them in a hidden
 * window at `width`×`height` with CSS zoom, so text is sharp rather than an upscaled screenshot.
 * Only works in the desktop app.
 */
export type PngExportResult = { saved: boolean; fileName?: string | undefined };

/** Every CSS rule the app has loaded (the bundle's own stylesheet; same origin). */
function collectCss(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) parts.push(rule.cssText);
    } catch {
      // A sheet we can't read (none today) is skipped.
    }
  }
  return parts.join("\n");
}

export const canExportPng = (): boolean => typeof window !== "undefined" && Boolean(window.edusuite?.capture);

/** The first solid background behind the element, so a see-through design keeps its look. */
function backdropOf(el: HTMLElement): string {
  for (let node: HTMLElement | null = el.parentElement; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg;
  }
  return "#ffffff";
}

export async function exportElementAsPng(el: HTMLElement, opts: { width: number; height: number; fileName: string }): Promise<PngExportResult> {
  const capture = window.edusuite?.capture;
  if (!capture) throw new Error("PNG export works only in the desktop app");
  // A size change (e.g. a new aspect ratio) animates; measure once it has finished.
  await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  const sourceWidth = el.offsetWidth;
  return capture.png({
    html: el.outerHTML,
    css: collectCss(),
    width: opts.width,
    height: opts.height,
    sourceWidth,
    // From the target's shape, so the scale is the same in both directions.
    sourceHeight: (sourceWidth * opts.height) / opts.width,
    background: backdropOf(el),
    fileName: opts.fileName,
  });
}

/** Export sizes: YouTube's recommended thumbnail, and common social sizes for posters. */
export const THUMBNAIL_SIZE = { width: 1280, height: 720 } as const;
export const POSTER_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
};

/** A safe file name from a title: letters (Devanagari too), digits, dashes. */
export function pngFileName(title: string, fallback: string): string {
  const base = title
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || fallback}.png`;
}
