// Restablece la contraseña de un usuario directamente en la base. Sirve para las cuentas
// cuyo email no existe de verdad (las de demostración), que no pueden usar "¿Olvidaste
// tu contraseña?".
//
//   npm run password -- admin@vetanimal.com NuevaContraseña123
//
import "dotenv/config";
import bcrypt from "bcryptjs";
import { execute, queryOne, pool } from "./pool.js";

const [email, nueva] = process.argv.slice(2);

if (!email || !nueva) {
  console.error("Uso: npm run password -- <email> <nueva-contraseña>");
  process.exit(1);
}
if (nueva.length < 8) {
  console.error("La contraseña tiene que tener al menos 8 caracteres.");
  process.exit(1);
}

const usuario = await queryOne("SELECT id, nombre, rol, activo FROM usuarios WHERE email = ?", [email]);
if (!usuario) {
  console.error(`No hay ningún usuario con el email ${email}.`);
  await pool.end();
  process.exit(1);
}

await execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", [await bcrypt.hash(nueva, 10), usuario.id]);
// Cierra las sesiones abiertas de esa cuenta: a partir de ahora entra solo con la nueva
await execute("DELETE FROM sesiones WHERE usuario_id = ?", [usuario.id]);

console.log(`Contraseña actualizada para ${usuario.nombre} (${email}, ${usuario.rol}${usuario.activo ? "" : ", dado de baja"}).`);
await pool.end();
