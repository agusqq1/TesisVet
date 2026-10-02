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
          <div className="logo cursor-pointer" onClick={() => navigate("/")}>
            <LogoIcon size={34} />
            <span>VetAnimal</span>
          </div>
          <h2>Creá tu cuenta en un minuto.</h2>
          <p>Después registrás a tu mascota y ya podés pedir turnos online.</p>
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
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-3 mb-1">
                    ¡Bienvenido a VetAnimal, {nombre.split(" ")[0]}!
                  </h2>
                  <p className="text-slate-600 text-xs sm:text-sm">
                    Ya iniciaste sesión con la cuenta:
                  </p>
                  <p className="text-brand-700 font-bold text-sm mt-1 bg-brand-50 py-1 px-3 rounded-lg inline-block border border-brand-100">
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
                    className="btn btn-primary flex-1 py-3 text-xs font-bold shadow-md shadow-brand-600/30"
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
                <h1>Crear cuenta</h1>
                <p className="text-slate-500 text-sm mb-7">
                  Completá tus datos para pedir turnos y gestionar tus mascotas.
                </p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label>Nombre y apellido</label>
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
                    <label>Email</label>
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
                    disabled={loading}
                    className="btn btn-primary btn-block py-3 mt-2"
                  >
                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </form>

                <div className="auth-foot">
                  ¿Ya tenés cuenta?{" "}
                  <span className="link-accent" onClick={() => navigate("/login")}>
                    Iniciar sesión
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
