import React, { useEffect, useState } from "react";
import { Service, CentroVeterinarioRecomendado } from "../types";
import { api } from "../api";
import { formatPrecio } from "../format";
import { CLINICA } from "../clinica";
import {
  Calendar,
  ShoppingBag,
  FileText,
  HeartPulse,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Clock,
  Phone,
  Mail,
  Building2,
} from "lucide-react";

interface HomeProps {
  navigate: (path: string) => void;
}

const ACCESOS = [
  {
    icon: Calendar,
    titulo: "Turnos online",
    texto: "Consultas, vacunación y controles. Elegís día y horario entre los que están libres.",
    accion: "Reservar turno",
    path: "/booking",
  },
  {
    icon: HeartPulse,
    titulo: "Estudios especializados",
    texto: "Cardiología, radiología y ecografía, con derivación a otro centro cuando hace falta.",
    accion: "Pedir un estudio",
    path: "/booking?tipo=especializado",
  },
  {
    icon: FileText,
    titulo: "Historia clínica",
    texto: "Consultas, vacunas, estudios y órdenes de cada mascota, siempre disponibles.",
    accion: "Ver historia clínica",
    path: "/historial",
  },
  {
    icon: ShoppingBag,
    titulo: "Tienda",
    texto: "Alimentos, antiparasitarios y medicamentos, con retiro en la clínica o envío.",
    accion: "Ir a la tienda",
    path: "/tienda",
  },
];

const PASOS_DERIVACION = [
  {
    titulo: "Pedís el turno",
    texto: "Elegís el estudio especializado desde la web y contás qué síntomas notaste.",
  },
  {
    titulo: "Evaluación en la clínica",
    texto: "El veterinario revisa a tu mascota y define si el estudio se puede hacer en la sede.",
  },
  {
    titulo: "Orden de derivación",
    texto: "Si hace falta otro centro, emite una orden con el estudio pedido y los datos del lugar.",
  },
  {
    titulo: "Todo queda registrado",
    texto: "La orden y los resultados se guardan en la historia clínica de tu mascota.",
  },
];

