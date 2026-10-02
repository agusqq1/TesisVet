const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Fecha de hoy en la clínica, "YYYY-MM-DD". No usar toISOString(): devuelve la fecha
// en UTC y a partir de las 21:00 de Argentina ya marca el día siguiente.
export const hoyLocal = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const formatPrecio = (monto: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);

// "2026-08-15" o "2026-08-15 10:30:00" → "15/08/2026"
export const formatFecha = (fecha?: string | null) => {
  if (!fecha) return "";
  const [anio, mes, dia] = fecha.substring(0, 10).split("-");
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha;
};

// "2026-08-15" → "sábado 15 de agosto de 2026"
export const formatFechaLarga = (fecha: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fecha.substring(0, 10)}T12:00:00Z`));
