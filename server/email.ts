// Envío de emails por SMTP y plantillas de los mensajes que manda el sistema.
// Sin SMTP_PASS configurado en .env no se envía nada: el mensaje solo se anota
// en la consola y `delivered` vuelve en false.

import nodemailer from "nodemailer";

const EMAIL_CLINICA_DEFAULT = "veterinariavet101@gmail.com";

export const CLINICA = {
  nombre: "VetAnimal",
  sede: "VetAnimal - Sede Del Viso / Pilar",
  telefono: "(011) 4000-1000",
  get email() {
    return (process.env.SMTP_USER || EMAIL_CLINICA_DEFAULT).trim();
  },
};

// Configuración de transporte de correo electrónico
const getMailTransporter = () => {
  let host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  // Validación de host: Si es puramente numérico (ej. "123456") o no tiene formato de host/dominio válido
  if (/^\d+$/.test(host) || !host.includes(".")) {
    host = "smtp.gmail.com";
  }

  // Validación de puerto: Debe ser un entero válido en el rango TCP [1, 65535]
  const rawPort = Number(process.env.SMTP_PORT);
  let port = 587;
  if (Number.isInteger(rawPort) && rawPort > 0 && rawPort < 65536) {
    port = rawPort;
  }

  const pass = (process.env.SMTP_PASS || "").trim();

  // Si la contraseña es un valor de prueba/dummy de configuración ("123456", "password", etc.) o está vacía,
  // evitamos disparar intentos fallidos contra servidores reales
  const isDummyPass =
    !pass ||
    pass === "123456" ||
    pass === "password" ||
    pass.startsWith("MY_") ||
    pass.length < 8;

  if (isDummyPass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: CLINICA.email, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
};

export const emailConfigurado = () => getMailTransporter() !== null;

// Prueba la conexión y el inicio de sesión contra el servidor de correo, sin enviar nada
export async function verificarEmail(): Promise<{ ok: boolean; detalle: string }> {
  const transporter = getMailTransporter();
  if (!transporter) {
    return { ok: false, detalle: "Falta SMTP_PASS en el archivo .env" };
  }
  try {
    await transporter.verify();
    return { ok: true, detalle: `Conectado como ${CLINICA.email}` };
  } catch (err: any) {
    const detalle =
      err.code === "EAUTH"
        ? "El servidor de correo rechazó el usuario o la contraseña. Con Gmail hay que usar una contraseña de aplicación, no la clave normal de la cuenta."
        : err.message;
    return { ok: false, detalle };
  }
}

export async function enviarEmail({
  to,
  subject,
  html,
  copiaClinica = false,
}: {
  to: string;
  subject: string;
  html: string;
  // Manda copia oculta a la casilla de la clínica
  copiaClinica?: boolean;
}): Promise<{ delivered: boolean }> {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.log(`[EMAIL NO ENVIADO] SMTP sin configurar. Para: ${to}. Asunto: "${subject}".`);
    return { delivered: false };
  }

  const from =
    process.env.SMTP_FROM && process.env.SMTP_FROM.includes("@")
      ? process.env.SMTP_FROM
      : `"VetAnimal Clínica Veterinaria" <${CLINICA.email}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      bcc: copiaClinica ? CLINICA.email : undefined,
      subject,
      text: html.replace(/<[^>]*>?/gm, ""),
      html,
    });
    console.log(`[EMAIL ENVIADO] A ${to} (ID: ${info.messageId})`);
    return { delivered: true };
  } catch (err: any) {
    console.warn(`[EMAIL FALLIDO] No se pudo enviar a ${to}: ${err.message}`);
    return { delivered: false };
  }
}

// Los textos que escriben los usuarios se escapan antes de meterlos en el HTML
export const esc = (valor: unknown) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const pesos = (monto: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);

function plantilla(titulo: string, subtitulo: string, cuerpo: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #1e3a8a; color: white; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">${titulo}</h2>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${subtitulo}</p>
      </div>
      <div style="padding: 24px;">
        ${cuerpo}
      </div>
      <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 11px; color: #64748b; text-align: center;">
        ${CLINICA.nombre} &bull; Tel: ${CLINICA.telefono} &bull; Email: ${CLINICA.email}
      </div>
    </div>
  `;
}

const caja = (contenido: string) =>
  `<div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 6px;">${contenido}</div>`;

