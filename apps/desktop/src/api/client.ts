import type { LoginRequest, LoginResponse, TokenPair } from "@edusuite/shared";

/** An error from the API in its `{ code, message, details }` shape (plan §07). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Where the refresh token lives: the Electron DPAPI vault, or memory in a plain browser. */
export type TokenVault = {
  get: () => Promise<string | null>;
  set: (token: string) => Promise<void>;
  clear: () => Promise<void>;
};

export type ApiClientOptions = {
  baseUrl: string;
  vault: TokenVault;
  deviceId: string;
  /** "hi" or "en"; sent as Accept-Language so error messages come back translated. */
  language: () => string;
  /** Called once when the session can't be renewed (expired, revoked, blocked). */
  onSessionEnded: (error: ApiError) => void;
  fetch?: typeof fetch;
};

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const NETWORK_ERROR = (lang: string) =>
  new ApiError(
    0,
    "NETWORK_ERROR",
    lang === "en" ? "Can't reach the server. Check the internet connection." : "सर्वर से संपर्क नहीं हो सका। इंटरनेट कनेक्शन जाँचें।",
  );

/**
 * The desktop app's only way to talk to the API.
 * - The access token is kept in memory only.
 * - On 401 it refreshes once and retries; concurrent 401s share one refresh,
 *   so the refresh token is never rotated twice in a race (the server would
 *   treat that as theft and end every session).
 */
export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  let accessToken: string | null = null;
  let refreshing: Promise<boolean> | null = null;

  async function send(method: Method, path: string, body: unknown, token: string | null): Promise<Response> {
    const headers: Record<string, string> = { "accept-language": options.language(), accept: "application/json" };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (token) headers.authorization = `Bearer ${token}`;
    try {
      return await doFetch(`${options.baseUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
    } catch {
      throw NETWORK_ERROR(options.language());
    }
  }

  async function toError(res: Response): Promise<ApiError> {
    try {
      const json = (await res.json()) as { code?: string; message?: string; details?: unknown };
      return new ApiError(res.status, json.code ?? "INTERNAL", json.message ?? res.statusText, json.details);
    } catch {
      return new ApiError(res.status, "INTERNAL", res.statusText);
    }
  }

  async function parse<T>(res: Response): Promise<T> {
    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async function storeTokens(tokens: TokenPair): Promise<void> {
    accessToken = tokens.accessToken;
    await options.vault.set(tokens.refreshToken);
  }

  /** Renews the access token from the vault's refresh token. Returns false if the session is over. */
  function refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const refreshToken = await options.vault.get();
      if (!refreshToken) return false;
      const res = await send("POST", "/auth/refresh", { refreshToken, deviceId: options.deviceId }, null);
      if (!res.ok) {
        const error = await toError(res);
        accessToken = null;
        await options.vault.clear();
        options.onSessionEnded(error);
        return false;
      }
      await storeTokens((await res.json()) as TokenPair);
      return true;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    if (!accessToken) await refresh();
    let res = await send(method, path, body, accessToken);
    if (res.status === 401 && (await refresh())) {
      res = await send(method, path, body, accessToken);
    }
    return parse<T>(res);
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: <T = void>(path: string) => request<T>("DELETE", path),

    async login(input: Omit<LoginRequest, "deviceId">): Promise<LoginResponse> {
      const res = await send("POST", "/auth/login", { ...input, deviceId: options.deviceId }, null);
      const data = await parse<LoginResponse>(res);
      await storeTokens(data);
      return data;
    },

    /** Tries to resume a session from the vault (after a restart). */
    async resume(): Promise<boolean> {
      return refresh();
    },

    async logout(): Promise<void> {
      const refreshToken = await options.vault.get();
      accessToken = null;
      await options.vault.clear();
      if (refreshToken) {
        // Best effort: the local session is gone either way.
        await send("POST", "/auth/logout", { refreshToken }, null).catch(() => undefined);
      }
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
