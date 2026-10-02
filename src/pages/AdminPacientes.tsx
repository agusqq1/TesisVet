import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Pet, Cliente } from "../types";
import { AdminSidebar } from "../components/AdminSidebar";
import { api } from "../api";
import { FileText, Search, Plus, X, Check, Upload, AlertCircle } from "lucide-react";

interface AdminPacientesProps {
  navigate: (path: string) => void;
}

const photoPresets = [
  { label: "Perro 1", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80" },
  { label: "Perro 2 (Boxer)", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&q=80" },
  { label: "Perro 3 (Golden)", url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500&q=80" },
  { label: "Gato 1 (Siamés)", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80" },
  { label: "Gato 2 (Carey)", url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500&q=80" },
  { label: "Gato 3 (Naranja)", url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500&q=80" },
  { label: "Ave", url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=500&q=80" },
  { label: "Exótico", url: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500&q=80" },
];

export const AdminPacientes: React.FC<AdminPacientesProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [search, setSearch] = useState("");

  // Modal para registrar paciente
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState("Gato");
  const [raza, setRaza] = useState("");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [duenoId, setDuenoId] = useState("");
  // Clientes registrados y alta rápida de uno nuevo desde el mostrador
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", email: "", telefono: "" });
  const [foto, setFoto] = useState("");
  const [customFotoUrl, setCustomFotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadPets = () => {
    api<Pet[]>("/api/pets?all=true")
      .then(setPets)
      .catch((err) => console.error("Error loading pets:", err));
  };

  const loadClientes = () => {
    api<Cliente[]>("/api/users?rol=cliente")
      .then(setClientes)
      .catch(() => {});
  };

  useEffect(() => {
    loadPets();
    loadClientes();
  }, [user]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setFoto(reader.result);
          setCustomFotoUrl("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre del paciente es obligatorio.");
      return;
    }

    if (!duenoId) {
      setErrorMsg("Elegí el cliente dueño del paciente.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const selectedPhoto = customFotoUrl.trim() || foto;

    try {
      // Si el dueño todavía no es cliente, primero se crea su cuenta
      let ownerId = Number(duenoId);
      if (duenoId === "nuevo") {
        const cliente = await api<Cliente>("/api/users", { method: "POST", body: nuevoCliente });
        ownerId = cliente.id;
        setDuenoId(String(cliente.id));
        setNuevoCliente({ nombre: "", email: "", telefono: "" });
        loadClientes();
      }

      const data = await api<Pet>("/api/pets", {
        method: "POST",
        body: {
          usuario_id: ownerId,
          nombre: nombre.trim(),
          especie,
          raza: raza.trim(),
          edad: edad ? Number(edad) : undefined,
          peso: peso ? Number(peso) : undefined,
          foto: selectedPhoto || undefined,
        },
      });
      setSubmitting(false);

      setSuccessMsg(`¡${data.nombre} (${data.especie}) registrado exitosamente!`);
      // Reset form
      setNombre("");
      setRaza("");
      setEdad("");
      setPeso("");
      setFoto("");
      setCustomFotoUrl("");
      loadPets();

      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
      }, 1400);
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err.message || "No se pudo registrar el paciente.");
    }
  };

  const handleDeletePet = async (petId: number, petName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${petName} del registro?`)) return;
    try {
      await api(`/api/pets/${petId}`, { method: "DELETE" });
      setPets((prev) => prev.filter((p) => p.id !== petId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredPets = pets.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.nombre.toLowerCase().includes(s) ||
      p.especie.toLowerCase().includes(s) ||
      (p.dueno && p.dueno.toLowerCase().includes(s)) ||
      (p.raza && p.raza.toLowerCase().includes(s))
    );
  });

  const countGatos = pets.filter((p) => p.especie.toLowerCase() === "gato").length;
  const countPerros = pets.filter((p) => p.especie.toLowerCase() === "perro").length;
  const countOtros = pets.length - countGatos - countPerros;

  return (
    <div className="admin-shell">
      <AdminSidebar active="pacientes" navigate={navigate} />

      <div className="admin-main">
        <div className="admin-topbar flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Registro de Pacientes</h1>
            <p className="text-sm text-slate-600">
              Pacientes de la clínica, con acceso a la historia clínica de cada uno.
            </p>
          </div>

          <button
            onClick={() => {
              setErrorMsg("");
              setSuccessMsg("");
              setShowModal(true);
            }}
            className="btn btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 bg-brand-600 hover:bg-brand-500 shadow-md cursor-pointer"
          >
            <Plus size={16} />
            <span>Nuevo paciente</span>
          </button>
        </div>

        {/* Resumen de Pacientes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pacientes</span>
            <span className="text-2xl font-bold text-slate-900 mt-1">{pets.length}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">En base de datos</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex flex-col bg-amber-50/40">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              Gatos
            </span>
            <span className="text-2xl font-bold text-amber-900 mt-1">{countGatos}</span>
            <span className="text-[11px] text-amber-700 mt-0.5">Pacientes felinos</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-brand-200 shadow-sm flex flex-col bg-brand-50/40">
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider flex items-center gap-1">
              Perros
            </span>
            <span className="text-2xl font-bold text-brand-900 mt-1">{countPerros}</span>
            <span className="text-[11px] text-brand-700 mt-0.5">Pacientes caninos</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Otras Especies</span>
            <span className="text-2xl font-bold text-slate-900 mt-1">{countOtros}</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Aves y exóticos</span>
          </div>
        </div>

        <div className="panel-card">
          <div className="mb-6 max-w-md">
            <div className="search-bar">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, especie (gato/perro), raza o dueño..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Especie / Raza</th>
                  <th>Edad &amp; Peso</th>
                  <th>Dueño / Contacto</th>
                  <th>Estado Clínico</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPets.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.foto ||
                            (p.especie === "Gato"
                              ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80"
                              : "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80")
                          }
                          alt={p.nombre}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-sm"
                        />
                        <div>
                          <strong className="block text-slate-900 font-bold">{p.nombre}</strong>
                          <span className="text-xs text-slate-400">ID #{p.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            p.especie.toLowerCase() === "gato"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : p.especie.toLowerCase() === "perro"
                              ? "bg-brand-100 text-brand-900 border border-brand-200"
                              : "bg-purple-100 text-purple-900 border border-purple-200"
                          }`}
                        >
                          {p.especie}
                        </span>
                      </div>
                      <small className="text-slate-500 font-medium mt-0.5 block">{p.raza || "Mestizo / Sin especificar"}</small>
                    </td>
                    <td>
                      <span className="text-sm font-semibold text-slate-800">
                        {p.edad ? `${p.edad} años` : "No esp."}
                      </span>
                      <br />
                      <small className="text-slate-500 font-medium">
                        {p.peso ? `${p.peso} kg` : "Sin pesar"}
                      </small>
                    </td>
                    <td>
                      <strong className="text-slate-900 block font-semibold">{p.dueno || "Cliente VetAnimal"}</strong>
                      <small className="text-slate-500">{p.telefono || "Sin teléfono"}</small>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.estado_salud?.includes("En tratamiento") || p.estado_salud?.includes("observación")
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {p.estado_salud || "Estable"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/historial?mascota_id=${p.id}`)}
                          className="btn btn-outline btn-sm text-xs font-bold py-1.5 px-3 flex items-center gap-1 hover:bg-brand-600 hover:text-white transition-colors cursor-pointer"
                          title={`Abrir historial clínico de ${p.nombre}`}
                        >
                          <FileText size={14} />
                          <span>Historial</span>
                        </button>
                        <button
                          onClick={() => handleDeletePet(p.id, p.nombre)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar paciente"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL PARA REGISTRAR NUEVO PACIENTE DIRECTAMENTE */}
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
                <Plus size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Registrar Nuevo Paciente</h2>
                <p className="text-xs text-slate-500">
                  Alta de un paciente y, si hace falta, de su dueño
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreatePet} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre del Paciente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Oliver, Simba, Kira..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Especie *
                  </label>
                  <select
                    value={especie}
                    onChange={(e) => setEspecie(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-slate-800"
                  >
                    <option value="Gato">Gato</option>
                    <option value="Perro">Perro</option>
                    <option value="Ave">Ave</option>
                    <option value="Exótico">Exótico / Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Raza
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Siamés, Mestizo..."
                    value={raza}
                    onChange={(e) => setRaza(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Edad (Años)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ej: 2"
                    value={edad}
                    onChange={(e) => setEdad(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Peso (Kg)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ej: 4.5"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dueño / Cliente Asignado *
                </label>
                <select
                  value={duenoId}
                  onChange={(e) => setDuenoId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800"
                >
                  <option value="">Elegí un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.email}{c.telefono ? ` - Tel: ${c.telefono}` : ""})
                    </option>
                  ))}
                  <option value="nuevo">+ Registrar un cliente nuevo...</option>
                </select>

                {duenoId === "nuevo" && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Nombre y apellido *"
                        value={nuevoCliente.nombre}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Email *"
                        value={nuevoCliente.email}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <input
                        type="text"
                        placeholder="Teléfono"
                        value={nuevoCliente.telefono}
                        onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })}
                        className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Para entrar a la web, el cliente elige su contraseña con "¿Olvidaste tu contraseña?" usando este email.
                    </p>
                  </div>
                )}
              </div>

              {/* Selector de Fotos / Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Foto del Paciente
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
                  {photoPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFoto(p.url);
                        setCustomFotoUrl("");
                      }}
                      className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                        (customFotoUrl ? "" : foto) === p.url
                          ? "border-brand-600 scale-105 shadow-md"
                          : "border-transparent opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="O pegar URL de imagen..."
                    value={customFotoUrl}
                    onChange={(e) => {
                      setCustomFotoUrl(e.target.value);
                      setFoto("");
                    }}
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer border border-slate-200">
                    <Upload size={13} />
                    <span>Subir</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
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
                  {submitting ? "Guardando..." : "Registrar Paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
