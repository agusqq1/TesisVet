import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { api, SESION_VENCIDA } from "../api";

type AuthResult = { success: boolean; error?: string; user?: User };

interface AuthContextType {
  user: User | null;
  // false hasta que el servidor confirma si hay una sesión iniciada
  ready: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<AuthResult>;
  register: (nombre: string, email: string, pass: string, telefono?: string) => Promise<AuthResult>;
  // Corrige nombre o teléfono del usuario con sesión iniciada
  actualizarPerfil: (datos: { nombre?: string; telefono?: string }) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // La sesión vive en una cookie que solo lee el servidor: se le pregunta quién es el usuario
  useEffect(() => {
    // Versiones anteriores guardaban el usuario en el navegador; ya no se usa
    localStorage.removeItem("vet_user");

    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));

    const onSesionVencida = () => setUser(null);
    window.addEventListener(SESION_VENCIDA, onSesionVencida);
    return () => window.removeEventListener(SESION_VENCIDA, onSesionVencida);
  }, []);

  const autenticar = async (url: string, body: unknown, errorPorDefecto: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const data = await api<{ user: User }>(url, { method: "POST", body });
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (e: any) {
      return { success: false, error: e.message || errorPorDefecto };
    } finally {
      setLoading(false);
    }
  };

  const login = (email: string, pass: string) =>
    autenticar("/api/auth/login", { email, password: pass }, "Error al iniciar sesión");

  const register = (nombre: string, email: string, pass: string, telefono?: string) =>
    autenticar("/api/auth/register", { nombre, email, password: pass, telefono }, "Error al registrarse");

  const actualizarPerfil = async (datos: { nombre?: string; telefono?: string }): Promise<AuthResult> => {
    try {
      const data = await api<{ user: User }>("/api/auth/me", { method: "PUT", body: datos });
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (e: any) {
      return { success: false, error: e.message || "No se pudieron guardar los datos." };
    }
  };

  const logout = () => {
    setUser(null);
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, ready, loading, login, register, actualizarPerfil, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
