import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "../components/LogoIcon";
import { User, Mail, Phone, Lock, ArrowRight, CheckCircle2 } from "lucide-react";

interface RegisterProps {
  navigate: (path: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ navigate }) => {
  const { register } = useAuth();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nombre || !email || !password) {
      setError("Completá todos los campos obligatorios.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const res = await register(nombre, email, password, telefono);
    setLoading(false);

    if (res.success) {
      setRegistered(true);
    } else {
      setError(res.error || "Error al crear cuenta");
    }
  };

  return (
    <>
      <div className="auth-wrap">
        <div
          className="auth-visual"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1544568100-847a948585b9?w=1000&q=80')",
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
            Sumate a la
            <br />
            comunidad VetAnimal.
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm">Creá tu cuenta para agendar turnos y consultar el historial médico.</p>
        </div>

        <div className="auth-form-side">
          <div className="auth-form">
            {registered ? (
              /* Success View */
              <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-xl text-center space-y-5 animate-in zoom-in-95">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    ¡Cuenta Creada con Éxito!
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-800 to-teal-700 bg-clip-text text-transparent mt-3 mb-1">
                    ¡Bienvenido a VetAnimal, {nombre.split(" ")[0]}!
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm">
                    Ya iniciaste sesión con la cuenta:
                  </p>
                  <p className="text-blue-700 font-bold text-sm mt-1 bg-blue-50 py-1 px-3 rounded-lg inline-block border border-blue-100">
                    {email}
                  </p>
                  <p className="text-slate-500 text-xs mt-3">
                    El próximo paso es registrar a tu mascota para poder pedir turnos.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/perfil")}
                    className="btn btn-primary flex-1 py-3 text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    <span>Ir a mi Perfil de Mascotas</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="btn btn-light py-3 text-xs font-semibold"
                  >
                    Volver al Inicio
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <>
                <div className="mb-4 flex items-center gap-2">
                  <LogoIcon size={20} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    Registro de Clientes
                  </span>
                </div>

                <div className="space-y-2 mb-8">
                  <h1 className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                    Creá tu cuenta
                  </h1>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed pt-1">
                    Completá tus datos para agendar consultas y gestionar tus mascotas.
                  </p>
                </div>

                {error && <div className="alert alert-error mb-4">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label>Nombre Completo</label>
                    <div className="input-wrap">
                      <span className="text-slate-400 flex items-center justify-center">
                        <User size={16} />
                      </span>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre y apellido"
                        required
                      />
                    </div>
                  </div>

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
                    <label>Teléfono</label>
                    <div className="input-wrap">
                      <span className="text-slate-400 flex items-center justify-center">
                        <Phone size={16} />
                      </span>
                      <input
                        type="text"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="11-1234-5678"
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
                        placeholder="Mínimo 8 caracteres"
                        required
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Confirmar Contraseña</label>
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
                    disabled={loading}
                    className="btn btn-primary btn-block mt-4 font-bold text-base py-3 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
                  >
                    <span>{loading ? "Creando cuenta..." : "Crear Cuenta"}</span>
                    <ArrowRight size={16} />
                  </button>
                </form>

                <div className="auth-foot mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
                  ¿Ya tenés una cuenta?{" "}
                  <span
                    className="text-blue-600 hover:text-blue-700 cursor-pointer font-bold ml-1"
                    onClick={() => navigate("/login")}
                  >
                    Iniciar Sesión
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
