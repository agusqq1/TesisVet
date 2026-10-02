# VetAnimal

Sistema de gestión veterinaria: turnos online, historia clínica, mascotas, derivaciones a otros centros, tienda y panel para el personal de la clínica.

- **Frontend:** React + Vite + Tailwind (`src/`)
- **Backend:** Express (`server.ts` y `server/`)
- **Base de datos:** MySQL 8 en Docker (`db/`)

## Requisitos

- Node.js
- Docker Desktop

## Primera vez

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` como `.env` y elegir las contraseñas `DB_PASSWORD` y `DB_ROOT_PASSWORD`
3. Abrir Docker Desktop y levantar la base: `npm run db:up`
4. Crear las tablas y cargar los datos iniciales: `npm run db:setup`
5. Iniciar la app: `npm run dev`

## Uso diario

Con Docker Desktop abierto:

```
npm run db:up
npm run dev
```

| Dirección | Qué es |
|---|---|
| http://localhost:3000 | La aplicación |
| http://localhost:8080 | phpMyAdmin, para ver y editar las tablas |

`npm run dev` se reinicia solo cuando cambia el código del servidor. Las claves de correo y del chat se toman al guardar el archivo `.env`, sin reiniciar; un cambio en los datos `DB_*` sí necesita reiniciar.

## Cuentas de demostración

Las crea `npm run db:setup`. Se ingresa escribiendo el email y la contraseña en la pantalla de login.

| Rol | Email | Contraseña |
|---|---|---|
| Veterinario / administrador | admin@vetanimal.com | Admin2026! |
| Cliente | agustina.gomez@example.com | 123456 |

**Antes de usar el sistema con datos reales hay que cambiar estas contraseñas o borrar estas cuentas.**

## Comandos de la base de datos

| Comando | Qué hace |
|---|---|
| `npm run db:up` | Levanta MySQL y phpMyAdmin en Docker |
| `npm run db:down` | Los detiene (los datos no se pierden) |
| `npm run db:setup` | Crea las tablas que falten y carga datos si la base está vacía. Hay que correrlo después de actualizar el código si se agregaron tablas |
| `npm run db:reset` | Borra todo y vuelve a cargar los datos iniciales |
| `npm run db:backup` | Guarda una copia de la base en `backups/` |

- **Esquema:** `db/schema.sql`
- **Datos iniciales:** `db/seed-data.ts` (o `data_storage.json`, si existe, con los datos de la versión anterior)
- **Imágenes subidas** (fotos de mascotas, radiografías): carpeta `uploads/`; en la base se guarda solo la ruta
- **Horarios de atención:** tabla `horarios_veterinario`, una fila por veterinario, día y franja. La agenda online solo ofrece turnos dentro de esas franjas.
- **Veterinarias móviles:** operativos de castración y vacunación que se cargan desde el panel y se ven en el mapa público (`/veterinarias-moviles`, con OpenStreetMap). Los clientes eligen de qué localidades quieren avisos y reciben un email cuando se publica uno. Las localidades están en `src/zonas.ts`.
- **Pago con tarjeta (simulado):** en el carrito se puede pagar con tarjeta, pero no hay ningún cobro real ni interviene un medio de pago. El número y el código de seguridad se validan en el navegador y no llegan al servidor; en la tabla `pagos` quedan solo la marca y los últimos 4 dígitos. Para probar: tarjeta `4111 1111 1111 1111`, cualquier vencimiento futuro y código; con `FUND` u `OTHE` como nombre del titular el pago se rechaza. En el panel esos pedidos figuran como "Pago online simulado". **Antes de vender de verdad hay que reemplazarlo por un medio de pago real o quitar la opción del carrito.**
- **Doctores:** se agregan desde el panel, en la sección Doctores, con sus días y horario de atención. Si no se les carga una contraseña inicial, reciben un email con un enlace para elegirla (necesita el envío de emails configurado).

Los datos de MySQL viven en el volumen de Docker `mysql_data`. Para borrarlo por completo: `docker compose down -v`.

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
- Definir `NODE_ENV=production`, `APP_URL` y las variables `DB_*` del servidor de base de datos.
- Usar HTTPS: la cookie de sesión se marca como segura automáticamente.
