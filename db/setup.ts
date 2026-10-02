// Prepara la base de datos: crea las tablas (db/schema.sql) y, si están vacías,
// carga los datos iniciales.
//
//   npm run db:setup   crea lo que falte; no toca datos existentes
//   npm run db:reset   borra todas las tablas y vuelve a cargar todo desde cero
//
// Si existe data_storage.json (el archivo que usaba la versión anterior), se
// importan esos datos; si no, se usan los de demostración de db/seed-data.ts.

import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";
import { dbConfig, pool } from "./pool";
import { guardarImagen } from "./imagenes";
import * as seed from "./seed-data";

const TABLAS = [
  "sesiones",
  "recuperaciones_password",
  "horarios_veterinario",
  "pedido_items",
  "pedidos",
  "productos",
  "estudios",
  "vacunas",
  "consultas",
  "turnos",
  "derivaciones",
  "centros_derivacion",
  "servicios",
  "mascotas",
  "usuarios",
];

// La primera vez, el contenedor de MySQL tarda unos segundos en aceptar conexiones.
async function conectar(): Promise<Connection> {
  const reintentables = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST"];
  for (let intento = 1; ; intento++) {
    try {
      return await mysql.createConnection({ ...dbConfig, multipleStatements: true });
    } catch (err: any) {
      if (!reintentables.includes(err.code) || intento >= 30) throw err;
      if (intento === 1) console.log("Esperando a que MySQL termine de iniciar...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

function leerDatos() {
  const datos: Record<string, any[]> = {
    users: seed.users,
    pets: seed.pets,
    turnos: seed.turnos,
    consultas: seed.consultas,
    vacunas: seed.vacunas,
    estudios: seed.estudios,
    centrosDerivacion: seed.centrosDerivacion,
    derivaciones: seed.derivaciones,
    products: seed.products,
    orders: [],
  };

  const jsonPath = path.join(process.cwd(), "data_storage.json");
  if (fs.existsSync(jsonPath)) {
    const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    for (const clave of Object.keys(datos)) {
      if (Array.isArray(json[clave])) datos[clave] = json[clave];
    }
    console.log("Origen de los datos: data_storage.json (datos de la versión anterior)");
  } else {
    console.log("Origen de los datos: db/seed-data.ts (datos de demostración)");
  }
  return datos;
}

async function cargarDatos(conn: Connection) {
  const datos = leerDatos();
  const insertar = (tabla: string, fila: Record<string, any>) =>
    conn.query(`INSERT INTO ${tabla} SET ?`, [fila]);

  const matriculas = new Map(seed.users.map((u: any) => [u.id, u.matricula ?? null]));
  const usuarios = new Set<number>();
  const mascotas = new Set<number>();
  const centros = new Set<string>();
  const derivaciones = new Set<number>();
  const productos = new Set<number>();
  let omitidos = 0;

  for (const u of datos.users) {
    await insertar("usuarios", {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password_hash: bcrypt.hashSync(String(u.password ?? ""), 10),
      rol: u.rol === "veterinario" ? "veterinario" : "cliente",
      telefono: u.telefono || "",
      especialidad: u.especialidad ?? null,
      matricula: u.matricula ?? (u.rol === "veterinario" ? matriculas.get(u.id) ?? null : null),
      foto: u.foto ?? null,
    });
    usuarios.add(u.id);

    // Horario de atención inicial de cada veterinario: lunes a sábado de 08:30 a 20:00.
    // Se ajusta desde la tabla horarios_veterinario.
    if (u.rol === "veterinario") {
      for (let dia = 1; dia <= 6; dia++) {
        await insertar("horarios_veterinario", {
          veterinario_id: u.id,
          dia_semana: dia,
          hora_inicio: "08:30",
          hora_fin: "20:00",
        });
      }
    }
  }

  for (const p of datos.pets) {
    if (!usuarios.has(p.usuario_id)) { omitidos++; continue; }
    await insertar("mascotas", {
      id: p.id,
      usuario_id: p.usuario_id,
      nombre: p.nombre,
      especie: p.especie,
      raza: p.raza || "",
      edad: p.edad ?? null,
      peso: p.peso ?? null,
      foto: guardarImagen(p.foto),
      estado_salud: p.estado_salud || "Estable",
      alergias: p.alergias ?? "",
      condiciones_cronicas: p.condiciones_cronicas ?? "",
      ...(p.creado_en && { creado_en: p.creado_en }),
    });
    mascotas.add(p.id);
  }

  for (const s of seed.services as any[]) {
    await insertar("servicios", {
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracion_min: s.duracion_min,
      precio: s.precio,
      icono: s.icono,
      categoria: s.categoria,
      especialidad: s.especialidad ?? null,
      estudio_sugerido: s.estudio_sugerido ?? null,
      derivacion_habilitada: s.derivacion_habilitada ? 1 : 0,
    });
  }
  const servicios = new Map(seed.services.map((s) => [s.id, s.duracion_min]));

  for (const [orden, c] of datos.centrosDerivacion.entries()) {
    await insertar("centros_derivacion", {
      id: c.id,
      nombre: c.nombre,
      direccion: c.direccion,
      localidad: c.localidad,
      telefono: c.telefono || "",
      whatsapp: c.whatsapp ?? null,
      horarios: c.horarios || "",
      especialidades: JSON.stringify(c.especialidades ?? []),
      equipamiento: JSON.stringify(c.equipamiento ?? []),
      medico_responsable: c.medico_responsable || "",
      distancia_estimada: c.distancia_estimada || "",
      acepta_urgencias: c.acepta_urgencias ? 1 : 0,
      orden,
    });
    centros.add(c.id);
  }

  for (const d of datos.derivaciones) {
    const centroId = d.centro_destino?.id;
    if (!mascotas.has(d.mascota_id) || !usuarios.has(d.veterinario_emisor_id) || !centros.has(centroId)) {
      omitidos++;
      continue;
    }
    await insertar("derivaciones", {
      id: d.id,
      codigo: d.codigo,
      mascota_id: d.mascota_id,
      veterinario_emisor_id: d.veterinario_emisor_id,
      centro_destino_id: centroId,
      edad: d.edad ?? null,
      peso: d.peso ?? null,
      especialidad_derivada: d.especialidad_derivada,
      estudio_solicitado: d.estudio_solicitado,
      motivo_derivacion: d.motivo_derivacion,
      sospecha_diagnostica: d.sospecha_diagnostica,
      resumen_clinico: d.resumen_clinico ?? null,
      indicaciones_previas: d.indicaciones_previas ?? null,
      fecha_emision: d.fecha_emision,
      fecha_validez_hasta: d.fecha_validez_hasta,
      estado: d.estado || "activa",
      ...(d.creado_en && { creado_en: d.creado_en }),
    });
    derivaciones.add(d.id);
  }

  for (const t of datos.turnos) {
    if (!mascotas.has(t.mascota_id) || !servicios.has(t.servicio_id)) { omitidos++; continue; }
    await insertar("turnos", {
      id: t.id,
      mascota_id: t.mascota_id,
      servicio_id: t.servicio_id,
      veterinario_id: usuarios.has(t.veterinario_id) ? t.veterinario_id : null,
      fecha: t.fecha,
      hora: t.hora,
      duracion_min: servicios.get(t.servicio_id),
      estado: t.estado,
      notas: t.notas ?? "",
      es_especializado: t.es_especializado ? 1 : 0,
      especialidad: t.especialidad ?? null,
      estudio_solicitado: t.estudio_solicitado ?? null,
      sintomas_observados: t.sintomas_observados ?? null,
      tiene_estudios_previos: t.tiene_estudios_previos ? 1 : 0,
      derivacion_id: derivaciones.has(t.derivacion_id) ? t.derivacion_id : null,
      ...(t.creado_en && { creado_en: t.creado_en }),
    });
  }

  for (const c of datos.consultas) {
    if (!mascotas.has(c.mascota_id)) { omitidos++; continue; }
    await insertar("consultas", {
      id: c.id,
      mascota_id: c.mascota_id,
      veterinario_id: usuarios.has(c.veterinario_id) ? c.veterinario_id : null,
      fecha: c.fecha,
      tipo: c.tipo,
      titulo: c.titulo,
      descripcion: c.descripcion,
      ...(c.creado_en && { creado_en: c.creado_en }),
    });
  }

  for (const v of datos.vacunas) {
    if (!mascotas.has(v.mascota_id)) { omitidos++; continue; }
    await insertar("vacunas", {
      id: v.id,
      mascota_id: v.mascota_id,
      nombre: v.nombre,
      fecha_aplicacion: v.fecha_aplicacion ?? null,
      fecha_refuerzo: v.fecha_refuerzo ?? null,
    });
  }

  for (const e of datos.estudios) {
    if (!mascotas.has(e.mascota_id)) { omitidos++; continue; }
    await insertar("estudios", {
      id: e.id,
      mascota_id: e.mascota_id,
      nombre: e.nombre,
      tipo: e.tipo || "Radiografía",
      fecha: e.fecha,
      zona_anatomica: e.zona_anatomica ?? null,
      imagen_url: guardarImagen(e.imagen_url),
      observaciones: e.observaciones ?? null,
      veterinario_id: usuarios.has(e.veterinario_id) ? e.veterinario_id : null,
      veterinario_nombre: e.veterinario_nombre ?? null,
      institucion: e.institucion ?? null,
      resultado_url: e.resultado_url || "#",
    });
  }

  for (const p of datos.products) {
    await insertar("productos", {
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria || "Medicamentos",
      etiqueta: p.etiqueta || "",
      descripcion: p.descripcion || "",
      precio: p.precio,
      requiere_receta: p.requiere_receta ? 1 : 0,
      stock: Math.max(0, Number(p.stock) || 0),
      imagen: guardarImagen(p.imagen),
    });
    productos.add(p.id);
  }

  for (const o of datos.orders) {
    if (!usuarios.has(o.usuario_id)) { omitidos++; continue; }
    await insertar("pedidos", {
      id: o.id,
      usuario_id: o.usuario_id,
      total: o.total,
      estado: o.estado || "pendiente",
      ...(o.creado_en && { creado_en: o.creado_en }),
    });
    for (const it of o.items ?? []) {
      await insertar("pedido_items", {
        pedido_id: o.id,
        producto_id: productos.has(it.producto_id) ? it.producto_id : null,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        producto_nombre: it.producto_nombre || "Producto",
        producto_imagen: it.producto_imagen ?? null,
      });
    }
  }

  return omitidos;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const conn = await conectar();
  console.log(`Conectado a MySQL en ${dbConfig.host}:${dbConfig.port}, base "${dbConfig.database}"`);

  try {
    if (reset) {
      await conn.query(
        `SET FOREIGN_KEY_CHECKS = 0; DROP TABLE IF EXISTS ${TABLAS.join(", ")}; SET FOREIGN_KEY_CHECKS = 1;`
      );
      console.log("Tablas anteriores eliminadas.");
    }

    await conn.query(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf-8"));
    console.log("Esquema aplicado.");

    const [filas] = await conn.query("SELECT COUNT(*) AS total FROM usuarios");
    if ((filas as any[])[0].total > 0) {
      console.log("La base ya tiene datos: no se cargó nada. Para empezar de cero usá `npm run db:reset`.");
      return;
    }

    await conn.beginTransaction();
    try {
      const omitidos = await cargarDatos(conn);
      await conn.commit();
      if (omitidos > 0) {
        console.log(`Se omitieron ${omitidos} registros que apuntaban a datos inexistentes.`);
      }
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const resumen: string[] = [];
    for (const tabla of [...TABLAS].reverse()) {
      const [conteo] = await conn.query(`SELECT COUNT(*) AS total FROM ${tabla}`);
      resumen.push(`${tabla}: ${(conteo as any[])[0].total}`);
    }
    console.log(`Datos cargados → ${resumen.join(" · ")}`);
  } finally {
    await conn.end();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\nNo se pudo preparar la base de datos:", err.message);
  if (err.code === "ECONNREFUSED") {
    console.error("¿Está corriendo MySQL? Probá con `npm run db:up` y esperá unos segundos.");
  }
  process.exit(1);
});
