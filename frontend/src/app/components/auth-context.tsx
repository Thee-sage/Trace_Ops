import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://trace-ops.onrender.com';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  apiKey: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function getToken(): string | null {
  return localStorage.getItem('traceops-token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('traceops-token'));
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('traceops-guest') === 'true');
  const [isLoading, setIsLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (!res.ok) throw new Error('Invalid token');
        const data = await res.json();
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem('traceops-token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('traceops-token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Registration failed');
    }

    const data = await res.json();
    localStorage.setItem('traceops-token', data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('traceops-token');
    localStorage.removeItem('traceops-guest');
    setToken(null);
    setUser(null);
    setIsGuest(false);
  }, []);

  const enterGuestMode = useCallback(() => {
    localStorage.setItem('traceops-guest', 'true');
    setIsGuest(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, isGuest, isLoading, login, register, logout, enterGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}
