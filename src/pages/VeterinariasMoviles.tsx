import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { OperativoMovil } from "../types";
import { Cargando } from "../components/Cargando";
import { api } from "../api";
import { formatFechaLarga } from "../format";
import { ZONAS } from "../zonas";
import { Mapa, PuntoMapa } from "../components/Mapa";
import { marcarOperativosVistos } from "../components/AvisoOperativos";
import { Bell, Clock, LocateFixed, MapPin, Navigation, Check, BellRing, BellOff, Smartphone } from "lucide-react";
import { estadoPush, activarPush, desactivarPush, EstadoPush } from "../push";

interface VeterinariasMovilesProps {
  navigate: (path: string) => void;
}

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const CENTRO_INICIAL: [number, number] = [ZONAS[0].lat, ZONAS[0].lng];

// Distancia en línea recta entre dos puntos, en kilómetros (fórmula del haversine)
function distanciaKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) {
  const rad = (grados: number) => (grados * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const formatDistancia = (km: number) =>
  km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1).replace(".", ",")} km`;

// Mapa público de veterinarias móviles: operativos de castración y vacunación de la zona
export const VeterinariasMoviles: React.FC<VeterinariasMovilesProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [operativos, setOperativos] = useState<OperativoMovil[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);

  const [ubicacion, setUbicacion] = useState<[number, number] | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState("");

  const [avisos, setAvisos] = useState<string[]>([]);
  const [estadoAvisos, setEstadoAvisos] = useState<"" | "guardado" | "error">("");

  // Notificaciones push en este dispositivo (además del email)
  const [push, setPush] = useState<EstadoPush | "cargando">("cargando");
  const [pushOcupado, setPushOcupado] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    estadoPush().then(setPush).catch(() => setPush("no-soportado"));
  }, [user?.id]);

  const alternarPush = async () => {
    setPushOcupado(true);
    setPushMsg("");
    try {
      if (push === "activo") {
        setPush(await desactivarPush());
        setPushMsg("Listo: este dispositivo ya no recibe notificaciones.");
      } else {
        const nuevo = await activarPush();
        setPush(nuevo);
        if (nuevo === "activo") {
          await api("/api/push/probar", { method: "POST" }).catch(() => {});
          setPushMsg("Activadas. Te mandamos una notificación de prueba.");
        } else if (nuevo === "bloqueado") {
          setPushMsg("Tu navegador tiene bloqueadas las notificaciones para este sitio. Habilitalas en la configuración del sitio y volvé a intentar.");
        }
      }
    } catch (e: any) {
      setPushMsg(e.message || "No se pudieron activar las notificaciones.");
    } finally {
      setPushOcupado(false);
    }
  };

  useEffect(() => {
    api<OperativoMovil[]>("/api/operativos")
      .then((lista) => {
        setOperativos(lista);
        if (user) marcarOperativosVistos(user.id, lista);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    setAvisos([]);
    if (!user) return;
    api<string[]>("/api/operativos/avisos")
      .then(setAvisos)
      .catch(() => {});
  }, [user?.id]);

  const puntos = useMemo<PuntoMapa[]>(
    () =>
      operativos.map((o) => ({
        id: o.id,
        lat: o.latitud,
        lng: o.longitud,
        titulo: o.titulo,
        detalle: [
          `${formatFechaLarga(o.fecha)} · ${o.hora_inicio} a ${o.hora_fin} hs`,
          `${o.direccion}, ${o.localidad}`,
        ],
      })),
    [operativos]
  );

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setErrorUbicacion("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setBuscandoUbicacion(true);
    setErrorUbicacion("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion([pos.coords.latitude, pos.coords.longitude]);
        setBuscandoUbicacion(false);
      },
      () => {
        setErrorUbicacion("No pudimos obtener tu ubicación. Revisá el permiso del navegador.");
        setBuscandoUbicacion(false);
      },
      { timeout: 10000 }
    );
  };

  const toggleAviso = async (localidad: string) => {
    const anteriores = avisos;
    const nuevos = avisos.includes(localidad)
      ? avisos.filter((l) => l !== localidad)
      : [...avisos, localidad];
    setAvisos(nuevos);
    setEstadoAvisos("");
    try {
      setAvisos(await api<string[]>("/api/operativos/avisos", { method: "PUT", body: { localidades: nuevos } }));
      setEstadoAvisos("guardado");
    } catch {
      setAvisos(anteriores);
      setEstadoAvisos("error");
    }
  };

  return (
    <div className="pb-16 bg-slate-50">
      <div className="bg-gradient-to-b from-brand-50/70 to-white border-b border-slate-200/70 mb-10">
        <div className="container py-12">
          <h1 className="text-3xl sm:text-4xl tracking-tight">Veterinarias móviles</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Operativos de castración y vacunación que recorren la zona. Mirá dónde y cuándo va a estar el más
            cercano, y anotate para que te avisemos cuando haya uno en tu localidad.
          </p>
        </div>
      </div>

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <Mapa
              puntos={puntos}
              centro={ubicacion ?? CENTRO_INICIAL}
              zoom={ubicacion ? 13 : 12}
              ajustarAPuntos={!ubicacion}
              seleccionado={seleccionado}
              onSeleccionar={setSeleccionado}
              miUbicacion={ubicacion}
              className="h-[420px] lg:h-[560px]"
            />
            <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
              <button
                onClick={usarMiUbicacion}
                disabled={buscandoUbicacion}
                className="btn btn-light btn-sm shadow-md"
              >
                <LocateFixed size={15} />
                <span>{buscandoUbicacion ? "Buscando..." : "Usar mi ubicación"}</span>
              </button>
              {errorUbicacion && (
                <span className="max-w-[240px] text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 shadow-md">
                  {errorUbicacion}
                </span>
              )}
            </div>
          </div>

          <div className="lg:max-h-[560px] lg:overflow-y-auto space-y-3 lg:pr-1">
            <h2 className="text-lg">Próximos operativos</h2>

            {loading ? (
              <Cargando texto="Cargando operativos..." />
            ) : operativos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <MapPin size={32} className="text-slate-400 mx-auto mb-3" />
                <p className="font-bold text-slate-900 text-sm">No hay operativos programados</p>
                <p className="text-xs text-slate-500 mt-1">
                  Anotate más abajo y te avisamos apenas se publique uno en tu localidad.
                </p>
              </div>
            ) : (
              operativos.map((o) => {
                const activo = o.id === seleccionado;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSeleccionado(o.id)}
                    className={`bg-white rounded-2xl border p-4 cursor-pointer transition-colors ${
                      activo
                        ? "border-brand-600 ring-1 ring-brand-600"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="w-12 shrink-0 rounded-xl bg-brand-50 border border-brand-200 text-center py-1.5 h-fit">
                        <span className="block text-lg font-bold text-brand-900 leading-none">
                          {Number(o.fecha.substring(8, 10))}
                        </span>
                        <span className="block text-[10px] font-bold text-brand-700 mt-0.5">
                          {MESES[Number(o.fecha.substring(5, 7)) - 1]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm text-slate-900 leading-snug">{o.titulo}</strong>
                        <span className="block text-xs text-slate-600 mt-0.5">{o.servicios}</span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold mt-2">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          {formatFechaLarga(o.fecha)} · {o.hora_inicio} a {o.hora_fin} hs
                        </span>
                        <span className="flex items-start gap-1.5 text-xs text-slate-700 mt-1">
                          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {o.direccion}, <strong>{o.localidad}</strong>
                            {ubicacion && (
                              <span className="text-brand-700 font-semibold">
                                {" "}
                                · {formatDistancia(distanciaKm(ubicacion, [o.latitud, o.longitud]))}
                              </span>
                            )}
                          </span>
                        </span>
                      </div>
                    </div>

                    {activo && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                        {o.requisitos && (
                          <p>
                            <strong className="text-slate-800">Requisitos:</strong> {o.requisitos}
                          </p>
                        )}
                        {o.organizador && (
                          <p>
                            <strong className="text-slate-800">Organiza:</strong> {o.organizador}
                          </p>
                        )}
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${o.latitud},${o.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-outline btn-sm"
                        >
                          <Navigation size={14} />
                          <span>Cómo llegar</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg">Avisame cuando haya una cerca</h2>
              {user ? (
                <>
                  <p className="text-sm text-slate-600 mt-1">
                    Elegí tus localidades. Cada vez que se publique un operativo en alguna, te mandamos un email a{" "}
                    <strong>{user.email}</strong> y te lo mostramos al entrar a la web.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {ZONAS.map((z) => {
                      const elegida = avisos.includes(z.nombre);
                      return (
                        <button
                          key={z.nombre}
                          onClick={() => toggleAviso(z.nombre)}
                          aria-pressed={elegida}
                          className={`px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            elegida
                              ? "bg-brand-600 text-white border-brand-600"
                              : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
                          }`}
                        >
                          {elegida && <Check size={13} />}
                          {z.nombre}
                        </button>
                      );
                    })}
                  </div>
                  {avisos.length > 0 && push !== "no-soportado" && push !== "sin-clave" && (
                    <div className="mt-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Smartphone size={18} className="text-brand-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">Notificaciones en este dispositivo</p>
                          <p className="text-xs text-slate-500">
                            {push === "activo"
                              ? "Te avisamos al instante cuando se publique un operativo y el día anterior como recordatorio."
                              : "Además del email, recibí el aviso al instante en este celular o computadora, aunque la web esté cerrada."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={alternarPush}
                        disabled={pushOcupado || push === "cargando"}
                        className={`btn btn-sm flex items-center gap-1.5 ${push === "activo" ? "btn-light" : "btn-primary"}`}
                      >
                        {push === "activo" ? <BellOff size={14} /> : <BellRing size={14} />}
                        <span>{pushOcupado ? "..." : push === "activo" ? "Desactivar" : "Activar"}</span>
                      </button>
                      {pushMsg && <p className="w-full text-xs text-slate-600">{pushMsg}</p>}
                    </div>
                  )}
                  <p className="text-xs mt-3 h-4">
                    {estadoAvisos === "guardado" && (
                      <span className="text-emerald-700 font-semibold">
                        {avisos.length === 0
                          ? "Listo: ya no vas a recibir avisos."
                          : `Guardado: te avisamos de los operativos en ${avisos.join(", ")}.`}
                      </span>
                    )}
                    {estadoAvisos === "error" && (
                      <span className="text-rose-700 font-semibold">No se pudo guardar. Probá de nuevo.</span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mt-1">
                    Con tu cuenta elegís las localidades que te interesan y te mandamos un email cada vez que se
                    publique un operativo en alguna.
                  </p>
                  <button onClick={() => navigate("/login")} className="btn btn-primary btn-sm mt-4">
                    Iniciar sesión para recibir avisos
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
