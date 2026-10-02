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
