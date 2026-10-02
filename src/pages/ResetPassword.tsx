import React, { useState } from "react";
import { LogoIcon } from "../components/LogoIcon";
import { Lock, ArrowLeft } from "lucide-react";
import { api } from "../api";

interface ResetPasswordProps {
  navigate: (path: string) => void;
}

// Pantalla a la que llega el enlace del email de "olvidé mi contraseña"
export const ResetPassword: React.FC<ResetPasswordProps> = ({ navigate }) => {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: { token, password },
      });
      setMensaje(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div
        className="flex items-center gap-2.5 mb-6 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <LogoIcon size={34} />
        <span className="font-bold text-2xl text-slate-900">VetAnimal</span>
      </div>
      <div className="bg-white rounded-3xl shadow-md p-8 sm:p-10 max-w-md w-full text-center border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Elegí tu nueva contraseña</h1>
        <p className="text-slate-500 mb-6 text-sm">
          La vas a usar para iniciar sesión de ahora en más.
        </p>

        {!token ? (
          <div className="alert alert-error text-sm mb-4">
            El enlace no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".
          </div>
        ) : mensaje ? (
          <>
            <div className="alert alert-success text-sm mb-4">{mensaje}</div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn btn-primary btn-block font-bold py-3"
            >
              Iniciar sesión
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            {error && <div className="alert alert-error text-sm mb-4">{error}</div>}

            <div className="field">
              <label>Nueva contraseña</label>
              <div className="input-wrap">
                <span className="text-slate-400 flex items-center justify-center">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Repetir contraseña</label>
              <div className="input-wrap">
                <span className="text-slate-400 flex items-center justify-center">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-block mt-4 font-bold py-3"
            >
              {submitting ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft size={15} />
            <span>Volver al inicio de sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
