// Refresh-token vault (plan §05 step "Encrypt refresh token with safeStorage (DPAPI)").
// The token is encrypted with Electron's safeStorage (Windows DPAPI: only this
// Windows user on this PC can decrypt it) and written to the app's data folder.
// The renderer never sees the file, only get/set/clear through the preload bridge.
const fs = require("node:fs");
const path = require("node:path");

function createTokenVault({ safeStorage, dir }) {
  const file = path.join(dir, "session.bin");
  // If encryption isn't available, keep the token in memory only: the user
  // logs in again after a restart, which is safer than writing it in plain text.
  let memoryOnly = null;

  return {
    get() {
      if (!safeStorage.isEncryptionAvailable()) return memoryOnly;
      try {
        return safeStorage.decryptString(fs.readFileSync(file));
      } catch {
        return null;
      }
    },
    set(token) {
      if (typeof token !== "string" || token.length < 20 || token.length > 500) {
        throw new Error("invalid token");
      }
      if (!safeStorage.isEncryptionAvailable()) {
        memoryOnly = token;
        return;
      }
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, safeStorage.encryptString(token), { mode: 0o600 });
    },
    clear() {
      memoryOnly = null;
      fs.rmSync(file, { force: true });
    },
  };
}

module.exports = { createTokenVault };
