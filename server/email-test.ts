// Prueba el envío de emails con la configuración SMTP del archivo .env.
//
//   npm run email:test                     envía un email de prueba a la casilla de la clínica
//   npm run email:test -- otro@correo.com  lo envía a esa dirección

import "dotenv/config";
import { CLINICA, enviarEmail, verificarEmail } from "./email";

async function main() {
  const destinatario = process.argv[2] || CLINICA.email;

  const conexion = await verificarEmail();
  if (!conexion.ok) {
    console.error(`No se puede enviar correo: ${conexion.detalle}`);
    console.error("Los pasos para configurarlo están en el README (sección «Emails reales»).");
    process.exit(1);
  }
  console.log(`Conexión con el servidor de correo: OK (${conexion.detalle})`);

  const { delivered } = await enviarEmail({
    to: destinatario,
    subject: "Prueba de correo de VetAnimal",
    html: `<p>Este es un email de prueba de <strong>${CLINICA.nombre}</strong>.</p><p>Si lo estás leyendo, el envío de correos funciona.</p>`,
  });

  if (!delivered) {
    console.error("El servidor de correo aceptó la conexión pero no se pudo enviar el mensaje (ver el detalle arriba).");
    process.exit(1);
  }
  console.log(`Email de prueba enviado a ${destinatario}. Revisá la bandeja de entrada (y la carpeta de spam).`);
}

main();