export const Home: React.FC<HomeProps> = ({ navigate }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [centros, setCentros] = useState<CentroVeterinarioRecomendado[]>([]);

  // Servicios y centros de derivación se leen de la base: la portada muestra lo que realmente se ofrece
  useEffect(() => {
    api<Service[]>("/api/services").then(setServices).catch(() => {});
    api<CentroVeterinarioRecomendado[]>("/api/centros-derivacion").then(setCentros).catch(() => {});
  }, []);

  const grupos = [
    {
      titulo: "Consultas y prácticas generales",
      servicios: services.filter((s) => s.categoria !== "especializado"),
      path: "/booking",
    },
    {
      titulo: "Estudios especializados",
      servicios: services.filter((s) => s.categoria === "especializado"),
      path: "/booking?tipo=especializado",
    },
  ];

  return (
    <div className="bg-white">
      {/* ---------------- Portada ---------------- */}
      <section className="bg-gradient-to-b from-brand-50/70 to-white border-b border-slate-200/70">
        <div className="container grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-14 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 bg-white border border-brand-200 rounded-full px-3.5 py-1.5 mb-6">
              <MapPin size={14} />
              Clínica veterinaria en Del Viso, Pilar
            </p>

            <h1 className="text-4xl sm:text-5xl leading-[1.1] tracking-tight">
              La salud de tu mascota,
              <span className="block text-brand-600">siempre a mano.</span>
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              Reservá turnos online, consultá su historia clínica con vacunas y estudios, y pedí lo que
              necesite en la tienda de la clínica.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate("/booking")} className="btn btn-primary px-6 py-3.5 text-base">
                <Calendar size={18} />
                Reservar turno
              </button>
              <a href="#servicios" className="btn btn-light px-6 py-3.5 text-base">
                Ver servicios y precios
              </a>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {["Turnos online a cualquier hora", "Historia clínica digital", "Derivación a especialistas"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-brand-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=1100&q=80"
              alt="Perro en la clínica veterinaria"
              className="w-full h-80 sm:h-[460px] object-cover rounded-3xl shadow-xl shadow-slate-900/10"
            />
            <div className="hidden sm:block absolute -bottom-6 -left-6 w-72 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Clock size={14} className="text-brand-600" />
                Horarios de atención
              </p>
              <p className="font-display font-bold text-slate-900 mt-1.5 leading-snug">{CLINICA.horarios}</p>
              <p className="text-sm text-slate-500 mt-2">
                {CLINICA.direccion}, {CLINICA.localidad}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Accesos principales ---------------- */}
      <section className="container py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl tracking-tight">Todo lo que podés hacer desde acá</h2>
          <p className="mt-3 text-slate-600">
            Con una cuenta gratuita gestionás los turnos, el historial y las compras de todas tus mascotas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACCESOS.map(({ icon: Icon, titulo, texto, accion, path }) => (
            <button
              key={titulo}
              onClick={() => navigate(path)}
              className="group text-left bg-white border border-slate-200 rounded-2xl p-6 hover:border-brand-300 hover:shadow-lg hover:shadow-slate-900/5 transition-all flex flex-col"
            >
              <span className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-5 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <Icon size={21} />
              </span>
              <span className="font-display font-bold text-lg text-slate-900">{titulo}</span>
              <span className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{texto}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                {accion}
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- Servicios y precios ---------------- */}
      <section id="servicios" className="bg-slate-50 border-y border-slate-200/70 scroll-mt-20">
        <div className="container py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="text-3xl tracking-tight">Servicios y precios</h2>
            <p className="mt-3 text-slate-600">
              Cada servicio indica cuánto dura el turno. Tocá uno para reservarlo.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {grupos.map((grupo) => (
              <div key={grupo.titulo} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <h3 className="px-6 py-4 border-b border-slate-200 text-base">{grupo.titulo}</h3>
                <ul className="divide-y divide-slate-100">
                  {grupo.servicios.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => navigate(grupo.path)}
                        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-brand-50/60 transition-colors"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold text-slate-900">{s.nombre}</span>
                          <span className="block text-sm text-slate-500 mt-0.5">{s.descripcion}</span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block font-display font-bold text-slate-900">{formatPrecio(s.precio)}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">{s.duracion_min} min</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {grupo.servicios.length === 0 && (
                    <li className="px-6 py-8 text-sm text-slate-500">Cargando servicios...</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Derivaciones ---------------- */}
      <section className="container py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl tracking-tight">Cuando hace falta un especialista</h2>
          <p className="mt-3 text-slate-600">
            Si un estudio necesita equipamiento o un profesional que no está en la sede, la clínica
            deriva a tu mascota a un centro de la zona. Así funciona:
          </p>
        </div>

        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PASOS_DERIVACION.map((paso, i) => (
            <li key={paso.titulo} className="relative">
              <span className="w-10 h-10 rounded-full bg-brand-600 text-white font-display font-bold flex items-center justify-center">
                {i + 1}
              </span>
              {i < PASOS_DERIVACION.length - 1 && (
                <span className="hidden lg:block absolute top-5 left-14 right-0 h-px bg-slate-200" />
              )}
              <h3 className="mt-5 text-lg">{paso.titulo}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- Ubicación ---------------- */}
      <section className="container pb-20">
        <div className="bg-brand-950 text-white rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="text-3xl tracking-tight text-white">Dónde estamos</h2>
            <ul className="mt-8 space-y-5 text-brand-50">
              <li className="flex items-start gap-3.5">
                <MapPin size={20} className="text-brand-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="block text-white font-semibold">{CLINICA.direccion}</strong>
                  <span className="text-sm text-brand-100/80">{CLINICA.localidad}</span>
                </span>
              </li>
              <li className="flex items-start gap-3.5">
                <Clock size={20} className="text-brand-300 shrink-0 mt-0.5" />
                <span>
                  <strong className="block text-white font-semibold">{CLINICA.horarios}</strong>
                  <span className="text-sm text-brand-100/80">Los turnos online respetan este horario</span>
                </span>
              </li>
              <li className="flex items-center gap-3.5">
                <Phone size={20} className="text-brand-300 shrink-0" />
                <strong className="text-white font-semibold">{CLINICA.telefono}</strong>
              </li>
              <li className="flex items-center gap-3.5">
                <Mail size={20} className="text-brand-300 shrink-0" />
                <a href={`mailto:${CLINICA.email}`} className="text-white font-semibold hover:underline">
                  {CLINICA.email}
                </a>
              </li>
            </ul>

            <button
              onClick={() => navigate("/booking")}
              className="btn mt-10 px-6 py-3.5 text-base bg-white text-brand-900 hover:bg-brand-50"
            >
              <Calendar size={18} />
              Reservar turno
            </button>
          </div>

          <div className="bg-white/5 border-t lg:border-t-0 lg:border-l border-white/10 p-8 sm:p-12">
            <h3 className="text-white text-lg flex items-center gap-2.5">
              <Building2 size={20} className="text-brand-300" />
              Centros a los que derivamos
            </h3>
            <ul className="mt-6 space-y-5">
              {centros.map((c) => (
                <li key={c.id} className="pb-5 border-b border-white/10 last:border-0 last:pb-0">
                  <strong className="block text-white font-semibold">{c.nombre}</strong>
                  <span className="block text-sm text-brand-100/80 mt-0.5">{c.localidad}</span>
                  <span className="block text-sm text-brand-100/60 mt-1.5">
                    {c.especialidades.slice(0, 3).join(" · ")}
                  </span>
                </li>
              ))}
              {centros.length === 0 && <li className="text-sm text-brand-100/70">Cargando centros...</li>}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
