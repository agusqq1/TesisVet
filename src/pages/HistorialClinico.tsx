import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Pet, Consulta, Vacuna, Estudio, OrdenDerivacion } from "../types";
import { LogoIcon } from "../components/LogoIcon";
import { api } from "../api";
import { hoyLocal } from "../format";
import { RadiografiaViewerModal } from "../components/RadiografiaViewerModal";
import { AdjuntarRadiografiaModal } from "../components/AdjuntarRadiografiaModal";
import { OrdenMedicaModal } from "../components/OrdenMedicaModal";
import { GenerarDerivacionModal } from "../components/GenerarDerivacionModal";
import { 
  Stethoscope, 
  Syringe, 
  FlaskConical, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Plus, 
  User, 
  Activity, 
  ShieldAlert,
  Sliders,
  Building2,
  Phone,
  MapPin,
  Clock,
  Printer,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";

interface HistorialClinicoProps {
  navigate: (path: string) => void;
}

export const HistorialClinico: React.FC<HistorialClinicoProps> = ({
  navigate,
}) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [vacunas, setVacunas] = useState<Vacuna[]>([]);
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [derivaciones, setDerivaciones] = useState<OrdenDerivacion[]>([]);
  const [attendedTurnos, setAttendedTurnos] = useState<any[]>([]);

  // Modals for Radiography & Medical Orders
  const [viewingEstudio, setViewingEstudio] = useState<Estudio | null>(null);
  const [showAdjuntarRadio, setShowAdjuntarRadio] = useState<boolean>(false);
  const [viewingOrden, setViewingOrden] = useState<OrdenDerivacion | null>(null);
  const [showGenerarDerivacion, setShowGenerarDerivacion] = useState<boolean>(false);

  // New consultation modal state
  const [showModal, setShowModal] = useState(false);
  const [newTitulo, setNewTitulo] = useState("");
  const [newTipo, setNewTipo] = useState<any>("CONTROL");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Alta de vacuna (solo personal de la clínica)
  const [showVacunaModal, setShowVacunaModal] = useState(false);
  const [vacNombre, setVacNombre] = useState("");
  const [vacAplicacion, setVacAplicacion] = useState(hoyLocal());
  const [vacRefuerzo, setVacRefuerzo] = useState("");
  const [vacError, setVacError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const targetPetId = searchParams.get("mascota_id");

    api<Pet[]>(user.rol === "veterinario" ? "/api/pets?all=true" : "/api/pets")
      .then((data) => {
        setPets(data);
        if (data.length > 0) {
          if (targetPetId && data.some((p) => p.id === Number(targetPetId))) {
            setSelectedPetId(Number(targetPetId));
          } else {
            setSelectedPetId(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (selectedPetId) {
      api<Pet>(`/api/pets/${selectedPetId}`).then(setPet).catch(() => {});
      api<Consulta[]>(`/api/consultas?mascota_id=${selectedPetId}`).then(setConsultas).catch(() => {});
      api<Vacuna[]>(`/api/vacunas?mascota_id=${selectedPetId}`).then(setVacunas).catch(() => {});
      api<Estudio[]>(`/api/estudios?mascota_id=${selectedPetId}`).then(setEstudios).catch(() => {});
      api<OrdenDerivacion[]>(`/api/derivaciones?mascota_id=${selectedPetId}`).then(setDerivaciones).catch(() => {});

      // REGLA: En el historial clínico solo deben figurar turnos CONFIRMADOS o ATENDIDOS (COMPLETADOS)
      // Los pendientes sin confirmar y los cancelados NO deben figurar en el historial
      api<any[]>(user?.rol === "veterinario" ? "/api/turnos?all=true" : "/api/turnos")
        .then((data) => {
          const valid = data.filter(
            (t) =>
              t.mascota_id === selectedPetId &&
              (t.estado === "completado" || t.estado === "confirmado")
          );
          setAttendedTurnos(valid);
        })
        .catch(() => {});
    }
  }, [selectedPetId, user]);

  const handleAddConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId || !newTitulo || !newDesc) return;
    setSubmitting(true);

    try {
      // El registro queda a nombre del profesional que tiene la sesión iniciada
      const data = await api<Consulta>("/api/consultas", {
        method: "POST",
        body: {
          mascota_id: selectedPetId,
          tipo: newTipo,
          titulo: newTitulo,
          descripcion: newDesc,
        },
      });
      setShowModal(false);
      setNewTitulo("");
      setNewDesc("");
      setConsultas((prev) => [data, ...prev]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVacuna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId || !vacNombre.trim()) return;
    setVacError("");
    setSubmitting(true);

    try {
      const data = await api<Vacuna>("/api/vacunas", {
        method: "POST",
        body: {
          mascota_id: selectedPetId,
          nombre: vacNombre,
          fecha_aplicacion: vacAplicacion,
          fecha_refuerzo: vacRefuerzo,
        },
      });
      setVacunas((prev) => [data, ...prev]);
      setShowVacunaModal(false);
      setVacNombre("");
      setVacRefuerzo("");
    } catch (e: any) {
      setVacError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!pet && pets.length === 0) {
    return (
      <div className="container section">
        <div className="empty-state">
          <h2>No tenés mascotas registradas.</h2>
          <p className="mt-2 text-gray-600 mb-6">
            Para ver diagnósticos e historial clínico, agregá una mascota.
          </p>
          <button
            onClick={() => navigate("/mascota-nueva")}
            className="btn btn-primary"
          >
            + Registrar Mascota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      {user?.rol === "veterinario" && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/admin/pacientes")}
            className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
          >
            ← Volver a Pacientes / Clientes
          </button>
          <span className="text-xs text-slate-500 font-semibold">
            Modo Administrador / Veterinario
          </span>
        </div>
      )}

      <div className="hist-title-row mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={24} />
            <h1 className="text-2xl font-bold text-slate-900 m-0">Historial Clínico Digital</h1>
          </div>
          <p className="text-sm text-slate-500">
            Expediente médico unificado, consultas, vacunas, radiografías y derivaciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paciente:</span>
            <select
              value={selectedPetId || ""}
              onChange={(e) => setSelectedPetId(Number(e.target.value))}
              className="border-0 bg-transparent text-sm font-bold text-blue-700 focus:outline-none cursor-pointer"
            >
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.especie === 'Gato' ? '🐱' : p.especie === 'Perro' ? '🐶' : '🐾'} {p.nombre} ({p.especie} {p.raza ? `· ${p.raza}` : ''})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => navigate("/mascota-nueva")}
            className="btn btn-primary text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Agregar Mascota</span>
          </button>
        </div>
      </div>

      {/* Selector Rápido con Píldoras y Avatares */}
      {pets.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-6">
          {pets.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPetId(p.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border transition-all cursor-pointer whitespace-nowrap text-xs font-bold ${
                selectedPetId === p.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <img
                src={
                  p.foto ||
                  (p.especie === "Gato"
                    ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80"
                    : "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80")
                }
                alt={p.nombre}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span>{p.nombre}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                  selectedPetId === p.id
                    ? "bg-white/20 text-white"
                    : p.especie === "Gato"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {p.especie}
              </span>
            </button>
          ))}
        </div>
      )}

      {pet && (
        <div className="hist-grid">
          {/* Pet Info Card */}
          <div className="pet-card">
            <img
              src={
                pet.foto ||
                "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&q=80"
              }
              alt={pet.nombre}
            />
            <div className="pet-info">
              <h2 className="text-xl mb-4">{pet.nombre}</h2>
              <div className="pet-info-row">
                <span>Especie:</span>
                <strong>{pet.especie}</strong>
              </div>
              <div className="pet-info-row">
                <span>Raza:</span>
                <strong>{pet.raza || "No especificada"}</strong>
              </div>
              <div className="pet-info-row">
                <span>Edad:</span>
                <strong>{pet.edad ? `${pet.edad} años` : "-"}</strong>
              </div>
              <div className="pet-info-row">
                <span>Peso actual:</span>
                <strong>{pet.peso ? `${pet.peso} kg` : "-"}</strong>
              </div>
              <div className="pet-info-row">
                <span>Estado de salud:</span>
                <span className="status-pill">{pet.estado_salud}</span>
              </div>
              {pet.dueno && (
                <div className="pet-info-row">
                  <span>Dueño:</span>
                  <strong>{pet.dueno}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Card */}
          <div className="timeline-card">
            <div className="timeline-head">
              <h2>Evolución Médica &amp; Consultas</h2>
              {user?.rol === "veterinario" && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  + Agregar Registro Médico
                </button>
              )}
            </div>

            {consultas.length === 0 ? (
              <p className="text-gray-500 py-6 text-center">
                Aún no hay registros médicos anotados para esta mascota.
              </p>
            ) : (
              <div>
                {consultas.map((c) => (
                  <div
                    key={c.id}
                    className={`timeline-item ${c.tipo.toLowerCase()}`}
                  >
                    <div className="timeline-dot"></div>
                    <div className="timeline-body">
                      <div className="timeline-top">
                        <span className="timeline-date">{c.fecha}</span>
                        <span
                          className={`tag tag-${c.tipo.toLowerCase()}`}
                        >
                          {c.tipo}
                        </span>
                      </div>
                      <h4>{c.titulo}</h4>
                      <p>{c.descripcion}</p>
                      <div className="timeline-doc flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                        <Stethoscope size={14} className="text-blue-600" />
                        <span>Atendido por: <strong>{c.vet_nombre}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Grid (Vaccines, Studies, and Confirmed/Attended Turnos) */}
      <div className="info-grid mt-6">
        <div className="info-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Syringe size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 m-0">Registro de Vacunas</h3>
            </div>
            {user?.rol === "veterinario" && (
              <button
                type="button"
                onClick={() => {
                  setVacError("");
                  setShowVacunaModal(true);
                }}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
              >
                + Registrar
              </button>
            )}
          </div>
          {vacunas.length === 0 ? (
            <p className="text-sm text-gray-500">Sin registros de vacunas.</p>
          ) : (
            vacunas.map((v) => (
              <div key={v.id} className="mini-card">
                <div>
                  <strong>{v.nombre}</strong>
                  <small>
                    Aplicada: {v.fecha_aplicacion || "Pendiente"} · Refuerzo: {v.fecha_refuerzo || "No programado"}
                  </small>
                </div>
                <span
                  className={`tag ${
                    v.estado === "AL_DIA"
                      ? "tag-control"
                      : v.estado === "PENDIENTE"
                      ? "tag-diagnostico"
                      : "tag-emergencia"
                  }`}
                >
                  {v.estado === "AL_DIA" ? "Al día" : v.estado === "PENDIENTE" ? "Pendiente" : "Vencida"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="info-card">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-900 m-0">Citas &amp; Turnos en Historial</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Únicamente citas confirmadas y atendidas en clínica.
          </p>
          {attendedTurnos.length === 0 ? (
            <p className="text-sm text-gray-500">Sin turnos confirmados o atendidos para esta mascota.</p>
          ) : (
            attendedTurnos.map((t) => (
              <div key={t.id} className="mini-card">
                <div>
                  <strong>{t.servicio_nombre || "Consulta Médica"}</strong>
                  <small>{t.fecha} • {t.hora} hs</small>
                </div>
                <span
                  className={`tag ${
                    t.estado === "completado"
                      ? "tag-control"
                      : "tag-diagnostico"
                  }`}
                >
                  {t.estado === "completado" ? "✓ ATENDIDO" : "CONFIRMADO"}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="info-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 m-0">Estudios y Laboratorio</h3>
            </div>
            {user?.rol === "veterinario" && (
              <button
                type="button"
                onClick={() => setShowAdjuntarRadio(true)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
              >
                + Adjuntar
              </button>
            )}
          </div>
          {estudios.length === 0 ? (
            <p className="text-sm text-gray-500">Sin estudios registrados.</p>
          ) : (
            estudios.map((e) => (
              <div key={e.id} className="mini-card">
                <div>
                  <strong className="block text-slate-900">{e.nombre}</strong>
                  <small className="text-slate-500">{e.fecha} &bull; {e.tipo || 'Imagen'}</small>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingEstudio(e)}
                  className="icon-btn flex items-center justify-center cursor-pointer"
                  title="Ver Placa / Negatoscopio Digital"
                >
                  <Sliders size={16} className="text-blue-600" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="info-card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={18} className="text-amber-600" />
            <h3 className="font-bold text-slate-900 m-0">Alergias &amp; Alertas</h3>
          </div>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Alergias conocidas:</strong>
          </p>
          <div>
            {pet?.alergias ? (
              pet.alergias.split(",").map((a, i) => (
                <span key={i} className="chip">
                  {a.trim()}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">Ninguna registrada</span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-4 mb-2">
            <strong>Condiciones crónicas:</strong>
          </p>
          <p className="text-sm text-gray-600">
            {pet?.condiciones_cronicas || "Ninguna."}
          </p>
        </div>
      </div>

      {/* SECCIÓN 1: RADIOGRAFÍAS Y DIAGNÓSTICO POR IMÁGENES */}
      <div className="mt-10 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Sliders size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Radiografías &amp; Diagnóstico por Imágenes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {estudios.length} {estudios.length === 1 ? 'estudio' : 'estudios'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Estudios cargados por el equipo veterinario, con visor de zoom e inversión de contraste.
              </p>
            </div>
          </div>

          {user?.rol === "veterinario" && (
            <button
              onClick={() => setShowAdjuntarRadio(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>+ Adjuntar Radiografía</span>
            </button>
          )}
        </div>

        {estudios.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ImageIcon size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Aún no se han adjuntado estudios radiológicos para {pet?.nombre}.</p>
            {user?.rol === "veterinario" && (
              <button
                onClick={() => setShowAdjuntarRadio(true)}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Hacé clic aquí para adjuntar la primera radiografía
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {estudios.map((est) => (
              <div
                key={est.id}
                onClick={() => setViewingEstudio(est)}
                className="group bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer flex flex-col shadow-md hover:shadow-xl"
              >
                {/* Image plate viewport */}
                <div className="h-44 bg-black relative flex items-center justify-center overflow-hidden">
                  {est.imagen_url ? (
                    <img
                      src={est.imagen_url}
                      alt={est.nombre}
                      className="max-h-full w-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-600">
                      <ImageIcon size={30} />
                      <span className="text-[11px]">Sin imagen adjunta</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />
                  
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider bg-black/70 backdrop-blur-md text-blue-300 border border-white/10 uppercase">
                    {est.tipo || 'Radiografía'}
                  </span>

                  <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-blue-600/90 text-white flex items-center gap-1.5 shadow-lg group-hover:bg-blue-500 transition-colors">
                    <Sliders size={13} />
                    <span>{est.imagen_url ? "Abrir Negatoscopio" : "Ver Informe"}</span>
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
                      {est.nombre}
                    </h3>
                    <p className="text-xs text-blue-400 font-medium mt-0.5">
                      Zona: {est.zona_anatomica || 'No especificada'}
                    </p>
                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {est.observaciones || 'Sin informe cargado.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{est.fecha}</span>
                    <span className="font-medium text-slate-300">
                      {est.veterinario_nombre || ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: ÓRDENES DE DERIVACIÓN E INTERCONSULTAS EXTERNAS */}
      <div className="mt-10 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-950">
                  Órdenes de Derivación e Interconsultas Externas
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900">
                  {derivaciones.length} {derivaciones.length === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Red médica asociada para especialidades externas (Cardiología, Radiología Especializada) cuando la clínica está saturada o no cuenta con la especialidad.
              </p>
            </div>
          </div>

          {user?.rol === "veterinario" && (
            <button
              onClick={() => setShowGenerarDerivacion(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>+ Generar Orden de Derivación</span>
            </button>
          )}
        </div>

        {derivaciones.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Building2 size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No hay órdenes de derivación externas emitidas para {pet?.nombre}.</p>
            {user?.rol === "veterinario" && (
              <button
                onClick={() => setShowGenerarDerivacion(true)}
                className="mt-3 text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
              >
                Emitir una orden para derivar a Tortuguitas u otro centro especializado
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {derivaciones.map((orden) => (
              <div
                key={orden.id}
                className="p-5 sm:p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500/60 bg-gradient-to-br from-slate-50/50 to-white transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-black font-mono bg-blue-950 text-white">
                      {orden.codigo}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900">
                      {orden.especialidad_derivada}
                    </span>
                    <span className="text-xs text-slate-500">
                      Emitida el {orden.fecha_emision} &bull; Válida hasta {orden.fecha_validez_hasta}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-950">
                    {orden.estudio_solicitado}
                  </h3>

                  {/* Destination Clinic Recommendation Highlight */}
                  <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
                        Centro Recomendado para Atención:
                      </span>
                      <strong className="text-sm text-slate-950 block mt-0.5">
                        {orden.centro_destino.nombre}
                      </strong>
                      <p className="text-slate-600 mt-0.5 flex items-center gap-1.5 text-[11px]">
                        <MapPin size={13} className="text-blue-600 shrink-0" />
                        {orden.centro_destino.direccion} ({orden.centro_destino.localidad}) &bull; Tel: {orden.centro_destino.telefono}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-blue-800 border border-blue-200 inline-block shadow-xs">
                        {orden.centro_destino.distancia_estimada || 'Zona Norte'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    <strong>Motivo:</strong> {orden.motivo_derivacion} &bull; <strong>Sospecha:</strong> {orden.sospecha_diagnostica}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <button
                    onClick={() => setViewingOrden(orden)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText size={15} />
                    <span>Ver Orden Oficial</span>
                  </button>
                  <span className="text-[10px] text-slate-400 text-center sm:text-right">
                    Para imprimir o enviar por email
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for adding clinical record */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#e1e0d8]">
            <h2 className="text-xl font-bold mb-4">
              Nuevo Registro Médico para {pet?.nombre}
            </h2>
            <form onSubmit={handleAddConsulta}>
              <div className="field">
                <label>Tipo de atención</label>
                <div className="input-wrap">
                  <select
                    value={newTipo}
                    onChange={(e) => setNewTipo(e.target.value as any)}
                  >
                    <option value="CONTROL">Control de Rutina</option>
                    <option value="EMERGENCIA">Emergencia / Urgencia</option>
                    <option value="VACUNA">Vacunación</option>
                    <option value="CIRUGIA">Cirugía</option>
                    <option value="DIAGNOSTICO">Diagnóstico</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Título de la consulta</label>
                <div className="input-wrap">
                  <input
                    type="text"
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    placeholder="Ej: Chequeo Semestral"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Descripción y Observaciones Clínicas</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="wizard-notes"
                  placeholder="Detalles del examen, diagnóstico o receta..."
                  required
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Guardando..." : "Guardar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para registrar una vacuna */}
      {showVacunaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#e1e0d8]">
            <h2 className="text-xl font-bold mb-4">Registrar vacuna de {pet?.nombre}</h2>
            {vacError && <div className="alert alert-error mb-4">{vacError}</div>}
            <form onSubmit={handleAddVacuna}>
              <div className="field">
                <label>Vacuna</label>
                <div className="input-wrap">
                  <input
                    type="text"
                    value={vacNombre}
                    onChange={(e) => setVacNombre(e.target.value)}
                    placeholder="Ej: Antirrábica, Séxtuple, Triple Felina"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="field">
                  <label>Fecha de aplicación</label>
                  <div className="input-wrap">
                    <input
                      type="date"
                      value={vacAplicacion}
                      onChange={(e) => setVacAplicacion(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Próximo refuerzo (opcional)</label>
                  <div className="input-wrap">
                    <input
                      type="date"
                      value={vacRefuerzo}
                      onChange={(e) => setVacRefuerzo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVacunaModal(false)}
                  className="btn btn-light"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? "Guardando..." : "Guardar Vacuna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Radiography Viewer DICOM Modal */}
      {viewingEstudio && (
        <RadiografiaViewerModal
          estudio={viewingEstudio}
          pet={pet}
          onClose={() => setViewingEstudio(null)}
        />
      )}

      {/* Attach X-ray Modal */}
      {showAdjuntarRadio && (
        <AdjuntarRadiografiaModal
          pets={pets}
          selectedPetId={selectedPetId || undefined}
          onClose={() => setShowAdjuntarRadio(false)}
          onSuccess={(newEst) => {
            setEstudios((prev) => [newEst, ...prev]);
            setViewingEstudio(newEst);
          }}
        />
      )}

      {/* Official Medical Order Modal */}
      {viewingOrden && (
        <OrdenMedicaModal
          orden={viewingOrden}
          onClose={() => setViewingOrden(null)}
        />
      )}

      {/* Generate Medical Referral Modal */}
      {showGenerarDerivacion && (
        <GenerarDerivacionModal
          pets={pets}
          selectedPetId={selectedPetId || undefined}
          onClose={() => setShowGenerarDerivacion(false)}
          onSuccess={(newOrd) => {
            setDerivaciones((prev) => [newOrd, ...prev]);
            setViewingOrden(newOrd);
          }}
        />
      )}
    </div>
  );
};
