const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../src/assets/logo.png');
const outPath = path.join(__dirname, '../src/assets/logoData.js');

const buffer = fs.readFileSync(logoPath);
const base64 = buffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64}`;

fs.writeFileSync(outPath, `// Auto-generated 100% offline Base64 logo for Electron desktop & web
export const SATYADHI_LOGO = "${dataUrl}";
export default SATYADHI_LOGO;
`);

console.log("Successfully generated logoData.js, bytes:", buffer.length);
