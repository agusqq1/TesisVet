import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { HorarioAtencion, Veterinario } from "../types";
import { Cargando } from "../components/Cargando";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { Plus, X, AlertCircle, Mail, Phone, Clock, Pencil, UserX, UserCheck } from "lucide-react";

interface AdminDoctoresProps {
  navigate: (path: string) => void;
}

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Orden en que se muestran en el formulario: la semana arranca el lunes
const DIAS_FORM = [1, 2, 3, 4, 5, 6, 0];

const FORM_VACIO = {
  nombre: "",
  email: "",
  telefono: "",
  especialidad: "",
  matricula: "",
  password: "",
  dias: [1, 2, 3, 4, 5, 6],
  hora_inicio: "08:30",
  hora_fin: "20:00",
};

// [1,2,3,4,5,6] → "Lun a Sáb" · [1,3,5] → "Lun, Mié, Vie"
function resumirDias(dias: number[]) {
  const tramos: string[] = [];
  for (let i = 0; i < dias.length; i++) {
    let j = i;
    while (j + 1 < dias.length && dias[j + 1] === dias[j] + 1) j++;
    if (j - i >= 2) {
      tramos.push(`${DIAS[dias[i]]} a ${DIAS[dias[j]]}`);
      i = j;
    } else {
      tramos.push(DIAS[dias[i]]);
    }
  }
  return tramos.join(", ");
}

// Junta los días que comparten franja: "Lun a Vie · 09:00 a 18:00"
function resumirHorarios(horarios: HorarioAtencion[]) {
  const porFranja = new Map<string, number[]>();
  for (const h of horarios) {
    const franja = `${h.hora_inicio} a ${h.hora_fin}`;
    porFranja.set(franja, [...(porFranja.get(franja) ?? []), h.dia_semana]);
  }
  return [...porFranja].map(([franja, dias]) => `${resumirDias(dias)} · ${franja}`);
}

const iniciales = (nombre: string) =>
  nombre
    .replace(/\b(dr|dra)\.?\s/gi, "")
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// Foto del profesional; si no tiene o no carga, sus iniciales
const Avatar: React.FC<{ doctor: Veterinario }> = ({ doctor }) => {
  const [sinFoto, setSinFoto] = useState(!doctor.foto);
  if (sinFoto) {
    return (
      <div className="w-11 h-11 shrink-0 rounded-full bg-brand-100 text-brand-800 border border-brand-200 flex items-center justify-center text-sm font-bold">
        {iniciales(doctor.nombre)}
      </div>
    );
  }
  return (
    <img
      src={doctor.foto!}
      alt={doctor.nombre}
      onError={() => setSinFoto(true)}
      className="w-11 h-11 shrink-0 rounded-full object-cover border border-slate-200 shadow-sm"
    />
  );
};

const INPUT =
  "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

