import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const EXTENSIONES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Dónde se guardan las imágenes que suben los usuarios (fotos de mascotas, radiografías,
// productos). Con SUPABASE_URL y una clave de servicio van a Supabase Storage, que es
// permanente y lo ve también la versión publicada. Sin esas variables, a la carpeta
// /uploads de esta PC (sirve para desarrollo; en Vercel el disco se borra).
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "imagenes";

export const almacenamientoEnNube = Boolean(SUPABASE_URL && SUPABASE_KEY);
export const descripcionAlmacenamiento = almacenamientoEnNube
  ? `Supabase Storage (bucket "${BUCKET}")`
  : "carpeta uploads/ de esta PC";

const cabeceras = (extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${SUPABASE_KEY}`,
  apikey: SUPABASE_KEY,
  ...extra,
});

// Crea el bucket público la primera vez. Si ya existe, Supabase responde 409 y seguimos.
let bucketListo: Promise<void> | null = null;
function asegurarBucket() {
  bucketListo ??= (async () => {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: cabeceras({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 15 * 1024 * 1024 }),
    });
    if (!res.ok && res.status !== 409) {
      const detalle = await res.text().catch(() => "");
      // "already exists" también puede venir como 400 según la versión de Storage
      if (!/exist/i.test(detalle)) {
        bucketListo = null;
        throw new Error(`No se pudo preparar el almacenamiento de imágenes (${res.status}): ${detalle.slice(0, 200)}`);
      }
    }
  })();
  return bucketListo;
}

async function subirANube(archivo: string, mime: string, datos: Buffer): Promise<string> {
  await asegurarBucket();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${archivo}`, {
    method: "POST",
    headers: cabeceras({ "Content-Type": mime, "x-upsert": "false", "cache-control": "public, max-age=31536000" }),
    body: new Uint8Array(datos),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    console.error(`[IMAGENES] Falló la subida a Supabase Storage (${res.status}): ${detalle.slice(0, 200)}`);
    throw Object.assign(new Error("No se pudo guardar la imagen. Intentá de nuevo en unos segundos."), { status: 502 });
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${archivo}`;
}

// Las fotos y radiografías llegan como data URL en base64. Se guardan como archivo (en la
// nube o en /uploads) y en la base queda solo la URL, para no llenar las tablas con megas
// de texto. Una URL común (http...) se devuelve tal cual.
export async function guardarImagen(valor: unknown): Promise<string | null> {
  if (typeof valor !== "string" || !valor) return null;
  if (!valor.startsWith("data:")) return valor;

  const coma = valor.indexOf(",");
  const [mime, encoding] = valor.slice(5, coma).split(";");
  const extension = EXTENSIONES[mime];
  if (coma === -1 || encoding !== "base64" || !extension) {
    throw Object.assign(
      new Error("Formato de imagen no soportado. Usá JPG, PNG, WebP o GIF."),
      { status: 400 }
    );
  }

  const archivo = `${randomUUID()}.${extension}`;
  const datos = Buffer.from(valor.slice(coma + 1), "base64");

  if (almacenamientoEnNube) return subirANube(archivo, mime, datos);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, archivo), datos);
  return `/uploads/${archivo}`;
}
