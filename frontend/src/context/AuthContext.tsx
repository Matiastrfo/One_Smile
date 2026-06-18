import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: number;
  email: string;
  role: string;
  name: string;
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
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("token"));

  useEffect(() => {
    const storedRole = sessionStorage.getItem("role");
    const storedEmail = sessionStorage.getItem("email");
    const storedName = sessionStorage.getItem("name") ?? "";
    if (token && storedRole && storedEmail && !user) {
      setUser({ id: 0, email: storedEmail, role: storedRole, name: storedName });
    }
  }, [token, user]);

  const login = (newToken: string, newUser: User) => {
    sessionStorage.setItem("token", newToken);
    sessionStorage.setItem("role", newUser.role);
    sessionStorage.setItem("email", newUser.email);
    sessionStorage.setItem("name", newUser.name ?? "");
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("name");
    setToken(null);
    setUser(null);
    window.location.hash = "#/login";
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
