// AuthContext: the single source of truth for "who is logged in right
// now". Wraps the whole app (see main.tsx) so any component can call
// useAuth() instead of threading user/token through props.

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { TOKEN_STORAGE_KEY } from "../api/client";
import { login as loginRequest } from "../api/auth";

const USER_STORAGE_KEY = "fundsroom_user";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Starts true so ProtectedRoute doesn't redirect to /login before
  // we've had a chance to read a saved session from localStorage.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted storage -- treat as logged out rather than crash.
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { token, user: loggedInUser } = await loginRequest(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
