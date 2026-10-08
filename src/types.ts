export type UserRole = 'cliente' | 'veterinario';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: UserRole;
  telefono?: string;
  especialidad?: string | null;
  matricula?: string | null;
  foto?: string;
}

// Cliente tal como lo lista el panel del personal
export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
}

// Franja en la que un profesional atiende turnos. dia_semana: 0 = domingo … 6 = sábado
export interface HorarioAtencion {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

// Profesional de la clínica tal como lo lista el panel del personal
export interface Veterinario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string | null;
  matricula: string | null;
  foto: string | null;
  horarios: HorarioAtencion[];
  // Solo en la respuesta del alta: si se lo invitó a elegir su contraseña y si salió el email
  invitado?: boolean;
  email_enviado?: boolean;
}

// Operativo de una veterinaria móvil (castración, vacunación) publicado en el mapa
export interface OperativoMovil {
  id: number;
  titulo: string;
  organizador: string;
  servicios: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  direccion: string;
  localidad: string;
  latitud: number;
  longitud: number;
  requisitos: string | null;
  // Solo en la respuesta del alta: a cuántos anotados se avisa y si el envío de emails está activo
  avisos?: number;
  email_activo?: boolean;
  // Solo en la respuesta de una edición: si cambió el día, el horario o el lugar y se volvió a avisar
  cambio_avisado?: boolean;
}

export interface Pet {
  id: number;
  usuario_id: number;
  nombre: string;
  especie: string;
  raza?: string;
  edad?: number;
  peso?: number;
  foto?: string;
  estado_salud: string;
  alergias?: string;
  condiciones_cronicas?: string;
  codigo_qr?: string | null;
  qr_publico?: boolean;
  qr_mensaje?: string | null;
  qr_mostrar_telefono?: boolean;
  creado_en?: string;
  dueno?: string;
  telefono?: string;
}

// Lo que ve quien escanea la chapa QR de una mascota (sin datos de contacto del dueño)
export interface MascotaPublica {
  nombre: string;
  especie: string;
  raza?: string;
  edad?: number;
  foto?: string;
  alergias?: string;
  condiciones_cronicas?: string;
  qr_mensaje?: string;
  dueno: string;
  // Solo viene si el dueño eligió mostrarlo en la chapa
  telefono?: string;
  activa: boolean;
  // Solo viene si quien mira es el dueño o personal de la clínica
  mascota_id?: number;
}

export interface Service {
  id: number;
  nombre: string;
  descripcion: string;
  duracion_min: number;
  precio: number;
  icono: string;
  categoria?: 'general' | 'especializado';
  especialidad?: 'Cardiología' | 'Radiología / Diagnóstico por Imágenes' | 'Ecografía Doppler' | 'Traumatología Compleja' | 'Cirugía Especializada' | 'Laboratorio de Alta Complejidad' | string;
  estudio_sugerido?: string;
  derivacion_habilitada?: boolean;
}

export type TurnoEstado = 'pendiente' | 'confirmado' | 'cancelado' | 'completado';

export interface Turno {
  id: number;
  mascota_id: number;
  servicio_id: number;
  veterinario_id?: number | null;
  fecha: string;
  hora: string;
  duracion_min?: number;
  estado: TurnoEstado;
  notas?: string;
  creado_en?: string;
  mascota_nombre?: string;
  dueno?: string;
  dueno_email?: string;
  servicio_nombre?: string;
  veterinario_nombre?: string;
  
  // Metadatos de turno especializado y derivación médica
  es_especializado?: boolean;
  categoria_servicio?: 'general' | 'especializado';
  especialidad?: string;
  estudio_solicitado?: string;
  sintomas_observados?: string;
  tiene_estudios_previos?: boolean;
  derivado?: boolean;
  derivacion_id?: number;
  derivacion_codigo?: string;
  // Solo en la respuesta de la reserva: indica si salió el email de confirmación
  email_enviado?: boolean;
}

export type ConsultaTipo = 'CONTROL' | 'EMERGENCIA' | 'VACUNA' | 'CIRUGIA' | 'DIAGNOSTICO';

