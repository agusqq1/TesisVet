import React, { useState } from 'react';
import { OrdenDerivacion } from '../types';
import { X, Printer, Mail, CheckCircle2, Building2, Phone, MapPin, Calendar, Clock, AlertTriangle, ShieldCheck, FileCheck2, ArrowRight } from 'lucide-react';
import { LogoIcon } from './LogoIcon';
import { api } from '../api';
import { formatFecha } from '../format';

interface OrdenMedicaModalProps {
  orden: OrdenDerivacion | null;
  onClose: () => void;
}

export const OrdenMedicaModal: React.FC<OrdenMedicaModalProps> = ({ orden, onClose }) => {
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message: string } | null>(null);

  if (!orden) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailStatus(null);

    try {
      const data = await api<{ message: string }>(`/api/derivaciones/${orden.id}/enviar-email`, {
        method: 'POST',
      });
      setEmailStatus({ sent: true, message: data.message });
    } catch (err: any) {
      setEmailStatus({
        sent: false,
        message: err.message || 'No se pudo enviar el correo en este momento.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar (No se imprime) */}
        <div className="print:hidden px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-300">
              ORDEN DE DERIVACIÓN &bull; {orden.codigo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Enviar por email al dueño de la mascota"
            >
              <Mail size={14} />
              <span>{sendingEmail ? 'Enviando...' : 'Enviar por Email'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Imprimir orden oficial"
            >
              <Printer size={14} />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Email feedback notice */}
        {emailStatus && (
          <div
            className={`print:hidden px-6 py-2 text-xs flex items-center gap-2 ${
              emailStatus.sent ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-amber-50 text-amber-800 border-b border-amber-200'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{emailStatus.message}</span>
          </div>
        )}

        {/* Document Body (Printable Area) */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 text-slate-900 bg-white" id="printable-order-area">
          
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-900 flex items-center justify-center text-white shadow-md">
                  <LogoIcon size={24} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight leading-none">
                    VetAnimal
                  </h1>
                  <p className="text-xs font-semibold text-brand-800 mt-1 uppercase tracking-wider">
                    Clínica Veterinaria &bull; Sede Del Viso / Pilar
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Central de Urgencias: (011) 4000-1000 &bull; Mail: veterinariavet101@gmail.com
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right bg-slate-50 border border-slate-200 p-3 rounded-xl sm:min-w-48">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  N° de Orden Médica
                </div>
                <div className="text-base font-bold text-brand-950 font-mono">
                  {orden.codigo}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Emisión: <strong>{formatFecha(orden.fecha_emision)}</strong>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  Válida hasta: {formatFecha(orden.fecha_validez_hasta)}
                </div>
              </div>
            </div>

            <div className="mt-5 text-center bg-brand-900 text-white py-2 px-4 rounded-lg">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest">
                Orden Médica de Derivación e Interconsulta Externa
              </h2>
            </div>
          </div>

          {/* Destination Clinic Recommendation Highlight Box */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-50 via-brand-50/50 to-white border-2 border-brand-600/60 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-brand-200">
              <div className="flex items-center gap-2 text-brand-950 font-bold text-xs sm:text-sm uppercase tracking-wider">
                <Building2 size={18} className="text-brand-600" />
                <span>Centro Veterinario Receptor Recomendado</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-600 text-white">
                {orden.centro_destino.distancia_estimada || 'Zona Norte'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7">
                <h3 className="text-base sm:text-lg font-bold text-slate-950">
                  {orden.centro_destino.nombre}
                </h3>
                <div className="mt-2 space-y-1 text-xs text-slate-700">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-brand-600 shrink-0" />
                    <strong>Dirección:</strong> {orden.centro_destino.direccion} ({orden.centro_destino.localidad})
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone size={14} className="text-brand-600 shrink-0" />
                    <strong>Contacto:</strong> {orden.centro_destino.telefono} &bull; WhatsApp: {orden.centro_destino.whatsapp || '-'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={14} className="text-brand-600 shrink-0" />
                    <strong>Horarios:</strong> {orden.centro_destino.horarios}
                  </p>
                </div>
              </div>

              <div className="md:col-span-5 bg-white/80 border border-brand-200/80 rounded-xl p-3 text-xs flex flex-col justify-center">
                <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wide text-brand-900 mb-1">
                  Especialista / Equipamiento Destacado:
                </p>
                <p className="text-slate-800 font-medium text-[11px] mb-1">
                  {orden.centro_destino.medico_responsable}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {orden.centro_destino.especialidades.slice(0, 2).map((esp, i) => (
                    <span key={i} className="px-2 py-0.5 bg-brand-100/70 text-brand-800 rounded text-[10px] font-medium">
                      {esp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Patient and Owner Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            
            {/* Box 1: Datos del Paciente */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200 flex items-center justify-between">
                <span>Datos del Paciente</span>
                <span className="text-brand-600 font-mono text-[11px]">ID #{orden.mascota_id}</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Nombre:</span>
                  <span className="font-bold text-slate-900 text-sm">{orden.mascota_nombre}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Especie / Raza:</span>
                  <span className="font-semibold text-slate-900">{orden.especie} &bull; {orden.raza || 'Mestizo'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Edad:</span>
                  <span className="font-semibold text-slate-900">{orden.edad ? `${orden.edad} años` : 'No especificada'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Peso Registrado:</span>
                  <span className="font-semibold text-slate-900">{orden.peso ? `${orden.peso} kg` : 'Normopeso'}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Propietario / Responsable */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-200">
                Tutor / Propietario
              </h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Nombre Completo:</span>
                  <span className="font-bold text-slate-900 text-sm">{orden.dueno_nombre}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span>Teléfono: <strong>{orden.dueno_telefono || '(No registrado)'}</strong></span>
                  <span>Email: <strong>{orden.dueno_email || '(No registrado)'}</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* Prescribed Study & Clinical Referral Specification */}
          <div className="space-y-4 mb-6">
            
            <div className="p-4 rounded-xl bg-slate-900 text-white">
              <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest block mb-1">
                Estudio / Práctica Diagnóstica Solicitada
              </span>
              <p className="text-base font-bold text-white leading-snug">
                {orden.estudio_solicitado}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-600/40 text-brand-200 border border-brand-500/30">
                  Especialidad: {orden.especialidad_derivada}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Motivo: {orden.motivo_derivacion}
                </span>
              </div>
            </div>

            {/* Sospecha Diagnóstica & Resumen Clínico */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 space-y-3">
              <div>
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  Sospecha Diagnóstica & Hallazgos Previos:
                </h5>
                <p className="leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-slate-800">
                  {orden.sospecha_diagnostica}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">
                  Resumen Clínico y Antecedentes de Relevancia:
                </h5>
                <p className="leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-slate-700">
                  {orden.resumen_clinico}
                </p>
              </div>

              {/* Indicaciones de Preparación Previa */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[11px] uppercase tracking-wide block">
                    Indicaciones para el Paciente Previas al Turno:
                  </span>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {orden.indicaciones_previas}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Professional Stamp & Legal Signature */}
          <div className="pt-4 border-t-2 border-slate-900 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck size={14} className="text-brand-700" />
                Documento de Interconsulta Médica Veterinaria
              </p>
              <p>
                Válido para ser presentado ante {orden.centro_destino.nombre} dentro del período estipulado.
              </p>
            </div>

            <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
              <div className="w-48 border-b border-slate-400 pb-1 mb-1.5 text-center">
                <div className="font-serif italic text-base text-brand-900 font-bold">
                  {orden.veterinario_emisor_nombre}
                </div>
              </div>
              <p className="text-xs font-bold text-slate-900">
                {orden.veterinario_emisor_nombre}
              </p>
              <p className="text-[11px] text-slate-600">
                Médico Veterinario &bull; {orden.veterinario_matricula}
              </p>
              <p className="text-[10px] text-slate-400">
                VetAnimal Sede Del Viso / Pilar
              </p>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="print:hidden px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Presentá este comprobante impreso o desde el celular al llegar a <strong>{orden.centro_destino.nombre}</strong>.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir Orden Médica</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
