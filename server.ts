import "dotenv/config";
import dotenv from "dotenv";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import QRCode from "qrcode";
import type { ResultSetHeader } from "./db/pool.js";
import { GoogleGenAI } from "@google/genai";
import { dbConfig, execute, query, queryOne, transaction } from "./db/pool.js";
import { guardarImagen, UPLOADS_DIR } from "./db/imagenes.js";
import { prepararBaseDeDatos } from "./db/init.js";
import {
  cargarUsuario,
  cerrarSesion,
  crearSesion,
  hashToken,
  limitar,
  mapUser,
  nuevoToken,
  requireAuth,
  requireVet,
} from "./server/auth.js";
import { horariosDisponibles, hoyLocal, sumarDias } from "./server/agenda.js";
import {
  CLINICA,
  emailConfigurado,
  emailAltaProfesional,
  emailBienvenida,
  emailDerivacion,
  emailMascotaEncontrada,
  emailOperativo,
  emailPedido,
  emailRecuperacion,
  emailTurno,
  enviarEmail,
} from "./server/email.js";
import { ZONAS } from "./src/zonas.js";
import { CUOTAS, MARCAS_TARJETA } from "./src/tarjetas.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Detrás de un proxy con HTTPS (hosting), req.secure y req.ip reflejan al cliente real
app.set("trust proxy", 1);

// Las fotos y radiografías llegan en base64 dentro del JSON (imágenes de hasta 15 MB)
app.use(express.json({ limit: "25mb" }));

// Las imágenes subidas se guardan como archivos en /uploads (ver db/imagenes.ts)
app.use("/uploads", express.static(UPLOADS_DIR));

// Crea las tablas que falten y carga los datos iniciales si la base está vacía.
// Se ejecuta una sola vez por proceso; si falla, se reintenta en el próximo pedido.
let baseLista: Promise<void> | null = null;
function asegurarBase() {
  baseLista ??= prepararBaseDeDatos().catch((err) => {
    baseLista = null;
    throw err;
  });
  return baseLista;
}

app.use("/api", (req, res, next) => {
  asegurarBase().then(() => next(), (err) => {
    console.error("[DB] No se pudo preparar la base:", err.code || err.message);
    res.status(503).json({ error: "La base de datos no está disponible. Intentá de nuevo en unos segundos." });
  });
});

// Identifica al usuario de cada pedido a partir de su cookie de sesión
app.use("/api", cargarUsuario);

// ==========================================
// HELPERS
// ==========================================
// Las tablas están definidas en db/schema.sql y se crean solas al arrancar (db/init.ts).

// Express 4 no captura los errores de los handlers async: wrap los deriva al
// manejador de errores definido al final de las rutas.
type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

const httpError = (status: number, message: string) =>
  Object.assign(new Error(message), { status });

const isDup = (err: any) => err?.code === "23505";

const esVet = (req: Request) => req.user!.rol === "veterinario";

const toId = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const toNumOrNull = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const numero = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw httpError(400, "Alguno de los valores numéricos no es válido.");
  }
  return n;
};

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

const esFecha = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const ms = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().substring(0, 10) === v;
};

const esHora = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

const esEmail = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const PASSWORD_MIN = 8;

// Dirección pública del sitio, para los enlaces de los emails y de las chapas QR.
// Se usa APP_URL si apunta a un dominio real. Si quedó en localhost (el valor de
// desarrollo) y el pedido llega desde otro host, se ignora: si no, los QR y los emails
// generados en Vercel apuntarían a la PC de quien lo configuró.
const esLocal = (valor: string) => /localhost|127\.0\.0\.1/.test(valor);
const urlBase = (req: Request) => {
  const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
  const host = req.get("host") || "";
  if (/^https?:\/\//.test(appUrl) && (!esLocal(appUrl) || esLocal(host))) return appUrl;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && !esLocal(host)) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return `${req.protocol}://${host}`;
};

// Enlace para elegir una contraseña
const enlaceClave = (req: Request, token: string) =>
  `${urlBase(req)}/reset-password?token=${token}`;

const PET_SELECT = `
  SELECT m.id, m.usuario_id, m.nombre, m.especie, m.raza, m.edad, m.peso, m.foto,
         m.estado_salud, m.alergias, m.condiciones_cronicas, m.creado_en,
         m.codigo_qr, m.qr_publico, m.qr_mensaje, m.qr_mostrar_telefono,
         u.nombre AS dueno, u.telefono
  FROM mascotas m
  LEFT JOIN usuarios u ON u.id = m.usuario_id`;

function mapPet(row: any, withOwner = true) {
  const { dueno, telefono, edad, peso, ...pet } = row;
  return {
    ...pet,
    ...(edad !== null && { edad }),
    ...(peso !== null && { peso }),
    ...(withOwner && { dueno: dueno ?? "Desconocido", telefono: telefono ?? "" }),
  };
}

// Devuelve la mascota solo si existe y el usuario puede verla: su dueño o el personal de la clínica
async function mascotaAccesible(req: Request, id: unknown) {
  const pet = await queryOne(
    "SELECT id, usuario_id, nombre, especie, raza, edad, peso FROM mascotas WHERE id = ? AND activo",
    [toId(id)]
  );
  if (!pet) return null;
  if (!esVet(req) && pet.usuario_id !== req.user!.id) return null;
  return pet;
}

const TURNO_SELECT = `
  SELECT t.id, t.mascota_id, t.servicio_id, t.veterinario_id, t.fecha,
         to_char(t.hora, 'HH24:MI') AS hora, t.duracion_min, t.estado, t.notas, t.creado_en,
         t.es_especializado, t.especialidad, t.estudio_solicitado, t.sintomas_observados,
         t.tiene_estudios_previos, t.derivacion_id, d.codigo AS derivacion_codigo,
         m.nombre AS mascota_nombre, s.nombre AS servicio_nombre,
         v.nombre AS veterinario_nombre, u.nombre AS dueno, u.email AS dueno_email
  FROM turnos t
  JOIN mascotas m ON m.id = t.mascota_id
  JOIN servicios s ON s.id = t.servicio_id
  LEFT JOIN usuarios v ON v.id = t.veterinario_id
  LEFT JOIN usuarios u ON u.id = m.usuario_id
  LEFT JOIN derivaciones d ON d.id = t.derivacion_id`;

function mapTurno(row: any) {
  const { derivacion_id, derivacion_codigo, ...turno } = row;
  const es_especializado = Boolean(row.es_especializado);
  return {
    ...turno,
    notas: row.notas ?? "",
    es_especializado,
    categoria_servicio: es_especializado ? "especializado" : "general",
    tiene_estudios_previos: Boolean(row.tiene_estudios_previos),
    derivado: derivacion_id !== null,
    ...(derivacion_id !== null && { derivacion_id, derivacion_codigo }),
    veterinario_nombre: row.veterinario_nombre ?? "Asignado en clínica",
    dueno: row.dueno ?? "Cliente",
    dueno_email: row.dueno_email ?? "",
  };
}

// mysql2 ya devuelve las columnas JSON como objetos; el parseo cubre motores que las entregan como texto.
const parseJson = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);

function mapCentro(row: any) {
  const { orden, ...centro } = row;
  return {
    ...centro,
    especialidades: parseJson(row.especialidades),
    equipamiento: parseJson(row.equipamiento),
    acepta_urgencias: Boolean(row.acepta_urgencias),
  };
}

const getCentros = async () =>
  (await query("SELECT * FROM centros_derivacion ORDER BY orden, nombre")).map(mapCentro);

const DERIVACION_SELECT = `
  SELECT d.*, m.nombre AS mascota_nombre, m.especie, m.raza, m.usuario_id AS dueno_id,
         u.nombre AS dueno_nombre, u.telefono AS dueno_telefono, u.email AS dueno_email,
         v.nombre AS veterinario_emisor_nombre, v.matricula AS veterinario_matricula
  FROM derivaciones d
  JOIN mascotas m ON m.id = d.mascota_id
  LEFT JOIN usuarios u ON u.id = m.usuario_id
  JOIN usuarios v ON v.id = d.veterinario_emisor_id`;

async function fetchDerivaciones(where: string, params: any[] = []) {
  const [rows, centros] = await Promise.all([
    query(`${DERIVACION_SELECT} ${where} ORDER BY d.creado_en DESC, d.id DESC`, params),
    getCentros(),
  ]);
  const centrosPorId = new Map(centros.map((c) => [c.id, c]));
  return rows.map(({ centro_destino_id, ...d }) => ({
    ...d,
    dueno_nombre: d.dueno_nombre ?? "Cliente",
    dueno_telefono: d.dueno_telefono ?? "",
    dueno_email: d.dueno_email ?? "",
    veterinario_matricula: d.veterinario_matricula ?? "",
    clinica_origen: CLINICA.sede,
    centro_destino: centrosPorId.get(centro_destino_id),
  }));
}

// Devuelve la orden (por id o por código) solo si el usuario puede verla
async function derivacionAccesible(req: Request, idOrCode: string) {
  const [orden] = await fetchDerivaciones("WHERE d.id = ? OR d.codigo = ?", [toId(idOrCode), idOrCode]);
  if (!orden) return null;
  if (!esVet(req) && orden.dueno_id !== req.user!.id) return null;
  return orden;
}

const mapProduct = (p: any) => ({ ...p, requiere_receta: Boolean(p.requiere_receta) });

async function fetchPedidos(where: string, params: any[] = []) {
  const pedidos = await query(
    `SELECT p.id, CONCAT('VET-', p.id) AS order_code, p.usuario_id,
            u.nombre AS cliente_nombre, u.email AS cliente_email,
            p.total, p.estado, p.entrega, p.direccion_envio, p.telefono_contacto, p.creado_en,
            g.referencia AS pago_referencia, g.tarjeta_marca, g.tarjeta_ultimos4, g.cuotas AS pago_cuotas
     FROM pedidos p
     JOIN usuarios u ON u.id = p.usuario_id
     LEFT JOIN pagos g ON g.pedido_id = p.id
     ${where}
     ORDER BY p.id DESC`,
    params
  );
  if (pedidos.length === 0) return [];
  const items = (
    await query("SELECT * FROM pedido_items WHERE pedido_id IN (?) ORDER BY id", [
      pedidos.map((p) => p.id),
    ])
  ).map((it) => ({ ...it, requiere_receta: Boolean(it.requiere_receta) }));
  return pedidos.map(({ pago_referencia, tarjeta_marca, tarjeta_ultimos4, pago_cuotas, ...p }) => ({
    ...p,
    // Solo los pedidos pagados online tienen un pago registrado
    pago: pago_referencia
      ? { referencia: pago_referencia, marca: tarjeta_marca, ultimos4: tarjeta_ultimos4, cuotas: pago_cuotas }
      : null,
    items: items.filter((it) => it.pedido_id === p.id),
  }));
}

// ==========================================
// API ROUTES
// ==========================================

// --- AUTH ---
const limiteLogin = limitar({
  ventanaMs: 15 * 60 * 1000,
  max: 20,
  mensaje: "Demasiados intentos. Esperá unos minutos y volvé a probar.",
});

