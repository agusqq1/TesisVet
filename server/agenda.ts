// Agenda de turnos: calcula qué horarios se pueden reservar según las franjas de
// atención de cada veterinario (tabla horarios_veterinario), la duración del
// servicio y los turnos que ya tiene tomados.

export const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// Cada cuántos minutos se ofrece un horario de inicio
const PASO_MIN = 30;

// Fecha de hoy en la clínica, "YYYY-MM-DD", sin depender de la zona horaria del servidor
export const hoyLocal = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Hora actual en la clínica, "HH:MM"
export const horaLocal = () =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

export const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().substring(0, 10);
};

const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

type Consulta = (sql: string, params?: any[]) => Promise<any[]>;

export interface HorarioDisponible {
  hora: string;
  // Veterinarios libres en ese horario, primero el que menos turnos tiene ese día
  veterinarios: number[];
}

export async function horariosDisponibles(
  consulta: Consulta,
  fecha: string,
  duracionMin: number
): Promise<HorarioDisponible[]> {
  const hoy = hoyLocal();
  if (fecha < hoy) return [];
  const minimoHoy = fecha === hoy ? aMinutos(horaLocal()) : -1;

  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const [franjas, turnos] = await Promise.all([
    consulta(
      `SELECT h.veterinario_id,
              to_char(h.hora_inicio, 'HH24:MI') AS inicio,
              to_char(h.hora_fin, 'HH24:MI') AS fin
       FROM horarios_veterinario h
       JOIN usuarios u ON u.id = h.veterinario_id AND u.rol = 'veterinario'
       WHERE h.dia_semana = ?`,
      [diaSemana]
    ),
    consulta(
      `SELECT veterinario_id, to_char(hora, 'HH24:MI') AS hora, duracion_min
       FROM turnos
       WHERE fecha = ? AND estado <> 'cancelado' AND veterinario_id IS NOT NULL`,
      [fecha]
    ),
  ]);

  const ocupados = new Map<number, Array<[number, number]>>();
  for (const t of turnos) {
    const inicio = aMinutos(t.hora);
    const lista = ocupados.get(t.veterinario_id) ?? [];
    lista.push([inicio, inicio + t.duracion_min]);
    ocupados.set(t.veterinario_id, lista);
  }

  const libres = new Map<number, Set<number>>();
  for (const franja of franjas) {
    const fin = aMinutos(franja.fin);
    const tomados = ocupados.get(franja.veterinario_id) ?? [];
    for (let inicio = aMinutos(franja.inicio); inicio + duracionMin <= fin; inicio += PASO_MIN) {
      if (inicio <= minimoHoy) continue;
      const seSolapa = tomados.some(([desde, hasta]) => inicio < hasta && desde < inicio + duracionMin);
      if (seSolapa) continue;
      const vets = libres.get(inicio) ?? new Set<number>();
      vets.add(franja.veterinario_id);
      libres.set(inicio, vets);
    }
  }

  const carga = (vetId: number) => ocupados.get(vetId)?.length ?? 0;
  return [...libres.entries()]
    .sort(([a], [b]) => a - b)
    .map(([inicio, vets]) => ({
      hora: aHora(inicio),
      veterinarios: [...vets].sort((a, b) => carga(a) - carga(b) || a - b),
    }));
}
