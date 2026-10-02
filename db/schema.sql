-- ============================================================
-- VetAnimal · Esquema de base de datos (MySQL 8)
-- Se aplica con `npm run db:setup`. Todas las sentencias son
-- idempotentes (CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- Clientes y veterinarios comparten tabla; el rol los distingue.
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  rol           ENUM('cliente', 'veterinario') NOT NULL DEFAULT 'cliente',
  telefono      VARCHAR(40)  NOT NULL DEFAULT '',
  especialidad  VARCHAR(120) NULL,
  matricula     VARCHAR(40)  NULL,
  foto          TEXT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Las mascotas no se borran físicamente: `activo = 0` las oculta
-- y conserva su historia clínica.
CREATE TABLE IF NOT EXISTS mascotas (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id           INT UNSIGNED NOT NULL,
  nombre               VARCHAR(80) NOT NULL,
  especie              VARCHAR(40) NOT NULL,
  raza                 VARCHAR(80) NOT NULL DEFAULT '',
  edad                 DECIMAL(4,1) NULL,
  peso                 DECIMAL(5,2) NULL,
  foto                 TEXT NULL,
  estado_salud         VARCHAR(60) NOT NULL DEFAULT 'Estable',
  alergias             TEXT NULL,
  condiciones_cronicas TEXT NULL,
  activo               TINYINT(1) NOT NULL DEFAULT 1,
  creado_en            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mascotas_usuario (usuario_id),
  CONSTRAINT fk_mascotas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servicios (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre                VARCHAR(120) NOT NULL,
  descripcion           TEXT NULL,
  duracion_min          SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  precio                DECIMAL(10,2) NOT NULL DEFAULT 0,
  icono                 VARCHAR(40) NOT NULL DEFAULT '',
  categoria             ENUM('general', 'especializado') NOT NULL DEFAULT 'general',
  especialidad          VARCHAR(120) NULL,
  estudio_sugerido      VARCHAR(255) NULL,
  derivacion_habilitada TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Centros externos a los que la clínica deriva pacientes.
CREATE TABLE IF NOT EXISTS centros_derivacion (
  id                 VARCHAR(60)  NOT NULL,
  nombre             VARCHAR(160) NOT NULL,
  direccion          VARCHAR(200) NOT NULL,
  localidad          VARCHAR(120) NOT NULL,
  telefono           VARCHAR(40)  NOT NULL DEFAULT '',
  whatsapp           VARCHAR(40)  NULL,
  horarios           VARCHAR(200) NOT NULL DEFAULT '',
  especialidades     JSON NOT NULL,
  equipamiento       JSON NOT NULL,
  medico_responsable VARCHAR(200) NOT NULL DEFAULT '',
  distancia_estimada VARCHAR(120) NOT NULL DEFAULT '',
  acepta_urgencias   TINYINT(1) NOT NULL DEFAULT 0,
  orden              SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Órdenes de derivación. Los datos del paciente, dueño, veterinario y centro
-- se leen por JOIN; `edad` y `peso` quedan copiados al momento de emitir.
CREATE TABLE IF NOT EXISTS derivaciones (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo                VARCHAR(40) NOT NULL,
  mascota_id            INT UNSIGNED NOT NULL,
  veterinario_emisor_id INT UNSIGNED NOT NULL,
  centro_destino_id     VARCHAR(60) NOT NULL,
  edad                  DECIMAL(4,1) NULL,
  peso                  DECIMAL(5,2) NULL,
  especialidad_derivada VARCHAR(120) NOT NULL,
  estudio_solicitado    VARCHAR(255) NOT NULL,
  motivo_derivacion     VARCHAR(500) NOT NULL,
  sospecha_diagnostica  TEXT NOT NULL,
  resumen_clinico       TEXT NULL,
  indicaciones_previas  TEXT NULL,
  fecha_emision         DATE NOT NULL,
  fecha_validez_hasta   DATE NOT NULL,
  estado                ENUM('activa', 'presentada', 'completada', 'vencida') NOT NULL DEFAULT 'activa',
  creado_en             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_derivaciones_codigo (codigo),
  KEY idx_derivaciones_mascota (mascota_id),
  CONSTRAINT fk_derivaciones_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas (id),
  CONSTRAINT fk_derivaciones_veterinario FOREIGN KEY (veterinario_emisor_id) REFERENCES usuarios (id),
  CONSTRAINT fk_derivaciones_centro FOREIGN KEY (centro_destino_id) REFERENCES centros_derivacion (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Franjas en las que atiende cada veterinario. dia_semana: 0 = domingo … 6 = sábado.
-- La agenda online solo ofrece horarios que caen dentro de estas franjas.
CREATE TABLE IF NOT EXISTS horarios_veterinario (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  veterinario_id INT UNSIGNED NOT NULL,
  dia_semana     TINYINT UNSIGNED NOT NULL,
  hora_inicio    TIME NOT NULL,
  hora_fin       TIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_horarios_veterinario (veterinario_id, dia_semana),
  CONSTRAINT fk_horarios_veterinario FOREIGN KEY (veterinario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada turno ocupa a un veterinario desde `hora` durante `duracion_min` minutos.
-- `ocupa_horario` vale 1 mientras el turno no esté cancelado y NULL si lo está.
-- Como los NULL no chocan en un índice único, uq_turnos_horario impide que un mismo
-- veterinario tenga dos turnos activos que empiecen a la misma hora, pero deja
-- reutilizar el horario de uno cancelado. Los solapamientos parciales los controla
-- el servidor al reservar (server/agenda.ts).
CREATE TABLE IF NOT EXISTS turnos (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mascota_id             INT UNSIGNED NOT NULL,
  servicio_id            INT UNSIGNED NOT NULL,
  veterinario_id         INT UNSIGNED NULL,
  fecha                  DATE NOT NULL,
  hora                   TIME NOT NULL,
  duracion_min           SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  estado                 ENUM('pendiente', 'confirmado', 'cancelado', 'completado') NOT NULL DEFAULT 'confirmado',
  notas                  TEXT NULL,
  es_especializado       TINYINT(1) NOT NULL DEFAULT 0,
  especialidad           VARCHAR(120) NULL,
  estudio_solicitado     VARCHAR(255) NULL,
  sintomas_observados    TEXT NULL,
  tiene_estudios_previos TINYINT(1) NOT NULL DEFAULT 0,
  derivacion_id          INT UNSIGNED NULL,
  creado_en              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ocupa_horario          TINYINT GENERATED ALWAYS AS (IF(estado = 'cancelado', NULL, 1)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_turnos_horario (veterinario_id, fecha, hora, ocupa_horario),
  KEY idx_turnos_fecha (fecha),
  KEY idx_turnos_mascota (mascota_id),
  CONSTRAINT fk_turnos_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas (id),
  CONSTRAINT fk_turnos_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id),
  CONSTRAINT fk_turnos_veterinario FOREIGN KEY (veterinario_id) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT fk_turnos_derivacion FOREIGN KEY (derivacion_id) REFERENCES derivaciones (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultas (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mascota_id     INT UNSIGNED NOT NULL,
  veterinario_id INT UNSIGNED NULL,
  fecha          DATE NOT NULL,
  tipo           ENUM('CONTROL', 'EMERGENCIA', 'VACUNA', 'CIRUGIA', 'DIAGNOSTICO') NOT NULL DEFAULT 'CONTROL',
  titulo         VARCHAR(200) NOT NULL,
  descripcion    TEXT NOT NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultas_mascota (mascota_id),
  CONSTRAINT fk_consultas_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas (id),
  CONSTRAINT fk_consultas_veterinario FOREIGN KEY (veterinario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- El estado (al día / vencida / pendiente) no se guarda: se calcula al consultar
-- comparando fecha_refuerzo con la fecha del día.
CREATE TABLE IF NOT EXISTS vacunas (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mascota_id       INT UNSIGNED NOT NULL,
  nombre           VARCHAR(120) NOT NULL,
  fecha_aplicacion DATE NULL,
  fecha_refuerzo   DATE NULL,
  PRIMARY KEY (id),
  KEY idx_vacunas_mascota (mascota_id),
  CONSTRAINT fk_vacunas_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `veterinario_nombre` es texto libre porque el estudio puede venir firmado
-- por un profesional de otro centro que no es usuario del sistema.
CREATE TABLE IF NOT EXISTS estudios (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mascota_id         INT UNSIGNED NOT NULL,
  nombre             VARCHAR(200) NOT NULL,
  tipo               VARCHAR(60)  NOT NULL DEFAULT 'Radiografía',
  fecha              DATE NOT NULL,
  zona_anatomica     VARCHAR(160) NULL,
  imagen_url         TEXT NULL,
  observaciones      TEXT NULL,
  veterinario_id     INT UNSIGNED NULL,
  veterinario_nombre VARCHAR(160) NULL,
  institucion        VARCHAR(200) NULL,
  resultado_url      VARCHAR(500) NOT NULL DEFAULT '#',
  PRIMARY KEY (id),
  KEY idx_estudios_mascota (mascota_id),
  CONSTRAINT fk_estudios_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas (id),
  CONSTRAINT fk_estudios_veterinario FOREIGN KEY (veterinario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(200) NOT NULL,
  categoria       VARCHAR(60)  NOT NULL DEFAULT 'Medicamentos',
  etiqueta        VARCHAR(60)  NOT NULL DEFAULT '',
  descripcion     TEXT NULL,
  precio          DECIMAL(10,2) NOT NULL,
  requiere_receta TINYINT(1) NOT NULL DEFAULT 0,
  stock           INT UNSIGNED NOT NULL DEFAULT 0,
  imagen          TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id        INT UNSIGNED NOT NULL,
  total             DECIMAL(10,2) NOT NULL,
  estado            ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  entrega           ENUM('retiro', 'envio') NOT NULL DEFAULT 'retiro',
  direccion_envio   VARCHAR(255) NULL,
  telefono_contacto VARCHAR(40)  NULL,
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pedidos_usuario (usuario_id),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nombre, precio e imagen se copian al comprar: el pedido tiene que seguir
-- mostrando lo que se vendió aunque el producto cambie de precio o se elimine.
CREATE TABLE IF NOT EXISTS pedido_items (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id       INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NULL,
  cantidad        INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  producto_nombre VARCHAR(200) NOT NULL,
  producto_imagen TEXT NULL,
  requiere_receta TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_pedido_items_pedido (pedido_id),
  CONSTRAINT fk_pedido_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_items_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sesiones iniciadas. El navegador guarda el token en una cookie; acá queda solo
-- su hash SHA-256, así una copia de la base no permite hacerse pasar por nadie.
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash CHAR(64) NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  expira_en  DATETIME NOT NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sesiones_usuario (usuario_id),
  CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enlaces de "olvidé mi contraseña": un solo uso y con vencimiento.
CREATE TABLE IF NOT EXISTS recuperaciones_password (
  token_hash CHAR(64) NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  expira_en  DATETIME NOT NULL,
  usado      TINYINT(1) NOT NULL DEFAULT 0,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_recuperaciones_usuario (usuario_id),
  CONSTRAINT fk_recuperaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Operativos de veterinarias móviles (castración, vacunación) que la clínica difunde
-- en el mapa público. El punto exacto se guarda como latitud y longitud.
CREATE TABLE IF NOT EXISTS operativos_moviles (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo      VARCHAR(160) NOT NULL,
  organizador VARCHAR(160) NOT NULL DEFAULT '',
  servicios   VARCHAR(255) NOT NULL,
  fecha       DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL,
  direccion   VARCHAR(200) NOT NULL,
  localidad   VARCHAR(120) NOT NULL,
  latitud     DECIMAL(9,6) NOT NULL,
  longitud    DECIMAL(9,6) NOT NULL,
  requisitos  TEXT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operativos_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Localidades de las que cada usuario pidió recibir avisos de operativos.
CREATE TABLE IF NOT EXISTS avisos_operativos (
  usuario_id INT UNSIGNED NOT NULL,
  localidad  VARCHAR(120) NOT NULL,
  PRIMARY KEY (usuario_id, localidad),
  KEY idx_avisos_localidad (localidad),
  CONSTRAINT fk_avisos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos online de los pedidos. Por ahora los genera el pago simulado de la tienda:
-- no hay cobro real. De la tarjeta solo se guardan la marca y los últimos 4 dígitos.
CREATE TABLE IF NOT EXISTS pagos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id        INT UNSIGNED NOT NULL,
  proveedor        VARCHAR(40) NOT NULL DEFAULT 'simulado',
  referencia       VARCHAR(40) NOT NULL,
  monto            DECIMAL(10,2) NOT NULL,
  cuotas           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tarjeta_marca    VARCHAR(30) NOT NULL,
  tarjeta_ultimos4 CHAR(4) NOT NULL,
  titular          VARCHAR(120) NOT NULL,
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pagos_pedido (pedido_id),
  UNIQUE KEY uq_pagos_referencia (referencia),
  CONSTRAINT fk_pagos_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
