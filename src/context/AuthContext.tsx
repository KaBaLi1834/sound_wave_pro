import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type User = {
  email: string;
  password: string;
  name: string;
};

const USERS_KEY = "users";
const CURRENT_USER_KEY = "currentUser";

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => boolean;
  signup: (
    email: string,
    password: string,
    confirmPassword: string,
  ) => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as User[];
  } catch {
    return [];
  }
}

function loadCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadCurrentUser());

  const login = useCallback((email: string, password: string) => {
    const users = loadUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    return true;
  }, []);

  const signup = useCallback(
    (email: string, password: string, confirmPassword: string) => {
      if (password !== confirmPassword) {
        return { ok: false as const, error: "Passwords do not match" };
      }
      if (password.length < 6) {
        return {
          ok: false as const,
          error: "Password must be at least 6 characters",
        };
      }
      const users = loadUsers();
      if (users.some((u) => u.email === email)) {
        return { ok: false as const, error: "Email already registered" };
      }
      const newUser: User = {
        email,
        password,
        name: email.split("@")[0],
      };
      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      return { ok: true as const };
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, login, signup, logout }),
    [user, login, signup, logout],
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
