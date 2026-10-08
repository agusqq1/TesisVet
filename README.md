# VetAnimal

Sistema de gestión veterinaria: turnos online, historia clínica, mascotas, derivaciones a otros centros, tienda y panel para el personal de la clínica.

- **Frontend:** React + Vite + Tailwind (`src/`)
- **Backend:** Express (`server.ts` y `server/`)
- **Base de datos:** PostgreSQL en Supabase (`db/`)
- **Hosting:** Vercel (`api/index.ts` sirve la API como función). Cada push a `main` publica solo en https://vetanimal.vercel.app

## Requisitos

- Node.js
- Docker Desktop (opcional, solo para la herramienta de tablas Adminer)

## Primera vez

1. Instalar dependencias: `npm install`
2. Tener en `.env` la conexión a Supabase (`POSTGRES_URL`) y las claves opcionales (ver más abajo)
3. Iniciar la app: `npm run dev` (al arrancar crea las tablas que falten y, si la base está vacía, carga los datos iniciales)

## Uso diario

```
npm run dev
```

| Dirección | Qué es |
|---|---|
| http://localhost:3000 | La aplicación en tu PC (usa la misma base que la web publicada) |
| https://vetanimal.vercel.app | La aplicación publicada |
| http://localhost:8080 | Adminer, para ver y editar las tablas (con `npm run db:admin`) |

`npm run dev` se reinicia solo cuando cambia el código del servidor. Las claves de correo y del chat se toman al guardar el archivo `.env`, sin reiniciar.

**Ojo:** tu `npm run dev` y la web publicada comparten la base. Lo que cargues o borres en tu PC se ve en la web, y al revés.

## Cuentas de demostración

Se crean solas la primera vez que arranca la app con la base vacía. Se ingresa escribiendo el email y la contraseña en la pantalla de login.

| Rol | Email | Contraseña |
|---|---|---|
| Veterinario / administrador | admin@vetanimal.com | Admin2026! |
| Cliente | agustina.gomez@example.com | 123456 |

**Antes de usar el sistema con datos reales hay que cambiar estas contraseñas o borrar estas cuentas.**

## Ver y editar las tablas

Hay dos formas, y se pueden usar las dos:

1. **Panel de Supabase** (sin instalar nada): https://supabase.com/dashboard → tu proyecto → **Table Editor**. Para consultas, **SQL Editor**.
2. **Adminer en tu PC** (parecido a phpMyAdmin, pero para PostgreSQL). Con Docker Desktop abierto:

   | Comando | Qué hace |
   |---|---|
   | `npm run db:admin` | Abre Adminer en http://localhost:8080 |
   | `npm run db:admin:stop` | Lo cierra |

   En la pantalla de ingreso: Sistema **PostgreSQL**, el servidor ya viene completado, usuario y contraseña son los de `POSTGRES_URL_NON_POOLING` en el `.env` (la parte `postgres.xxxx:contraseña@`), base de datos `postgres`.

| Comando | Qué hace |
|---|---|
| `npm run db:reset` | **Borra todo** en la base (también lo de la web publicada) y vuelve a cargar los datos iniciales |

- **Esquema:** `db/schema.sql`
- **Datos iniciales:** `db/seed-data.ts` (o `data_storage.json`, si existe, con los datos de la versión anterior)
- **Imágenes subidas** (fotos de mascotas, radiografías): carpeta `uploads/`; en la base se guarda solo la ruta
- **Horarios de atención:** tabla `horarios_veterinario`, una fila por veterinario, día y franja. La agenda online solo ofrece turnos dentro de esas franjas.
- **Veterinarias móviles:** operativos de castración y vacunación que se cargan y se editan desde el panel y se ven en el mapa público (`/veterinarias-moviles`, con OpenStreetMap). Los clientes eligen de qué localidades quieren avisos y reciben un email cuando se publica uno o cuando cambia su día, horario o lugar. Las localidades están en `src/zonas.ts`.
- **Pago con tarjeta (simulado):** en el carrito se puede pagar con tarjeta, pero no hay ningún cobro real ni interviene un medio de pago. El número y el código de seguridad se validan en el navegador y no llegan al servidor; en la tabla `pagos` quedan solo la marca y los últimos 4 dígitos. Para probar: tarjeta `4111 1111 1111 1111`, cualquier vencimiento futuro y código; con `FUND` u `OTHE` como nombre del titular el pago se rechaza. En el panel esos pedidos figuran como "Pago online simulado". **Antes de vender de verdad hay que reemplazarlo por un medio de pago real o quitar la opción del carrito.**
- **Doctores:** se agregan, se editan y se dan de baja desde el panel, en la sección Doctores, con sus días y horario de atención. Si no se les carga una contraseña inicial, reciben un email con un enlace para elegirla (necesita el envío de emails configurado). La baja no borra nada: el profesional deja de ingresar y de recibir turnos, sus turnos futuros se cancelan y su historial se conserva; se lo puede reincorporar.