export interface Consulta {
  id: number;
  mascota_id: number;
  veterinario_id?: number | null;
  fecha: string;
  tipo: ConsultaTipo;
  titulo: string;
  descripcion: string;
  creado_en?: string;
  vet_nombre?: string;
}

export type VacunaEstado = 'AL_DIA' | 'VENCIDA' | 'PENDIENTE';

export interface Vacuna {
  id: number;
  mascota_id: number;
  nombre: string;
  fecha_aplicacion?: string;
  fecha_refuerzo?: string;
  estado: VacunaEstado;
}

export interface Estudio {
  id: number;
  mascota_id: number;
  nombre: string;
  tipo?: string;
  fecha: string;
  resultado_url?: string;
  imagen_url?: string;
  zona_anatomica?: string;
  observaciones?: string;
  veterinario_id?: number;
  veterinario_nombre?: string;
  institucion?: string;
}

export interface CentroVeterinarioRecomendado {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  telefono: string;
  whatsapp?: string;
  horarios: string;
  especialidades: string[];
  equipamiento: string[];
  medico_responsable: string;
  distancia_estimada: string;
  acepta_urgencias: boolean;
}

export interface OrdenDerivacion {
  id: number;
  codigo: string;
  mascota_id: number;
  mascota_nombre: string;
  especie: string;
  raza?: string;
  edad?: number;
  peso?: number;
  dueno_nombre: string;
  dueno_telefono?: string;
  dueno_email?: string;
  
  veterinario_emisor_id: number;
  veterinario_emisor_nombre: string;
  veterinario_matricula: string;
  clinica_origen: string;
  
  centro_destino: CentroVeterinarioRecomendado;
  
  especialidad_derivada: 'Cardiología' | 'Radiología / Diagnóstico por Imágenes' | 'Ecografía Doppler' | 'Traumatología Compleja' | 'Cirugía Especializada' | 'Laboratorio de Alta Complejidad';
  estudio_solicitado: string;
  motivo_derivacion: 'Falta de especialista cardiólogo en sede' | 'Saturación de turnos / derivación prioritaria' | 'Equipamiento de alta complejidad requerido' | 'Evaluación prequirúrgica urgente';
  
  sospecha_diagnostica: string;
  resumen_clinico: string;
  indicaciones_previas: string;
  
  fecha_emision: string;
  fecha_validez_hasta: string;
  estado: 'activa' | 'presentada' | 'completada' | 'vencida';
  creado_en: string;
}

export type ProductCategory = 'Medicamentos' | 'Bienestar y Estética' | 'Nutrición y Alimento' | 'Pulgas y Garrapatas';

export interface Product {
  id: number;
  nombre: string;
  categoria: ProductCategory;
  etiqueta?: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  requiere_receta?: boolean;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number;
  pedido_id: number;
  producto_id: number | null;
  cantidad: number;
  precio_unitario: number;
  producto_nombre: string;
  producto_imagen?: string | null;
  requiere_receta: boolean;
}

export type OrderEstado = 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado';

// Pago online de un pedido. De la tarjeta solo se conocen la marca y los últimos 4 dígitos
export interface PagoPedido {
  referencia: string;
  marca: string;
  ultimos4: string;
  cuotas: number;
}

// Lo que el formulario de pago le manda al servidor
export type DatosPago = Omit<PagoPedido, "referencia"> & { titular: string };

export interface Order {
  id: number;
  order_code: string;
  usuario_id: number;
  cliente_nombre: string;
  cliente_email: string;
  total: number;
  estado: OrderEstado;
  entrega: 'retiro' | 'envio';
  direccion_envio?: string | null;
  telefono_contacto?: string | null;
  creado_en: string;
  // null si se paga al retirar o recibir
  pago: PagoPedido | null;
  items: OrderItem[];
  // Solo en la respuesta de la compra: indica si salió el email de confirmación
  email_enviado?: boolean;
}

export interface AdminStats {
  totalHoy: number;
  pendientes: number;
  totalPacientes: number;
  totalClientes: number;
  pedidosPendientes: number;
}
