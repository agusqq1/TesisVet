import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "../components/LogoIcon";
import { Mail, Lock } from "lucide-react";

interface LoginProps {
  navigate: (path: string) => void;
}

export const Login: React.FC<LoginProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      // El destino depende del rol que informa el servidor, no del email
      navigate(res.user?.rol === "veterinario" ? "/admin/dashboard" : "/");
    } else {
      setError(res.error || "Credenciales incorrectas. Verificá tu email y contraseña.");
    }
  };

  return (
    <div className="auth-wrap">
      <div
        className="auth-visual"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1000&q=80')",
        }}
      >
        <div className="logo cursor-pointer" onClick={() => navigate("/")}>
          <LogoIcon size={34} />
          <span>VetAnimal</span>
        </div>
        <h2>Todo lo de tu mascota, en un solo lugar.</h2>
        <p>Turnos, historia clínica, vacunas y pedidos de la tienda.</p>
      </div>

      <div className="auth-form-side">
        <div className="auth-form">
          <h1>Iniciar sesión</h1>
          <p>Ingresá con el email y la contraseña de tu cuenta.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <div className="input-wrap">
                <Mail size={16} className="text-slate-400 shrink-0" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password">Contraseña</label>
                <span
                  className="link-accent text-xs mb-1.5"
                  onClick={() => navigate("/forgot-password")}
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div className="input-wrap">
                <Lock size={16} className="text-slate-400 shrink-0" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block py-3 mt-2">
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="auth-foot">
            ¿Todavía no tenés cuenta?{" "}
            <span className="link-accent" onClick={() => navigate("/register")}>
              Crear cuenta
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
