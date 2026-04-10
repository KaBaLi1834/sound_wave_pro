import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, getStoredToken, parseApiJsonLoose, setStoredToken } from "../api/client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

const USER_KEY = "soundwave_user";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setSession: (user: AuthUser, token: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    const u = loadUser();
    if (t && u) setUser(u);
    else {
      setUser(null);
      setStoredToken(null);
      localStorage.removeItem(USER_KEY);
    }
    setReady(true);
  }, []);

  const persist = useCallback((u: AuthUser, token: string) => {
    setUser(u);
    setStoredToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const setSession = useCallback(
    (u: AuthUser, token: string) => {
      persist(u, token);
    },
    [persist],
  );

  const logout = useCallback(() => {
    setUser(null);
    setStoredToken(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await parseApiJsonLoose<{
        token?: string;
        user?: AuthUser;
        error?: string;
      }>(res);
      if (!res.ok) return { ok: false as const, error: data.error || "Login failed" };
      if (!data.token || !data.user) return { ok: false as const, error: "Invalid response" };
      persist(data.user, data.token);
      return { ok: true as const };
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      });
      const data = await parseApiJsonLoose<{
        token?: string;
        user?: AuthUser;
        error?: string;
      }>(res);
      if (!res.ok) return { ok: false as const, error: data.error || "Sign up failed" };
      if (!data.token || !data.user) return { ok: false as const, error: "Invalid response" };
      persist(data.user, data.token);
      return { ok: true as const };
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      register,
      logout,
      setSession,
    }),
    [user, ready, login, register, logout, setSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
