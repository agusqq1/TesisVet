import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "../components/LogoIcon";
import { Mail, Lock, ShieldCheck, UserCheck, ArrowRight } from "lucide-react";

interface LoginProps {
  navigate: (path: string) => void;
}

// Cuentas de demostración que carga `npm run db:setup`. Los accesos directos solo
// existen al correr `npm run dev`: en el build de producción este bloque se elimina.
const CUENTAS_DEMO = import.meta.env.DEV
  ? {
      admin: { email: "admin@vetanimal.com", password: "Admin2026!" },
      cliente: { email: "agustina.gomez@example.com", password: "123456" },
    }
  : null;

export const Login: React.FC<LoginProps> = ({ navigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ingresar = async (mail: string, pass: string) => {
    setError("");
    setLoading(true);
    const res = await login(mail, pass);
    setLoading(false);

    if (res.success) {
      // El destino depende del rol que informa el servidor, no del email
      navigate(res.user?.rol === "veterinario" ? "/admin/dashboard" : "/");
    } else {
      setError(res.error || "Credenciales incorrectas. Verificá tu email y contraseña.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ingresar(email, password);
  };

  const handleQuickLogin = (cuenta: { email: string; password: string }) => {
    setEmail(cuenta.email);
    setPassword(cuenta.password);
    ingresar(cuenta.email, cuenta.password);
  };

  return (
    <>
      <div className="auth-wrap">
        <div
          className="auth-visual"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1000&q=80')",
          }}
        >
          <div
            className="logo cursor-pointer flex items-center gap-2.5 text-white mb-auto"
            onClick={() => navigate("/")}
          >
            <LogoIcon size={32} />
            <span className="font-bold text-xl text-white tracking-tight">VetAnimal</span>
          </div>
          <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">
            Cuidado y Atención
            <br />
            para Cada Compañero.
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm">Acceso seguro para veterinarios y dueños de mascotas.</p>
        </div>

        <div className="auth-form-side">
          <div className="auth-form">
            <div className="mb-4 flex items-center gap-2">
              <LogoIcon size={20} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Acceso al Sistema
              </span>
            </div>

            <div className="space-y-2 mb-8">
              <h1 className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                Iniciar Sesión
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed pt-1">
                Ingresá tus credenciales para acceder a la plataforma.
              </p>
            </div>

            {error && <div className="alert alert-error mb-4">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Dirección de Email</label>
                <div className="input-wrap">
                  <span className="text-slate-400 flex items-center justify-center">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@ejemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Contraseña</label>
                <div className="input-wrap">
                  <span className="text-slate-400 flex items-center justify-center">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="field-row flex items-center justify-end text-xs text-slate-600 mb-5">
                <span
                  className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  onClick={() => navigate("/forgot-password")}
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block font-bold text-base py-3 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
              >
                <span>{loading ? "Verificando..." : "Ingresar al Sistema"}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="auth-foot mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
              ¿No tenés una cuenta todavía?{" "}
              <span
                className="text-blue-600 hover:text-blue-700 cursor-pointer font-bold ml-1"
                onClick={() => navigate("/register")}
              >
                Crear Cuenta
              </span>
            </div>

            {/* Quick Login Assist Card (solo en desarrollo) */}
            {CUENTAS_DEMO && (
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Accesos Directos de Demostración
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <div>
                      <span className="font-bold text-blue-900 block">Veterinario / Admin</span>
                      <span className="text-[11px] text-slate-500 font-mono">admin@vetanimal.com</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(CUENTAS_DEMO.admin)}
                    className="btn btn-primary btn-sm text-[11px] py-1 px-2.5 font-bold"
                  >
                    Usar
                  </button>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-slate-600" />
                    <div>
                      <span className="font-bold text-slate-800 block">Cliente de Prueba</span>
                      <span className="text-[11px] text-slate-500 font-mono">agustina.gomez@example.com</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(CUENTAS_DEMO.cliente)}
                    className="btn btn-outline btn-sm text-[11px] py-1 px-2.5 font-bold"
                  >
                    Usar
                  </button>
                </div>
              </div>
            </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};
