// Notificaciones push en este navegador: registra el service worker (public/sw.js),
// pide permiso, se suscribe con la clave pública del servidor y guarda la suscripción
// en la cuenta del usuario. Las usa la pantalla de veterinarias móviles.
import { api } from "./api";

export type EstadoPush = "no-soportado" | "sin-clave" | "bloqueado" | "inactivo" | "activo";

export const pushSoportado = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window &&
  window.isSecureContext;

function base64UrlABytes(base64Url: string) {
  const relleno = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(base64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registroSW() {
  return navigator.serviceWorker.register("/sw.js");
}

// Qué pasa en este navegador: si no soporta, si el servidor no tiene claves, si el
// usuario bloqueó las notificaciones, o si ya está suscripto.
export async function estadoPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return "no-soportado";
  const { publicKey } = await api<{ publicKey: string | null }>("/api/push/clave").catch(() => ({ publicKey: null }));
  if (!publicKey) return "sin-clave";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "activo" : "inactivo";
}

export async function activarPush(): Promise<EstadoPush> {
  if (!pushSoportado()) return "no-soportado";
  const { publicKey } = await api<{ publicKey: string | null }>("/api/push/clave");
  if (!publicKey) return "sin-clave";

  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return permiso === "denied" ? "bloqueado" : "inactivo";

  const reg = await registroSW();
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(publicKey),
    }));
  await api("/api/push/suscribir", { method: "POST", body: { subscription: sub.toJSON() } });
  return "activo";
}

export async function desactivarPush(): Promise<EstadoPush> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api("/api/push/suscribir", { method: "DELETE", body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  }
  return "inactivo";
}