// Equipo de profesionales: quiénes tienen acceso al panel y en qué días toman turnos
export const AdminDoctores: React.FC<AdminDoctoresProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [doctores, setDoctores] = useState<Veterinario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [showModal, setShowModal] = useState(false);
  // Doctor que se está editando; null cuando el formulario es un alta
  const [editando, setEditando] = useState<Veterinario | null>(null);
  const [cambiandoId, setCambiandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [submitting, setSubmitting] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  useEffect(() => {
    api<Veterinario[]>("/api/veterinarios")
      .then(setDoctores)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const abrirModal = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setErrorForm("");
    setShowModal(true);
  };

  // Carga el formulario con los datos del doctor. Si tiene franjas distintas por día,
  // toma la primera: el formulario maneja un solo horario para todos los días marcados.
  const abrirEdicion = (d: Veterinario) => {
    setEditando(d);
    setForm({
      nombre: d.nombre,
      email: d.email,
      telefono: d.telefono || "",
      especialidad: d.especialidad || "",
      matricula: d.matricula || "",
      password: "",
      dias: [...new Set(d.horarios.map((h) => h.dia_semana))].sort((a, b) => a - b),
      hora_inicio: d.horarios[0]?.hora_inicio || "08:30",
      hora_fin: d.horarios[0]?.hora_fin || "20:00",
    });
    setErrorForm("");
    setShowModal(true);
  };

  const reemplazar = (actualizado: Veterinario) =>
    setDoctores((prev) =>
      prev
        .map((d) => (d.id === actualizado.id ? actualizado : d))
        .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, "es"))
    );

  // Baja o reincorporación. La baja no borra nada: conserva su historial y libera sus turnos futuros.
  const cambiarActivo = async (d: Veterinario) => {
    const mensaje = d.activo
      ? `¿Dar de baja a ${d.nombre}?\n\nNo va a poder ingresar al panel ni recibir turnos, y sus turnos futuros se cancelan para que los clientes reprogramen. Su historial clínico se conserva y podés reincorporarlo cuando quieras.`
      : `¿Reincorporar a ${d.nombre}? Vuelve a poder ingresar y a recibir turnos en sus días de atención.`;
    if (!window.confirm(mensaje)) return;
    setCambiandoId(d.id);
    setError("");
    try {
      const actualizado = await api<Veterinario>(`/api/veterinarios/${d.id}/activo`, {
        method: "PATCH",
        body: { activo: !d.activo },
      });
      reemplazar(actualizado);
      setAviso(actualizado.activo ? `${actualizado.nombre} fue reincorporado.` : `${actualizado.nombre} fue dado de baja.`);
    } catch (err: any) {
      setError(err.message || "No se pudo cambiar el estado del doctor.");
    } finally {
      setCambiandoId(null);
    }
  };

  const toggleDia = (dia: number) =>
    setForm((f) => ({
      ...f,
      dias: f.dias.includes(dia) ? f.dias.filter((d) => d !== dia) : [...f.dias, dia].sort((a, b) => a - b),
    }));

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.dias.length > 0 && form.hora_inicio >= form.hora_fin) {
      setErrorForm("La hora de fin tiene que ser posterior a la de inicio.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setErrorForm("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    setErrorForm("");
    if (editando) {
      try {
        const actualizado = await api<Veterinario>(`/api/veterinarios/${editando.id}`, { method: "PUT", body: form });
        reemplazar(actualizado);
        setAviso(`Los datos de ${actualizado.nombre} se guardaron.${form.password ? " La contraseña fue cambiada." : ""}`);
        setShowModal(false);
      } catch (err: any) {
        setErrorForm(err.message || "No se pudieron guardar los cambios.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    try {
      const { invitado, email_enviado, ...nuevo } = await api<Veterinario>("/api/veterinarios", {
        method: "POST",
        body: form,
      });
      setDoctores((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setAviso(
        !invitado
          ? `${nuevo.nombre} ya puede ingresar al panel con su email y la contraseña que cargaste.`
          : email_enviado
          ? `Le enviamos un email a ${nuevo.email} para que elija su contraseña. El enlace vence en 3 días.`
          : `${nuevo.nombre} quedó registrado, pero no se pudo enviar el email de invitación. Puede elegir su contraseña desde "¿Olvidaste tu contraseña?" en la pantalla de ingreso.`
      );
      setShowModal(false);
    } catch (err: any) {
      setErrorForm(err.message || "No se pudo registrar al doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar active="doctores" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctores</h1>
            <p className="text-sm text-slate-600">
              Profesionales de la clínica: tienen acceso a este panel y reciben los turnos online en sus días de atención.
            </p>
          </div>

          <button
            onClick={abrirModal}
            className="btn btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 bg-brand-600 hover:bg-brand-500 shadow-md cursor-pointer"
          >
            <Plus size={16} />
            <span>Nuevo doctor</span>
          </button>
        </div>

        {error && <div className="alert alert-error mb-4">{error}</div>}
        {aviso && (
          <div className="alert alert-success mb-4 flex items-start justify-between gap-3">
            <span>{aviso}</span>
            <button onClick={() => setAviso("")} className="shrink-0 cursor-pointer" title="Cerrar aviso">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="panel-card">
          {loading ? (
            <Cargando texto="Cargando doctores..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Profesional</th>
                    <th>Especialidad</th>
                    <th>Contacto</th>
                    <th>Atención de turnos</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {doctores.map((d) => (
                    <tr key={d.id} className={d.activo ? "" : "opacity-60"}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar doctor={d} />
                          <div>
                            <strong className="block text-slate-900 font-bold">
                              {d.nombre}
                              {d.id === user?.id && (
                                <span className="ml-2 text-[10px] font-bold uppercase text-brand-800 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded">
                                  Vos
                                </span>
                              )}
                              {!d.activo && (
                                <span className="ml-2 text-[10px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded">
                                  Dado de baja
                                </span>
                              )}
                            </strong>
                            <span className="text-xs text-slate-500 font-mono">
                              {d.matricula || "Sin matrícula cargada"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-slate-800">{d.especialidad || "Clínica general"}</span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Mail size={13} className="text-slate-400" />
                          {d.email}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <Phone size={13} className="text-slate-400" />
                          {d.telefono || "Sin teléfono"}
                        </span>
                      </td>
                      <td>
                        {!d.activo ? (
                          <span className="text-xs text-slate-500">Sin atención</span>
                        ) : d.horarios.length === 0 ? (
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                            No recibe turnos online
                          </span>
                        ) : (
                          resumirHorarios(d.horarios).map((linea) => (
                            <span key={linea} className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                              <Clock size={13} className="text-slate-400" />
                              {linea}
                            </span>
                          ))
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEdicion(d)}
                            className="btn btn-outline btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                            title="Editar datos, horario o contraseña"
                          >
                            <Pencil size={12} />
                            <span>Editar</span>
                          </button>
                          {d.id !== user?.id && (
                            <button
                              type="button"
                              onClick={() => cambiarActivo(d)}
                              disabled={cambiandoId === d.id}
                              className={`btn btn-sm text-xs py-1 px-2.5 flex items-center gap-1 ${d.activo ? "btn-danger" : "btn-primary"}`}
                              title={d.activo ? "Dar de baja (conserva su historial)" : "Reincorporar"}
                            >
                              {d.activo ? <UserX size={12} /> : <UserCheck size={12} />}
                              <span>{cambiandoId === d.id ? "..." : d.activo ? "Baja" : "Reincorporar"}</span>
                            </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                {editando ? <Pencil size={20} /> : <Plus size={22} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editando ? `Editar a ${editando.nombre}` : "Agregar doctor"}</h2>
                <p className="text-xs text-slate-500">
                  {editando
                    ? "Cambios en sus datos, su horario de atención o su contraseña"
                    : "Alta de un profesional con acceso al panel veterinario"}
                </p>
              </div>
            </div>

            {errorForm && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorForm}</span>
              </div>
            )}

            <form onSubmit={handleGuardar} className="space-y-4">
              <div>
                <label className={LABEL}>Nombre y apellido *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ej: Dra. Laura Fernández"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Email *</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="Con este email va a ingresar"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Teléfono</label>
                  <input
                    type="text"
                    maxLength={40}
                    placeholder="Ej: 11-4000-1002"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Especialidad</label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Ej: Clínica general, Cardiología"
                    value={form.especialidad}
                    onChange={(e) => setForm({ ...form, especialidad: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Matrícula *</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ej: MP 12.345"
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>Días y horario de atención</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {DIAS_FORM.map((dia) => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        form.dias.includes(dia)
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-slate-500 border-slate-300 hover:border-brand-400"
                      }`}
                    >
                      {DIAS[dia]}
                    </button>
                  ))}
                </div>
                {form.dias.length > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>De</span>
                    <input
                      type="time"
                      required
                      step={1800}
                      value={form.hora_inicio}
                      onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span>a</span>
                    <input
                      type="time"
                      required
                      step={1800}
                      value={form.hora_fin}
                      onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                      className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span>hs</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 font-semibold">
                    Sin días marcados, el doctor no recibe turnos online.
                  </p>
                )}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  La agenda online le asigna turnos solo dentro de estos días y horarios.
                </p>
              </div>

              <div>
                <label className={LABEL}>{editando ? "Nueva contraseña" : "Contraseña inicial"}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder={editando ? "Dejar vacía para no cambiarla" : "Opcional, mínimo 8 caracteres"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={INPUT}
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {editando
                    ? "Solo si el doctor necesita una contraseña nueva; si no, dejala vacía."
                    : "Si la dejás vacía, el doctor recibe un email con un enlace para elegir su propia contraseña."}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 bg-brand-600 hover:bg-brand-500 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : editando ? "Guardar cambios" : "Agregar doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
