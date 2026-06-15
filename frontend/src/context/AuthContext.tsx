import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  useEffect(() => {
    // Si hay un token pero no hay usuario en memoria, idealmente llamaríamos a /api/auth/me
    // Por simplicidad, leeremos el rol del localStorage o decodificaremos el JWT en una v2
    const storedRole = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email");
    if (token && storedRole && storedEmail && !user) {
      setUser({ id: 0, email: storedEmail, role: storedRole });
    }
  }, [token, user]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newUser.role);
    localStorage.setItem("email", newUser.email);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
