import React, { useEffect, useState } from "react";
import { AlertTriangle, Phone, Send, FileText, ShieldOff } from "lucide-react";
import { LogoIcon } from "../components/LogoIcon";
import { MascotaPublica as DatosMascota } from "../types";
import { api } from "../api";
import { CLINICA } from "../clinica";

interface MascotaPublicaProps {
  codigo: string;
  navigate: (path: string) => void;
}

// Página que abre la chapa QR del collar. Es pública y pensada para el celular de
// quien encuentra a la mascota: ve lo justo para ayudarla y le avisa al dueño.
export const MascotaPublica: React.FC<MascotaPublicaProps> = ({ codigo, navigate }) => {
  const [mascota, setMascota] = useState<DatosMascota | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState("");
  const [errorAviso, setErrorAviso] = useState("");

  useEffect(() => {
    setCargando(true);
    api<DatosMascota>(`/api/publico/mascotas/${encodeURIComponent(codigo)}`)
      .then(setMascota)
      .catch((e) => setError(e.message || "No se pudo cargar la chapa."))
      .finally(() => setCargando(false));
  }, [codigo]);

  const enviarAviso = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAviso("");
    setEnviando(true);
    try {
      const r = await api<{ message: string }>(
        `/api/publico/mascotas/${encodeURIComponent(codigo)}/aviso`,
        { method: "POST", body: { nombre, telefono, ubicacion, mensaje } }
      );
      setEnviado(r.message);
    } catch (err: any) {
      setErrorAviso(err.message || "No se pudo enviar el aviso.");
    } finally {
      setEnviando(false);
    }
  };

  const telefonoClinica = CLINICA.telefono.replace(/[^\d+]/g, "");
  const alertas = [
    mascota?.alergias && { titulo: "Alergias", texto: mascota.alergias },
    mascota?.condiciones_cronicas && { titulo: "Condiciones crónicas", texto: mascota.condiciones_cronicas },
  ].filter(Boolean) as { titulo: string; texto: string }[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-8">
      <div className="flex items-center gap-2.5 mb-6 cursor-pointer" onClick={() => navigate("/")}>
        <LogoIcon size={34} />
        <span className="font-bold text-2xl text-slate-900">VetAnimal</span>
      </div>

      <div className="w-full max-w-md">
        {cargando && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            Buscando la chapa...
          </div>
        )}

        {!cargando && error && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
            <ShieldOff size={36} className="mx-auto text-slate-400 mb-3" />
            <h1 className="text-lg font-bold text-slate-900 mb-2">Chapa no reconocida</h1>
            <p className="text-sm text-slate-500 mb-5">{error}</p>
            <a href={`tel:${telefonoClinica}`} className="btn btn-outline btn-sm inline-flex items-center gap-1.5">
              <Phone size={14} />
              <span>Llamar a la clínica {CLINICA.telefono}</span>
            </a>
          </div>
        )}

        {!cargando && mascota && !mascota.activa && !mascota.mascota_id && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
            <ShieldOff size={36} className="mx-auto text-slate-400 mb-3" />
            <h1 className="text-lg font-bold text-slate-900 mb-2">Esta chapa está desactivada</h1>
            <p className="text-sm text-slate-500 mb-5">
              El dueño de {mascota.nombre} desactivó la página pública. Si encontraste a esta
              mascota, la clínica puede ayudarte a contactarlo.
            </p>
            <a href={`tel:${telefonoClinica}`} className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
              <Phone size={14} />
              <span>Llamar a {CLINICA.nombre} {CLINICA.telefono}</span>
            </a>
          </div>
        )}

        {!cargando && mascota && (mascota.activa || mascota.mascota_id) && (
          <>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {mascota.foto && (
                <img src={mascota.foto} alt={mascota.nombre} className="w-full h-64 object-cover" />
              )}
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
                  ¡Hola! Me llamo
                </p>
                <h1 className="text-3xl font-bold text-slate-900">{mascota.nombre}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {[mascota.especie, mascota.raza, mascota.edad !== undefined && `${mascota.edad} años`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {mascota.dueno && (
                  <p className="text-sm text-slate-700 mt-3">
                    Mi familia me está esperando. Mi humano se llama <strong>{mascota.dueno}</strong>.
                  </p>
                )}

                {!mascota.activa && (
                  <div className="alert alert-error text-xs mt-4">
                    La chapa está desactivada: solo vos y la clínica ven estos datos.
                  </div>
                )}

                {mascota.qr_mensaje && (
                  <div className="mt-4 p-4 rounded-2xl bg-brand-50 border border-brand-100 text-sm text-slate-800">
                    “{mascota.qr_mensaje}”
                  </div>
                )}

                {alertas.length > 0 && (
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-2">
                      <AlertTriangle size={16} />
                      <span>Alertas médicas</span>
                    </div>
                    {alertas.map((a) => (
                      <p key={a.titulo} className="text-sm text-amber-900">
                        <strong>{a.titulo}:</strong> {a.texto}
                      </p>
                    ))}
                  </div>
                )}

                {mascota.mascota_id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/historial?mascota_id=${mascota.mascota_id}`)}
                    className="btn btn-outline btn-sm w-full mt-4 flex items-center justify-center gap-1.5"
                  >
                    <FileText size={14} />
                    <span>Abrir historia clínica</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-4">
              <h2 className="text-lg font-bold text-slate-900">¿Me encontraste?</h2>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Dejá tus datos y le avisamos a mi familia ahora mismo. Ellos no ven tu información
                hasta que vos la compartís acá.
              </p>

              {enviado ? (
                <div className="alert alert-success text-sm">{enviado}</div>
              ) : (
                <form onSubmit={enviarAviso} className="space-y-3">
                  {errorAviso && <div className="alert alert-error text-sm">{errorAviso}</div>}
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    maxLength={80}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Tu teléfono o WhatsApp"
                    maxLength={40}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <input
                    type="text"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="¿Dónde está ahora? (calle, barrio, referencia)"
                    maxLength={200}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Mensaje (opcional)"
                    rows={3}
                    maxLength={500}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                  <button
                    type="submit"
                    disabled={enviando}
                    className="btn btn-primary btn-block flex items-center justify-center gap-1.5 py-3"
                  >
                    <Send size={15} />
                    <span>{enviando ? "Enviando..." : "Avisar a la familia"}</span>
                  </button>
                </form>
              )}

              <a
                href={`tel:${telefonoClinica}`}
                className="mt-4 flex items-center justify-center gap-1.5 text-sm text-brand-700 font-semibold hover:underline"
              >
                <Phone size={14} />
                <span>O llamá a {CLINICA.nombre}: {CLINICA.telefono}</span>
              </a>
            </div>
          </>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Chapa QR de {CLINICA.nombre} · {CLINICA.direccion}, {CLINICA.localidad}
        </p>
      </div>
    </div>
  );
};