## Funciones opcionales (`.env`)

**Chat con IA.** Sin configurar, el asistente responde con una base de respuestas fijas. Para que responda con Gemini:

1. Crear una clave en https://aistudio.google.com/apikey
2. Agregar en `.env`: `GEMINI_API_KEY=la-clave`
3. Guardar el archivo: la consola del servidor avisa que el chat con IA quedó activado

**Emails reales** (confirmación de turnos y pedidos, órdenes de derivación, bienvenida, recuperación de contraseña). Sin configurar no se envía nada: cada email queda anotado en la consola del servidor, y el enlace de recuperación de contraseña también se muestra ahí para poder probar. Con una cuenta de Gmail:

1. Activar la verificación en dos pasos de la cuenta
2. Crear una contraseña de aplicación en https://myaccount.google.com/apppasswords
3. Completar en `.env`: `SMTP_USER=la-cuenta@gmail.com` y `SMTP_PASS=la-contraseña-de-aplicación` (las 16 letras, sin espacios)
4. Probar con `npm run email:test`: envía un email de prueba a la casilla de la clínica y, si algo falla, dice por qué

Al arrancar, la consola del servidor indica si el envío real está activado.

**Imágenes en la nube.** Con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env` (y en Vercel), las fotos de mascotas, radiografías e imágenes de productos se guardan en Supabase Storage (bucket `imagenes`, se crea solo) y quedan para siempre. Sin esas variables van a la carpeta `uploads/` de la PC, que en Vercel se borra en cada deploy.

**Notificaciones push y recordatorios de veterinarias móviles.**

1. Generar las claves una sola vez: `npx web-push generate-vapid-keys`
2. Cargar en `.env` y en Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (`mailto:` + el email de la clínica)
3. Cargar `CRON_SECRET` (cualquier texto largo al azar) en `.env` y en Vercel: el cron de Vercel (`vercel.json`) llama todos los días a las 09:00 a `/api/tareas/recordatorios` con ese secreto y manda el recordatorio del día anterior por push y por email. En la PC, el servidor hace la misma revisión cada media hora.

Los clientes activan las notificaciones desde Veterinarias móviles, debajo de sus localidades ("Notificaciones en este dispositivo"). Sin claves VAPID, los avisos salen solo por email.

## Seguridad

- Las contraseñas se guardan cifradas con bcrypt.
- La sesión viaja en una cookie `httpOnly`; en la base queda solo el hash del token (tabla `sesiones`).
- Cada ruta de la API valida la sesión y el rol: un cliente solo accede a sus mascotas, turnos, pedidos e historia clínica; el alta de registros médicos, productos y derivaciones es solo para el personal.
- Los registros médicos quedan a nombre del profesional que tiene la sesión iniciada.

## Estructura

```
server.ts          Rutas de la API y arranque
server/auth.ts     Sesiones, permisos y límite de intentos
server/agenda.ts   Cálculo de horarios disponibles
server/email.ts    Envío de emails y plantillas
db/                Esquema, conexión, datos iniciales, backup
src/               Aplicación React (páginas, componentes, contexto)
```

## Producción

- `npm run build` genera `dist/`; `npm start` lo sirve.
- En Vercel, definir `APP_URL=https://vetanimal.vercel.app`, `POSTGRES_URL`, `SMTP_USER`, `SMTP_PASS` y `GEMINI_API_KEY` en Settings → Environment Variables.
- Usar HTTPS: la cookie de sesión se marca como segura automáticamente.