const limiteCuentas = limitar({
  ventanaMs: 60 * 60 * 1000,
  max: 10,
  mensaje: "Demasiados pedidos seguidos. Probá de nuevo más tarde.",
});

app.post("/api/auth/login", limiteLogin, wrap(async (req, res) => {
  const { email, password } = req.body;
  const user =
    typeof email === "string"
      ? await queryOne("SELECT * FROM usuarios WHERE email = ?", [email])
      : null;
  const passwordOk =
    user && typeof password === "string" && (await bcrypt.compare(password, user.password_hash));
  if (!passwordOk) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  await crearSesion(req, res, user.id);
  res.json({ user: mapUser(user) });
}));

app.post("/api/auth/register", limiteCuentas, wrap(async (req, res) => {
  const { nombre, email, password, telefono } = req.body;
  if (![nombre, email, password].every((v) => typeof v === "string" && v.trim())) {
    return res
      .status(400)
      .json({ error: "Completá todos los campos obligatorios." });
  }
  if (!esEmail(email)) {
    return res.status(400).json({ error: "El email no es válido." });
  }
  if (password.length < PASSWORD_MIN) {
    return res
      .status(400)
      .json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` });
  }
  const emailEnUso = { error: "Ya existe una cuenta registrada con ese email." };
  if (await queryOne("SELECT id FROM usuarios WHERE email = ?", [email])) {
    return res.status(400).json(emailEnUso);
  }

  let userId: number;
  try {
    const result = await execute("INSERT INTO usuarios SET ?", [
      {
        nombre: nombre.trim(),
        email,
        password_hash: await bcrypt.hash(password, 10),
        rol: "cliente",
        telefono: str(telefono),
      },
    ]);
    userId = result.insertId;
  } catch (err) {
    if (isDup(err)) return res.status(400).json(emailEnUso);
    throw err;
  }

  const newUser = await queryOne("SELECT * FROM usuarios WHERE id = ?", [userId]);
  await crearSesion(req, res, userId);
  // Se espera el envío antes de responder: en Vercel la función se congela al
  // responder y un envío "en segundo plano" nunca llega a salir.
  await enviarEmail({ to: newUser.email, ...emailBienvenida(newUser.nombre) });
  res.json({ user: mapUser(newUser) });
}));

app.get("/api/auth/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "No hay una sesión iniciada." });
  res.json({ user: req.user });
});

// El usuario corrige sus propios datos de contacto (por ejemplo, el teléfono que
// aparece en la chapa QR de sus mascotas)
app.put("/api/auth/me", requireAuth, wrap(async (req, res) => {
  const campos: Record<string, any> = {};
  if (req.body.telefono !== undefined) campos.telefono = str(req.body.telefono).trim().slice(0, 40);
  if (req.body.nombre !== undefined) {
    const nombre = str(req.body.nombre).trim().slice(0, 120);
    if (nombre.length < 2) return res.status(400).json({ error: "Ingresá tu nombre." });
    campos.nombre = nombre;
  }
  if (Object.keys(campos).length > 0) {
    await execute("UPDATE usuarios SET ? WHERE id = ?", [campos, req.user!.id]);
  }
  const user = await queryOne("SELECT * FROM usuarios WHERE id = ?", [req.user!.id]);
  res.json({ user: mapUser(user) });
}));

app.post("/api/auth/logout", wrap(async (req, res) => {
  await cerrarSesion(req, res);
  res.json({ ok: true });
}));

app.post("/api/auth/forgot-password", limiteCuentas, wrap(async (req, res) => {
  const { email } = req.body;
  const user =
    typeof email === "string"
      ? await queryOne("SELECT id, nombre, email FROM usuarios WHERE email = ?", [email])
      : null;

  if (user) {
    const token = nuevoToken();
    await execute(
      "INSERT INTO recuperaciones_password (token_hash, usuario_id, expira_en) VALUES (?, ?, NOW() + INTERVAL '1 hour')",
      [hashToken(token), user.id]
    );
    const enlace = enlaceClave(req, token);

    const { delivered } = await enviarEmail({
      to: user.email,
      ...emailRecuperacion(user.nombre, enlace),
    });
    if (!delivered && process.env.NODE_ENV !== "production") {
      // Sin SMTP configurado, en desarrollo el enlace se muestra acá para poder probar
      console.log(`[RECUPERACIÓN] Enlace para ${user.email}: ${enlace}`);
    }
  }

  // La respuesta es la misma exista o no la cuenta, para no revelar qué emails están registrados
  res.json({
    message:
      "Si el correo existe en nuestro sistema, te enviamos un enlace de recuperación.",
  });
}));

app.post("/api/auth/reset-password", limiteCuentas, wrap(async (req, res) => {
  const { token, password } = req.body;
  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    return res
      .status(400)
      .json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` });
  }

  const pedido =
    typeof token === "string"
      ? await queryOne(
          "SELECT usuario_id FROM recuperaciones_password WHERE token_hash = ? AND NOT usado AND expira_en > NOW()",
          [hashToken(token)]
        )
      : null;
  if (!pedido) {
    return res
      .status(400)
      .json({ error: "El enlace no es válido o ya venció. Pedí uno nuevo." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await transaction(async (conn) => {
    await conn.query("UPDATE usuarios SET password_hash = ? WHERE id = ?", [passwordHash, pedido.usuario_id]);
    await conn.query("UPDATE recuperaciones_password SET usado = true WHERE usuario_id = ?", [pedido.usuario_id]);
    // Cierra las sesiones abiertas: quien tenía la clave anterior queda afuera
    await conn.query("DELETE FROM sesiones WHERE usuario_id = ?", [pedido.usuario_id]);
  });

  res.json({ message: "Tu contraseña fue actualizada. Ya podés iniciar sesión." });
}));

// --- USERS (solo personal de la clínica) ---
app.get("/api/users", requireVet, wrap(async (req, res) => {
  const rol = req.query.rol === "veterinario" ? "veterinario" : "cliente";
  res.json(
    await query(
      "SELECT id, nombre, email, telefono FROM usuarios WHERE rol = ? ORDER BY nombre",
      [rol]
    )
  );
}));

// Alta de un cliente desde el mostrador. La cuenta queda sin contraseña utilizable:
// el cliente la elige con "Olvidé mi contraseña" cuando quiera entrar a la web.
app.post("/api/users", requireVet, wrap(async (req, res) => {
  const { nombre, email, telefono } = req.body;
  if (typeof nombre !== "string" || !nombre.trim() || !esEmail(email)) {
    return res.status(400).json({ error: "Ingresá el nombre y un email válido del cliente." });
  }

  try {
    const result = await execute("INSERT INTO usuarios SET ?", [
      {
        nombre: nombre.trim(),
        email,
        password_hash: await bcrypt.hash(nuevoToken(), 10),
        rol: "cliente",
        telefono: str(telefono),
      },
    ]);
    res.status(201).json(
      await queryOne("SELECT id, nombre, email, telefono FROM usuarios WHERE id = ?", [result.insertId])
    );
  } catch (err) {
    if (isDup(err)) {
      return res.status(400).json({ error: "Ya existe una cuenta registrada con ese email." });
    }
    throw err;
  }
}));

// --- VETERINARIOS (equipo de la clínica) ---
async function fetchVeterinarios(where = "", params: any[] = []) {
  const vets = await query(
    `SELECT id, nombre, email, telefono, especialidad, matricula, foto
     FROM usuarios WHERE rol = 'veterinario' ${where} ORDER BY nombre`,
    params
  );
  if (vets.length === 0) return [];
  const horarios = await query(
    `SELECT veterinario_id, dia_semana,
            to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
            to_char(hora_fin, 'HH24:MI') AS hora_fin
     FROM horarios_veterinario WHERE veterinario_id IN (?)
     ORDER BY dia_semana, hora_inicio`,
    [vets.map((v) => v.id)]
  );
  return vets.map((v) => ({
    ...v,
    horarios: horarios
      .filter((h) => h.veterinario_id === v.id)
      .map(({ veterinario_id, ...h }) => h),
  }));
}

app.get("/api/veterinarios", requireVet, wrap(async (req, res) => {
  res.json(await fetchVeterinarios());
}));

// Alta de un profesional. Queda con acceso al panel y, si se le cargan días de
// atención, entra en la agenda de turnos online. Sin contraseña inicial recibe un
// email con un enlace para elegir la suya.
app.post("/api/veterinarios", requireVet, wrap(async (req, res) => {
  const { nombre, email, telefono, especialidad, matricula, password, dias, hora_inicio, hora_fin } = req.body;
  if (typeof nombre !== "string" || !nombre.trim() || !esEmail(email)) {
    return res.status(400).json({ error: "Ingresá el nombre y un email válido del profesional." });
  }
  if (!str(matricula).trim()) {
    return res.status(400).json({ error: "Ingresá la matrícula del profesional." });
  }

  const conPassword = typeof password === "string" && password !== "";
  if (conPassword && password.length < PASSWORD_MIN) {
    return res
      .status(400)
      .json({ error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` });
  }
  if (!conPassword && !emailConfigurado()) {
    return res.status(400).json({
      error: "El envío de emails no está configurado: cargá una contraseña inicial para el profesional.",
    });
  }

  const diasAtencion: unknown[] = Array.isArray(dias) ? [...new Set(dias)] : [];
  if (diasAtencion.some((d) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)) {
    return res.status(400).json({ error: "Alguno de los días de atención no es válido." });
  }
  if (diasAtencion.length > 0 && (!esHora(hora_inicio) || !esHora(hora_fin) || hora_inicio >= hora_fin)) {
    return res
      .status(400)
      .json({ error: "El horario de atención no es válido: la hora de fin tiene que ser posterior a la de inicio." });
  }

  const passwordHash = await bcrypt.hash(conPassword ? password : nuevoToken(), 10);
  let vetId: number;
  try {
    vetId = await transaction(async (conn) => {
      const [result] = await conn.query<ResultSetHeader>("INSERT INTO usuarios SET ?", [
        {
          nombre: nombre.trim(),
          email,
          password_hash: passwordHash,
          rol: "veterinario",
          telefono: str(telefono).trim(),
          especialidad: str(especialidad).trim() || null,
          matricula: str(matricula).trim(),
        },
      ]);
      for (const dia of diasAtencion) {
        await conn.query("INSERT INTO horarios_veterinario SET ?", [
          { veterinario_id: result.insertId, dia_semana: dia, hora_inicio, hora_fin },
        ]);
      }
      return result.insertId;
    });
  } catch (err) {
    if (isDup(err)) {
      return res.status(400).json({ error: "Ya existe una cuenta registrada con ese email." });
    }
    throw err;
  }

  let enlace: string | null = null;
  if (!conPassword) {
    const token = nuevoToken();
    await execute(
      "INSERT INTO recuperaciones_password (token_hash, usuario_id, expira_en) VALUES (?, ?, NOW() + INTERVAL '3 days')",
      [hashToken(token), vetId]
    );
    enlace = enlaceClave(req, token);
  }

  // El profesional ya quedó registrado: si el email falla, la respuesta lo informa
  const { delivered } = await enviarEmail({
    to: email,
    ...emailAltaProfesional(nombre.trim(), enlace),
  });
  if (enlace && !delivered && process.env.NODE_ENV !== "production") {
    console.log(`[ALTA PROFESIONAL] Enlace para ${email}: ${enlace}`);
  }

  const [vet] = await fetchVeterinarios("AND id = ?", [vetId]);
  res.status(201).json({ ...vet, email_enviado: delivered, invitado: !conPassword });
}));

// --- PETS ---
app.get("/api/pets", requireAuth, wrap(async (req, res) => {
  // Un cliente solo ve sus mascotas, pida lo que pida
  if (!esVet(req)) {
    const rows = await query(
      `${PET_SELECT} WHERE m.activo AND m.usuario_id = ? ORDER BY m.id`,
      [req.user!.id]
    );
    return res.json(rows.map((r) => mapPet(r, false)));
  }

  const userId = toId(req.query.userId);
  if (userId && req.query.all !== "true") {
    const rows = await query(
      `${PET_SELECT} WHERE m.activo AND m.usuario_id = ? ORDER BY m.id`,
      [userId]
    );
    return res.json(rows.map((r) => mapPet(r)));
  }

  const rows = await query(`${PET_SELECT} WHERE m.activo ORDER BY m.id`);
  res.json(rows.map((r) => mapPet(r)));
}));

app.get("/api/pets/:id", requireAuth, wrap(async (req, res) => {
  const accesible = await mascotaAccesible(req, req.params.id);
  if (!accesible) return res.status(404).json({ error: "Mascota no encontrada" });
  res.json(mapPet(await queryOne(`${PET_SELECT} WHERE m.id = ?`, [accesible.id])));
}));

app.post("/api/pets", requireAuth, wrap(async (req, res) => {
  const { usuario_id, nombre, especie, raza, edad, peso, foto } = req.body;
  if (!nombre || !especie) {
    return res
      .status(400)
      .json({ error: "El nombre y la especie son obligatorios." });
  }

  // El cliente registra mascotas a su nombre; el personal elige a qué cliente pertenece
  const ownerId = esVet(req) ? toId(usuario_id) : req.user!.id;
  const owner = await queryOne("SELECT id FROM usuarios WHERE id = ? AND rol = 'cliente'", [ownerId]);
  if (!owner) {
    return res.status(400).json({ error: "Elegí el cliente dueño de la mascota." });
  }

  let defaultFoto = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&q=80";
  if (especie === "Gato") {
    defaultFoto = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&q=80";
  } else if (especie === "Ave") {
    defaultFoto = "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=500&q=80";
  } else if (especie === "Exótico") {
    defaultFoto = "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500&q=80";
  }

  const newPet = {
    usuario_id: owner.id,
    nombre: str(nombre),
    especie: str(especie),
    raza: str(raza),
    edad: toNumOrNull(edad),
    peso: toNumOrNull(peso),
    foto: guardarImagen(foto) || defaultFoto,
    estado_salud: "Estable",
    alergias: "",
    condiciones_cronicas: "",
  };

  const petId = await transaction(async (conn) => {
    const [result] = await conn.query<ResultSetHeader>("INSERT INTO mascotas SET ?", [newPet]);

    // Primer asiento de la historia clínica: registra el alta, sin afirmar nada sobre su salud
    await conn.query("INSERT INTO consultas SET ?", [
      {
        mascota_id: result.insertId,
        veterinario_id: esVet(req) ? req.user!.id : null,
        fecha: hoyLocal(),
        tipo: "CONTROL",
        titulo: `Alta de paciente: ${newPet.nombre}`,
        descripcion: `Apertura de la historia clínica. Datos declarados al registrar: especie ${newPet.especie}, raza ${newPet.raza || "sin especificar"}, peso ${newPet.peso ? newPet.peso + " kg" : "a registrar"}.`,
      },
    ]);
    return result.insertId;
  });

  res.json(mapPet(await queryOne(`${PET_SELECT} WHERE m.id = ?`, [petId])));
}));

app.put("/api/pets/:id", requireAuth, wrap(async (req, res) => {
  const pet = await mascotaAccesible(req, req.params.id);
  if (!pet) {
    return res.status(404).json({ error: "Mascota no encontrada." });
  }

  const { nombre, especie, raza, edad, peso, foto, alergias, condiciones_cronicas, estado_salud } = req.body;

  const campos: Record<string, any> = {};
  if (nombre) campos.nombre = str(nombre);
  if (especie) campos.especie = str(especie);
  if (raza !== undefined) campos.raza = str(raza);
  if (edad !== undefined) campos.edad = toNumOrNull(edad);
  if (peso !== undefined) campos.peso = toNumOrNull(peso);
  if (foto !== undefined) campos.foto = guardarImagen(foto);

  // Los datos clínicos solo los modifica el personal de la clínica
  if (esVet(req)) {
    if (alergias !== undefined) campos.alergias = str(alergias);
    if (condiciones_cronicas !== undefined) campos.condiciones_cronicas = str(condiciones_cronicas);
    if (estado_salud !== undefined) campos.estado_salud = str(estado_salud);
  }

  // Chapa QR: el dueño decide si la página pública está activa y qué mensaje muestra
  const { qr_publico, qr_mensaje, qr_mostrar_telefono } = req.body;
  if (qr_publico !== undefined) campos.qr_publico = Boolean(qr_publico);
  if (qr_mensaje !== undefined) campos.qr_mensaje = str(qr_mensaje).trim().slice(0, 300);
  if (qr_mostrar_telefono !== undefined) campos.qr_mostrar_telefono = Boolean(qr_mostrar_telefono);

  if (Object.keys(campos).length > 0) {
    await execute("UPDATE mascotas SET ? WHERE id = ?", [campos, pet.id]);
  }

  res.json(mapPet(await queryOne(`${PET_SELECT} WHERE m.id = ?`, [pet.id])));
}));

// La mascota se da de baja sin borrarla, para conservar su historia clínica.
app.delete("/api/pets/:id", requireAuth, wrap(async (req, res) => {
  const pet = await mascotaAccesible(req, req.params.id);
  if (!pet) {
    return res.status(404).json({ error: "Mascota no encontrada." });
  }
  await execute("UPDATE mascotas SET activo = false WHERE id = ?", [pet.id]);
  // Libera los horarios que la mascota tenía reservados a futuro
  await execute(
    "UPDATE turnos SET estado = 'cancelado' WHERE mascota_id = ? AND estado IN ('pendiente', 'confirmado') AND fecha >= ?",
    [pet.id, hoyLocal()]
  );
  res.json({ message: "Mascota eliminada correctamente." });
}));

// --- CHAPA QR ---
// Cada mascota puede tener un código impreso en la chapa del collar. Quien lo escanea
// abre /m/<codigo>: ve el nombre, la foto y las alertas médicas, y puede avisarle al
// dueño sin ver su teléfono ni su dirección. El código es aleatorio para que no se
// pueda recorrer de a uno como pasaría con el id.

// Sin 0/O ni 1/I, que se confunden al leerlos impresos
const ALFABETO_QR = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nuevoCodigoQr = () =>
  Array.from({ length: 10 }, () => ALFABETO_QR[crypto.randomInt(ALFABETO_QR.length)]).join("");
const esCodigoQr = (v: unknown): v is string => typeof v === "string" && /^[A-Z2-9]{10}$/.test(v);

// Devuelve el código de la mascota y lo crea la primera vez que hace falta
async function asegurarCodigoQr(petId: number): Promise<string> {
  for (let intento = 0; intento < 5; intento++) {
    const fila = await queryOne("SELECT codigo_qr FROM mascotas WHERE id = ?", [petId]);
    if (fila?.codigo_qr) return fila.codigo_qr;
    try {
      await execute("UPDATE mascotas SET codigo_qr = ? WHERE id = ? AND codigo_qr IS NULL", [
        nuevoCodigoQr(),
        petId,
      ]);
    } catch (err) {
      if (!isDup(err)) throw err; // código repetido: se vuelve a sortear
    }
  }
  throw httpError(500, "No se pudo generar el código de la chapa. Intentá de nuevo.");
}

const enlaceChapa = (req: Request, codigo: string) => `${urlBase(req)}/m/${codigo}`;

// Imagen del QR para imprimir en la chapa, más los ajustes de la página pública
app.get("/api/pets/:id/qr", requireAuth, wrap(async (req, res) => {
  const pet = await mascotaAccesible(req, req.params.id);
  if (!pet) return res.status(404).json({ error: "Mascota no encontrada." });

  const codigo = await asegurarCodigoQr(pet.id);
  const url = enlaceChapa(req, codigo);
  const imagen = await QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    errorCorrectionLevel: "H", // tolera rayones y desgaste de la chapa
    color: { dark: "#1e3a8a", light: "#ffffff" },
  });
  const ajustes = await queryOne(
    `SELECT m.qr_publico, m.qr_mensaje, m.qr_mostrar_telefono, u.telefono
     FROM mascotas m JOIN usuarios u ON u.id = m.usuario_id WHERE m.id = ?`,
    [pet.id]
  );

  res.json({
    codigo,
    url,
    imagen,
    qr_publico: Boolean(ajustes?.qr_publico),
    qr_mensaje: ajustes?.qr_mensaje || "",
    qr_mostrar_telefono: Boolean(ajustes?.qr_mostrar_telefono),
    telefono_dueno: ajustes?.telefono || "",
  });
}));

const limiteChapa = limitar({
  ventanaMs: 60 * 1000,
  max: 60,
  mensaje: "Demasiadas consultas seguidas. Esperá un minuto.",
});

const limiteAvisoChapa = limitar({
  ventanaMs: 10 * 60 * 1000,
  max: 5,
  mensaje: "Ya enviaste varios avisos. Si es urgente, llamá a la clínica.",
});

// Datos públicos de la mascota: lo que ve quien escanea la chapa, sin iniciar sesión
app.get("/api/publico/mascotas/:codigo", limiteChapa, wrap(async (req, res) => {
  const codigo = String(req.params.codigo || "").toUpperCase();
  const noExiste = { error: "Esta chapa no corresponde a ninguna mascota registrada." };
  if (!esCodigoQr(codigo)) return res.status(404).json(noExiste);

  const m = await queryOne(
    `SELECT m.id, m.usuario_id, m.nombre, m.especie, m.raza, m.edad, m.foto, m.alergias,
            m.condiciones_cronicas, m.qr_publico, m.qr_mensaje, m.qr_mostrar_telefono,
            u.nombre AS dueno, u.telefono
     FROM mascotas m JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.codigo_qr = ? AND m.activo`,
    [codigo]
  );
  if (!m) return res.status(404).json(noExiste);

  // El dueño y el personal ven la chapa aunque esté desactivada, y reciben el id
  // para saltar a la historia clínica
  const esDuenoOVet = Boolean(req.user) && (req.user!.rol === "veterinario" || req.user!.id === m.usuario_id);
  const activa = Boolean(m.qr_publico);
  if (!activa && !esDuenoOVet) {
    return res.json({ nombre: m.nombre, especie: m.especie, dueno: "", activa: false });
  }

  res.json({
    nombre: m.nombre,
    especie: m.especie,
    raza: m.raza || undefined,
    edad: m.edad ?? undefined,
    foto: m.foto || undefined,
    alergias: m.alergias || undefined,
    condiciones_cronicas: m.condiciones_cronicas || undefined,
    qr_mensaje: m.qr_mensaje || undefined,
    dueno: String(m.dueno || "").split(" ")[0], // solo el nombre de pila
    // El teléfono se muestra solo si el dueño lo habilitó en la chapa
    ...(m.qr_mostrar_telefono && m.telefono && { telefono: m.telefono }),
    activa,
    ...(esDuenoOVet && { mascota_id: m.id }),
  });
}));

// Quien encontró a la mascota deja sus datos; el dueño los recibe por email
app.post("/api/publico/mascotas/:codigo/aviso", limiteAvisoChapa, wrap(async (req, res) => {
  const codigo = String(req.params.codigo || "").toUpperCase();
  if (!esCodigoQr(codigo)) {
    return res.status(404).json({ error: "Esta chapa no corresponde a ninguna mascota registrada." });
  }

  const contacto = str(req.body.nombre).trim().slice(0, 80);
  const telefono = str(req.body.telefono).trim().slice(0, 40);
  const ubicacion = str(req.body.ubicacion).trim().slice(0, 200);
  const mensaje = str(req.body.mensaje).trim().slice(0, 500);
  if (!contacto) return res.status(400).json({ error: "Decinos tu nombre para que el dueño sepa quién lo contacta." });
  if (!telefono && !mensaje) {
    return res.status(400).json({ error: "Dejá un teléfono o un mensaje para que el dueño pueda comunicarse." });
  }

  const m = await queryOne(
    `SELECT m.nombre, m.qr_publico, u.nombre AS dueno, u.email
     FROM mascotas m JOIN usuarios u ON u.id = m.usuario_id
     WHERE m.codigo_qr = ? AND m.activo`,
    [codigo]
  );
  if (!m || !m.qr_publico) {
    return res.status(404).json({ error: "Esta chapa no está activa. Llamá a la clínica para que te ayudemos." });
  }

  const { delivered } = await enviarEmail({
    to: m.email,
    copiaClinica: true,
    ...emailMascotaEncontrada({
      dueno: m.dueno,
      mascota: m.nombre,
      contacto,
      telefono,
      ubicacion,
      mensaje,
    }),
  });

  if (!delivered) {
    return res.status(502).json({
      error: `No pudimos avisarle al dueño en este momento. Llamá a la clínica al ${CLINICA.telefono} y te ayudamos.`,
    });
  }
  res.json({ message: `Le avisamos al dueño de ${m.nombre}. ¡Gracias por ayudar!` });
}));

// --- SERVICES ---
app.get("/api/services", wrap(async (req, res) => {
  const rows = await query("SELECT * FROM servicios ORDER BY id");
  res.json(rows.map((s) => ({ ...s, derivacion_habilitada: Boolean(s.derivacion_habilitada) })));
}));

// --- TURNOS ---
app.get("/api/turnos", requireAuth, wrap(async (req, res) => {
  const fechaFilter = req.query.fecha ? String(req.query.fecha) : null;

  const where: string[] = [];
  const params: any[] = [];

  if (!esVet(req)) {
    where.push("m.usuario_id = ?");
    params.push(req.user!.id);
  } else if (toId(req.query.userId) && req.query.all !== "true") {
    where.push("m.usuario_id = ?");
    params.push(toId(req.query.userId));
  }

  if (fechaFilter) {
    if (!esFecha(fechaFilter)) return res.json([]);
    where.push("t.fecha = ?");
    params.push(fechaFilter);
  }

  const rows = await query(
    `${TURNO_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY t.fecha DESC, t.hora DESC`,
    params
  );
  res.json(rows.map(mapTurno));
}));

app.get("/api/turnos/booked-dates", requireAuth, wrap(async (req, res) => {
  const mesParam = req.query.mes ? String(req.query.mes) : hoyLocal().substring(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mesParam)) return res.json([]);
  const rows = await query(
    "SELECT DISTINCT EXTRACT(DAY FROM fecha)::int AS dia FROM turnos WHERE to_char(fecha, 'YYYY-MM') = ? AND estado <> 'cancelado' ORDER BY dia",
    [mesParam]
  );
  res.json(rows.map((r) => r.dia));
}));

// Horarios de inicio que se pueden reservar ese día para ese servicio
app.get("/api/turnos/disponibilidad", requireAuth, wrap(async (req, res) => {
  const fecha = String(req.query.fecha || "");
  const service = await queryOne("SELECT duracion_min FROM servicios WHERE id = ?", [
    toId(req.query.servicio_id),
  ]);
  if (!esFecha(fecha) || !service) return res.json([]);

  const disponibles = await horariosDisponibles(query, fecha, service.duracion_min);
  res.json(disponibles.map((h) => h.hora));
}));

app.post("/api/turnos", requireAuth, wrap(async (req, res) => {
  const {
    mascota_id,
    servicio_id,
    fecha,
    hora,
    notas,
    sintomas_observados,
    tiene_estudios_previos,
  } = req.body;

  if (!mascota_id || !servicio_id || !fecha || !hora) {
    return res
      .status(400)
      .json({ error: "Completá todos los datos para la reserva." });
  }
  const hoy = hoyLocal();
  if (!esFecha(fecha) || !esHora(hora) || fecha < hoy || fecha > sumarDias(hoy, 365)) {
    return res.status(400).json({ error: "La fecha o el horario elegido no es válido." });
  }

  const sId = toId(servicio_id);
  const pet = await mascotaAccesible(req, mascota_id);
  const service = await queryOne("SELECT * FROM servicios WHERE id = ?", [sId]);
  if (!pet || !service) {
    return res.status(400).json({ error: "La mascota o el servicio elegido no existe." });
  }

  const isSurgery = sId === 2;
  const isSpecialized = service.categoria === "especializado";
  const horarioOcupado = "Ese horario ya no está disponible. Elegí otro horario.";

  let turnoId: number;
  try {
    turnoId = await transaction(async (conn) => {
      // Bloquea a los veterinarios mientras se reserva: dos reservas simultáneas se
      // procesan de a una y la segunda ya ve el turno de la primera.
      await conn.query("SELECT id FROM usuarios WHERE rol = 'veterinario' FOR UPDATE");

      const consulta = async (sql: string, params?: any[]) =>
        (await conn.query(sql, params))[0] as any[];
      const disponibles = await horariosDisponibles(consulta, fecha, service.duracion_min);
      const horario = disponibles.find((h) => h.hora === hora);
      if (!horario) throw httpError(400, horarioOcupado);

      const [result] = await conn.query<ResultSetHeader>("INSERT INTO turnos SET ?", [
        {
          mascota_id: pet.id,
          servicio_id: sId,
          veterinario_id: horario.veterinarios[0],
          fecha,
          hora,
          duracion_min: service.duracion_min,
          estado: "confirmado",
          notas: str(notas) || (isSurgery ? "Bloque Quirúrgico Extendido (90 min)." : (isSpecialized ? "Turno Especializado / Interconsulta diagnóstica." : "")),
          es_especializado: isSpecialized ? 1 : 0,
          especialidad: service.especialidad || (isSpecialized ? "Cardiología" : null),
          estudio_solicitado: service.estudio_sugerido || service.nombre,
          sintomas_observados: str(sintomas_observados),
          tiene_estudios_previos: tiene_estudios_previos ? 1 : 0,
        },
      ]);
      return result.insertId;
    });
  } catch (err) {
    if (isDup(err)) return res.status(400).json({ error: horarioOcupado });
    throw err;
  }

  const turno = mapTurno(await queryOne(`${TURNO_SELECT} WHERE t.id = ?`, [turnoId]));

  // El turno ya quedó reservado: si el email falla, la respuesta lo informa pero no se revierte nada
  let emailEnviado = false;
  if (turno.dueno_email) {
    const { delivered } = await enviarEmail({
      to: turno.dueno_email,
      copiaClinica: true,
      ...emailTurno({
        dueno: turno.dueno,
        mascota: turno.mascota_nombre,
        servicio: turno.servicio_nombre,
        fecha: turno.fecha,
        hora: turno.hora,
        veterinario: turno.veterinario_nombre,
        esEspecializado: isSpecialized,
        esCirugia: isSurgery,
        sintomas: turno.sintomas_observados,
      }),
    });
    emailEnviado = delivered;
  }

  res.json({ ...turno, email_enviado: emailEnviado });
}));

app.patch("/api/turnos/:id/estado", requireAuth, wrap(async (req, res) => {
  const turnoId = toId(req.params.id);
  const { estado } = req.body;
  const turno = await queryOne(
    `SELECT t.id, t.estado, t.veterinario_id, t.fecha, to_char(t.hora, 'HH24:MI') AS hora,
            t.duracion_min, m.usuario_id
     FROM turnos t JOIN mascotas m ON m.id = t.mascota_id
     WHERE t.id = ?`,
    [turnoId]
  );
  if (!turno || (!esVet(req) && turno.usuario_id !== req.user!.id)) {
    return res.status(404).json({ error: "Turno no encontrado" });
  }
  if (!["pendiente", "confirmado", "cancelado", "completado"].includes(estado)) {
    return res.status(400).json({ error: "El estado indicado no es válido." });
  }

  // El cliente solo puede cancelar sus turnos que todavía no fueron atendidos
  if (!esVet(req) && (estado !== "cancelado" || turno.estado === "completado")) {
    return res.status(403).json({ error: "Solo podés cancelar tus turnos pendientes." });
  }

  // Regla de negocio: Si el turno está cancelado, no se puede pasar a completado directamente
  if (turno.estado === "cancelado" && estado === "completado") {
    return res
      .status(400)
      .json({ error: "No podés marcar como Atendido un turno que ya fue cancelado." });
  }

  const horarioTomado = "Ese horario ya está ocupado por otro turno.";
  try {
    await transaction(async (conn) => {
      // Al reactivar un turno cancelado hay que revisar que su horario siga libre
      if (turno.estado === "cancelado" && estado !== "cancelado" && turno.veterinario_id) {
        await conn.query("SELECT id FROM usuarios WHERE id = ? FOR UPDATE", [turno.veterinario_id]);
        const [solapados] = await conn.query(
          `SELECT id FROM turnos
           WHERE veterinario_id = ? AND fecha = ? AND estado <> 'cancelado' AND id <> ?
             AND hora < (?::time + make_interval(mins => ?::int))
             AND (hora + make_interval(mins => duracion_min)) > ?`,
          [turno.veterinario_id, turno.fecha, turno.id, turno.hora, turno.duracion_min, turno.hora]
        );
        if ((solapados as any[]).length > 0) throw httpError(400, horarioTomado);
      }
      await conn.query("UPDATE turnos SET estado = ? WHERE id = ?", [estado, turno.id]);
    });
  } catch (err) {
    if (isDup(err)) return res.status(400).json({ error: horarioTomado });
    throw err;
  }

  res.json(mapTurno(await queryOne(`${TURNO_SELECT} WHERE t.id = ?`, [turno.id])));
}));

// --- CLINICAL HISTORY (CONSULTAS, VACUNAS, ESTUDIOS) ---
const CONSULTA_SELECT = `
  SELECT c.*, COALESCE(v.nombre, 'Registro del sistema') AS vet_nombre
  FROM consultas c
  LEFT JOIN usuarios v ON v.id = c.veterinario_id`;

app.get("/api/consultas", requireAuth, wrap(async (req, res) => {
  const pet = await mascotaAccesible(req, req.query.mascota_id);
  if (!pet) return res.json([]);

  res.json(
    await query(`${CONSULTA_SELECT} WHERE c.mascota_id = ? ORDER BY c.fecha DESC, c.id DESC`, [pet.id])
  );
}));

app.post("/api/consultas", requireVet, wrap(async (req, res) => {
  const { mascota_id, fecha, tipo, titulo, descripcion } = req.body;
  if (!mascota_id || !titulo || !descripcion) {
    return res.status(400).json({ error: "Completá el título y la descripción." });
  }

  const pet = await mascotaAccesible(req, mascota_id);
  if (!pet) return res.status(404).json({ error: "Mascota no encontrada." });

  const tipoConsulta = tipo || "CONTROL";
  if (!["CONTROL", "EMERGENCIA", "VACUNA", "CIRUGIA", "DIAGNOSTICO"].includes(tipoConsulta)) {
    return res.status(400).json({ error: "El tipo de atención no es válido." });
  }

  // El registro queda a nombre del profesional que inició sesión
  const result = await execute("INSERT INTO consultas SET ?", [
    {
      mascota_id: pet.id,
      veterinario_id: req.user!.id,
      fecha: esFecha(fecha) ? fecha : hoyLocal(),
      tipo: tipoConsulta,
      titulo: str(titulo),
      descripcion: str(descripcion),
    },
  ]);

  res.json(await queryOne(`${CONSULTA_SELECT} WHERE c.id = ?`, [result.insertId]));
}));

// El estado de cada vacuna se calcula con la fecha del día
const VACUNA_SELECT = `
  SELECT v.*,
         CASE
           WHEN v.fecha_aplicacion IS NULL THEN 'PENDIENTE'
           WHEN v.fecha_refuerzo IS NOT NULL AND v.fecha_refuerzo < ? THEN 'VENCIDA'
           ELSE 'AL_DIA'
         END AS estado
  FROM vacunas v`;

app.get("/api/vacunas", requireAuth, wrap(async (req, res) => {
  const pet = await mascotaAccesible(req, req.query.mascota_id);
  if (!pet) return res.json([]);
  res.json(
    await query(`${VACUNA_SELECT} WHERE v.mascota_id = ? ORDER BY v.fecha_aplicacion DESC, v.id DESC`, [
      hoyLocal(),
      pet.id,
    ])
  );
}));

app.post("/api/vacunas", requireVet, wrap(async (req, res) => {
  const { mascota_id, nombre, fecha_aplicacion, fecha_refuerzo } = req.body;
  if (!mascota_id || typeof nombre !== "string" || !nombre.trim()) {
    return res.status(400).json({ error: "Indicá el nombre de la vacuna." });
  }
  if ((fecha_aplicacion && !esFecha(fecha_aplicacion)) || (fecha_refuerzo && !esFecha(fecha_refuerzo))) {
    return res.status(400).json({ error: "Alguna de las fechas no es válida." });
  }

  const pet = await mascotaAccesible(req, mascota_id);
  if (!pet) return res.status(404).json({ error: "Mascota no encontrada." });

  const result = await execute("INSERT INTO vacunas SET ?", [
    {
      mascota_id: pet.id,
      nombre: nombre.trim(),
      fecha_aplicacion: fecha_aplicacion || null,
      fecha_refuerzo: fecha_refuerzo || null,
    },
  ]);

  res.status(201).json(
    await queryOne(`${VACUNA_SELECT} WHERE v.id = ?`, [hoyLocal(), result.insertId])
  );
}));

app.get("/api/estudios", requireAuth, wrap(async (req, res) => {
  if (!req.query.mascota_id) {
    // El listado completo es solo para el personal
    if (!esVet(req)) return res.json([]);
    return res.json(await query("SELECT * FROM estudios ORDER BY fecha DESC, id DESC"));
  }

  const pet = await mascotaAccesible(req, req.query.mascota_id);
  if (!pet) return res.json([]);
  res.json(
    await query("SELECT * FROM estudios WHERE mascota_id = ? ORDER BY fecha DESC, id DESC", [pet.id])
  );
}));

app.post("/api/estudios", requireVet, wrap(async (req, res) => {
  const {
    mascota_id,
    nombre,
    tipo,
    fecha,
    zona_anatomica,
    imagen_url,
    observaciones,
    institucion,
  } = req.body;

  if (!mascota_id || !nombre) {
    return res.status(400).json({ error: "Completá los campos obligatorios del estudio." });
  }

  const pet = await mascotaAccesible(req, mascota_id);
  if (!pet) return res.status(404).json({ error: "Mascota no encontrada." });

  // Se guarda lo que cargó el profesional: sin imagen ni informe de relleno
  const result = await execute("INSERT INTO estudios SET ?", [
    {
      mascota_id: pet.id,
      nombre: str(nombre).trim(),
      tipo: str(tipo) || "Radiografía",
      fecha: esFecha(fecha) ? fecha : hoyLocal(),
      zona_anatomica: str(zona_anatomica) || null,
      imagen_url: guardarImagen(imagen_url),
      observaciones: str(observaciones) || null,
      veterinario_id: req.user!.id,
      veterinario_nombre: req.user!.matricula
        ? `${req.user!.nombre} (${req.user!.matricula})`
        : req.user!.nombre,
      institucion: str(institucion) || CLINICA.sede,
      resultado_url: "#",
    },
  ]);

  res.status(201).json(await queryOne("SELECT * FROM estudios WHERE id = ?", [result.insertId]));
}));

// --- ÓRDENES DE DERIVACIÓN E INTERCONSULTA MÉDICA EXTERNA ---
app.get("/api/centros-derivacion", wrap(async (req, res) => {
  res.json(await getCentros());
}));

app.get("/api/derivaciones", requireAuth, wrap(async (req, res) => {
  if (req.query.mascota_id) {
    const pet = await mascotaAccesible(req, req.query.mascota_id);
    if (!pet) return res.json([]);
    return res.json(await fetchDerivaciones("WHERE d.mascota_id = ?", [pet.id]));
  }

  const userId = esVet(req) ? toId(req.query.userId) : req.user!.id;
  if (userId) return res.json(await fetchDerivaciones("WHERE m.usuario_id = ?", [userId]));
  res.json(await fetchDerivaciones(""));
}));

app.post("/api/derivaciones", requireVet, wrap(async (req, res) => {
  const {
    mascota_id,
    centro_destino_id,
    especialidad_derivada,
    estudio_solicitado,
    motivo_derivacion,
    sospecha_diagnostica,
    resumen_clinico,
    indicaciones_previas,
  } = req.body;

  if (!mascota_id || !especialidad_derivada || !estudio_solicitado || !sospecha_diagnostica) {
    return res.status(400).json({ error: "Completá los datos médicos obligatorios para emitir la orden." });
  }

  const pet = await mascotaAccesible(req, mascota_id);
  if (!pet) return res.status(404).json({ error: "Mascota no encontrada." });

  const centro =
    typeof centro_destino_id === "string"
      ? await queryOne("SELECT id FROM centros_derivacion WHERE id = ?", [centro_destino_id])
      : null;
  if (!centro) {
    return res.status(400).json({ error: "Elegí el centro de destino de la derivación." });
  }

  const emisionStr = hoyLocal();
  const validezStr = sumarDias(emisionStr, 30);

  // Si la derivación proviene de un turno médico, se asocia en la misma transacción
  const turnoId = toId(req.body.turno_id);

  let derivacionId = 0;
  for (let intento = 0; ; intento++) {
    const orderCode = `ORD-${emisionStr.substring(0, 4)}-${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`;
    try {
      derivacionId = await transaction(async (conn) => {
        const [result] = await conn.query<ResultSetHeader>("INSERT INTO derivaciones SET ?", [
          {
            codigo: orderCode,
            mascota_id: pet.id,
            // La orden queda firmada por el profesional que inició sesión
            veterinario_emisor_id: req.user!.id,
            centro_destino_id: centro.id,
            edad: pet.edad,
            peso: pet.peso,
            especialidad_derivada: str(especialidad_derivada),
            estudio_solicitado: str(estudio_solicitado),
            motivo_derivacion: str(motivo_derivacion) || "Equipamiento de alta complejidad requerido",
            sospecha_diagnostica: str(sospecha_diagnostica),
            resumen_clinico: str(resumen_clinico) || null,
            indicaciones_previas: str(indicaciones_previas) || "Concurrir con esta orden médica impresa o en el celular.",
            fecha_emision: emisionStr,
            fecha_validez_hasta: validezStr,
            estado: "activa",
          },
        ]);
        if (turnoId) {
          await conn.query(
            "UPDATE turnos SET derivacion_id = ? WHERE id = ? AND mascota_id = ?",
            [result.insertId, turnoId, pet.id]
          );
        }
        return result.insertId;
      });
      break;
    } catch (err) {
      // El código es aleatorio: si coincide con uno ya emitido se genera otro
      if (!isDup(err) || intento >= 5) throw err;
    }
  }

  const [newDerivacion] = await fetchDerivaciones("WHERE d.id = ?", [derivacionId]);

  if (newDerivacion.dueno_email) {
    // Con await por el mismo motivo que en el registro (ver /api/auth/register)
    await enviarEmail({
      to: newDerivacion.dueno_email,
      copiaClinica: true,
      ...emailDerivacion(newDerivacion),
    });
  }

  res.status(201).json(newDerivacion);
}));

app.patch("/api/derivaciones/:id/estado", requireVet, wrap(async (req, res) => {
  const id = toId(req.params.id);
  const { estado } = req.body;
  const existe = await queryOne("SELECT id FROM derivaciones WHERE id = ?", [id]);
  if (!existe) return res.status(404).json({ error: "Orden no encontrada." });
  if (["activa", "presentada", "completada", "vencida"].includes(estado)) {
    await execute("UPDATE derivaciones SET estado = ? WHERE id = ?", [estado, id]);
  }
  const [item] = await fetchDerivaciones("WHERE d.id = ?", [id]);
  res.json(item);
}));

app.get("/api/derivaciones/:id", requireAuth, wrap(async (req, res) => {
  const item = await derivacionAccesible(req, req.params.id);
  if (!item) return res.status(404).json({ error: "Orden no encontrada." });
  res.json(item);
}));

// Reenvía la orden al dueño de la mascota. El destinatario y el contenido los
// arma el servidor: la API no acepta direcciones ni HTML del navegador.
app.post("/api/derivaciones/:id/enviar-email", requireAuth, wrap(async (req, res) => {
  const orden = await derivacionAccesible(req, req.params.id);
  if (!orden) return res.status(404).json({ error: "Orden no encontrada." });
  if (!orden.dueno_email) {
    return res.status(400).json({ error: "El dueño de la mascota no tiene un email registrado." });
  }

  const { delivered } = await enviarEmail({
    to: orden.dueno_email,
    copiaClinica: true,
    ...emailDerivacion(orden),
  });
  if (!delivered) {
    return res.status(503).json({ error: "No se pudo enviar el email. Revisá la configuración de correo de la clínica." });
  }
  res.json({ message: `Orden enviada a ${orden.dueno_email}.` });
}));

// --- STORE & ORDERS ---
app.get("/api/products", wrap(async (req, res) => {
  res.json((await query("SELECT * FROM productos ORDER BY id")).map(mapProduct));
}));

app.post("/api/products", requireVet, wrap(async (req, res) => {
  const { nombre, categoria, etiqueta, descripcion, precio, imagen, requiere_receta, stock } = req.body;
  if (!nombre || precio === undefined || precio === null) {
    return res.status(400).json({ error: "El nombre y el precio son obligatorios." });
  }

  const result = await execute("INSERT INTO productos SET ?", [
    {
      nombre: str(nombre).trim(),
      categoria: str(categoria) || "Medicamentos",
      etiqueta: str(etiqueta),
      descripcion: str(descripcion),
      precio: numero(precio),
      requiere_receta: requiere_receta ? 1 : 0,
      stock: stock !== undefined && stock !== "" ? numero(stock) : 0,
      imagen:
        guardarImagen(imagen) ||
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80",
    },
  ]);

  const newProduct = await queryOne("SELECT * FROM productos WHERE id = ?", [result.insertId]);
  res.status(201).json(mapProduct(newProduct));
}));

app.put("/api/products/:id", requireVet, wrap(async (req, res) => {
  const prodId = toId(req.params.id);
  const existe = await queryOne("SELECT id FROM productos WHERE id = ?", [prodId]);
  if (!existe) {
    return res.status(404).json({ error: "Producto no encontrado." });
  }

  const { nombre, categoria, etiqueta, descripcion, precio, imagen, requiere_receta, stock } = req.body;

  const campos: Record<string, any> = {};
  if (nombre) campos.nombre = str(nombre).trim();
  if (categoria) campos.categoria = str(categoria);
  if (etiqueta !== undefined) campos.etiqueta = str(etiqueta);
  if (descripcion !== undefined) campos.descripcion = str(descripcion);
  if (precio !== undefined && precio !== "") campos.precio = numero(precio);
  if (imagen !== undefined) campos.imagen = guardarImagen(imagen);
  if (requiere_receta !== undefined) campos.requiere_receta = requiere_receta ? 1 : 0;
  if (stock !== undefined && stock !== "") campos.stock = numero(stock);

  if (Object.keys(campos).length > 0) {
    await execute("UPDATE productos SET ? WHERE id = ?", [campos, prodId]);
  }

  res.json(mapProduct(await queryOne("SELECT * FROM productos WHERE id = ?", [prodId])));
}));

app.delete("/api/products/:id", requireVet, wrap(async (req, res) => {
  const prodId = toId(req.params.id);
  const product = await queryOne("SELECT * FROM productos WHERE id = ?", [prodId]);
  if (!product) {
    return res.status(404).json({ error: "Producto no encontrado." });
  }

  // Los pedidos que lo incluían conservan nombre y precio (ver pedido_items)
  await execute("DELETE FROM productos WHERE id = ?", [prodId]);
  res.json({ message: "Producto eliminado correctamente.", product: mapProduct(product) });
}));

// Pago simulado con tarjeta: no se cobra nada ni interviene ningún medio de pago real.
// El número y el código de seguridad no llegan al servidor: el navegador manda solo
// la marca y los últimos 4 dígitos. Como en los entornos de prueba de los medios de
// pago, el nombre del titular decide el resultado: FUND y OTHE simulan un rechazo.
function autorizarPagoSimulado(pago: any) {
  const titular = str(pago?.titular).trim();
  const cuotas = Number(pago?.cuotas ?? 1);
  if (
    !titular ||
    titular.length > 120 ||
    !MARCAS_TARJETA.includes(pago?.marca) ||
    !/^\d{4}$/.test(str(pago?.ultimos4)) ||
    !CUOTAS.includes(cuotas)
  ) {
    throw httpError(400, "Los datos de la tarjeta no son válidos.");
  }
  if (titular.toUpperCase() === "FUND") {
    throw httpError(402, "La tarjeta no tiene fondos suficientes. Probá con otra tarjeta.");
  }
  if (titular.toUpperCase() === "OTHE") {
    throw httpError(402, "La tarjeta rechazó el pago. Probá con otra o pagá al recibir el pedido.");
  }
  return {
    referencia: `SIM-${nuevoToken().substring(0, 10).toUpperCase()}`,
    cuotas,
    tarjeta_marca: pago.marca as string,
    tarjeta_ultimos4: pago.ultimos4 as string,
    titular,
  };
}

app.post("/api/orders", requireAuth, wrap(async (req, res) => {
  // items = [{ productId, quantity }]; pago = { titular, marca, ultimos4, cuotas } si paga online
  const { items, entrega, direccion_envio, telefono_contacto, pago } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "El carrito está vacío." });
  }

  // Un mismo producto repetido en el carrito se suma en una sola línea
  const cantidades = new Map<number, number>();
  for (const it of items) {
    const productId = toId(it?.productId);
    const quantity = toId(it?.quantity);
    if (!productId || !quantity) {
      return res.status(400).json({ error: "Hay un producto o una cantidad inválida en el carrito." });
    }
    cantidades.set(productId, (cantidades.get(productId) ?? 0) + quantity);
  }
  const lineas = [...cantidades].map(([productId, quantity]) => ({ productId, quantity }));

  const tipoEntrega = entrega === "envio" ? "envio" : "retiro";
  const direccion = str(direccion_envio).trim();
  if (tipoEntrega === "envio" && direccion.length < 5) {
    return res.status(400).json({ error: "Ingresá la dirección de envío." });
  }

  // Stock, pedido e ítems se graban juntos: si algo falla no queda nada a medias.
  const pedidoId = await transaction(async (conn) => {
    let total = 0;
    const orderItems: Record<string, any>[] = [];

    for (const linea of lineas) {
      // FOR UPDATE bloquea la fila para que dos compras simultáneas no vendan la misma unidad
      const [rows] = await conn.query(
        "SELECT id, nombre, precio, stock, imagen, requiere_receta FROM productos WHERE id = ? FOR UPDATE",
        [linea.productId]
      );
      const prod = (rows as any[])[0];
      if (!prod) {
        throw httpError(400, "Uno de los productos del carrito ya no está disponible.");
      }
      if (prod.stock < linea.quantity) {
        throw httpError(400, `No hay stock suficiente de "${prod.nombre}" (quedan ${prod.stock}).`);
      }

      await conn.query("UPDATE productos SET stock = stock - ? WHERE id = ?", [linea.quantity, prod.id]);
      total += prod.precio * linea.quantity;
      orderItems.push({
        producto_id: prod.id,
        cantidad: linea.quantity,
        precio_unitario: prod.precio,
        producto_nombre: prod.nombre,
        producto_imagen: prod.imagen,
        requiere_receta: prod.requiere_receta,
      });
    }

    total = Math.round(total * 100) / 100;
    // Si el pago se rechaza, la transacción se revierte: no queda pedido ni stock reservado
    const pagoAprobado = pago ? autorizarPagoSimulado(pago) : null;

    // Sin pago online el pedido nace "pendiente": se marca como pagado desde el panel cuando se cobra
    const [pedido] = await conn.query<ResultSetHeader>("INSERT INTO pedidos SET ?", [
      {
        usuario_id: req.user!.id,
        total,
        estado: pagoAprobado ? "pagado" : "pendiente",
        entrega: tipoEntrega,
        direccion_envio: tipoEntrega === "envio" ? direccion : null,
        telefono_contacto: str(telefono_contacto).trim() || req.user!.telefono || null,
      },
    ]);
    for (const item of orderItems) {
      await conn.query("INSERT INTO pedido_items SET ?", [{ pedido_id: pedido.insertId, ...item }]);
    }
    if (pagoAprobado) {
      await conn.query("INSERT INTO pagos SET ?", [{ pedido_id: pedido.insertId, monto: total, ...pagoAprobado }]);
    }
    return pedido.insertId;
  });

  const [newOrder] = await fetchPedidos("WHERE p.id = ?", [pedidoId]);
  const { delivered } = await enviarEmail({
    to: newOrder.cliente_email,
    copiaClinica: true,
    ...emailPedido(newOrder),
  });
  res.json({ ...newOrder, email_enviado: delivered });
}));

app.get("/api/orders", requireAuth, wrap(async (req, res) => {
  // El personal ve todos los pedidos; el cliente, los suyos
  if (esVet(req) && req.query.all === "true") {
    return res.json(await fetchPedidos(""));
  }
  res.json(await fetchPedidos("WHERE p.usuario_id = ?", [req.user!.id]));
}));

app.patch("/api/orders/:id/estado", requireVet, wrap(async (req, res) => {
  const pedidoId = toId(req.params.id);
  const { estado } = req.body;
  if (!["pendiente", "pagado", "enviado", "entregado", "cancelado"].includes(estado)) {
    return res.status(400).json({ error: "El estado indicado no es válido." });
  }

  await transaction(async (conn) => {
    const [rows] = await conn.query("SELECT id, estado FROM pedidos WHERE id = ? FOR UPDATE", [pedidoId]);
    const pedido = (rows as any[])[0];
    if (!pedido) throw httpError(404, "Pedido no encontrado.");
    if (pedido.estado === "cancelado" && estado !== "cancelado") {
      throw httpError(400, "Un pedido cancelado no se puede reactivar. Cargá uno nuevo.");
    }

    // Al cancelar, las unidades vuelven al stock
    if (estado === "cancelado" && pedido.estado !== "cancelado") {
      await conn.query(
        `UPDATE productos p
         JOIN pedido_items i ON i.producto_id = p.id
         SET p.stock = p.stock + i.cantidad
         WHERE i.pedido_id = ?`,
        [pedido.id]
      );
    }
    await conn.query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, pedido.id]);
  });

  const [pedido] = await fetchPedidos("WHERE p.id = ?", [pedidoId]);
  res.json(pedido);
}));

// --- VETERINARIAS MÓVILES (operativos de castración y vacunación) ---
const OPERATIVO_SELECT = `
  SELECT id, titulo, organizador, servicios, fecha,
         to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(hora_fin, 'HH24:MI') AS hora_fin,
         direccion, localidad, latitud, longitud, requisitos
  FROM operativos_moviles`;

const esZona = (v: unknown): v is string => ZONAS.some((z) => z.nombre === v);

const esCoordenada = (v: unknown, maximo: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= maximo;

// El mapa es público: muestra los operativos de hoy en adelante.
app.get("/api/operativos", wrap(async (req, res) => {
  const hoy = hoyLocal();
  // El personal también ve los que ya pasaron: primero los próximos, del más cercano al más lejano
  if (req.query.todos === "true" && req.user?.rol === "veterinario") {
    return res.json(
      await query(`${OPERATIVO_SELECT} ORDER BY fecha < ?, ABS(fecha - ?::date), hora_inicio`, [hoy, hoy])
    );
  }
  res.json(await query(`${OPERATIVO_SELECT} WHERE fecha >= ? ORDER BY fecha, hora_inicio`, [hoy]));
}));

// Localidades de las que el usuario quiere recibir avisos. Estas rutas van antes que
// las de /api/operativos/:id: si no, "avisos" se tomaría como el id de un operativo.
app.get("/api/operativos/avisos", requireAuth, wrap(async (req, res) => {
  const filas = await query("SELECT localidad FROM avisos_operativos WHERE usuario_id = ?", [req.user!.id]);
  res.json(filas.map((f) => f.localidad));
}));

app.put("/api/operativos/avisos", requireAuth, wrap(async (req, res) => {
  const pedidas: unknown[] = Array.isArray(req.body.localidades) ? req.body.localidades : [];
  const localidades = [...new Set(pedidas.filter(esZona))];

  await transaction(async (conn) => {
    await conn.query("DELETE FROM avisos_operativos WHERE usuario_id = ?", [req.user!.id]);
    for (const localidad of localidades) {
      await conn.query("INSERT INTO avisos_operativos SET ?", [{ usuario_id: req.user!.id, localidad }]);
    }
  });
  res.json(localidades);
}));

// Valida los datos de un operativo y los deja listos para guardar; si falta algo, lanza el motivo
function leerOperativo(body: any) {
  const {
    titulo,
    organizador,
    servicios,
    fecha,
    hora_inicio,
    hora_fin,
    direccion,
    localidad,
    latitud,
    longitud,
    requisitos,
  } = body;

  if (![titulo, servicios, direccion].every((v) => typeof v === "string" && v.trim())) {
    throw httpError(400, "Completá el título, los servicios y la dirección del operativo.");
  }
  if (!esZona(localidad)) {
    throw httpError(400, "Elegí la localidad del operativo.");
  }
  const hoy = hoyLocal();
  if (!esFecha(fecha) || fecha < hoy || fecha > sumarDias(hoy, 365)) {
    throw httpError(400, "La fecha del operativo tiene que ser de hoy en adelante.");
  }
  if (!esHora(hora_inicio) || !esHora(hora_fin) || hora_inicio >= hora_fin) {
    throw httpError(400, "El horario no es válido: la hora de fin tiene que ser posterior a la de inicio.");
  }
  if (!esCoordenada(latitud, 90) || !esCoordenada(longitud, 180)) {
    throw httpError(400, "Marcá en el mapa el punto donde va a estar la veterinaria móvil.");
  }

  return {
    titulo: titulo.trim() as string,
    organizador: str(organizador).trim(),
    servicios: servicios.trim() as string,
    fecha,
    hora_inicio,
    hora_fin,
    direccion: direccion.trim() as string,
    localidad,
    latitud,
    longitud,
    requisitos: str(requisitos).trim() || null,
  };
}

// Avisa por email a quienes se anotaron en esas localidades y devuelve a cuántos. Los
// avisos salen de a uno y en segundo plano: la respuesta no espera a que terminen.
async function avisarOperativo(req: Request, operativo: any, localidades: string[], esCambio = false) {
  const suscriptores = await query(
    `SELECT DISTINCT u.nombre, u.email
     FROM avisos_operativos a JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.localidad IN (?)`,
    [localidades]
  );
  const enlaceMapa = `${urlBase(req)}/veterinarias-moviles`;
  (async () => {
    for (const s of suscriptores) {
      await enviarEmail({ to: s.email, ...emailOperativo(s.nombre, operativo, enlaceMapa, esCambio) });
    }
  })().catch(() => {});
  return suscriptores.length;
}

// Al publicar un operativo se avisa a quienes se anotaron en esa localidad.
app.post("/api/operativos", requireVet, wrap(async (req, res) => {
  const result = await execute("INSERT INTO operativos_moviles SET ?", [leerOperativo(req.body)]);
  const operativo = await queryOne(`${OPERATIVO_SELECT} WHERE id = ?`, [result.insertId]);

  const avisos = await avisarOperativo(req, operativo, [operativo.localidad]);
  res.status(201).json({ ...operativo, avisos, email_activo: emailConfigurado() });
}));

// Si cambia el día, el horario o el lugar, se vuelve a avisar: quienes recibieron el
// primer aviso tienen que enterarse. Corregir el título o mover el punto no avisa.
const CAMBIOS_QUE_AVISAN = ["fecha", "hora_inicio", "hora_fin", "direccion", "localidad"];

app.put("/api/operativos/:id", requireVet, wrap(async (req, res) => {
  const id = toId(req.params.id);
  const anterior = await queryOne(`${OPERATIVO_SELECT} WHERE id = ?`, [id]);
  if (!anterior) {
    return res.status(404).json({ error: "Operativo no encontrado." });
  }

  await execute("UPDATE operativos_moviles SET ? WHERE id = ?", [leerOperativo(req.body), id]);
  const operativo = await queryOne(`${OPERATIVO_SELECT} WHERE id = ?`, [id]);

  const cambio = CAMBIOS_QUE_AVISAN.some((campo) => operativo[campo] !== anterior[campo]);
  // Si se mudó de localidad, también se enteran los anotados en la anterior
  const localidades = [...new Set([anterior.localidad, operativo.localidad])];
  const avisos = cambio ? await avisarOperativo(req, operativo, localidades, true) : 0;
  res.json({ ...operativo, avisos, cambio_avisado: cambio, email_activo: emailConfigurado() });
}));

app.delete("/api/operativos/:id", requireVet, wrap(async (req, res) => {
  const result = await execute("DELETE FROM operativos_moviles WHERE id = ?", [toId(req.params.id)]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: "Operativo no encontrado." });
  }
  res.json({ message: "Operativo eliminado." });
}));

// --- ADMIN STATS ---
app.get("/api/admin/stats", requireVet, wrap(async (req, res) => {
  const hoy = hoyLocal();
  const stats = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM turnos WHERE fecha = ? AND estado <> 'cancelado') AS "totalHoy",
       (SELECT COUNT(*) FROM turnos WHERE fecha >= ? AND estado IN ('pendiente', 'confirmado')) AS pendientes,
       (SELECT COUNT(*) FROM mascotas WHERE activo) AS "totalPacientes",
       (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente') AS "totalClientes",
       (SELECT COUNT(*) FROM pedidos WHERE estado IN ('pendiente', 'pagado')) AS "pedidosPendientes"`,
    [hoy, hoy]
  );
  res.json(stats);
}));

// --- MANEJO DE ERRORES DE LA API ---
// Códigos de Postgres que indican un dato inválido enviado por el cliente
// (fuera de rango, texto demasiado largo, valor o fecha incorrectos).
const ERRORES_DE_DATOS = ["22001", "22003", "22007", "22008", "22P02", "23514"];

app.use("/api", (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }
  if (ERRORES_DE_DATOS.includes(err.code)) {
    return res.status(400).json({ error: "Alguno de los datos enviados no es válido." });
  }

  console.error("[API ERROR]", err);
  res.status(500).json({ error: "Ocurrió un error interno. Intentá nuevamente." });
});

// --- CHATBOX ASISTENTE CLÍNICO IA (GEMINI API) ---
let geminiAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!geminiAiClient) {
    geminiAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiAiClient;
}

const MODELOS_CHAT = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

// Google devuelve 503 o 429 cuando un modelo está saturado, y pasa seguido. Por eso se
// alterna entre los dos modelos hasta que alguno responda o se agote el tiempo: nadie
// espera más de TIEMPO_MAXIMO_CHAT_MS. Si devuelve null, el chat responde con los textos fijos.
const TIEMPO_MAXIMO_CHAT_MS = 15000;
const TIEMPO_POR_INTENTO_MS = 8000;

async function generarRespuestaIA(
  ai: GoogleGenAI,
  contents: any[],
  systemInstruction: string
): Promise<string | null> {
  const limite = Date.now() + TIEMPO_MAXIMO_CHAT_MS;
  let ultimoError: any = null;

  for (let intento = 0; ; intento++) {
    const restante = limite - Date.now();
    if (restante < 1000) break;

    try {
      const respuesta = await ai.models.generateContent({
        model: MODELOS_CHAT[intento % MODELOS_CHAT.length],
        contents,
        config: {
          systemInstruction,
          temperature: 0.6,
          // Corta el intento si el modelo no contesta a tiempo
          abortSignal: AbortSignal.timeout(Math.min(TIEMPO_POR_INTENTO_MS, restante)),
        },
      });
      const texto = respuesta.text?.trim();
      if (texto) return texto;
    } catch (err: any) {
      ultimoError = err;
      // Clave inválida, permisos o pedido mal armado: reintentar no lo arregla
      if (err?.status && ![429, 500, 503].includes(err.status)) {
        console.warn(`[CHAT] Gemini rechazó el pedido (${err.status}): ${String(err.message).slice(0, 200)}`);
        return null;
      }
    }

    // Pausa corta después de probar los dos modelos
    if (intento % MODELOS_CHAT.length === MODELOS_CHAT.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.warn(
    `[CHAT] Gemini no respondió a tiempo (${ultimoError?.status ?? ultimoError?.name ?? "sin detalle"}). Se usa la respuesta fija.`
  );
  return null;
}

const CLINICAL_VET_FALLBACKS: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ["ayuno", "ecografia", "ecografía", "estudio", "analisis", "sangre", "preparar", "preparacion"],
    response:
      "🐾 **Preparación para estudios clínicos en VetAnimal:**\n\n• **Ecografía Abdominal:** Requiere de 8 a 10 horas de ayuno sólido (se puede mantener agua hasta 2 horas antes). Es ideal evitar que orine 1 hora previa para evaluar vejiga.\n• **Análisis de Sangre y Perfil Prequirúrgico:** Ayuno de 8 a 12 horas.\n• **Radiografías Digitales:** En general no requieren ayuno, excepto si el veterinario indicó sedación ligera.\n\n¿Querés que te ayude a agendar un turno para el estudio?",
  },
  {
    keywords: ["vacuna", "vacunas", "vacunacion", "vacunación", "antirrabica", "antirrábica", "cachorro", "gatito", "sextuple", "triple"],
    response:
      "🐾 **Plan de Vacunación y Prevención:**\n\n• **Caninos (Perros):** Inicio a los 45 días con Séxtuple/Óctuple (parvovirus, moquillo, hepatitis), con 2 o 3 refuerzos cada 21-30 días. A partir de los 3 meses se aplica la vacuna Antirrábica obligatoria anual.\n• **Felinos (Gatos):** Triple Felina (panleucopenia, rinotraqueítis, calicivirus) a los 60 días con su refuerzo, más Antirrábica anual.\n\n*Recomendación médica:* Antes de vacunar, la mascota debe estar clínicamente sana y desparasitada.",
  },
  {
    keywords: ["horario", "horarios", "donde", "dónde", "direccion", "dirección", "ubicacion", "ubicación", "queda", "telefono", "teléfono"],
    response:
      "🏥 **VetAnimal - Clínica Veterinaria Del Viso:**\n\n• **Sede Central:** Av. Eduardo Madero 1250, Del Viso (Partido del Pilar, Bs. As.).\n• **Horarios de Atención:** Lunes a Sábados de 08:30 a 20:00 hs.\n• **Teléfono de Recepción:** 11 6426-0688.\n• **Red de Derivaciones:** Centro Asociado Tortuguitas en Cura Brochero 1420.",
  },
  {
    keywords: ["cardio", "cardiografia", "cardiografía", "doppler", "ecocardiograma", "rayos", "radiografia", "radiología", "derivacion", "derivación", "tortuguitas"],
    response:
      "❤️ **Estudios Especializados & Red de Interconsultas:**\n\nEn VetAnimal contamos con servicio de **Cardiografía, Ecocardiograma Doppler y Radiología Digital HD**. Además, articulamos con nuestro centro asociado de **Tortuguitas (Cura Brochero 1420)** para estudios con aparatología de alta complejidad.\n\nPodés solicitar tu **Turno Especializado** con derivación médica oficial directamente desde la sección *Turnos Especializados* de nuestra web.",
  },
  {
    keywords: ["turno", "turnos", "agendar", "reservar", "cita", "pedir turno"],
    response:
      "📅 **Reserva de Turnos Online en VetAnimal:**\n\nPodés sacar turno en menos de 2 minutos:\n1. Ingresá a **Reservar Turno** (/booking) para consultas generales, vacunación o desparasitación.\n2. O elegí **Turnos Especializados** si tu mascota precisa Cardiografía, Doppler o Rayos X.\n3. Seleccionás tu mascota, profesional y horario de preferencia y listo.",
  },
  {
    keywords: ["no come", "anorexia", "vomito", "vómito", "diarrea", "decaido", "decaído", "fiebre"],
    response:
      "⚠️ **Atención y Observación Clínica:**\n\nSi tu perro o gato presenta vómitos reiterados, diarrea abundante o lleva más de 24 horas sin comer o beber agua, no esperes: puede tratarse de una deshidratación o cuadro infeccioso.\n\nTe sugerimos no medicar por tu cuenta (muchos fármacos humanos como paracetamol o ibuprofeno son sumamente tóxicos para mascotas) y acercarte a nuestra clínica en Av. Eduardo Madero 1250 o comunicarte con nuestra guardia.",
  },
  {
    keywords: ["ahoga", "respirar", "urgencia", "emergencia", "convulsion", "convulsión", "sangre", "sangrado", "veneno", "intoxic", "atragant"],
    response:
      "🚨 **¡ATENCIÓN - POSIBLE URGENCIA VETERINARIA!**\n\n1. **Trasladate de inmediato:** Acudí a nuestra guardia médica presencial en **Av. Eduardo Madero 1250, Del Viso** o al centro veterinario de urgencia más cercano.\n2. **Mantené la calma:** El estrés acelera el ritmo cardíaco y empeora la dificultad respiratoria del animal.\n3. **Vías aéreas:** Asegurate de que el cuello esté recto y no comprimido. No suministres líquidos ni medicamentos caseros por la boca.\n4. **Teléfono de guardia:** 11 6426-0688.",
  },
];

// Cada respuesta con IA tiene costo: se limita la cantidad de mensajes por visitante
const limiteChat = limitar({
  ventanaMs: 60 * 1000,
  max: 15,
  mensaje: "Estás enviando muchos mensajes seguidos. Esperá un minuto y volvé a escribir.",
});

app.post("/api/chat", limiteChat, async (req, res) => {
  try {
    const { message, history } = req.body;
    const userMessage = str(message).trim();

    if (!userMessage) {
      return res.status(400).json({ error: "El mensaje no puede estar vacío." });
    }
    if (userMessage.length > 2000) {
      return res.status(400).json({ error: "El mensaje es demasiado largo." });
    }

    const ai = getGeminiClient();

    if (ai) {
      // Si el usuario inició sesión, el asistente conoce sus mascotas registradas
      const mascotas = req.user
        ? await query(
            "SELECT nombre, especie, raza, edad FROM mascotas WHERE usuario_id = ? AND activo",
            [req.user.id]
          )
        : [];
      const petDetails = mascotas.length
        ? `Mascotas registradas del usuario: ${mascotas
            .map((m) => `${m.nombre} (${m.especie}${m.raza ? `, ${m.raza}` : ""}${m.edad != null ? `, ${m.edad} años` : ""})`)
            .join("; ")}.`
        : "El usuario no tiene mascotas registradas o no inició sesión.";

      // Servicios y precios leídos de la base: el asistente responde con los datos reales
      const servicios = await query(
        "SELECT nombre, categoria, duracion_min, precio FROM servicios ORDER BY id"
      );
      const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
      const serviceDetails = servicios.length
        ? `5. Servicios y precios vigentes de la clínica (en pesos argentinos):
${servicios
  .map(
    (s) =>
      `   - ${s.nombre}${s.categoria === "especializado" ? " (estudio especializado)" : ""}: ${pesos.format(s.precio)}, turno de ${s.duracion_min} minutos.`
  )
  .join("\n")}
   - Si preguntan cuánto sale un servicio, respondé con el precio de esta lista y aclará que se confirma al reservar el turno.
   - Si el servicio no figura en la lista, decí que no tenés ese dato y sugerí consultar en la clínica. NUNCA inventes precios.`
        : "";

      const systemInstruction = `Sos "VetBot", el asistente clínico virtual inteligente de "VetAnimal Clínica Veterinaria", ubicada en Av. Eduardo Madero 1250, Del Viso (Partido del Pilar, Buenos Aires).

Tu rol es responder de forma concisa, cálida, profesional y empática a preguntas simples y frecuentes de tutores de mascotas (perros, gatos y otros animales):
1. Información de la clínica:
   - Sede Central: Av. Eduardo Madero 1250, Del Viso (Pilar).
   - Horarios: Lunes a Sábados de 08:30 a 20:00 hs.
   - Red de interconsultas y derivación médica: Centro Asociado Tortuguitas (Cura Brochero 1420) para aparatología y estudios de alta complejidad (Cardiografía, Ecocardiograma Doppler, Radiología Digital).
   - Servicios: Clínica general, vacunación, desparasitación, farmacia y alimentos clínicos, turnos online, historial médico digital con placas radiográficas.
2. Cuidados y preparación para estudios:
   - Ecografía abdominal: 8 a 10 hs de ayuno sólido, vejiga llena si es posible.
   - Análisis de sangre: 8 a 12 hs de ayuno.
   - Vacunación en cachorros/gatitos y refuerzos anuales.
   - Pautas básicas de prevención, higiene y nutrición.
3. Límites médicos importantes:
   - NUNCA diagnosticar enfermedades complejas ni recetar dosis farmacológicas específicas por chat.
   - Si detectás un cuadro de urgencia (dificultad respiratoria aguda, traumatismo grave, convulsiones, sangrado profuso o ingestión de veneno/cuerpos extraños), avisá inmediatamente que deben acudir a la guardia presencial en Av. Eduardo Madero 1250.
4. Tono y formato:
   - Sé breve, cercano y fácil de leer en pantallas de celular (usá viñetas cortas y emojis sutiles).
   - Español rioplatense o neutro cálido.
   - Podés invitar al usuario a usar las secciones de la app: "Reservar Turno" (/booking), "Historial Clínico" (/historial) o "Tienda" (/tienda).
   - No uses enlaces en formato markdown: nombrá la sección tal como figura arriba.
${serviceDetails}
${petDetails}`;

      // Armar contenido para Gemini
      const contentsPayload: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        // Tomar hasta los últimos 6 mensajes para contexto conversacional
        const recentHistory = history.slice(-6);
        for (const h of recentHistory) {
          if (h.role === "user" || h.role === "assistant" || h.role === "model") {
            contentsPayload.push({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: String(h.content || h.text || "") }],
            });
          }
        }
      }
      contentsPayload.push({
        role: "user",
        parts: [{ text: userMessage }],
      });

      const replyText = await generarRespuestaIA(ai, contentsPayload, systemInstruction);
      if (replyText) {
        return res.json({ reply: replyText, source: "gemini-ai" });
      }
    }

    // Respuesta con fallback de conocimiento clínico si Gemini no está configurado o falló
    const lower = userMessage.toLowerCase();
    const matched = CLINICAL_VET_FALLBACKS.find((f) =>
      f.keywords.some((k) => lower.includes(k))
    );

    if (matched) {
      return res.json({ reply: matched.response, source: "clinical-knowledge-base" });
    }

    // Respuesta de bienvenida/orientación por defecto
    const defaultReply =
      "🐾 ¡Hola! Soy **VetBot**, el asistente de **VetAnimal Del Viso**.\n\nPodés consultarme sobre:\n• **Preparación para estudios** (ayuno de ecografías o análisis de sangre)\n• **Plan de vacunas y desparasitación** para cachorros y gatitos\n• **Horarios y ubicación** de nuestra sede en Del Viso y centro de Tortuguitas\n• **Cómo reservar turnos** clínicos o especializados (Cardiología / Rx)\n\n¿Sobre cuál de estos temas te gustaría saber más?";

    return res.json({ reply: defaultReply, source: "clinical-knowledge-base" });
  } catch (error: any) {
    console.error("Error en endpoint /api/chat:", error);
    return res.status(500).json({
      error: "Ocurrió un error al procesar tu consulta.",
      reply: "Disculpá, tuvimos un inconveniente temporal al responder. Por favor intentá nuevamente o comunicate con la clínica al (02320) 47-1234.",
    });
  }
});

