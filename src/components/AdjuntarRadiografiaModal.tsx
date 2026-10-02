import React, { useState } from 'react';
import { Pet, Estudio } from '../types';
import { X, Upload, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { api } from '../api';
import { hoyLocal } from '../format';

interface AdjuntarRadiografiaModalProps {
  pets: Pet[];
  selectedPetId?: number;
  onClose: () => void;
  onSuccess: (newEstudio: Estudio) => void;
}

export const AdjuntarRadiografiaModal: React.FC<AdjuntarRadiografiaModalProps> = ({
  pets,
  selectedPetId,
  onClose,
  onSuccess,
}) => {
  const [petId, setPetId] = useState<number>(selectedPetId || (pets[0]?.id || 1));
  const [nombre, setNombre] = useState<string>('');
  const [tipo, setTipo] = useState<string>('Radiografía');
  const [fecha, setFecha] = useState<string>(hoyLocal());
  const [zonaAnatomica, setZonaAnatomica] = useState<string>('');
  const [imagenUrl, setImagenUrl] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [institucion, setInstitucion] = useState<string>('VetAnimal - Sede Del Viso / Pilar');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 15MB
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('El archivo es demasiado grande. El límite es de 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagenUrl(reader.result);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!petId) {
      setErrorMsg('Seleccioná el paciente.');
      return;
    }

    if (!nombre.trim()) {
      setErrorMsg('Ingresá el título o denominación del estudio radiológico.');
      return;
    }

    setIsSubmitting(true);
    try {
      // El estudio queda a nombre del profesional que tiene la sesión iniciada
      const newEstudio = await api<Estudio>('/api/estudios', {
        method: 'POST',
        body: {
          mascota_id: petId,
          nombre,
          tipo,
          fecha,
          zona_anatomica: zonaAnatomica,
          imagen_url: imagenUrl,
          observaciones,
          institucion,
        },
      });
      onSuccess(newEstudio);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el estudio radiológico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <ImageIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Adjuntar Radiografía o Estudio de Imagen</h3>
              <p className="text-xs text-slate-400">Incorporar placas radiológicas de alta definición al historial clínico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Paciente
              </label>
              <select
                value={petId}
                onChange={(e) => setPetId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.especie} · {p.raza})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Fecha del Estudio
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Título del Estudio
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Radiografía Digital de Tórax"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Región Anatómica
              </label>
              <input
                type="text"
                value={zonaAnatomica}
                onChange={(e) => setZonaAnatomica(e.target.value)}
                placeholder="Ej. Tórax Frente y Perfil"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Box / Image Preview */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Archivo de la Placa / Imagen Radiológica
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="radiografia-file-upload"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="radiografia-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5 text-slate-600 hover:text-blue-600"
                >
                  <Upload size={24} className="text-blue-600" />
                  <span className="text-xs font-bold">Hacé clic para subir la placa o imagen</span>
                  <span className="text-[11px] text-slate-400">JPG, PNG, WebP o GIF (hasta 15 MB)</span>
                </label>
              </div>

              <div className="sm:col-span-4 bg-slate-900 rounded-2xl p-2 flex items-center justify-center h-28 border border-slate-800 overflow-hidden relative group">
                {imagenUrl ? (
                  <img
                    src={imagenUrl}
                    alt="Vista previa"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-slate-500">Sin vista previa</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Informe Radiológico & Hallazgos
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Describí los hallazgos radiológicos (silueta cardíaca, campos pulmonares, estructuras óseas)..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Institución / Servicio
              </label>
              <input
                type="text"
                value={institucion}
                onChange={(e) => setInstitucion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tipo de Diagnóstico
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="Radiografía">Radiografía Digital</option>
                <option value="Cardiografía / ECG">Cardiografía / ECG</option>
                <option value="Ecografía">Ecografía</option>
                <option value="Laboratorio">Laboratorio Clínico</option>
                <option value="Otro">Otro Diagnóstico</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Guardando...' : 'Adjuntar al Historial'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
