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

// Las fotos y radiografías que sube el usuario llegan como data URL en base64.
// Se guardan como archivo en /uploads y en la base queda solo la ruta, para no
// llenar las tablas con megas de texto. Una URL común se devuelve tal cual.
export function guardarImagen(valor: unknown): string | null {
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

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const archivo = `${randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, archivo), Buffer.from(valor.slice(coma + 1), "base64"));
  return `/uploads/${archivo}`;
}
