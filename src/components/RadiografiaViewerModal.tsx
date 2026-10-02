import React, { useState } from 'react';
import { Estudio, Pet } from '../types';
import { X, ZoomIn, ZoomOut, RotateCcw, Sliders, Calendar, User, ShieldCheck, Download, Printer } from 'lucide-react';

interface RadiografiaViewerModalProps {
  estudio: Estudio | null;
  pet?: Pet | null;
  onClose: () => void;
}

export const RadiografiaViewerModal: React.FC<RadiografiaViewerModalProps> = ({
  estudio,
  pet,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [inverted, setInverted] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);

  if (!estudio) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setInverted(false);
    setBrightness(100);
  };

  const handlePrint = () => {
    window.print();
  };

  // Sin imagen cargada no se muestra ninguna de relleno
  const imageUrl = estudio.imagen_url || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sliders size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  {estudio.nombre}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {estudio.tipo || 'Radiografía'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {pet ? `${pet.nombre} (${pet.especie} · ${pet.raza})` : 'Paciente'} &bull; Zona: {estudio.zona_anatomica || 'No especificada'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimir informe radiológico"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Main Radiographic Canvas */}
          <div className="lg:col-span-8 bg-black relative flex items-center justify-center overflow-hidden min-h-[340px] sm:min-h-[460px] p-4">
            
            {/* Viewport Canvas */}
            <div
              className="transition-all duration-150 ease-out max-h-full max-w-full flex items-center justify-center"
              style={{
                transform: `scale(${zoom})`,
                filter: `${inverted ? 'invert(1)' : ''} brightness(${brightness}%)`,
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={estudio.nombre}
                  referrerPolicy="no-referrer"
                  className="max-h-[55vh] w-auto object-contain rounded shadow-2xl select-none"
                />
              ) : (
                <p className="text-sm text-slate-500 py-24">Este estudio no tiene una imagen adjunta.</p>
              )}
            </div>

            {/* Diagnostic Plate Overlay Watermark */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-[11px] font-mono text-slate-300 pointer-events-none">
              <span className="text-blue-400 font-bold">VETANIMAL</span> | {estudio.fecha} | ZOOM: {Math.round(zoom * 100)}%
            </div>

            {/* Floating Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 py-2 flex items-center gap-3 shadow-xl">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-40"
                title="Reducir zoom"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono text-slate-300 min-w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors disabled:opacity-40"
                title="Aumentar zoom"
              >
                <ZoomIn size={16} />
              </button>

              <div className="h-4 w-px bg-slate-700" />

              <button
                onClick={() => setInverted(!inverted)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
                  inverted
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Invertir contraste positivo/negativo"
              >
                Inversión {inverted ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Restablecer vista original"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* Clinical Diagnostic Sidebar */}
          <div className="lg:col-span-4 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto max-h-[460px] lg:max-h-none">
            <div className="space-y-5">
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                  Informe Radiológico & Diagnóstico
                </h4>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {estudio.observaciones || 'Todavía no se cargó un informe para este estudio.'}
                </div>
              </div>

              {/* Technical Information */}
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" /> Fecha del estudio
                  </span>
                  <span className="font-semibold text-slate-200">{estudio.fecha}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User size={13} className="text-slate-500" /> Profesional actuante
                  </span>
                  <span className="font-semibold text-slate-200 text-right">
                    {estudio.veterinario_nombre || 'No registrado'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-blue-400" /> Centro emisor
                  </span>
                  <span className="font-semibold text-slate-200 text-right text-[11px]">
                    {estudio.institucion || 'No registrado'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">Región anatómica</span>
                  <span className="font-semibold text-blue-300">
                    {estudio.zona_anatomica || 'No especificada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 border-t border-slate-800 flex items-center gap-3">
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`estudio_${pet?.nombre || 'mascota'}`}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  <span>Descargar Imagen</span>
                </a>
              )}
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
