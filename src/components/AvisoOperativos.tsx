import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { OperativoMovil } from "../types";
import { api } from "../api";
import { formatFechaLarga } from "../format";
import { MapPin, X } from "lucide-react";

export const RUTA_MAPA = "/veterinarias-moviles";

// Cada navegador recuerda hasta qué operativo ya vio el usuario, para avisar solo de los nuevos
const claveVistos = (usuarioId: number) => `vet:operativos-vistos:${usuarioId}`;

export function marcarOperativosVistos(usuarioId: number, operativos: OperativoMovil[]) {
  if (operativos.length === 0) return;
  const ultimo = Math.max(...operativos.map((o) => o.id), Number(localStorage.getItem(claveVistos(usuarioId))) || 0);
  localStorage.setItem(claveVistos(usuarioId), String(ultimo));
}

interface AvisoOperativosProps {
  currentPath: string;
  navigate: (path: string) => void;
}

// Aviso emergente: operativos nuevos en las localidades que el usuario eligió seguir
export const AvisoOperativos: React.FC<AvisoOperativosProps> = ({ currentPath, navigate }) => {
  const { user } = useAuth();
  const [nuevos, setNuevos] = useState<OperativoMovil[]>([]);

  useEffect(() => {
    setNuevos([]);
    if (!user) return;
    let vigente = true;
    Promise.all([api<OperativoMovil[]>("/api/operativos"), api<string[]>("/api/operativos/avisos")])
      .then(([operativos, localidades]) => {
        const ultimoVisto = Number(localStorage.getItem(claveVistos(user.id))) || 0;
        if (vigente) {
          setNuevos(operativos.filter((o) => o.id > ultimoVisto && localidades.includes(o.localidad)));
        }
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [user?.id]);

  // En la página del mapa ya están todos a la vista
  useEffect(() => {
    if (currentPath === RUTA_MAPA) setNuevos([]);
  }, [currentPath]);

  if (!user || nuevos.length === 0) return null;

  const cerrar = () => {
    marcarOperativosVistos(user.id, nuevos);
    setNuevos([]);
  };

  const [primero, ...resto] = nuevos;

  return (
    <div className="fixed bottom-6 left-6 z-40 w-[340px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-brand-200 p-4">
      <button
        onClick={cerrar}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
        title="Cerrar aviso"
        aria-label="Cerrar aviso"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
          <MapPin size={20} />
        </div>
        <div className="min-w-0 pr-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
            Veterinaria móvil en {primero.localidad}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug mt-0.5">{primero.titulo}</p>
          <p className="text-xs text-slate-600 mt-1">
            {formatFechaLarga(primero.fecha)}, de {primero.hora_inicio} a {primero.hora_fin} hs
          </p>
          {resto.length > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              y {resto.length === 1 ? "otro operativo más" : `otros ${resto.length} operativos`} en tus localidades
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          cerrar();
          navigate(RUTA_MAPA);
        }}
        className="btn btn-primary btn-sm btn-block mt-3"
      >
        Ver en el mapa
      </button>
    </div>
  );
};
