import SATYADHI_LOGO from "../assets/logoData.js";

export { SATYADHI_LOGO };

/**
 * Returns safe logo URL - defaults to embedded Base64 logo so it never breaks in Electron
 */
export function getLogo(customLogo) {
  if (customLogo && customLogo !== "/logo.png" && customLogo !== "./logo.png") {
    return customLogo;
  }
  return SATYADHI_LOGO;
}

/**
 * Converts any user-uploaded file (Image/PDF/PNG) to a safe Data URL
 * This guarantees images always render inside packaged Electron desktop apps
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
