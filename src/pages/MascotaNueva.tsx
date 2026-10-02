import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { LogoIcon } from "../components/LogoIcon";
import { Cliente, Pet } from "../types";
import { api } from "../api";

interface MascotaNuevaProps {
  navigate: (path: string) => void;
}

export const MascotaNueva: React.FC<MascotaNuevaProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState("Perro");
  const [raza, setRaza] = useState("");
  const [edad, setEdad] = useState("");
  const [peso, setPeso] = useState("");
  const [foto, setFoto] = useState("");
  const [customFotoUrl, setCustomFotoUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // El personal de la clínica elige a qué cliente pertenece el paciente
  const esVeterinario = user?.rol === "veterinario";
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [duenoId, setDuenoId] = useState("");

  useEffect(() => {
    if (!esVeterinario) return;
    api<Cliente[]>("/api/users?rol=cliente")
      .then(setClientes)
      .catch(() => {});
  }, [esVeterinario]);

  const photoPresets = [
    { label: "Perro 1", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80" },
    { label: "Perro 2", url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&q=80" },
    { label: "Perro 3", url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=500&q=80" },
    { label: "Gato 1", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80" },
    { label: "Gato 2", url: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500&q=80" },
    { label: "Ave", url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=500&q=80" },
    { label: "Exótico", url: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500&q=80" },
  ];

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

  const selectedFoto = foto || customFotoUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      setError("El nombre de la mascota es obligatorio.");
      return;
    }
    if (esVeterinario && !duenoId) {
      setError("Elegí el cliente dueño de la mascota.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await api<Pet>("/api/pets", {
        method: "POST",
        body: {
          usuario_id: esVeterinario ? Number(duenoId) : undefined,
          nombre,
          especie,
          raza,
          edad: edad ? Number(edad) : undefined,
          peso: peso ? Number(peso) : undefined,
          foto: selectedFoto || undefined,
        },
      });

      if (esVeterinario) {
        navigate("/admin/pacientes");
      } else {
        navigate(`/historial?mascota_id=${data.id}`);
      }
    } catch (e: any) {
      setError(e.message || "Error al guardar mascota");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: "600px" }}>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="back-link mb-6"
      >
        ← Volver
      </button>

      <div className="panel-card">
        <h1 className="text-2xl font-bold mb-2">Agregar Nueva Mascota</h1>
        <p className="text-gray-600 mb-6 text-sm">
          Registrá los datos de tu compañero para poder solicitar turnos y llevar
          su historial clínico.
        </p>

        {error && <div className="alert alert-error mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          {esVeterinario && (
            <div className="field">
              <label>Cliente dueño de la mascota *</label>
              <div className="input-wrap">
                <select value={duenoId} onChange={(e) => setDuenoId(e.target.value)} required>
                  <option value="">Elegí un cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Si el cliente todavía no tiene cuenta, cargalo desde Pacientes &amp; Clientes.
              </p>
            </div>
          )}

          <div className="field">
            <label>Nombre de la mascota *</label>
            <div className="input-wrap">
              <span className="flex items-center justify-center text-blue-600">
                <LogoIcon size={16} />
              </span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Max, Luna..."
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Especie *</label>
            <div className="input-wrap">
              <select
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
              >
                <option value="Perro">Perro</option>
                <option value="Gato">Gato</option>
                <option value="Ave">Ave</option>
                <option value="Exótico">Exótico / Otro</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Raza</label>
            <div className="input-wrap">
              <input
                type="text"
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                placeholder="Ej: Golden Retriever, Siames..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <label>Edad (años)</label>
              <div className="input-wrap">
                <input
                  type="number"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  placeholder="Ej: 3"
                  min="0"
                />
              </div>
            </div>

            <div className="field">
              <label>Peso (kg)</label>
              <div className="input-wrap">
                <input
                  type="number"
                  step="0.1"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ej: 12.5"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label>Foto de la mascota</label>
            <p className="text-xs text-gray-500 mb-2">
              Elegí un avatar predeterminado, subí una foto de tu dispositivo o ingresá una URL:
            </p>
            
            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {photoPresets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setFoto(p.url);
                    setCustomFotoUrl("");
                  }}
                  className={`flex items-center gap-1.5 p-1 px-2.5 rounded-lg border text-xs font-medium transition-all ${
                    foto === p.url
                      ? "border-[#2f4b3c] bg-[#e7f0ea] text-[#2f4b3c] font-bold"
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
                <label className="text-xs font-semibold text-gray-600 block mb-1">Subir imagen:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2f4b3c] file:text-white hover:file:bg-[#243c30]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">O pegar URL de imagen:</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={customFotoUrl}
                  onChange={(e) => {
                    setCustomFotoUrl(e.target.value);
                    setFoto("");
                  }}
                  className="w-full text-xs p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {selectedFoto && (
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <img src={selectedFoto} alt="Previsualización" className="w-12 h-12 rounded-full object-cover border" />
                <span className="text-xs text-gray-600 font-medium">✓ Vista previa de foto seleccionada</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn btn-light"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
            >
              {submitting ? "Guardando..." : "Guardar Mascota ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
