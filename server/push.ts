// Notificaciones push a los navegadores que las aceptaron (estándar Web Push, librería
// web-push). Hace falta un par de claves VAPID en .env (VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY, generadas con `npx web-push generate-vapid-keys`). Sin ellas, las
// funciones no hacen nada y la app sigue avisando por email.
import webpush from "web-push";
import { execute, query } from "../db/pool.js";

const PUBLICA = (process.env.VAPID_PUBLIC_KEY || "").trim();
const PRIVADA = (process.env.VAPID_PRIVATE_KEY || "").trim();
const SUJETO = (process.env.VAPID_SUBJECT || "mailto:veterinariavet101@gmail.com").trim();

export const pushConfigurado = () => Boolean(PUBLICA && PRIVADA);
export const clavePublicaPush = () => (pushConfigurado() ? PUBLICA : null);

if (pushConfigurado()) {
  webpush.setVapidDetails(SUJETO, PUBLICA, PRIVADA);
}

export const estadoPush = () =>
  pushConfigurado()
    ? "[PUSH] Notificaciones push activadas"
    : "[PUSH] Sin claves VAPID en .env: las notificaciones push están desactivadas (los avisos salen solo por email)";

export interface Suscripcion {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface MensajePush {
  titulo: string;
  cuerpo: string;
  url?: string;
  etiqueta?: string;
}

export const esSuscripcionValida = (s: unknown): s is Suscripcion =>
  typeof s === "object" &&
  s !== null &&
  typeof (s as any).endpoint === "string" &&
  /^https:\/\//.test((s as any).endpoint) &&
  typeof (s as any).keys?.p256dh === "string" &&
  typeof (s as any).keys?.auth === "string";

// Envía a una suscripción. Si el navegador la dio de baja (404/410), la borra de la base.
async function enviarA(fila: { id: number; endpoint: string; p256dh: string; auth: string }, mensaje: MensajePush) {
  try {
    await webpush.sendNotification(
      { endpoint: fila.endpoint, keys: { p256dh: fila.p256dh, auth: fila.auth } },
      JSON.stringify(mensaje),
      { TTL: 60 * 60 * 24 }
    );
    return true;
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await execute("DELETE FROM suscripciones_push WHERE id = ?", [fila.id]).catch(() => {});
    } else {
      console.warn(`[PUSH] No se pudo enviar a un dispositivo: ${err?.statusCode || ""} ${err?.message || err}`);
    }
    return false;
  }
}

// Notifica a todos los dispositivos de los usuarios anotados en esas localidades.
// Devuelve a cuántos dispositivos llegó.
export async function avisarPushPorLocalidades(localidades: string[], mensaje: MensajePush): Promise<number> {
  if (!pushConfigurado() || localidades.length === 0) return 0;
  const filas = await query(
    `SELECT DISTINCT p.id, p.endpoint, p.p256dh, p.auth
     FROM suscripciones_push p
     JOIN avisos_operativos a ON a.usuario_id = p.usuario_id
     WHERE a.localidad IN (?)`,
    [localidades]
  );
  let enviados = 0;
  for (const fila of filas) {
    if (await enviarA(fila, mensaje)) enviados++;
  }
  return enviados;
}

// Notifica a todos los dispositivos de un usuario (por ejemplo, para probar que anda)
export async function avisarPushUsuario(usuarioId: number, mensaje: MensajePush): Promise<number> {
  if (!pushConfigurado()) return 0;
  const filas = await query(
    "SELECT id, endpoint, p256dh, auth FROM suscripciones_push WHERE usuario_id = ?",
    [usuarioId]
  );
  let enviados = 0;
  for (const fila of filas) {
    if (await enviarA(fila, mensaje)) enviados++;
  }
  return enviados;
}