const fila = (etiqueta: string, valor: unknown) =>
  `<p style="margin: 0 0 6px;"><strong>${etiqueta}:</strong> ${esc(valor)}</p>`;

export function emailTurno(t: {
  dueno: string;
  mascota: string;
  servicio: string;
  fecha: string;
  hora: string;
  veterinario: string;
  esEspecializado: boolean;
  esCirugia: boolean;
  sintomas?: string;
}) {
  const avisoEspecializado = t.esEspecializado
    ? `
      <div style="margin-top: 10px; padding: 10px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 13px; color: #1e40af;">
        <strong>Protocolo de interconsulta y alta complejidad:</strong>
        <p style="margin: 4px 0 0;">Este turno corresponde a una prestación médica especializada. En caso de requerir equipamiento específico o si el especialista no estuviese disponible en sede, el médico veterinario emitirá una orden de derivación a un centro de nuestra red.</p>
        ${t.sintomas ? `<p style="margin: 4px 0 0;"><strong>Síntomas registrados:</strong> ${esc(t.sintomas)}</p>` : ""}
      </div>`
    : "";

  const avisoCirugia = t.esCirugia
    ? `
      <div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; font-size: 13px; color: #92400e;">
        <strong>Protocolo pre-quirúrgico obligatorio:</strong>
        <ul style="margin: 6px 0 0; padding-left: 20px;">
          <li>Ayuno estricto de sólidos de 12 horas previas a la cirugía.</li>
          <li>Ayuno de líquidos (agua) de 6 horas previas.</li>
          <li>Presentarse con análisis prequirúrgicos (sangre y valoración cardiológica).</li>
        </ul>
      </div>`
    : "";

  return {
    subject: `Turno confirmado: ${t.mascota} - ${t.servicio} (${t.fecha} ${t.hora} hs)`,
    html: plantilla(
      "CONFIRMACIÓN DE TURNO VETERINARIO",
      `${CLINICA.nombre} &bull; Cita médica ${t.esEspecializado ? "especializada" : "confirmada"}`,
      `
        <p>Hola <strong>${esc(t.dueno)}</strong>,</p>
        <p>Te confirmamos que el turno para <strong>${esc(t.mascota)}</strong> ha sido programado con éxito.</p>
        ${caja(
          fila("Servicio", t.servicio) +
            fila("Fecha", t.fecha) +
            fila("Hora", `${t.hora} hs`) +
            fila("Veterinario asignado", t.veterinario) +
            avisoEspecializado +
            avisoCirugia
        )}
        <p style="font-size: 13px; color: #64748b;">
          Podés cancelar el turno desde tu perfil en la web. Por cualquier duda comunicate al ${CLINICA.telefono} o respondé este correo.
        </p>
      `
    ),
  };
}

// `orden` es una orden de derivación tal como la devuelve la API
export function emailDerivacion(orden: any) {
  const centro = orden.centro_destino;
  return {
    subject: `Orden médica de derivación #${orden.codigo} - ${orden.mascota_nombre} (${centro.nombre})`,
    html: plantilla(
      "ORDEN MÉDICA DE DERIVACIÓN E INTERCONSULTA",
      `${esc(orden.clinica_origen)} &bull; Código: <strong>${esc(orden.codigo)}</strong>`,
      `
        <p>Estimado/a <strong>${esc(orden.dueno_nombre)}</strong>,</p>
        <p>El equipo veterinario de ${CLINICA.nombre} emitió una <strong>orden de derivación médica</strong> para tu mascota <strong>${esc(orden.mascota_nombre)}</strong>.</p>
        ${caja(`
          <p style="margin: 0 0 8px; font-weight: bold; color: #1e3a8a;">Centro receptor:</p>
          <p style="margin: 0; font-size: 15px; font-weight: bold;">${esc(centro.nombre)}</p>
          <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">Dirección: ${esc(centro.direccion)} (${esc(centro.localidad)})</p>
          <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">Tel: ${esc(centro.telefono)} &bull; WhatsApp: ${esc(centro.whatsapp || "-")}</p>
          <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">Horarios: ${esc(centro.horarios)}</p>
        `)}
        <div style="margin: 16px 0; font-size: 13px; line-height: 1.6;">
          ${fila("Estudio solicitado", orden.estudio_solicitado)}
          ${fila("Especialidad", orden.especialidad_derivada)}
          ${fila("Motivo de derivación", orden.motivo_derivacion)}
          ${fila("Sospecha diagnóstica", orden.sospecha_diagnostica)}
          <p style="margin: 0 0 6px; color: #b45309;"><strong>Indicaciones previas:</strong> ${esc(orden.indicaciones_previas)}</p>
          ${fila("Profesional emisor", `${orden.veterinario_emisor_nombre} ${orden.veterinario_matricula ? `(${orden.veterinario_matricula})` : ""}`)}
          ${fila("Validez", `hasta el ${orden.fecha_validez_hasta}`)}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
          Podés presentar esta orden impresa o mostrarla desde tu celular al llegar a ${esc(centro.nombre)}.
        </p>
      `
    ),
  };
}

