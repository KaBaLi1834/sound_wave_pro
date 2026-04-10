const TOKEN_KEY = "soundwave_token";

export function getApiOrigin(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined;
  return (v || "").replace(/\/$/, "");
}

/** Path starting with /api — uses VITE_API_URL when set, else same-origin (Vite proxy in dev). */
export function apiUrl(path: string): string {
  const origin = getApiOrigin();
  if (!origin) return path;
  return `${origin}${path}`;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = apiUrl(path);
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

/** Parse JSON body; avoids SyntaxError when the server returns HTML (e.g. SPA fallback or proxy miss). */
export async function parseApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error("Unexpected response from server");
  }
  if (text.trim() === "") {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid response from server");
  }
}

/** Like parseApiJson but returns {} if the body is not JSON (e.g. HTML error page). */
export async function parseApiJsonLoose<T extends object = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  try {
    return await parseApiJson<T>(res);
  } catch {
    return {} as T;
  }
}

export function googleAuthUrl(): string {
  const origin = getApiOrigin();
  const base = origin || "http://localhost:4000";
  return `${base.replace(/\/$/, "")}/api/auth/google`;
}
