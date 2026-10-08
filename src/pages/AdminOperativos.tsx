import React, { useEffect, useMemo, useState } from "react";
import { OperativoMovil } from "../types";
import { Cargando } from "../components/Cargando";
import { AdminSidebar } from "../components/AdminSidebar";
import { Mapa, PuntoMapa } from "../components/Mapa";
import { RUTA_MAPA } from "../components/AvisoOperativos";
import { api } from "../api";
import { formatFecha, hoyLocal } from "../format";
import { ZONAS } from "../zonas";
import { Plus, X, AlertCircle, MapPin, Search, Trash2, Pencil, ExternalLink } from "lucide-react";

interface AdminOperativosProps {
  navigate: (path: string) => void;
}

const FORM_VACIO = {
  titulo: "",
  organizador: "",
  servicios: "",
  fecha: "",
  hora_inicio: "09:00",
  hora_fin: "13:00",
  localidad: ZONAS[0].nombre,
  direccion: "",
  requisitos: "",
};

const centroDe = (localidad: string): [number, number] => {
  const zona = ZONAS.find((z) => z.nombre === localidad) ?? ZONAS[0];
  return [zona.lat, zona.lng];
};

const INPUT =
  "w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const LABEL = "block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5";

// Operativos de veterinarias móviles que la clínica publica en el mapa del sitio
export const AdminOperativos: React.FC<AdminOperativosProps> = ({ navigate }) => {
  const [operativos, setOperativos] = useState<OperativoMovil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [showModal, setShowModal] = useState(false);
  // Operativo que se está corrigiendo; null si el formulario es de un alta
  const [editando, setEditando] = useState<OperativoMovil | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  // Punto exacto del operativo y lugar donde está centrado el mapa del formulario
  const [punto, setPunto] = useState<[number, number] | null>(null);
  const [centroMapa, setCentroMapa] = useState<[number, number]>(centroDe(FORM_VACIO.localidad));
  const [buscando, setBuscando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const hoy = hoyLocal();

  useEffect(() => {
    api<OperativoMovil[]>("/api/operativos?todos=true")
      .then(setOperativos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const puntosForm = useMemo<PuntoMapa[]>(
    () => (punto ? [{ id: 0, lat: punto[0], lng: punto[1], titulo: "Acá va a estar la veterinaria móvil" }] : []),
    [punto]
  );

  const abrirModal = (o: OperativoMovil | null = null) => {
    setEditando(o);
    setForm(
      o
        ? {
            titulo: o.titulo,
            organizador: o.organizador,
            servicios: o.servicios,
            fecha: o.fecha,
            hora_inicio: o.hora_inicio,
            hora_fin: o.hora_fin,
            localidad: o.localidad,
            direccion: o.direccion,
            requisitos: o.requisitos ?? "",
          }
        : FORM_VACIO
    );
    setPunto(o ? [o.latitud, o.longitud] : null);
    setCentroMapa(o ? [o.latitud, o.longitud] : centroDe(FORM_VACIO.localidad));
    setErrorForm("");
    setShowModal(true);
  };

  const cambiarLocalidad = (localidad: string) => {
    setForm((f) => ({ ...f, localidad }));
    setCentroMapa(centroDe(localidad));
  };

  // Ubica la dirección escrita con el buscador de OpenStreetMap; si no la encuentra, se marca a mano
  const buscarDireccion = async () => {
    if (!form.direccion.trim()) {
      setErrorForm("Escribí la dirección para buscarla en el mapa.");
      return;
    }
    setBuscando(true);
    setErrorForm("");
    try {
      const consulta = encodeURIComponent(`${form.direccion}, ${form.localidad}, Buenos Aires, Argentina`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${consulta}`
      );
      const [lugar] = await res.json();
      if (!lugar) throw new Error("sin resultados");
      const encontrado: [number, number] = [Number(lugar.lat), Number(lugar.lon)];
      setPunto(encontrado);
      setCentroMapa(encontrado);
    } catch {
      setErrorForm("No encontramos esa dirección. Marcá el punto haciendo clic en el mapa.");
    } finally {
      setBuscando(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.hora_inicio >= form.hora_fin) {
      setErrorForm("La hora de fin tiene que ser posterior a la de inicio.");
      return;
    }
    if (!punto) {
      setErrorForm("Marcá en el mapa el punto donde va a estar la veterinaria móvil.");
      return;
    }

    setSubmitting(true);
    setErrorForm("");
    try {
      const { avisos = 0, email_activo, cambio_avisado, ...nuevo } = await api<OperativoMovil>(
        editando ? `/api/operativos/${editando.id}` : "/api/operativos",
        { method: editando ? "PUT" : "POST", body: { ...form, latitud: punto[0], longitud: punto[1] } }
      );
      // Se vuelve a pedir la lista para que el nuevo quede en su lugar por fecha
      setOperativos(await api<OperativoMovil[]>("/api/operativos?todos=true").catch(() => [nuevo, ...operativos]));
      const anotados = avisos === 1 ? "1 cliente anotado" : `${avisos} clientes anotados`;
      setAviso(
        editando
          ? !cambio_avisado
            ? "Cambios guardados."
            : avisos === 0
            ? "Cambios guardados. No hay clientes anotados a quienes avisarles del cambio."
            : email_activo
            ? `Cambios guardados. Se le está avisando del cambio por email a ${anotados}.`
            : `Cambios guardados. Hay ${anotados}, pero el envío de emails no está configurado: no se les pudo avisar del cambio.`
          : avisos === 0
          ? `Operativo publicado en el mapa. Todavía no hay clientes anotados para recibir avisos de ${nuevo.localidad}.`
          : email_activo
          ? `Operativo publicado en el mapa. Se le está avisando por email a ${anotados} en ${nuevo.localidad}.`
          : `Operativo publicado en el mapa. Hay ${anotados} en ${nuevo.localidad}, pero el envío de emails no está configurado: lo van a ver al entrar a la web.`
      );
      setShowModal(false);
    } catch (err: any) {
      setErrorForm(err.message || "No se pudo guardar el operativo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (o: OperativoMovil) => {
    if (!window.confirm(`¿Eliminar "${o.titulo}" del ${formatFecha(o.fecha)}? Deja de aparecer en el mapa.`)) return;
    setError("");
    try {
      await api(`/api/operativos/${o.id}`, { method: "DELETE" });
      setOperativos((prev) => prev.filter((x) => x.id !== o.id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar active="operativos" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Veterinarias móviles</h1>
            <p className="text-sm text-slate-600">
              Operativos de castración y vacunación que se muestran en el mapa del sitio. Al publicar uno, se avisa
              a los clientes anotados en esa localidad.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate(RUTA_MAPA)} className="btn btn-light px-4 py-2.5 text-xs font-bold">
              <ExternalLink size={15} />
              <span>Ver mapa público</span>
            </button>
            <button
              onClick={() => abrirModal()}
              className="btn btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 bg-brand-600 hover:bg-brand-500 shadow-md cursor-pointer"
            >
              <Plus size={16} />
              <span>Nuevo operativo</span>
            </button>
          </div>
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
            <Cargando texto="Cargando operativos..." />
          ) : operativos.length === 0 ? (
            <p className="text-center py-10 text-gray-500">
              Todavía no hay operativos cargados. Publicá el primero con "Nuevo operativo".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Operativo</th>
                    <th>Lugar</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {operativos.map((o) => {
                    const pasado = o.fecha < hoy;
                    return (
                      <tr key={o.id} className={pasado ? "opacity-60" : ""}>
                        <td className="whitespace-nowrap">
                          <strong className="block text-slate-900">{formatFecha(o.fecha)}</strong>
                          <small className="text-slate-500">
                            {o.hora_inicio} a {o.hora_fin} hs
                          </small>
                        </td>
                        <td>
                          <strong className="block text-slate-900">{o.titulo}</strong>
                          <small className="text-slate-600 block">{o.servicios}</small>
                          {o.organizador && <small className="text-slate-400 block">{o.organizador}</small>}
                        </td>
                        <td>
                          <span className="flex items-start gap-1.5 text-xs text-slate-700">
                            <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                            <span>
                              {o.direccion}
                              <strong className="block">{o.localidad}</strong>
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${pasado ? "badge-completado" : "badge-confirmado"}`}>
                            {pasado ? "Finalizado" : o.fecha === hoy ? "Hoy" : "Próximo"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            {!pasado && (
                              <button
                                onClick={() => abrirModal(o)}
                                className="p-1.5 text-slate-400 hover:text-brand-700 rounded-lg hover:bg-brand-50 transition-colors cursor-pointer"
                                title="Editar operativo"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEliminar(o)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar operativo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editando ? "Editar operativo" : "Nuevo operativo"}</h2>
                <p className="text-xs text-slate-500">
                  {editando
                    ? "Si cambia el día, el horario o el lugar, se les avisa a los clientes anotados"
                    : "Se publica en el mapa y se avisa a los clientes anotados"}
                </p>
              </div>
            </div>

            {errorForm && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorForm}</span>
              </div>
            )}

            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Título *</label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    placeholder="Ej: Quirófano móvil de castración"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Organiza</label>
                  <input
                    type="text"
                    maxLength={160}
                    placeholder="Ej: Zoonosis del municipio"
                    value={form.organizador}
                    onChange={(e) => setForm({ ...form, organizador: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL}>Servicios *</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  placeholder="Ej: Castración gratuita de perros y gatos, vacunación antirrábica"
                  value={form.servicios}
                  onChange={(e) => setForm({ ...form, servicios: e.target.value })}
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Fecha *</label>
                  <input
                    type="date"
                    required
                    min={hoy}
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Desde *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Hasta *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_fin}
                    onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
                <div>
                  <label className={LABEL}>Localidad *</label>
                  <select
                    value={form.localidad}
                    onChange={(e) => cambiarLocalidad(e.target.value)}
                    className={`${INPUT} bg-white`}
                  >
                    {ZONAS.map((z) => (
                      <option key={z.nombre} value={z.nombre}>
                        {z.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Dirección o lugar *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={200}
                      placeholder="Ej: Plaza central, calle y altura"
                      value={form.direccion}
                      onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={buscarDireccion}
                      disabled={buscando}
                      className="btn btn-light btn-sm shrink-0"
                      title="Buscar la dirección en el mapa"
                    >
                      <Search size={14} />
                      <span>{buscando ? "Buscando..." : "Buscar"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className={LABEL}>Punto en el mapa *</label>
                <div className="rounded-xl overflow-hidden border border-slate-300">
                  <Mapa
                    puntos={puntosForm}
                    centro={centroMapa}
                    zoom={15}
                    onClickMapa={(lat, lng) => setPunto([lat, lng])}
                    className="h-64"
                  />
                </div>
                <p className={`text-[11px] mt-1.5 ${punto ? "text-slate-500" : "text-amber-700 font-semibold"}`}>
                  {punto
                    ? "Punto marcado. Hacé clic en otro lugar del mapa para corregirlo."
                    : "Hacé clic en el mapa para marcar dónde va a estar, o buscá la dirección."}
                </p>
              </div>

              <div>
                <label className={LABEL}>Requisitos</label>
                <textarea
                  rows={2}
                  placeholder="Ej: Ayuno de 12 horas, llevar al animal con correa o en transportadora"
                  value={form.requisitos}
                  onChange={(e) => setForm({ ...form, requisitos: e.target.value })}
                  className={INPUT}
                />
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
                  {submitting ? "Guardando..." : editando ? "Guardar cambios" : "Publicar operativo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
