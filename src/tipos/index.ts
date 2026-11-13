// src/tipos/index.ts

// --- Entidades Auxiliares ---
export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo, 1 = lunes, ..., 6 = sábado
  abre: string;                  // "08:00"
  cierra: string;                // "12:00"
}

// --- Entidades Principales del PRD ---
export interface Comercio {
  id: string;
  nombre: string;
  rubroId: string;
  descripcion: string;
  direccion: string;
  coordenadas: Coordenadas;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  imagenes: string[];
  videoUrl: string | null;
  horarios: Horario[];
  mediosDePago: string[];
  puntaje: number;
  cantidadResenas: number;
  codigoQr: string | null;
  activo: boolean;
}

export interface Rubro {
  id: string;
  nombre: string;
  icono: string; // Nombre del ícono según @react-native-vector-icons/ionicons
  color: string; // Hexadecimal, ej. "#7A5C3E"
  orden: number;
}

export interface Promocion {
  id: string;
  comercioId: string;
  titulo: string;
  detalle: string;
  descuento: number | null; // Porcentaje entero (ej: 15 para 15%)
  desde: string;            // ISO 8601 con zona
  hasta: string;            // ISO 8601 con zona
  imagenUrl: string | null;
  soloApp: boolean;
  usos: number;
  activa: boolean;
}

export interface Resena {
  id: string;
  comercioId: string;
  usuarioId: string;
  estrellas: 1 | 2 | 3 | 4 | 5;
  comentario: string;
  respuesta: string | null;
  reportada: boolean;
  creadaEn: string;         // ISO 8601 con zona
  sincronizada: boolean;
}

export interface UsoDePromocion {
  id: string;
  promocionId: string;
  usuarioId: string;
  codigo: string;           // Código único que se muestra en pantalla y se escanea
  validadoEn: string | null;// ISO 8601 con zona cuando se valida en mostrador
}

export type Rol = 'vecino' | 'comercio';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  comercioId: string | null; // Obligatorio si rol === "comercio"
  favoritos: string[];       // Array de comercioId
  rubrosDeInteres: string[]; // Array de rubroId
  avisosActivos: boolean;
}

// --- Formato de Respuestas de la API de la Cátedra ---
export interface MetaPaginacion {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaExitosa<T> {
  datos: T;
  meta?: MetaPaginacion;
}

export interface DetalleErrorApi {
  codigo: string;
  mensaje: string;
}

export interface RespuestaError {
  error: DetalleErrorApi;
}