// Corta el arranque con un mensaje claro si la base no está lista
async function checkDatabase() {
  try {
    await asegurarBase();
  } catch (err: any) {
    console.error(`\n[DB] No se pudo usar la base "${dbConfig.database}" en ${dbConfig.host}:${dbConfig.port} (${err.code || err.message}).`);
    console.error("[DB] Revisá que POSTGRES_URL (Supabase) esté configurada en el entorno.\n");
    process.exit(1);
  }
}

const estadoEmail = () =>
  emailConfigurado()
    ? `[EMAIL] Envío real activado desde ${CLINICA.email}`
    : "[EMAIL] Envío desactivado: falta SMTP_PASS en .env (los emails solo se anotan en esta consola)";

const estadoChat = () =>
  getGeminiClient()
    ? "[CHAT] Respuestas con IA activadas"
    : "[CHAT] Sin GEMINI_API_KEY en .env: el chat responde con textos fijos";

// Relee el archivo .env cuando cambia, para tomar claves nuevas (correo, chat con IA)
// sin reiniciar el servidor. La conexión a la base no se rearma: un cambio en DB_*
// sí necesita reiniciar.
function vigilarEnv() {
  const archivo = path.join(process.cwd(), ".env");
  fs.watchFile(archivo, { interval: 1500 }, (actual, anterior) => {
    if (actual.mtimeMs === anterior.mtimeMs) return;
    dotenv.config({ path: archivo, override: true, quiet: true });
    geminiAiClient = null;
    console.log("\n[.env] Cambios detectados, configuración recargada:");
    console.log(estadoEmail());
    console.log(estadoChat());
  });
}

// --- VITE SERVING & PRODUCTION SETUP ---
async function startServer() {
  await checkDatabase();
  vigilarEnv();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\nVetAnimal listo en http://localhost:${PORT}`);
    console.log(estadoEmail());
    console.log(estadoChat());
  });
}

// En Vercel el servidor no escucha un puerto: api/index.ts exporta la app como función
if (!process.env.VERCEL) startServer();

export default app;
