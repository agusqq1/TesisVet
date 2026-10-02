import React, { useState } from "react";
import { LogoIcon } from "../components/LogoIcon";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { api } from "../api";

interface ForgotPasswordProps {
  navigate: (path: string) => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ navigate }) => {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError("");
    api<{ message: string }>("/api/auth/forgot-password", { method: "POST", body: { email } })
      .then((data) => setMensaje(data.message))
      .catch((err) => setError(err.message));
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Restablecer Contraseña</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Ingresá tu correo electrónico y te enviaremos las instrucciones de recuperación.
        </p>

        {mensaje ? (
          <div className="alert alert-success text-sm mb-4">{mensaje}</div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            {error && <div className="alert alert-error text-sm mb-4">{error}</div>}
            <div className="field">
              <label>Dirección de Correo Electrónico</label>
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
            <button type="submit" className="btn btn-primary btn-block mt-4 font-bold py-3 flex items-center justify-center gap-2">
              <span>Enviar enlace de recuperación</span>
              <Send size={15} />
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            className="text-brand-600 hover:text-brand-700 text-sm font-semibold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
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