export function emailBienvenida(nombre: string) {
  return {
    subject: `¡Bienvenido/a a ${CLINICA.nombre}!`,
    html: plantilla(
      "TU CUENTA FUE CREADA",
      `${CLINICA.nombre} &bull; Clínica veterinaria`,
      `
        <p>Hola <strong>${esc(nombre)}</strong>,</p>
        <p>Tu cuenta ya está lista. Desde la web podés registrar a tus mascotas, reservar turnos, consultar su historial clínico y comprar en la tienda.</p>
        <p style="font-size: 13px; color: #64748b;">Si no creaste esta cuenta, respondé este correo para avisarnos.</p>
      `
    ),
  };
}

// Aviso al profesional que el personal dio de alta desde el panel. Con `enlace` lo
// invita a elegir su contraseña; sin él, entra con la que le cargaron en la clínica.
export function emailAltaProfesional(nombre: string, enlace: string | null) {
  const acceso = enlace
    ? `
        <p>Para empezar, elegí tu contraseña desde este enlace (vence en 3 días):</p>
        <p style="margin: 20px 0;">
          <a href="${esc(enlace)}" style="background-color: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Elegir mi contraseña</a>
        </p>
        <p style="font-size: 12px; color: #64748b; word-break: break-all;">Si el botón no funciona, copiá esta dirección en tu navegador: ${esc(enlace)}</p>
        <p style="font-size: 13px; color: #64748b;">Si el enlace venció, pedí uno nuevo desde "¿Olvidaste tu contraseña?" en la pantalla de ingreso.</p>`
    : `
        <p>Ingresá con este email y la contraseña que te indicaron en la clínica. Podés cambiarla cuando quieras desde "¿Olvidaste tu contraseña?" en la pantalla de ingreso.</p>`;

  return {
    subject: `Tu acceso al panel de ${CLINICA.nombre}`,
    html: plantilla(
      "ACCESO AL PANEL VETERINARIO",
      `${CLINICA.nombre} &bull; Equipo profesional`,
      `
        <p>Hola <strong>${esc(nombre)}</strong>,</p>
        <p>Te sumaron al equipo de ${CLINICA.nombre}. Desde el panel veterinario vas a poder ver tu agenda de turnos, las historias clínicas y emitir órdenes de derivación.</p>
        ${acceso}
      `
    ),
  };
}

