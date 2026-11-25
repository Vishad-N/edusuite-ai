import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionUser } from "@edusuite/shared";
import { ApiError, createApiClient, type ApiClient, type TokenVault } from "./client.ts";

/** The preload bridge from electron/preload.cjs (absent in a plain browser). */
type Bridge = {
  app: { config: () => Promise<{ apiBaseUrl: string }> };
  auth: { getToken: () => Promise<string | null>; setToken: (t: string) => Promise<void>; clearToken: () => Promise<void> };
  /** Isolated, network-less player for generated HTML (DN-036); returns the URL to load in a sandboxed iframe. */
  motion?: { open: (html: string) => Promise<string> };
  /** Native save dialog (allowed extensions only). */
  file?: { saveAs: (suggestedName: string, data: Uint8Array) => Promise<{ saved: boolean; fileName?: string }> };
  /** PNG export of a design at an exact size (DN-072). */
  capture?: {
    png: (request: {
      html: string;
      css: string;
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
      background: string;
      fileName: string;
    }) => Promise<{ saved: boolean; fileName?: string }>;
  };
  /** Sends a crash to error reporting when the build has it on (DN-068); otherwise does nothing. */
  telemetry?: { report: (crash: { name: string; message: string; stack: string; screen?: string }) => Promise<boolean> };
};
declare global {
  interface Window {
    edusuite?: Bridge;
  }
}

export type SessionState =
  | { status: "loading" }
  | { status: "signedOut"; endedBecause?: ApiError | undefined }
  /** pickBranch: just signed in with more than one branch, so ask which one today (DN-070). */
  | { status: "signedIn"; user: SessionUser; pickBranch?: boolean };

type SessionContextValue = {
  state: SessionState;
  client: ApiClient;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Works at another of the user's branches from now on (a new session on the server). */
  switchBranch: (branchId: string) => Promise<void>;
  /** Ends the after-login branch question. */
  finishBranchPick: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Refresh token storage: the DPAPI vault in Electron, memory only in a plain browser (DN-037). */
function vaultFromBridge(bridge: Bridge | undefined): TokenVault {
  if (bridge) return { get: bridge.auth.getToken, set: bridge.auth.setToken, clear: bridge.auth.clearToken };
  let token: string | null = null;
  return {
    get: async () => token,
    set: async (t) => {
      token = t;
    },
    clear: async () => {
      token = null;
    },
  };
}

/** A stable id for this install, sent with logins so the server can spot a stolen refresh token. */
function deviceId(): string {
  const key = "edusuite_device_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const language = () => {
  try {
    return localStorage.getItem("edusuite_lang") === "en" ? "en" : "hi";
  } catch {
    return "hi";
  }
};

export function SessionProvider({ apiBaseUrl, children }: { apiBaseUrl: string; children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: apiBaseUrl,
        vault: vaultFromBridge(window.edusuite),
        deviceId: deviceId(),
        language,
        // setState is stable, so the client can call it directly when the server ends the session.
        onSessionEnded: (e) => setState({ status: "signedOut", endedBecause: e }),
      }),
    [apiBaseUrl],
  );

  // On start, resume the day's session from the vault if there is one.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resumed = await client.resume();
        const user = resumed ? await client.get<SessionUser>("/me") : null;
        if (!cancelled) setState(user ? { status: "signedIn", user } : { status: "signedOut" });
      } catch {
        if (!cancelled) setState({ status: "signedOut" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await client.login({ identifier, password });
      setState({ status: "signedIn", user: res.user, pickBranch: res.user.branches.length > 1 });
    },
    [client],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setState({ status: "signedOut" });
  }, [client]);

  const switchBranch = useCallback(
    async (branchId: string) => {
      const res = await client.switchBranch(branchId);
      setState({ status: "signedIn", user: res.user });
    },
    [client],
  );

  const finishBranchPick = useCallback(() => {
    setState((s) => (s.status === "signedIn" ? { status: "signedIn", user: s.user } : s));
  }, []);

  const value = useMemo(
    () => ({ state, client, login, logout, switchBranch, finishBranchPick }),
    [state, client, login, logout, switchBranch, finishBranchPick],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

/** The signed-in user; only for components rendered behind the auth guard. */
export function useSignedInUser(): SessionUser {
  const { state } = useSession();
  if (state.status !== "signedIn") throw new Error("useSignedInUser used while signed out");
  return state.user;
}

/** API base URL: from Electron's config, else VITE_API_URL, else the local stack. */
export async function resolveApiBaseUrl(): Promise<string> {
  if (window.edusuite) return (await window.edusuite.app.config()).apiBaseUrl;
  return import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
}
