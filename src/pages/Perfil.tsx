import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Pet, Turno, Order } from "../types";
import { api } from "../api";
import { formatFecha, formatPrecio } from "../format";
import { 
  FileText, 
  Pencil, 
  Trash2, 
  Plus, 
  Calendar, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  Check,
  Sparkles,
  HeartPulse,
  Share2,
  ExternalLink,
  Building2
} from "lucide-react";

interface PerfilProps {
  navigate: (path: string) => void;
}

const photoPresets = [
  { label: "Perro 1", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80" },
  { label: "Perro 2", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&q=80" },
  { label: "Perro 3", url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500&q=80" },
  { label: "Gato 1", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80" },
  { label: "Gato 2", url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500&q=80" },
  { label: "Ave", url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=500&q=80" },
  { label: "Exótico", url: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500&q=80" },
];

export const Perfil: React.FC<PerfilProps> = ({ navigate }) => {
  const { user } = useAuth();
  const esVeterinario = user?.rol === "veterinario";
  const [pets, setPets] = useState<Pet[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pedidos, setPedidos] = useState<Order[]>([]);

  // Editing state
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEspecie, setEditEspecie] = useState("Perro");
  const [editRaza, setEditRaza] = useState("");
  const [editEdad, setEditEdad] = useState<number | "">("");
  const [editPeso, setEditPeso] = useState<number | "">("");
  const [editFoto, setEditFoto] = useState("");
  const [editAlergias, setEditAlergias] = useState("");
  const [editCondiciones, setEditCondiciones] = useState("");
  const [customFotoUrl, setCustomFotoUrl] = useState("");
  const [savingPet, setSavingPet] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    api<Pet[]>(user.rol === "veterinario" ? "/api/pets?all=true" : "/api/pets")
      .then(setPets)
      .catch(() => {});

    api<Turno[]>(`/api/turnos?userId=${user.id}`)
      .then(setTurnos)
      .catch(() => {});

    api<Order[]>("/api/orders")
      .then(setPedidos)
      .catch(() => {});
  }, [user]);

  const openEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setEditNombre(pet.nombre);
    setEditEspecie(pet.especie);
    setEditRaza(pet.raza || "");
    setEditEdad(pet.edad !== undefined ? pet.edad : "");
    setEditPeso(pet.peso !== undefined ? pet.peso : "");
    setEditFoto(pet.foto || "");
    setEditAlergias(pet.alergias || "");
    setEditCondiciones(pet.condiciones_cronicas || "");
    setCustomFotoUrl("");
    setEditMsg(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setEditFoto(reader.result);
          setCustomFotoUrl("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    if (!editNombre.trim()) {
      setEditMsg({ type: "error", text: "El nombre es obligatorio." });
      return;
    }

    setSavingPet(true);
    setEditMsg(null);

    const finalFoto = customFotoUrl.trim() || editFoto;

    try {
      const updated = await api<Pet>(`/api/pets/${editingPet.id}`, {
        method: "PUT",
        body: {
          nombre: editNombre,
          especie: editEspecie,
          raza: editRaza,
          edad: editEdad,
          peso: editPeso,
          foto: finalFoto,
          // Los datos clínicos solo los carga el personal de la clínica
          ...(esVeterinario && {
            alergias: editAlergias,
            condiciones_cronicas: editCondiciones,
          }),
        },
      });
      setSavingPet(false);

      setPets((prev) => prev.map((p) => (p.id === editingPet.id ? updated : p)));
      setEditMsg({ type: "success", text: "¡Mascota actualizada correctamente!" });

      setTimeout(() => {
        setEditingPet(null);
      }, 1000);
    } catch (e: any) {
      setSavingPet(false);
      setEditMsg({ type: "error", text: e.message || "Error al actualizar la mascota." });
    }
  };

  const handleDeletePet = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`)) return;
    try {
      await api(`/api/pets/${id}`, { method: "DELETE" });
      setPets((prev) => prev.filter((p) => p.id !== id));
      // Sus turnos futuros se cancelan junto con la baja
      api<Turno[]>(`/api/turnos?userId=${user?.id}`).then(setTurnos).catch(() => {});
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCancelTurno = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas cancelar este turno?")) return;
    try {
      await api(`/api/turnos/${id}/estado`, { method: "PATCH", body: { estado: "cancelado" } });
      setTurnos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, estado: "cancelado" } : t))
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user) return null;

  return (
    <div className="container section">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-10 pb-2">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="text-sm text-slate-500 pt-1">
            Gestioná tus datos personales, mascotas y turnos solicitados.
          </p>
        </div>
        {user.rol === "veterinario" && (
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="btn btn-primary shadow-md shadow-brand-600/20"
          >
            Ir al Panel Veterinario →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {/* User Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-2xl border border-slate-200">
              {user.nombre.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg">{user.nombre}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                {user.rol === "veterinario" ? "Veterinario / Admin" : "Cliente"}
              </span>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Teléfono:</strong> {user.telefono || "No especificado"}
            </p>
          </div>
        </div>

        {/* Pets Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">
              {user.rol === "veterinario" ? `Pacientes Clínicos (${pets.length})` : `Mis Mascotas (${pets.length})`}
            </h2>
            <button
              onClick={() => navigate("/mascota-nueva")}
              className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer bg-brand-600 hover:bg-brand-500"
            >
              <Plus size={14} />
              <span>Agregar Mascota</span>
            </button>
          </div>

          {pets.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              Aún no tenés mascotas registradas.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pets.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between p-4 border border-slate-200 rounded-2xl hover:border-brand-400 transition-all bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        p.foto ||
                        (p.especie === "Gato"
                          ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80"
                          : "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80")
                      }
                      alt={p.nombre}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base truncate">{p.nombre}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.especie === "Gato"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : p.especie === "Perro"
                              ? "bg-brand-100 text-brand-900 border border-brand-200"
                              : "bg-brand-50 text-brand-700"
                          }`}
                        >
                          {p.especie}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {p.raza || "Sin raza especificada"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                        <span>{p.edad !== undefined ? `${p.edad} años` : "Edad no especif."}</span>
                        <span>•</span>
                        <span>{p.peso !== undefined ? `${p.peso} kg` : "Peso no especif."}</span>
                      </div>
                      {p.dueno && user.rol === "veterinario" && (
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">Dueño: {p.dueno}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => navigate(`/historial?mascota_id=${p.id}`)}
                      className="text-xs text-brand-600 font-semibold hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText size={13} />
                      <span>Historial</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditPet(p)}
                        className="btn btn-outline btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                        title="Editar datos y foto de la mascota"
                      >
                        <Pencil size={12} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeletePet(p.id, p.nombre)}
                        className="btn btn-danger btn-sm text-xs py-1 px-2 flex items-center justify-center"
                        title="Eliminar mascota"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Pet Modal */}
      {editingPet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingPet(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 font-bold text-xl cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Pencil size={18} className="text-brand-600" />
              <span>Editar Mascota: <strong className="text-brand-600">{editingPet.nombre}</strong></span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Modificá los datos personales, avatar o foto de tu mascota.
            </p>

            {editMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold mb-4 ${
                  editMsg.type === "success"
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {editMsg.text}
              </div>
            )}

            <form onSubmit={handleSavePet} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    required
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Especie *</label>
                  <select
                    value={editEspecie}
                    onChange={(e) => setEditEspecie(e.target.value)}
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                  >
                    <option value="Perro">Perro</option>
                    <option value="Gato">Gato</option>
                    <option value="Ave">Ave</option>
                    <option value="Exótico">Exótico / Otro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Raza</label>
                  <input
                    type="text"
                    value={editRaza}
                    onChange={(e) => setEditRaza(e.target.value)}
                    className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Edad (años)</label>
                    <input
                      type="number"
                      value={editEdad}
                      onChange={(e) => setEditEdad(e.target.value === "" ? "" : Number(e.target.value))}
                      min="0"
                      className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPeso}
                      onChange={(e) => setEditPeso(e.target.value === "" ? "" : Number(e.target.value))}
                      min="0"
                      className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>
              </div>

              {/* Foto customization */}
              <div className="pt-3 border-t border-gray-200">
                <label className="text-xs font-bold text-gray-700 block mb-1">Foto de la Mascota</label>
                <p className="text-xs text-gray-500 mb-2">
                  Elegí un avatar predeterminado, subí un archivo o pegá la URL directa de la foto:
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {photoPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEditFoto(p.url);
                        setCustomFotoUrl("");
                      }}
                      className={`flex items-center gap-1.5 p-1 px-2.5 rounded-lg border text-xs font-medium transition-all ${
                        (customFotoUrl ? customFotoUrl : editFoto) === p.url
                          ? "border-brand-600 bg-brand-50 text-brand-700 font-bold"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-5 h-5 rounded-full object-cover" />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Subir desde equipo:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-700"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">O pegar URL de imagen:</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={customFotoUrl}
                      onChange={(e) => setCustomFotoUrl(e.target.value)}
                      className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  <img
                    src={customFotoUrl.trim() || editFoto || "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80"}
                    alt="Vista previa"
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div>
                    <span className="text-xs text-gray-700 font-bold block">Vista previa del avatar</span>
                    <span className="text-[11px] text-gray-500">Así se mostrará en los turnos y el perfil.</span>
                  </div>
                </div>
              </div>

              {esVeterinario && (
              <>
              {/* Alergias & Condiciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Alergias Conocidas</label>
                  <input
                    type="text"
                    value={editAlergias}
                    onChange={(e) => setEditAlergias(e.target.value)}
                    placeholder="Ej: Polen, Algún fármaco..."
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Condiciones Crónicas</label>
                  <input
                    type="text"
                    value={editCondiciones}
                    onChange={(e) => setEditCondiciones(e.target.value)}
                    placeholder="Ej: Displasia leve..."
                    className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingPet(null)}
                  className="btn btn-light btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPet}
                  className="btn btn-primary btn-sm"
                >
                  {savingPet ? "Guardando..." : "Guardar Cambios ✓"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Turnos Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="font-bold text-xl text-slate-900">Mis Turnos Solicitados</h2>
            <p className="text-xs text-slate-500">Consultas clínicas, vacunaciones y estudios especializados agendados</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate("/booking?tipo=especializado")}
              className="btn btn-outline btn-sm flex items-center gap-1.5 border-brand-600 text-brand-600 hover:bg-brand-50 font-bold"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>+ Turno Especializado</span>
            </button>
            <button
              onClick={() => navigate("/booking")}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold"
            >
              <Plus size={14} />
              <span>+ Reservar Turno</span>
            </button>
          </div>
        </div>

        {turnos.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No tenés turnos registrados actualmente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Mascota</th>
                  <th>Servicio</th>
                  <th>Tipo / Modalidad</th>
                  <th>Veterinario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap">
                      <strong>{formatFecha(t.fecha)}</strong>
                      <br />
                      <small className="text-gray-500">{t.hora} hs</small>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">{t.mascota_nombre}</span>
                    </td>
                    <td>
                      <div className="font-medium text-slate-900">{t.servicio_nombre}</div>
                      {t.sintomas_observados && (
                        <div className="text-[11px] text-slate-500 italic max-w-xs truncate">
                          Obs: {t.sintomas_observados}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 items-start">
                        {t.es_especializado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Sparkles size={11} className="text-amber-600" />
                            <span>Especializado ({t.especialidad || "Imágenes/Cardio"})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">General</span>
                        )}

                        {t.derivado && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Building2 size={11} />
                            <span>Derivado a Centro Asociado</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{t.veterinario_nombre || "A asignar"}</td>
                    <td>
                      <span className={`badge badge-${t.estado}`}>
                        {t.estado.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {t.derivado && (
                          <button
                            onClick={() => navigate(`/historial?mascota_id=${t.mascota_id}`)}
                            title="Ver orden de derivación en historial"
                            className="p-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={13} />
                            <span>Ver Orden</span>
                          </button>
                        )}
                        {t.estado !== "cancelado" && t.estado !== "completado" && (
                          <button
                            onClick={() => handleCancelTurno(t.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Cancelar
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

      {/* Pedidos de la tienda */}
      {pedidos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-8">
          <h2 className="font-bold text-xl text-slate-900 mb-1">Mis Pedidos de Tienda</h2>
          <p className="text-xs text-slate-500 mb-5">El pago se realiza al retirar o recibir el pedido.</p>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Productos</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong className="font-mono">#{p.order_code}</strong>
                      <br />
                      <small className="text-gray-500">{formatFecha(p.creado_en)}</small>
                    </td>
                    <td>
                      {p.items.map((it) => (
                        <div key={it.id} className="text-xs text-slate-700">
                          {it.cantidad} × {it.producto_nombre}
                        </div>
                      ))}
                    </td>
                    <td className="text-xs">
                      {p.entrega === "envio" ? `Envío a ${p.direccion_envio}` : "Retiro en la clínica"}
                    </td>
                    <td>
                      <strong>{formatPrecio(p.total)}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${p.estado === "entregado" ? "completado" : p.estado === "cancelado" ? "cancelado" : p.estado === "pendiente" ? "pendiente" : "confirmado"}`}>
                        {p.estado.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
