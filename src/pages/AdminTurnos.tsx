import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Turno, TurnoEstado, OrdenDerivacion, Pet } from "../types";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { GenerarDerivacionModal } from "../components/GenerarDerivacionModal";
import { OrdenMedicaModal } from "../components/OrdenMedicaModal";
import { Stethoscope, Sparkles, CheckCircle2, FileCheck } from "lucide-react";
import { formatFecha } from "../format";

interface AdminTurnosProps {
  navigate: (path: string) => void;
}

export const AdminTurnos: React.FC<AdminTurnosProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [error, setError] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [filterFecha, setFilterFecha] = useState<string>("");
  const [filterEspecializado, setFilterEspecializado] = useState<boolean>(false);

  // Estados para modales de derivación
  const [modalDerivarOpen, setModalDerivarOpen] = useState(false);
  const [selectedTurnoParaDerivar, setSelectedTurnoParaDerivar] = useState<Turno | null>(null);
  const [viewingOrden, setViewingOrden] = useState<OrdenDerivacion | null>(null);
  const [successToast, setSuccessToast] = useState<string>("");

  useEffect(() => {
    fetchTurnos();
    // La lista de pacientes la usa el formulario de derivación
    api<Pet[]>("/api/pets?all=true").then(setPets).catch(() => {});
  }, [user]);

  const fetchTurnos = () => {
    api<Turno[]>("/api/turnos?all=true")
      .then(setTurnos)
      .catch((e) => setError(e.message));
  };

  const updateEstado = async (id: number, estado: TurnoEstado) => {
    setError("");
    try {
      const actualizado = await api<Turno>(`/api/turnos/${id}/estado`, { method: "PATCH", body: { estado } });
      setTurnos((prev) => prev.map((t) => (t.id === id ? actualizado : t)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleOpenDerivar = (turno: Turno) => {
    setSelectedTurnoParaDerivar(turno);
    setModalDerivarOpen(true);
  };

  const handleDerivacionCreada = (nuevaOrden: OrdenDerivacion) => {
    setModalDerivarOpen(false);
    setSelectedTurnoParaDerivar(null);
    setSuccessToast(`Orden de derivación ${nuevaOrden.codigo} generada con éxito.`);
    setTimeout(() => setSuccessToast(""), 5000);
    // Refresh turnos to show derivado badge
    fetchTurnos();
    // Prompt to view the generated order
    setViewingOrden(nuevaOrden);
  };

  const handleVerOrden = async (derivacionId: number) => {
    try {
      setViewingOrden(await api<OrdenDerivacion>(`/api/derivaciones/${derivacionId}`));
    } catch (e: any) {
      setError(e.message || "No se pudo cargar la orden médica.");
    }
  };

  const filteredTurnos = turnos.filter((t) => {
    const matchEstado =
      filterEstado === "todos" || t.estado === filterEstado;
    const matchFecha = !filterFecha || t.fecha === filterFecha;
    const matchEsp = !filterEspecializado || Boolean(t.es_especializado);
    return matchEstado && matchFecha && matchEsp;
  });

  return (
    <div className="admin-shell">
      <AdminSidebar active="turnos" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="text-2xl font-bold">Gestión Global de Turnos</h1>
            <p className="text-sm text-gray-600">
              Visualizá, confirmá, atendé o derivá citas a centros aliados con equipamiento de alta complejidad.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/booking?tipo=especializado")}
              className="btn btn-outline btn-sm flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>+ Turno Especializado</span>
            </button>
            <button
              onClick={() => navigate("/booking")}
              className="btn btn-primary btn-sm"
            >
              + Agendar Turno
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        {successToast && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast("")}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="panel-card">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Estado:
                </label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="confirmado">Confirmados</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="completado">Completados (Atendidos)</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Fecha:
                </label>
                <input
                  type="date"
                  value={filterFecha}
                  onChange={(e) => setFilterFecha(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 bg-white text-sm"
                />
                {filterFecha && (
                  <button
                    type="button"
                    onClick={() => setFilterFecha("")}
                    className="text-xs text-red-600 font-semibold cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Toggle solo especializados */}
            <div>
              <button
                type="button"
                onClick={() => setFilterEspecializado(!filterEspecializado)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  filterEspecializado
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <Sparkles size={13} className={filterEspecializado ? "text-amber-300" : "text-amber-500"} />
                <span>Solo Especializados / Derivables ({turnos.filter(t => t.es_especializado).length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha y Hora</th>
                  <th>Mascota</th>
                  <th>Dueño</th>
                  <th>Servicio / Estudio</th>
                  <th>Estado</th>
                  <th>Acciones Veterinarias</th>
                </tr>
              </thead>
              <tbody>
                {filteredTurnos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron turnos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTurnos.map((t) => (
                    <tr key={t.id} className={t.estado === "cancelado" ? "opacity-60 bg-gray-50" : ""}>
                      <td>#{t.id}</td>
                      <td className="whitespace-nowrap">
                        <strong>{formatFecha(t.fecha)}</strong>
                        <br />
                        <small className="text-gray-500">{t.hora} hs</small>
                      </td>
                      <td>
                        <strong className="text-gray-900">{t.mascota_nombre}</strong>
                        {t.sintomas_observados && (
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px] mt-0.5" title={t.sintomas_observados}>
                            🩺 {t.sintomas_observados}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{t.dueno}</td>
                      <td>
                        <div className="font-semibold text-slate-900">{t.servicio_nombre}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {t.es_especializado && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Sparkles size={10} className="text-blue-600" />
                              Especializado
                            </span>
                          )}
                          {t.derivado && (
                            <button
                              type="button"
                              onClick={() => t.derivacion_id && handleVerOrden(t.derivacion_id)}
                              className="text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer transition-colors"
                              title="Hacé clic para ver la orden de derivación oficial"
                            >
                              <FileCheck size={10} className="text-amber-700" />
                              Derivado (Ver Orden)
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${t.estado}`}>
                          {t.estado === "completado"
                            ? "ATENDIDO"
                            : t.estado.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions flex items-center gap-1.5 flex-wrap">
                          {/* BOTÓN CLAVE: DERIVAR A CENTRO ALIADO */}
                          {t.estado !== "cancelado" && (
                            <button
                              type="button"
                              onClick={() => handleOpenDerivar(t)}
                              className={`btn btn-sm text-xs py-1 px-2.5 font-medium flex items-center gap-1.5 border-0 transition-all ${
                                t.derivado
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              }`}
                              title="Emitir orden de derivación médica a Centro Tortuguitas u otro centro"
                            >
                              <Stethoscope size={13} className={t.derivado ? "text-slate-500" : "text-amber-300"} />
                              <span>{t.derivado ? "Nueva Orden" : "Derivar a Centro"}</span>
                            </button>
                          )}

                          {/* REGLA: Si no está completado ni cancelado, marcar como atendido */}
                          {t.estado !== "completado" && t.estado !== "cancelado" && (
                            <button
                              onClick={() => updateEstado(t.id, "completado")}
                              className="btn btn-primary btn-sm text-xs py-1 px-2.5"
                              title="Marcar como atendido en sede"
                            >
                              ✓ Atendido
                            </button>
                          )}
                          {t.estado !== "cancelado" && t.estado !== "completado" && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Deseas cancelar el turno #${t.id} de ${t.mascota_nombre}?`)) {
                                  updateEstado(t.id, "cancelado");
                                }
                              }}
                              className="btn btn-danger btn-sm text-xs py-1 px-2.5"
                              title="Cancelar turno"
                            >
                              ✕
                            </button>
                          )}
                          {t.estado === "cancelado" && (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                              Cancelado
                            </span>
                          )}
                          {t.estado === "completado" && (
                            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                              ✓ Finalizado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para generar derivación desde el turno */}
      {modalDerivarOpen && selectedTurnoParaDerivar && (
        <GenerarDerivacionModal
          pets={pets}
          selectedPetId={selectedTurnoParaDerivar.mascota_id}
          turnoId={selectedTurnoParaDerivar.id}
          initialEspecialidad={
            selectedTurnoParaDerivar.servicio_nombre?.toLowerCase().includes("radio")
              ? "Radiología / Diagnóstico por Imágenes"
              : selectedTurnoParaDerivar.servicio_nombre?.toLowerCase().includes("ecograf")
              ? "Ecografía Doppler"
              : "Cardiología"
          }
          initialEstudio={selectedTurnoParaDerivar.estudio_solicitado || selectedTurnoParaDerivar.servicio_nombre}
          initialResumen={
            selectedTurnoParaDerivar.sintomas_observados
              ? `Síntomas informados por el tutor al pedir el turno #${selectedTurnoParaDerivar.id}: ${selectedTurnoParaDerivar.sintomas_observados}`
              : undefined
          }
          onClose={() => {
            setModalDerivarOpen(false);
            setSelectedTurnoParaDerivar(null);
          }}
          onSuccess={handleDerivacionCreada}
        />
      )}

      {/* Modal para visualizar / imprimir orden de derivación médica */}
      {viewingOrden && (
        <OrdenMedicaModal
          orden={viewingOrden}
          onClose={() => setViewingOrden(null)}
        />
      )}
    </div>
  );
};
