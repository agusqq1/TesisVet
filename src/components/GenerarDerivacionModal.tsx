import React, { useState, useEffect } from 'react';
import { Pet, CentroVeterinarioRecomendado, OrdenDerivacion } from '../types';
import { X, Stethoscope, AlertCircle, CheckCircle2, Sparkles, MapPin, ShieldAlert } from 'lucide-react';
import { api } from '../api';

interface GenerarDerivacionModalProps {
  pets: Pet[];
  selectedPetId?: number;
  turnoId?: number;
  initialEspecialidad?: OrdenDerivacion['especialidad_derivada'];
  initialEstudio?: string;
  initialMotivo?: OrdenDerivacion['motivo_derivacion'];
  initialSospecha?: string;
  initialResumen?: string;
  onClose: () => void;
  onSuccess: (newOrden: OrdenDerivacion) => void;
}

export const GenerarDerivacionModal: React.FC<GenerarDerivacionModalProps> = ({
  pets,
  selectedPetId,
  turnoId,
  initialEspecialidad,
  initialEstudio,
  initialMotivo,
  initialSospecha,
  initialResumen,
  onClose,
  onSuccess,
}) => {
  const [petId, setPetId] = useState<number>(selectedPetId || (pets[0]?.id || 1));
  const [centros, setCentros] = useState<CentroVeterinarioRecomendado[]>([]);
  const [selectedCentroId, setSelectedCentroId] = useState<string>('tortuguitas-brochero');

  const [especialidad, setEspecialidad] = useState<OrdenDerivacion['especialidad_derivada']>(
    initialEspecialidad || 'Cardiología'
  );
  const [estudioSolicitado, setEstudioSolicitado] = useState<string>(
    initialEstudio || 'Cardiografía / Ecocardiograma Doppler Color + Electrocardiograma de 12 derivaciones'
  );
  const [motivoDerivacion, setMotivoDerivacion] = useState<OrdenDerivacion['motivo_derivacion']>(
    initialMotivo || 'Falta de especialista cardiólogo en sede'
  );
  // La sospecha diagnóstica y el resumen clínico los redacta el profesional: no se precargan
  const [sospechaDiagnostica, setSospechaDiagnostica] = useState<string>(initialSospecha || '');
  const [resumenClinico, setResumenClinico] = useState<string>(initialResumen || '');
  const [indicacionesPrevias, setIndicacionesPrevias] = useState<string>(
    'Ayuno de 6 horas de sólidos. Presentarse con esta orden médica.'
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api<CentroVeterinarioRecomendado[]>('/api/centros-derivacion')
      .then((data) => {
        setCentros(data);
        if (data.length > 0) {
          // Default to Tortuguitas Cura Brochero as requested
          const tort = data.find((c) => c.id.includes('tortuguitas'));
          if (tort) setSelectedCentroId(tort.id);
        }
      })
      .catch(() => {});
  }, []);

  const handleEspecialidadChange = (esp: OrdenDerivacion['especialidad_derivada']) => {
    setEspecialidad(esp);
    if (esp === 'Cardiología') {
      setEstudioSolicitado('Cardiografía / Ecocardiograma Doppler Color + Electrocardiograma de 12 derivaciones');
      setMotivoDerivacion('Falta de especialista cardiólogo en sede');
      setIndicacionesPrevias('Ayuno de 6 horas de sólidos. Presentarse con esta orden médica.');
    } else if (esp === 'Radiología / Diagnóstico por Imágenes') {
      setEstudioSolicitado('Radiografía Digital de Columna Lumbo-Sacra y Miembros Pélvicos (VD y Lateral)');
      setMotivoDerivacion('Saturación de turnos / derivación prioritaria');
      setIndicacionesPrevias('Ayuno de sólidos de 8 horas en caso de requerir sedación ligera para posicionamiento radiológico.');
    } else if (esp === 'Ecografía Doppler') {
      setEstudioSolicitado('Ecografía Abdominal Completa con Doppler Vascular');
      setMotivoDerivacion('Equipamiento de alta complejidad requerido');
      setIndicacionesPrevias('Ayuno de sólidos de 8 horas y vejiga moderadamente pletórica.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!estudioSolicitado.trim() || !sospechaDiagnostica.trim()) {
      setErrorMsg('Por favor completá los campos médicos indispensables (estudio y sospecha diagnóstica).');
      return;
    }

    setIsSubmitting(true);
    try {
      // La orden queda a nombre del profesional que tiene la sesión iniciada
      const newOrden = await api<OrdenDerivacion>('/api/derivaciones', {
        method: 'POST',
        body: {
          turno_id: turnoId,
          mascota_id: petId,
          centro_destino_id: selectedCentroId,
          especialidad_derivada: especialidad,
          estudio_solicitado: estudioSolicitado,
          motivo_derivacion: motivoDerivacion,
          sospecha_diagnostica: sospechaDiagnostica,
          resumen_clinico: resumenClinico,
          indicaciones_previas: indicacionesPrevias,
        },
      });
      onSuccess(newOrden);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la derivación médica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCentro = centros.find((c) => c.id === selectedCentroId) || centros[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-blue-950 text-white px-6 py-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg leading-tight">Generar Orden Médica de Derivación / Interconsulta</h3>
                {turnoId && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-blue-950">
                    Vinculada a Turno #{turnoId}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200">
                Para especialistas externos (Cardiología, Radiología) cuando la sede está saturada o no cuenta con la especialidad
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Context Reason Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-700">
            <ShieldAlert size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900 mb-0.5">Protocolo de Red de Atención Externa</p>
              <p className="text-slate-600 leading-relaxed">
                Esta herramienta emite una orden médica con código único, firmada con tu nombre y matrícula, para presentar en el centro de destino.
              </p>
            </div>
          </div>

          {/* Pet & Motivo Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Paciente a Derivar
              </label>
              <select
                value={petId}
                onChange={(e) => setPetId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.especie} · {p.raza} &bull; Tutor: {p.dueno || 'Cliente'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Motivo de Derivación
              </label>
              <select
                value={motivoDerivacion}
                onChange={(e) => setMotivoDerivacion(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none"
              >
                <option value="Falta de especialista cardiólogo en sede">Falta de especialista cardiólogo en sede</option>
                <option value="Saturación de turnos / derivación prioritaria">Saturación de turnos / derivación prioritaria</option>
                <option value="Equipamiento de alta complejidad requerido">Equipamiento de alta complejidad requerido</option>
                <option value="Evaluación prequirúrgica urgente">Evaluación prequirúrgica urgente</option>
              </select>
            </div>
          </div>

          {/* Especialidad & Recommended Center Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Especialidad Requerida
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'Cardiología', label: 'Cardiología / ECG', desc: 'Cardiólogo & Ecocardiograma Doppler' },
                { key: 'Radiología / Diagnóstico por Imágenes', label: 'Radiología Digital', desc: 'Rayos X de Alta Frecuencia' },
                { key: 'Ecografía Doppler', label: 'Ecografía Doppler', desc: 'Abdominal y Vascular' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleEspecialidadChange(item.key as any)}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    especialidad === item.key
                      ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 text-blue-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-xs block">{item.label}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Centro Veterinario Recomendado Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span>Centro de Destino Recomendado (Alrededores de Pilar / Del Viso)</span>
              <span className="text-blue-600 text-[11px] font-semibold flex items-center gap-1">
                <Sparkles size={12} /> Red Asociada VetAnimal
              </span>
            </label>
            <div className="space-y-2.5">
              {centros.map((centro) => (
                <div
                  key={centro.id}
                  onClick={() => setSelectedCentroId(centro.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    selectedCentroId === centro.id
                      ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-950">{centro.nombre}</span>
                      {centro.id.includes('tortuguitas') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          Recomendada por proximidad
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-blue-600 shrink-0" />
                      <strong>{centro.direccion}</strong> &bull; {centro.localidad}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      📞 {centro.telefono} &bull; Horarios: {centro.horarios}
                    </p>
                  </div>

                  <div className="text-right sm:shrink-0">
                    <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 inline-block">
                      {centro.distancia_estimada}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estudio Solicitado */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Estudio / Práctica Médica Solicitada
            </label>
            <input
              type="text"
              value={estudioSolicitado}
              onChange={(e) => setEstudioSolicitado(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
              placeholder="Ej. Cardiografía / Ecocardiograma Doppler Color + Electrocardiograma"
              required
            />
          </div>

          {/* Sospecha Diagnóstica & Resumen Clínico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sospecha Diagnóstica
              </label>
              <textarea
                value={sospechaDiagnostica}
                onChange={(e) => setSospechaDiagnostica(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                placeholder="Indique los hallazgos en auscultación o examen físico que motivan la interconsulta..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Resumen Clínico / Antecedentes
              </label>
              <textarea
                value={resumenClinico}
                onChange={(e) => setResumenClinico(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                placeholder="Evolución clínica previa, medicaciones actuales, tolerancia..."
              />
            </div>
          </div>

          {/* Indicaciones Previas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Indicaciones de Preparación Previa para el Tutor
            </label>
            <input
              type="text"
              value={indicacionesPrevias}
              onChange={(e) => setIndicacionesPrevias(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
              placeholder="Ej. Ayuno de 6 horas de sólidos. Concurrir con la orden médica oficial..."
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Al confirmar se genera la orden y, si el correo de la clínica está configurado, se le envía una copia al dueño.
            </p>
            <div className="flex items-center gap-2">
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
                <span>{isSubmitting ? 'Emitiendo Orden...' : 'Emitir Orden de Derivación'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
