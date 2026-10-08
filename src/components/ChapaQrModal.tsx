import React, { useEffect, useState } from "react";
import { Download, ExternalLink, QrCode, Check } from "lucide-react";
import { Pet } from "../types";
import { api } from "../api";

interface ChapaQrModalProps {
  pet: Pet;
  onClose: () => void;
  onUpdated: (pet: Pet) => void;
}

interface DatosQr {
  codigo: string;
  url: string;
  imagen: string;
  qr_publico: boolean;
  qr_mensaje: string;
}

// Muestra el QR para imprimir en la chapa del collar y deja configurar la página
// pública que abre: si está activa y qué mensaje ve quien la encuentra.
export const ChapaQrModal: React.FC<ChapaQrModalProps> = ({ pet, onClose, onUpdated }) => {
  const [datos, setDatos] = useState<DatosQr | null>(null);
  const [error, setError] = useState("");
  const [activa, setActiva] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    api<DatosQr>(`/api/pets/${pet.id}/qr`)
      .then((d) => {
        setDatos(d);
        setActiva(d.qr_publico);
        setMensaje(d.qr_mensaje);
      })
      .catch((e) => setError(e.message || "No se pudo generar el código."));
  }, [pet.id]);

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      const updated = await api<Pet>(`/api/pets/${pet.id}`, {
        method: "PUT",
        body: { qr_publico: activa, qr_mensaje: mensaje },
      });
      onUpdated(updated);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);
    } catch (e: any) {
      setError(e.message || "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const nombreArchivo = `chapa-qr-${pet.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-xl cursor-pointer"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-1">
          <QrCode size={20} className="text-brand-600" />
          <h2 className="text-xl font-bold text-slate-900">Chapa QR de {pet.nombre}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          Imprimí este código en la chapa del collar. Quien lo escanee con la cámara del celular
          ve el nombre, la foto y las alertas médicas de {pet.nombre}, y puede avisarte sin ver tu
          teléfono ni tu dirección.
        </p>

        {error && <div className="alert alert-error text-sm mb-4">{error}</div>}

        {!datos && !error && (
          <p className="text-sm text-slate-500 py-8 text-center">Generando el código...</p>
        )}

        {datos && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-3">
                <img src={datos.imagen} alt={`Código QR de ${pet.nombre}`} className="w-56 h-56" />
              </div>
              <p className="font-mono text-sm tracking-widest text-slate-700 mt-3">{datos.codigo}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 text-center break-all">{datos.url}</p>

              <div className="flex flex-col gap-2 w-full mt-4">
                <a
                  href={datos.imagen}
                  download={nombreArchivo}
                  className="btn btn-primary btn-sm flex items-center justify-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Descargar imagen para imprimir</span>
                </a>
                <a
                  href={datos.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={14} />
                  <span>Ver lo que ve quien escanea</span>
                </a>
              </div>
            </div>

            <div>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activa}
                  onChange={(e) => setActiva(e.target.checked)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Chapa activa</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Si la desactivás, el código sigue impreso pero quien lo escanee no ve ningún dato.
                    Útil si perdés el collar.
                  </span>
                </span>
              </label>

              <div className="field mt-4">
                <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                  Mensaje para quien la encuentre
                </label>
                <textarea
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value.slice(0, 300))}
                  rows={4}
                  placeholder="Ej.: Es muy miedoso, no lo persigas. Está medicado, por favor avisá rápido."
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-[11px] text-slate-400 text-right">{mensaje.length}/300</p>
              </div>

              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="btn btn-primary btn-block flex items-center justify-center gap-1.5"
              >
                {guardado ? <Check size={15} /> : null}
                <span>{guardando ? "Guardando..." : guardado ? "Guardado" : "Guardar cambios"}</span>
              </button>

              <div className="mt-4 text-xs text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-700">Qué ve quien escanea</p>
                <p>Nombre, foto, especie, raza y edad. Alergias y condiciones crónicas, si las hay. Tu nombre de pila y este mensaje.</p>
                <p className="font-semibold text-slate-700 pt-1">Qué no ve</p>
                <p>Tu teléfono, tu email, tu dirección ni la historia clínica. El aviso te llega por email a través de la clínica.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
