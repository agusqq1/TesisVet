import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Pet, Service, Turno } from "../types";
import { Cargando } from "../components/Cargando";
import { 
  Heart, 
  Scissors, 
  FlaskConical, 
  Syringe, 
  Stethoscope, 
  CheckCircle2, 
  User, 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  Scan,
  Bone,
  Sparkles,
  AlertCircle,
  Building2,
  ShieldCheck,
  FileCheck
} from "lucide-react";
import { LogoIcon } from "../components/LogoIcon";
import { api } from "../api";
import { formatFecha, formatFechaLarga, formatPrecio, hoyLocal } from "../format";

interface BookingWizardProps {
  navigate: (path: string) => void;
}

const renderServiceIcon = (iconName: string) => {
  switch (iconName) {
    case "heart":
      return <Heart size={20} className="text-rose-500" />;
    case "scalpel":
      return <Scissors size={20} className="text-amber-500" />;
    case "flask":
      return <FlaskConical size={20} className="text-cyan-500" />;
    case "syringe":
      return <Syringe size={20} className="text-emerald-500" />;
    case "heart-pulse":
      return <Activity size={20} className="text-rose-600" />;
    case "scan":
      return <Scan size={20} className="text-brand-600" />;
    case "activity":
      return <Activity size={20} className="text-brand-600" />;
    case "bone":
      return <Bone size={20} className="text-amber-700" />;
    default:
      return <Stethoscope size={20} className="text-brand-600" />;
  }
};

