import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { AdminStats, Turno, TurnoEstado } from "../types";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { hoyLocal } from "../format";

interface AdminDashboardProps {
  navigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalHoy: 0,
    pendientes: 0,
    totalPacientes: 0,
    totalClientes: 0,
    pedidosPendientes: 0,
  });
  const [todayTurnos, setTodayTurnos] = useState<Turno[]>([]);
  const [error, setError] = useState("");

  const hoyStr = hoyLocal();

  const cargar = () => {
    api<AdminStats>("/api/admin/stats").then(setStats).catch(() => {});
    api<Turno[]>(`/api/turnos?all=true&fecha=${hoyStr}`)
      // La agenda del día se lee de la mañana a la tarde
      .then((data) => setTodayTurnos([...data].sort((a, b) => a.hora.localeCompare(b.hora))))
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
  }, [user]);

  const updateEstado = async (id: number, estado: TurnoEstado) => {
    setError("");
    try {
      await api(`/api/turnos/${id}/estado`, { method: "PATCH", body: { estado } });
      cargar();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar active="dashboard" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel Veterinario</h1>
            <p className="text-sm text-slate-500">
              Bienvenido/a, {user?.nombre}. Hoy es {hoyStr}.
            </p>
          </div>
          <button
            onClick={() => navigate("/booking")}
            className="btn btn-primary btn-sm font-bold flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Agendar Turno</span>
          </button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="num">{stats.totalHoy}</div>
            <div className="lbl">Turnos para hoy</div>
          </div>
          <div className="stat-card">
            <div className="num">{stats.pendientes}</div>
            <div className="lbl">Turnos próximos sin atender</div>
          </div>
          <div className="stat-card">
            <div className="num">{stats.totalPacientes}</div>
            <div className="lbl">Pacientes en sistema</div>
          </div>
          <div className="stat-card">
            <div className="num">{stats.totalClientes}</div>
            <div className="lbl">Clientes registrados</div>
          </div>
          <div className="stat-card cursor-pointer" onClick={() => navigate("/admin/pedidos")}>
            <div className="num">{stats.pedidosPendientes}</div>
            <div className="lbl">Pedidos de tienda por entregar</div>
          </div>
        </div>

        <div className="panel-card">
          <h2>Agenda del Día ({todayTurnos.length})</h2>
          {todayTurnos.length === 0 ? (
            <p className="text-slate-500 py-8 text-center">
              No hay turnos agendados para la fecha de hoy.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Mascota</th>
                    <th>Dueño</th>
                    <th>Servicio</th>
                    <th>Veterinario</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTurnos.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.hora} hs</strong>
                      </td>
                      <td>{t.mascota_nombre}</td>
                      <td>{t.dueno}</td>
                      <td>{t.servicio_nombre}</td>
                      <td>{t.veterinario_nombre}</td>
                      <td>
                        <span className={`badge badge-${t.estado}`}>
                          {t.estado === "completado" ? "ATENDIDO" : t.estado.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {t.estado !== "completado" && t.estado !== "cancelado" && (
                            <button
                              onClick={() => updateEstado(t.id, "completado")}
                              className="btn btn-primary btn-sm text-xs py-1 px-2.5"
                              title="Marcar como atendido"
                            >
                              ✓ Atendido
                            </button>
                          )}
                          {t.estado !== "cancelado" && t.estado !== "completado" && (
                            <button
                              onClick={() => {
                                if (confirm(`¿Deseas cancelar el turno #${t.id}?`)) {
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
                            <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              Cancelado
                            </span>
                          )}
                          {t.estado === "completado" && (
                            <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              Atendido
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