// "2026-10-10" → "sábado, 10 de octubre"
const fechaLarga = (fecha: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T12:00:00Z`));

// Aviso a quien pidió enterarse de los operativos de veterinarias móviles de su
// localidad. `o` es un operativo tal como lo devuelve la API. Con `esCambio` avisa
// que cambió el día, el horario o el lugar de uno ya anunciado.
export function emailOperativo(nombre: string, o: any, enlaceMapa: string, esCambio = false) {
  return {
    subject: esCambio
      ? `Cambio en la veterinaria móvil de ${o.localidad}: ahora es el ${fechaLarga(o.fecha)}`
      : `Veterinaria móvil en ${o.localidad}: ${fechaLarga(o.fecha)}`,
    html: plantilla(
      esCambio ? "CAMBIO EN UNA VETERINARIA MÓVIL" : "VETERINARIA MÓVIL CERCA TUYO",
      `${CLINICA.nombre} &bull; Aviso para ${esc(o.localidad)}`,
      `
        <p>Hola <strong>${esc(nombre)}</strong>,</p>
        <p>${
          esCambio
            ? "Cambió el día, el horario o el lugar de un operativo de veterinaria móvil. Estos son los datos actualizados:"
            : `Se publicó un operativo de veterinaria móvil en <strong>${esc(o.localidad)}</strong>:`
        }</p>
        ${caja(
          `<p style="margin: 0 0 8px; font-size: 15px; font-weight: bold; color: #1e3a8a;">${esc(o.titulo)}</p>` +
            fila("Servicios", o.servicios) +
            fila("Fecha", fechaLarga(o.fecha)) +
            fila("Horario", `${o.hora_inicio} a ${o.hora_fin} hs`) +
            fila("Lugar", `${o.direccion}, ${o.localidad}`) +
            (o.organizador ? fila("Organiza", o.organizador) : "") +
            (o.requisitos ? fila("Requisitos", o.requisitos) : "")
        )}
        <p style="margin: 20px 0;">
          <a href="${esc(enlaceMapa)}" style="background-color: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver en el mapa</a>
        </p>
        <p style="font-size: 12px; color: #64748b;">
          Recibís este aviso porque te anotaste a los avisos de veterinarias móviles de tu zona. Podés dejar de recibirlos desde la sección "Veterinarias móviles" de la web.
        </p>
      `
    ),
  };
}

// `pedido` es un pedido tal como lo devuelve la API
export function emailPedido(pedido: any) {
  const filas = pedido.items
    .map(
      (it: any) => `
        <tr>
          <td style="padding: 6px 0;">${esc(it.producto_nombre)} × ${it.cantidad}</td>
          <td style="padding: 6px 0; text-align: right;">${pesos(it.precio_unitario * it.cantidad)}</td>
        </tr>`
    )
    .join("");

  const entrega =
    pedido.entrega === "envio"
      ? `Envío a domicilio: ${pedido.direccion_envio}`
      : "Retiro en la clínica";
  const llevaReceta = pedido.items.some((it: any) => it.requiere_receta);

  return {
    subject: `Recibimos tu pedido #${pedido.order_code} - ${CLINICA.nombre}`,
    html: plantilla(
      "PEDIDO RECIBIDO",
      `${CLINICA.nombre} &bull; Pedido #${esc(pedido.order_code)}`,
      `
        <p>Hola <strong>${esc(pedido.cliente_nombre)}</strong>,</p>
        <p>Registramos tu pedido y ya reservamos los productos. ${
          pedido.pago
            ? `El pago con ${esc(pedido.pago.marca)} terminada en ${esc(pedido.pago.ultimos4)} quedó registrado (operación ${esc(pedido.pago.referencia)}). Es un pago de prueba: no se realizó ningún cobro.`
            : "El pago se realiza al retirar o recibir el pedido."
        }</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
          ${filas}
          <tr>
            <td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0;"><strong>Total</strong></td>
            <td style="padding: 10px 0 0; border-top: 1px solid #e2e8f0; text-align: right;"><strong>${pesos(pedido.total)}</strong></td>
          </tr>
        </table>
        ${caja(fila("Entrega", entrega))}
        ${llevaReceta ? `<p style="font-size: 13px; color: #b45309;"><strong>Importante:</strong> tu pedido incluye productos de venta bajo receta. Vas a tener que presentar la receta veterinaria para que te los entreguemos.</p>` : ""}
      `
    ),
  };
}

export function emailRecuperacion(nombre: string, enlace: string) {
  return {
    subject: `Restablecer tu contraseña de ${CLINICA.nombre}`,
    html: plantilla(
      "RESTABLECER CONTRASEÑA",
      `${CLINICA.nombre} &bull; Seguridad de tu cuenta`,
      `
        <p>Hola <strong>${esc(nombre)}</strong>,</p>
        <p>Recibimos un pedido para cambiar la contraseña de tu cuenta. Para elegir una nueva, entrá a este enlace (vence en 1 hora):</p>
        <p style="margin: 20px 0;">
          <a href="${esc(enlace)}" style="background-color: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Elegir nueva contraseña</a>
        </p>
        <p style="font-size: 12px; color: #64748b; word-break: break-all;">Si el botón no funciona, copiá esta dirección en tu navegador: ${esc(enlace)}</p>
        <p style="font-size: 13px; color: #64748b;">Si no fuiste vos, ignorá este mensaje: tu contraseña no cambia.</p>
      `
    ),
  };
}