export const BookingWizard: React.FC<BookingWizardProps> = ({ navigate }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  // Tab de categoría de turnos (General vs Especializado)
  const [selectedCategory, setSelectedCategory] = useState<"general" | "especializado">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tipo") === "especializado" || params.get("categoria") === "especializado") {
        return "especializado";
      }
    }
    return "general";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tipo") === "especializado" || params.get("categoria") === "especializado") {
        setSelectedCategory("especializado");
      }
    }
  }, []);

  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Campos específicos para turnos especializados
  const [sintomasObservados, setSintomasObservados] = useState<string>("");
  const [tieneEstudiosPrevios, setTieneEstudiosPrevios] = useState<boolean>(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [bookedDays, setBookedDays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  // Horarios que el servidor informa como reservables para la fecha y el servicio elegidos
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [notas, setNotas] = useState("");
  const [confirmedTurno, setConfirmedTurno] = useState<Turno | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Load pets & services. El personal de la clínica agenda para cualquier paciente.
    api<Pet[]>(user.rol === "veterinario" ? "/api/pets?all=true" : "/api/pets")
      .then((data) => {
        setPets(data);
        if (data.length > 0) setSelectedPetId(data[0].id);
      })
      .catch(() => {});

    api<Service[]>("/api/services")
      .then((data) => {
        setServices(data);
        // Pre-select based on initial category
        const initialFiltered = data.filter((s) => 
          selectedCategory === "especializado" 
            ? (s.categoria === "especializado" || s.id >= 5)
            : (s.categoria !== "especializado" && s.id < 5)
        );
        if (initialFiltered.length > 0) {
          setSelectedServiceId(initialFiltered[0].id);
        } else if (data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      })
      .catch(() => {});
  }, [user]);

  // When switching category tab, update selected service to the first available in category
  const handleCategoryTabChange = (cat: "general" | "especializado") => {
    setSelectedCategory(cat);
    const inCategory = services.filter((s) => 
      cat === "especializado"
        ? (s.categoria === "especializado" || s.id >= 5)
        : (s.categoria !== "especializado" && s.id < 5)
    );
    if (inCategory.length > 0) {
      setSelectedServiceId(inCategory[0].id);
    }
  };

  // Load booked days for current month
  useEffect(() => {
    if (step === 2 && currentMonth) {
      api<number[]>(`/api/turnos/booked-dates?mes=${currentMonth}`)
        .then(setBookedDays)
        .catch(() => {});
    }
  }, [step, currentMonth]);

  // Los horarios dependen de la fecha y también del servicio, por su duración
  useEffect(() => {
    setSelectedTime("");
    if (!selectedDate || !selectedServiceId) {
      setAvailableTimes([]);
      return;
    }
    setLoadingTimes(true);
    api<string[]>(`/api/turnos/disponibilidad?fecha=${selectedDate}&servicio_id=${selectedServiceId}`)
      .then(setAvailableTimes)
      .catch(() => setAvailableTimes([]))
      .finally(() => setLoadingTimes(false));
  }, [selectedDate, selectedServiceId]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const isSpecializedService = selectedService?.categoria === "especializado" || (selectedService?.id ? selectedService.id >= 5 : false);

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPetId || !selectedServiceId) {
      setError("Elegí una mascota y un servicio para continuar.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError("Elegí una fecha y un horario disponible.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const data = await api<Turno>("/api/turnos", {
        method: "POST",
        body: {
          mascota_id: selectedPetId,
          servicio_id: selectedServiceId,
          fecha: selectedDate,
          hora: selectedTime,
          notas,
          sintomas_observados: sintomasObservados,
          tiene_estudios_previos: tieneEstudiosPrevios,
        },
      });
      setConfirmedTurno(data);
    } catch (e: any) {
      setError(e.message || "Error al reservar turno");
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar render helpers
  const [yearStr, monthStr] = currentMonth.split("-");
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const monthNamesEs = [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const handlePrevMonth = () => {
    const d = new Date(yearNum, monthNum - 2, 1);
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleNextMonth = () => {
    const d = new Date(yearNum, monthNum, 1);
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const todayStr = hoyLocal();

  if (confirmedTurno) {
    return (
      <div className="wizard-page">
        <div style={{ maxWidth: "560px", margin: "60px auto", textAlign: "center" }}>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-600 shadow-lg">
              <CheckCircle2 size={36} />
            </div>
          </div>
          <h1 style={{ margin: "18px 0 12px" }}>¡Turno confirmado!</h1>
          <p style={{ color: "var(--texto-muted)", marginBottom: "20px" }}>
            Reservamos el turno de{" "}
            <strong>{confirmedTurno.servicio_nombre}</strong> para{" "}
            <strong>{confirmedTurno.mascota_nombre}</strong> el{" "}
            {formatFecha(confirmedTurno.fecha)} a las {confirmedTurno.hora} hs.
            {confirmedTurno.email_enviado && " Te enviamos la confirmación por email."}
          </p>

          {confirmedTurno.es_especializado && (
            <div className="mb-6 p-4 rounded-2xl bg-brand-50 border border-brand-200 text-left text-xs text-brand-900">
              <div className="flex items-center gap-2 font-bold text-brand-950 mb-1.5">
                <Sparkles size={16} className="text-amber-500" />
                <span>Estudio Especializado & Protocolo de Derivación Activo</span>
              </div>
              <p className="m-0 leading-relaxed text-brand-800">
                Tu cita médica ha sido registrada como estudio de alta complejidad. El veterinario evaluará a {confirmedTurno.mascota_nombre} en sede y, de ser necesario por equipamiento o saturación de agenda, emitirá una <strong>Orden Oficial de Derivación</strong> con recomendación prioritaria a la sede de <strong>Centro Tortuguitas</strong>.
              </p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate(user?.rol === "veterinario" ? "/admin/turnos" : "/perfil")}
              className="btn btn-primary"
            >
              {user?.rol === "veterinario" ? "Ver Agenda de Turnos" : "Ver Mis Turnos"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="btn btn-outline"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-page">
      {/* Wizard Steps Nav Header */}
      <div className="wizard-steps">
        <div
          className={`wizard-step ${
            step >= 1 ? (step > 1 ? "done" : "active") : ""
          }`}
        >
          <div className="step-circle">{step > 1 ? "✓" : "1"}</div>
          <span className="label">Mascota y Servicio</span>
        </div>
        <div className={`wizard-line ${step > 1 ? "done" : ""}`}></div>
        <div
          className={`wizard-step ${
            step >= 2 ? (step > 2 ? "done" : "active") : ""
          }`}
        >
          <div className="step-circle">{step > 2 ? "✓" : "2"}</div>
          <span className="label">Fecha y Hora</span>
        </div>
        <div className={`wizard-line ${step > 2 ? "done" : ""}`}></div>
        <div className={`wizard-step ${step >= 3 ? "active" : ""}`}>
          <div className="step-circle">3</div>
          <span className="label">Revisión</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: "1100px", margin: "0 auto 20px" }}>
          {error}
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h1 className="wizard-title">Mascota y Servicio</h1>
          <p className="wizard-sub">
            Seleccioná para quién es la consulta y la atención requerida.
          </p>

          <form onSubmit={handleStep1Submit}>
            <div className="wizard-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="wizard-panel">
                <h3 className="mb-4">Mascota</h3>
                {pets.length === 0 ? (
                  <div className="empty-state">
                    {user?.rol === "veterinario"
                      ? "Todavía no hay pacientes registrados."
                      : "Todavía no tenés mascotas registradas."}
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => navigate("/mascota-nueva")}
                        className="btn btn-primary btn-sm"
                      >
                        + Agregar Mascota
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="pet-select-grid">
                      {pets.map((m) => (
                        <div
                          key={m.id}
                          className={`option-card ${
                            selectedPetId === m.id ? "selected" : ""
                          }`}
                          onClick={() => setSelectedPetId(m.id)}
                        >
                          <img
                            src={
                              m.foto ||
                              "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80"
                            }
                            alt={m.nombre}
                          />
                          <div>
                            <strong>{m.nombre}</strong>
                            <small>
                              {m.especie} · {m.raza || "Sin raza"}
                              {m.dueno ? ` · Dueño: ${m.dueno}` : ""}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/mascota-nueva")}
                      className="link-accent text-sm mt-3 inline-block bg-transparent border-none cursor-pointer"
                    >
                      + Agregar otra mascota
                    </button>
                  </div>
                )}

                <div className="mt-8 mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 m-0">Tipo de Atención y Servicio</h3>
                      <p className="text-xs text-slate-500 m-0">
                        Seleccioná entre consultas generales de rutina o estudios especializados de alta complejidad.
                      </p>
                    </div>

                    {/* Segmented control / Tabs */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                      {([
                        ["general", "Consultas generales"],
                        ["especializado", "Estudios especializados"],
                      ] as const).map(([valor, etiqueta]) => (
                        <button
                          key={valor}
                          type="button"
                          onClick={() => handleCategoryTabChange(valor)}
                          className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                            selectedCategory === valor
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner explicativo para la sección especializada */}
                  {selectedCategory === "especializado" && (
                    <div className="mb-4 p-3.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Activity size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-brand-950 m-0">
                          Estudios especializados e interconsultas
                        </p>
                        <p className="text-brand-800 leading-relaxed m-0">
                          Al solicitar un turno para <strong>Cardiografía, Ecocardiograma Doppler o Radiología de Alta Frecuencia</strong>, tu veterinario de VetAnimal evaluará a tu mascota. Si la sede se encuentra saturada o se requiere aparatología específica, se emitirá una <strong>Orden Oficial de Derivación prioritaria</strong> al <em>Centro Veterinario & Diagnóstico Tortuguitas (Cura Brochero 1420)</em> sin demoras.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Grid de servicios filtrados */}
                  <div className="service-select-grid">
                    {services
                      .filter((s) =>
                        selectedCategory === "especializado"
                          ? (s.categoria === "especializado" || s.id >= 5)
                          : (s.categoria !== "especializado" && s.id < 5)
                      )
                      .map((s) => (
                        <div
                          key={s.id}
                          className={`option-card relative ${
                            selectedServiceId === s.id ? "selected" : ""
                          }`}
                          onClick={() => setSelectedServiceId(s.id)}
                        >
                          <div className="icon-badge">
                            {renderServiceIcon(s.icono)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <strong>{s.nombre}</strong>
                              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                                {formatPrecio(s.precio)}
                              </span>
                            </div>
                            <small>{s.descripcion}</small>
                            {s.categoria === "especializado" && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
                                <FileCheck size={12} className="text-amber-600" />
                                <span>Apto para emisión de Orden de Derivación</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Campos específicos si es turno especializado */}
                  {selectedCategory === "especializado" && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-brand-600" />
                        Detalles para el Especialista Veterinario (Opcional)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-slate-700 block mb-1">
                            Síntomas observados o sospecha médica:
                          </label>
                          <input
                            type="text"
                            value={sintomasObservados}
                            onChange={(e) => setSintomasObservados(e.target.value)}
                            placeholder="Ej. Tos nocturna, soplo detectado en consulta previa, cansancio"
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-brand-600 bg-white"
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 p-2.5 bg-white border border-slate-300 rounded-lg">
                            <input
                              type="checkbox"
                              checked={tieneEstudiosPrevios}
                              onChange={(e) => setTieneEstudiosPrevios(e.target.checked)}
                              className="rounded text-brand-600 focus:ring-brand-500"
                            />
                            <span>¿Cuenta con placas o estudios previos de otra clínica?</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="wizard-actions" style={{ justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedPetId || !selectedServiceId}
              >
                Continuar →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <h1 className="wizard-title">Fecha y Horario</h1>
          <p className="wizard-sub">
            Elegí día y hora para {selectedPet?.nombre}.
          </p>

          <form onSubmit={handleStep2Submit}>
            <div className="wizard-grid">
              <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", flex: 1 }}>
                <div className="calendar-panel" style={{ flex: 1, minWidth: "280px" }}>
                  <div className="cal-head">
                    <h3>
                      {monthNamesEs[monthNum]} {yearNum}
                    </h3>
                    <div className="cal-nav">
                      <button type="button" onClick={handlePrevMonth}>
                        ‹
                      </button>
                      <button type="button" onClick={handleNextMonth}>
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="cal-grid">
                    {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((d) => (
                      <div key={d} className="dow">
                        {d}
                      </div>
                    ))}

                    {/* Empty offset days */}
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="cal-day muted"></div>
                    ))}

                    {/* Month days */}
                    {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                      const dNum = i + 1;
                      const dateFormatted = `${yearNum}-${String(
                        monthNum
                      ).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
                      const isPast = dateFormatted < todayStr;
                      const isSelected = selectedDate === dateFormatted;
                      const isToday = dateFormatted === todayStr;
                      const hasTurnos = bookedDays.includes(dNum);

                      let dayClasses = "cal-day";
                      if (isPast) dayClasses += " muted";
                      if (isToday) dayClasses += " today";
                      if (isSelected) dayClasses += " selected";
                      if (hasTurnos) dayClasses += " has-turnos";

                      return (
                        <button
                          key={dNum}
                          type="button"
                          disabled={isPast}
                          className={dayClasses}
                          onClick={() => {
                            if (!isPast) {
                              setSelectedDate(dateFormatted);
                              setSelectedTime("");
                            }
                          }}
                        >
                          {dNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="times-panel" style={{ flex: 1, minWidth: "280px" }}>
                  <h3>Horarios Disponibles</h3>
                  {!selectedDate ? (
                    <p style={{ color: "var(--texto-muted)", marginTop: "14px" }}>
                      Seleccioná primero una fecha en el calendario.
                    </p>
                  ) : (
                    <div>
                      <p style={{ color: "var(--texto-muted)", marginTop: "6px" }}>
                        Fecha elegida: {formatFechaLarga(selectedDate)}
                      </p>
                      {loadingTimes ? (
                        <Cargando texto="Buscando horarios..." className="mt-2" />
                      ) : availableTimes.length === 0 ? (
                        <p style={{ color: "var(--texto-muted)", marginTop: "14px" }}>
                          No quedan horarios disponibles para ese día. Probá con otra fecha.
                        </p>
                      ) : (
                        <div className="times-grid">
                          {availableTimes.map((h) => (
                            <button
                              key={h}
                              type="button"
                              className={`time-slot ${selectedTime === h ? "selected" : ""}`}
                              onClick={() => setSelectedTime(h)}
                            >
                              {h} hs
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Card */}
              <div className="summary-card">
                <h3>Resumen del Turno</h3>
                <div className="summary-row">
                  <img
                    src={
                      selectedPet?.foto ||
                      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80"
                    }
                    alt="mascota"
                  />
                  <div>
                    <small>Paciente</small>
                    <strong>{selectedPet?.nombre}</strong>
                    <span className="detail">
                      {selectedPet?.especie} · {selectedPet?.raza}
                    </span>
                  </div>
                </div>
                <div className="summary-divider"></div>
                <div className="summary-row">
                  <div className="icon-badge"><Stethoscope size={18} /></div>
                  <div>
                    <small>Servicio</small>
                    <strong>{selectedService?.nombre}</strong>
                    <span className="detail">{selectedService?.descripcion}</span>
                  </div>
                </div>
                {selectedDate && (
                  <div className="summary-selected">
                    <small>Horario Seleccionado</small>
                    <strong>
                      {formatFecha(selectedDate)} {selectedTime ? `a las ${selectedTime} hs` : ""}
                    </strong>
                    {selectedTime && (
                      <div className="ok">✓ Selección Confirmada</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
              >
                ← Volver
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedDate || !selectedTime}
              >
                Continuar →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <h1 className="wizard-title">Revisá tu Turno</h1>
          <p className="wizard-sub">Confirmá los datos antes de reservar.</p>

          <form onSubmit={handleStep3Submit}>
            <div className="wizard-grid">
              <div className="wizard-panel">
                <div className="review-block">
                  <h4>Paciente</h4>
                  <div className="summary-row" style={{ marginBottom: 0 }}>
                    <img
                      src={
                        selectedPet?.foto ||
                        "https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&q=80"
                      }
                      alt="mascota"
                    />
                    <div>
                      <strong>{selectedPet?.nombre}</strong>
                      <span className="detail">
                        {selectedPet?.especie} · {selectedPet?.raza}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="review-block">
                  <h4>Servicio</h4>
                  <div className="flex items-start justify-between gap-2">
                    <p className="m-0">
                      <strong>{selectedService?.nombre}</strong> —{" "}
                      {selectedService?.descripcion}
                    </p>
                    {isSpecializedService && (
                      <span className="shrink-0 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                        Alta Complejidad
                      </span>
                    )}
                  </div>
                  {isSpecializedService && (
                    <div className="mt-2.5 p-3 rounded-xl bg-brand-50/80 border border-brand-200 text-xs space-y-1">
                      <p className="text-brand-900 font-semibold m-0 flex items-center gap-1.5">
                        <Activity size={14} className="text-brand-600" />
                        Estudio con protocolo de derivación interclínica a Centro Tortuguitas
                      </p>
                      {sintomasObservados && (
                        <p className="text-slate-700 m-0">
                          <strong>Síntomas ingresados:</strong> {sintomasObservados}
                        </p>
                      )}
                      {tieneEstudiosPrevios && (
                        <p className="text-emerald-700 font-medium m-0">
                          ✓ Se presentarán estudios/placas anteriores en la consulta.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="review-block">
                  <h4>Fecha y hora</h4>
                  <p>
                    <strong>{formatFechaLarga(selectedDate)}</strong> a las {selectedTime} hs
                  </p>
                </div>

                <div className="review-block">
                  <h4>Notas para el equipo (opcional)</h4>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="wizard-notes"
                    placeholder="Contanos si hay algo importante que debamos saber..."
                  ></textarea>
                </div>
              </div>

              <div className="summary-card">
                <h3>Resumen del Turno</h3>
                <div className="summary-row">
                  <div className="icon-badge">
                    <LogoIcon size={18} />
                  </div>
                  <div>
                    <small>Paciente</small>
                    <strong>{selectedPet?.nombre}</strong>
                  </div>
                </div>
                <div className="summary-row">
                  <div className="icon-badge">
                    <Stethoscope size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <small>Servicio</small>
                    <strong>{selectedService?.nombre}</strong>
                  </div>
                </div>
                <div className="summary-selected">
                  <small>Turno</small>
                  <strong>
                    {formatFecha(selectedDate)} · {selectedTime} hs
                  </strong>
                </div>
              </div>
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn btn-outline"
              >
                ← Volver
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                {submitting ? "Confirmando..." : "Confirmar Turno ✓"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
