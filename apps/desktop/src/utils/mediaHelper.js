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
