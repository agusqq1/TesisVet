// La base se prepara sola al arrancar el servidor (ver db/init.ts).
// Este script queda para casos manuales:
//
//   npm run db:reset   borra todas las tablas y vuelve a cargar todo desde cero

import { pool } from "./pool.js";
import { prepararBaseDeDatos } from "./init.js";

prepararBaseDeDatos({ reset: process.argv.includes("--reset") })
  .then(() => console.log("Base de datos lista."))
  .catch((err) => {
    console.error("\nNo se pudo preparar la base de datos:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error("¿Está corriendo MySQL? Probá con `npm run db:up` y esperá unos segundos.");
    }
    process.exitCode = 1;
  })
  .finally(() => pool.end());
