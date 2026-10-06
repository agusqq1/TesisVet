// Sesiones y permisos. Al iniciar sesión se genera un token aleatorio que viaja en
// una cookie httpOnly (el JavaScript de la página no puede leerla) y se valida
// contra la tabla `sesiones` en cada pedido a la API.

import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { execute, queryOne } from "../db/pool.js";

const COOKIE = "vet_session";
const DIAS_SESION = 7;

export interface SessionUser {
  id: number;
  nombre: string;
  email: string;
  rol: "cliente" | "veterinario";
  telefono: string;
  especialidad: string | null;
  matricula: string | null;
  foto?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const nuevoToken = () => crypto.randomBytes(32).toString("hex");

export const mapUser = (u: any): SessionUser => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  telefono: u.telefono,
  especialidad: u.especialidad,
  matricula: u.matricula,
  foto: u.foto ?? undefined,
});

function leerCookie(req: Request): string | null {
  for (const parte of (req.headers.cookie || "").split(";")) {
    const [nombre, ...valor] = parte.trim().split("=");
    if (nombre === COOKIE) return valor.join("=") || null;
  }
  return null;
}

function opcionesCookie(req: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Con HTTPS (producción) la cookie solo viaja cifrada
    secure: req.secure,
    path: "/",
  };
}

export async function crearSesion(req: Request, res: Response, usuarioId: number) {
  const token = nuevoToken();
  await execute(
    "INSERT INTO sesiones (token_hash, usuario_id, expira_en) VALUES (?, ?, NOW() + make_interval(days => ?::int))",
    [hashToken(token), usuarioId, DIAS_SESION]
  );
  // De paso se limpian las sesiones vencidas
  await execute("DELETE FROM sesiones WHERE expira_en < NOW()");
  res.cookie(COOKIE, token, {
    ...opcionesCookie(req),
    maxAge: DIAS_SESION * 24 * 60 * 60 * 1000,
  });
}

export async function cerrarSesion(req: Request, res: Response) {
  const token = leerCookie(req);
  if (token) {
    await execute("DELETE FROM sesiones WHERE token_hash = ?", [hashToken(token)]);
  }
  res.clearCookie(COOKIE, opcionesCookie(req));
}

// Middleware: si el pedido trae una sesión válida, deja al usuario en req.user
export function cargarUsuario(req: Request, res: Response, next: NextFunction) {
  const token = leerCookie(req);
  if (!token) return next();

  queryOne(
    `SELECT u.* FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_en > NOW()`,
    [hashToken(token)]
  )
    .then((usuario) => {
      if (usuario) req.user = mapUser(usuario);
      next();
    })
    .catch(next);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Iniciá sesión para continuar." });
  }
  next();
}

export function requireVet(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Iniciá sesión para continuar." });
  }
  if (req.user.rol !== "veterinario") {
    return res.status(403).json({ error: "Esta acción es solo para el personal de la clínica." });
  }
  next();
}

// Límite de pedidos por IP en una ventana de tiempo. Frena los intentos de adivinar
// contraseñas y el abuso del chat con IA. Vive en memoria: alcanza para un solo servidor.
export function limitar(opciones: { ventanaMs: number; max: number; mensaje: string }) {
  const registros = new Map<string, { cantidad: number; vence: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ahora = Date.now();
    if (registros.size > 5000) {
      for (const [clave, r] of registros) if (r.vence <= ahora) registros.delete(clave);
    }

    const clave = req.ip || "desconocida";
    const registro = registros.get(clave);
    if (!registro || registro.vence <= ahora) {
      registros.set(clave, { cantidad: 1, vence: ahora + opciones.ventanaMs });
      return next();
    }
    if (registro.cantidad >= opciones.max) {
      return res.status(429).json({ error: opciones.mensaje });
    }
    registro.cantidad++;
    next();
  };
}
