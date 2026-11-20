import { createHash, randomBytes } from "node:crypto";
import { hash, verify, type Algorithm } from "@node-rs/argon2";
import { SignJWT, jwtVerify } from "jose";
import { ROLES, type Role } from "@edusuite/shared";
import type { AuthUser } from "./authUser";

// argon2id with OWASP's recommended minimum (19 MiB memory, 2 passes).
// `Algorithm` is a const enum, which isolatedModules can't read at runtime; 2 is Argon2id.
const ARGON2ID = 2 as Algorithm;
const ARGON2 = { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * A real hash checked when the login ID doesn't exist, so a wrong ID takes
 * as long as a wrong password and can't be told apart by timing.
 */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(await dummyHash, password);
}

/** Opaque refresh token: 32 random bytes. Only its SHA-256 is stored. */
export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const ISSUER = "edusuite-api";
const AUDIENCE = "edusuite-desktop";
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function signAccessToken(user: AuthUser, secret: string, expiresAt: Date): Promise<string> {
  return new SignJWT({ sid: user.sessionId, iid: user.instituteId, bid: user.branchId, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(secret));
}

/** Returns the caller, or null if the token is missing, forged, expired or malformed. */
export async function verifyAccessToken(token: string, secret: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["HS256"],
    });
    const { sub, sid, iid, bid, role } = payload as Record<string, unknown>;
    if (
      typeof sub !== "string" ||
      typeof sid !== "string" ||
      typeof iid !== "string" ||
      typeof bid !== "string" ||
      !ROLES.includes(role as Role)
    ) {
      return null;
    }
    return { userId: sub, sessionId: sid, instituteId: iid, branchId: bid, role: role as Role };
  } catch {
    return null;
  }
}
