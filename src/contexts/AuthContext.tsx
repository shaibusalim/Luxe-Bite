import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  user: { id: string; email?: string } | null;
  session: null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAdmin: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [session, setSession] = useState<null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async (_userId: string) => {
    setIsAdmin(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.id, email: payload.email });
        setIsAdmin(Array.isArray(payload.roles) && payload.roles.includes('admin'));
      } catch {
        localStorage.removeItem('token');
      }
    }
    setSession(null);
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setIsAdmin(Array.isArray(data.roles) && data.roles.includes('admin'));
      return { error: null };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: err };
    }
  };

  const signInAdmin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid credentials');
      }
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setIsAdmin(true);
      return { error: null };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      if (!res.ok) throw new Error('Signup failed');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      setUser({ id: data.user.id, email: data.user.email });
      setIsAdmin(Array.isArray(data.roles) && data.roles.includes('admin'));
      return { error: null };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: err };
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, isLoading, signIn, signInAdmin, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
