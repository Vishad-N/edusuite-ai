/**
 * Branding (DN-052). The app is EduSuite; documents carry the signed-in institute's
 * own name and, until logo upload exists, a badge with its initials. No other
 * institute's name or logo is built in.
 */

import { initialsOf } from "@edusuite/shared";

export const PRODUCT_NAME = "EduSuite AI";

/** The EduSuite mark: an amber "E" on a navy rounded square (also the app icon's source). */
export const EDUSUITE_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="56" fill="#0f172a"/><rect x="20" y="20" width="216" height="216" rx="40" fill="none" stroke="#f59e0b" stroke-width="8"/><path d="M84 64h96v28h-64v22h56v28h-56v22h64v28H84z" fill="#f59e0b"/></svg>`;

const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const EDUSUITE_MARK = svgDataUrl(EDUSUITE_MARK_SVG);

const escapeXml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export { initialsOf };

const initialsCache = new Map<string, string>();

/** A round badge with the institute's initials, as an image URL usable in <img>, HTML exports and SVG. */
export function initialsLogo(name: string | null | undefined): string {
  const initials = initialsOf(name);
  let url = initialsCache.get(initials);
  if (!url) {
    const size = initials.length > 1 ? 92 : 120;
    url = svgDataUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><circle cx="128" cy="128" r="124" fill="#0f172a"/><circle cx="128" cy="128" r="112" fill="none" stroke="#f59e0b" stroke-width="8"/><text x="128" y="128" dy="0.35em" text-anchor="middle" font-family="Nirmala UI, Segoe UI, sans-serif" font-weight="700" font-size="${size}" fill="#f59e0b">${escapeXml(initials)}</text></svg>`,
    );
    initialsCache.set(initials, url);
  }
  return url;
}

/** The institute's own logo if it has one, otherwise its initials badge. */
export function instituteLogo(institute: { name?: string | null; logo?: string | null } | null | undefined): string {
  return institute?.logo || initialsLogo(institute?.name);
}
