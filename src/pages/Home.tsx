import React from "react";
import { LogoIcon } from "../components/LogoIcon";
import { 
  Calendar, 
  ShoppingBag, 
  FileText, 
  ShieldCheck, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  Stethoscope,
  Syringe,
  Activity,
  PackageCheck,
  Building2,
  MapPin,
  Clock,
  HeartPulse,
  Scan,
  FileCheck2,
  Award
} from "lucide-react";

interface HomeProps {
  navigate: (path: string) => void;
}

export const Home: React.FC<HomeProps> = ({ navigate }) => {
  return (
    <div className="pb-32 bg-slate-50 flex flex-col gap-20">
      {/* ---------------- HERO SECTION: COMBINACIÓN DE AMBOS MODELOS ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white mx-3 sm:mx-8 md:mx-12 mt-6 sm:mt-10 rounded-3xl border border-blue-900/60 shadow-2xl">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Título cálido y profesional + credenciales médicas */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm shadow-sm">
                <Building2 size={14} className="text-blue-400" />
                <span>Clínica Veterinaria VetAnimal · Sede Del Viso (Pilar)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wide">
                <Sparkles size={13} className="text-amber-400" />
                <span>Red de Interconsultas Activa · Tortuguitas</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15]">
                <span className="bg-gradient-to-r from-white via-blue-100 to-sky-300 bg-clip-text text-transparent">
                  Cuidado y salud para tus mascotas.
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Medicina veterinaria integral en Del Viso. Turnos online para consultas clínicas y estudios de alta complejidad (<strong>Cardiografía, Ecocardiograma Doppler y Radiología Digital</strong>), expediente médico digital y emisión directa de órdenes de derivación asistida cuando tu mascota lo necesita.
              </p>
            </div>

            {/* Credenciales médicas y tecnológicas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                <HeartPulse size={16} className="text-rose-400 shrink-0" />
                <span className="font-medium">Cardiografía &amp; Doppler</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                <Scan size={16} className="text-blue-400 shrink-0" />
                <span className="font-medium">Radiografías Digitales</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm">
                <FileCheck2 size={16} className="text-amber-400 shrink-0" />
                <span className="font-medium">Derivación Médica Oficial</span>
              </div>
            </div>

            {/* CTAs principales combinando accesos rápidos */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={() => navigate("/booking")}
                className="btn btn-primary px-6 py-3.5 text-sm font-bold flex items-center gap-2.5 shadow-lg shadow-blue-600/30 hover:scale-[1.02] transition-all cursor-pointer bg-blue-600 hover:bg-blue-500 border-0"
              >
                <Calendar size={17} />
                <span>Reservar Turno</span>
              </button>

              <button
                onClick={() => navigate("/booking?tipo=especializado")}
                className="px-5 py-3.5 rounded-full text-sm font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-sm"
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Turno Especializado (Cardio / Rx)</span>
              </button>

              <button
                onClick={() => navigate("/tienda")}
                className="px-5 py-3.5 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-sm"
              >
                <ShoppingBag size={16} className="text-blue-300" />
                <span>Tienda Oficial</span>
              </button>

              <button
                onClick={() => navigate("/historial")}
                className="px-4 py-3.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileText size={15} />
                <span>Historial &amp; Radiografías</span>
              </button>
            </div>
          </div>

          {/* Right Column: Visual fotográfico cálido de VetAnimal con badges flotantes */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-blue-400/20 shadow-2xl bg-slate-900">
              <img
                src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=900&q=80"
                alt="Atención médica e instalaciones de VetAnimal"
                className="w-full h-80 sm:h-[420px] object-cover filter brightness-95 contrast-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 space-y-2.5">
                {/* Badge 1: Sede Central Del Viso */}
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Hospital Veterinario VetAnimal</h4>
                      <p className="text-[11px] text-slate-300">Av. Eduardo Madero 1250, Del Viso (Pilar)</p>
                    </div>
                  </div>
                  <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-400/30 text-blue-300">
                    <LogoIcon size={18} />
                  </div>
                </div>

                {/* Badge 2: Red de Interconsultas */}
                <div className="bg-slate-900/85 backdrop-blur-md border border-amber-400/20 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Building2 size={13} className="text-amber-400" />
                    <span>Centro Asociado: <strong>Tortuguitas (Cura Brochero 1420)</strong></span>
                  </span>
                  <span className="text-amber-300 font-semibold flex items-center gap-0.5">
                    Interconsulta directa <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- 4 MÓDULOS DE ACCESO RÁPIDO Y SERVICIOS ---------------- */}
      <section className="container">
        <div className="flex flex-col items-center text-center max-w-xl mx-auto mb-10 gap-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Servicios y Especialidades</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Cobertura Médica &amp; Prestaciones
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Accedé a cada área con un solo clic: agenda turnos generales o especializados, consultá radiografías o visitá la farmacia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Turnos Online Generales */}
          <div 
            onClick={() => navigate("/booking")}
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
          >
            <div className="flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <Calendar size={22} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Turnos Online
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Consultas clínicas, vacunación, desparasitaciones y controles de rutina preventiva.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Agendar consulta</span>
              <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Turnos Especializados */}
          <div 
            onClick={() => navigate("/booking?tipo=especializado")}
            className="bg-white border-2 border-amber-400 hover:border-amber-500 p-6 rounded-3xl shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-xl">
              Especialidad
            </div>
            <div className="flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <HeartPulse size={22} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Turnos Especializados
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cardiografía, ecocardiograma doppler y radiología HD con derivación asistida.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>Sacar turno especializado</span>
              <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Historial Clínico & Radiografías */}
          <div 
            onClick={() => navigate("/historial")}
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
          >
            <div className="flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <FileText size={22} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Historial &amp; Radiografías
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Expediente médico digital, placas radiográficas en alta definición, vacunas y diagnósticos.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Ver expediente</span>
              <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Tienda & Farmacia Oficial */}
          <div 
            onClick={() => navigate("/tienda")}
            className="bg-white border border-slate-200 hover:border-blue-500 p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
          >
            <div className="flex flex-col items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <ShoppingBag size={22} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Tienda &amp; Farmacia
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Alimentos balanceados terapéuticos, medicamentos recetados y suplementos oficiales.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>Ir a la tienda</span>
              <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PROTOCOLO DE DERIVACIÓN E INTERCONSULTAS EN 4 PASOS ---------------- */}
      <section className="container">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="max-w-3xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles size={13} className="text-amber-600" />
              <span>Innovación en Red Interclínica</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight leading-snug">
              ¿Cómo funciona el circuito de derivación médica y turnos especializados?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Si tu mascota necesita un estudio especializado (como cardiografía o ecocardiograma doppler) y nuestra sede central Del Viso requiere articulación o aparatología específica, nuestro sistema interclínico resuelve la atención de inmediato.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center mb-4">
                  01
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">Turno Especializado</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El cliente reserva desde la web en el apartado de turnos especializados para Cardiografía, Doppler o Radiología HD.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-blue-700">
                Selección de especialidad ✓
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center mb-4">
                  02
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">Evaluación Veterinaria</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El veterinario analiza el caso en el panel clínico. Si se requiere aparatología específica, activa la derivación con un clic.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-blue-700">
                Criterio médico profesional ✓
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center mb-4">
                  03
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">Orden Médica Oficial</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Se emite la orden formal con código alfanumérico, sospecha diagnóstica y derivación geográfica a <em>Centro Tortuguitas</em>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-amber-800">
                Recomendación de cercanía ✓
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 font-black text-sm flex items-center justify-center mb-4">
                  04
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-2">Retorno al Expediente</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El paciente asiste con la orden médica. Los resultados y placas quedan guardados permanentemente en su expediente digital.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-emerald-700">
                Historial clínico unificado ✓
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SECCIÓN QUE LE ENCANTABA: INFRAESTRUCTURA Y EQUIPAMIENTO MÉDICO ---------------- */}
      <section className="container">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: 4 Bloques Clave de Salud */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck size={14} />
                <span>Nuestros Estándares Clínicos</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Infraestructura y equipamiento médico al servicio de tu mascota.
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                Diseñamos un centro veterinario cálido, seguro y tecnológicamente equipado para garantizar diagnósticos certeros y tratamientos de máxima eficacia.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-blue-200 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                    <Stethoscope size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Clínica General</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Consultas preventivas diarias, control clínico integral y seguimiento pediátrico y geriátrico.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-blue-200 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                    <Syringe size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Vacunación &amp; Prevención</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Esquemas de inmunización completos, desparasitación interna y externa y certificados sanitarios.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-blue-200 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
                    <PackageCheck size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Farmacia Oficial</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Medicamentos recetados, antiparasitarios de primeras marcas y nutrición clínica balanceada.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 hover:border-blue-200 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
                    <Activity size={18} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Expediente Digital</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Historial médico en la nube, visor de radiografías digitales y órdenes de derivación disponibles 24/7.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => navigate("/booking")}
                  className="btn btn-primary px-5 py-3 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Calendar size={15} />
                  <span>Solicitar Turno</span>
                </button>
                <button
                  onClick={() => navigate("/historial")}
                  className="px-4 py-3 rounded-full text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Ver Historiales Clínicos
                </button>
              </div>
            </div>

            {/* Right: Foto cálida del equipo médico */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1581888227599-779811939961?w=800&q=80"
                  alt="Equipo veterinario VetAnimal"
                  className="w-full h-80 sm:h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 text-white p-3 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300 mb-1">
                    <Award size={14} />
                    <span>Equipo Profesional VetAnimal</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Médicos veterinarios matriculados y especialistas en constante actualización académica.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------- Sede Del Viso & Red de Centros ---------------- */}
      <section className="bg-slate-900 text-white py-16 mx-3 sm:mx-8 md:mx-12 rounded-3xl border border-slate-800">
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <MapPin size={13} className="text-blue-400" />
                <span>Ubicación &amp; Cobertura Territorial</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                Hospital Central VetAnimal Del Viso
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Estamos ubicados en el centro de Del Viso, Partido del Pilar. Contamos con estacionamiento propio, consultorios equipados, área de farmacia y articulación directa con los principales centros de imágenes de Tortuguitas, Pilar y Manuel Alberti.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <MapPin size={14} />
                    <span>Sede Central</span>
                  </div>
                  <p className="text-xs text-white font-medium">Av. Eduardo Madero 1250, Del Viso</p>
                  <p className="text-[11px] text-slate-400">Partido del Pilar, Buenos Aires</p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                    <Clock size={14} />
                    <span>Horarios de Atención</span>
                  </div>
                  <p className="text-xs text-white font-medium">Lunes a Sábados: 08:30 a 20:00 hs</p>
                  <p className="text-[11px] text-slate-400">Guardia pasiva de emergencias</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 rounded-2xl bg-gradient-to-br from-blue-900/60 to-slate-800/80 border border-blue-500/30 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <Building2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Red de Derivación Activa</h4>
                  <p className="text-xs text-blue-200">Convenio interclínico para pacientes de Pilar</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Centro Tortuguitas:</strong> Cura Brochero 1420 (Cardiografía, Rayos X, Ecodoppler).</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Hospital Pilar Centro:</strong> Tratamientos oncológicos y resonancia magnética.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Orden digital unificada:</strong> Sin pérdidas de historial ni trámites manuales.</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/booking?tipo=especializado")}
                className="w-full btn btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 border-0 cursor-pointer shadow-md"
              >
                <Sparkles size={15} className="text-amber-300" />
                <span>Solicitar Turno o Interconsulta Médica</span>
              </button>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
