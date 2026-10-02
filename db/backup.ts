// Copia de seguridad de la base: genera backups/vetanimal-FECHA_HORA.sql con todas
// las tablas y datos, usando mysqldump dentro del contenedor de Docker.
//
//   npm run db:backup
//
// Para restaurar una copia:
//   docker exec -i vetanimal-mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < backups/ARCHIVO.sql
//
// Las imágenes subidas no están en la base: hay que copiar también la carpeta uploads/.

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const CONTENEDOR = "vetanimal-mysql";

const carpeta = path.join(process.cwd(), "backups");
fs.mkdirSync(carpeta, { recursive: true });

const ahora = new Date();
const dos = (n: number) => String(n).padStart(2, "0");
const marca = `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}_${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;
const archivo = path.join(carpeta, `vetanimal-${marca}.sql`);

const dump = spawn("docker", [
  "exec",
  CONTENEDOR,
  "sh",
  "-c",
  'mysqldump --no-tablespaces --single-transaction -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"',
]);

dump.stdout.pipe(fs.createWriteStream(archivo));

let errores = "";
dump.stderr.on("data", (d) => (errores += d));

dump.on("error", () => {
  console.error("No se pudo ejecutar Docker. ¿Está abierto Docker Desktop?");
  process.exit(1);
});

dump.on("close", (codigo) => {
  if (codigo !== 0) {
    fs.rmSync(archivo, { force: true });
    console.error("No se pudo generar la copia:", errores.trim() || `código ${codigo}`);
    console.error("¿Está corriendo la base? Probá con `npm run db:up`.");
    process.exit(1);
  }
  const kb = Math.round(fs.statSync(archivo).size / 1024);
  console.log(`Copia de seguridad guardada en ${path.relative(process.cwd(), archivo)} (${kb} KB)`);
  console.log("Recordá copiar también la carpeta uploads/ (fotos y radiografías).");
});
