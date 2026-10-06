// Tipos que reflejan exactamente las respuestas JSON de la API en Go.

export interface Publicacion {
  id: string;
  autor_id: string;
  autor_nombre: string;
  titulo: string;
  descripcion: string;
  lenguaje: string;
  codigo: string;
  estado: 'abierta' | 'resuelta';
  total_propuestas: number;
  total_comentarios: number;
  creado_en: string;
}

export interface Propuesta {
  id: string;
  publicacion_id: string;
  autor_id: string;
  autor_nombre: string;
  codigo: string;
  explicacion: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  creado_en: string;
}

export interface Comentario {
  id: string;
  autor_id: string;
  autor_nombre: string;
  texto: string;
  creado_en: string;
}

export interface DetallePublicacion extends Publicacion {
  propuestas: Propuesta[];
  comentarios: Comentario[];
}

export interface Experiencia {
  cargo: string;
  empresa: string;
  inicio: string; // AAAA-MM
  fin: string; // vacío = actual
  descripcion: string;
}

export type Disponibilidad = '' | 'practicas' | 'medio_tiempo' | 'tiempo_completo' | 'freelance' | 'no_disponible';
export type Modalidad = '' | 'presencial' | 'remoto' | 'hibrido';

export interface PerfilEstudiante {
  id: string;
  nombre: string;
  titular: string;
  edad: number | null;
  fecha_nacimiento?: string; // solo llega si es el propio perfil
  programa: string;
  institucion: string;
  semestre: number | null;
  estado_academico: '' | 'cursando' | 'egresado';
  anio_inicio: number | null;
  anio_fin: number | null;
  ciudad: string;
  disponibilidad: Disponibilidad;
  modalidad: Modalidad;
  github_url: string;
  linkedin_url: string;
  sitio_url: string;
  stack: string[];
  idiomas: string[];
  experiencia: Experiencia[];
  biografia: string;
}

/** Lo que se envía al guardar el perfil. */
export type PerfilEditable = Omit<PerfilEstudiante, 'id' | 'nombre' | 'edad' | 'fecha_nacimiento'> & { fecha_nacimiento: string };

export const DISPONIBILIDADES: { valor: Disponibilidad; etiqueta: string }[] = [
  { valor: 'practicas', etiqueta: 'Disponible para prácticas' },
  { valor: 'medio_tiempo', etiqueta: 'Disponible medio tiempo' },
  { valor: 'tiempo_completo', etiqueta: 'Disponible tiempo completo' },
  { valor: 'freelance', etiqueta: 'Disponible para proyectos freelance' },
  { valor: 'no_disponible', etiqueta: 'No disponible por ahora' },
];

export const MODALIDADES: { valor: Modalidad; etiqueta: string }[] = [
  { valor: 'presencial', etiqueta: 'Presencial' },
  { valor: 'remoto', etiqueta: 'Remoto' },
  { valor: 'hibrido', etiqueta: 'Híbrido' },
];

export interface EventoHistorial {
  tipo: 'publicacion' | 'aporte' | 'recibida' | 'sesion';
  id: string;
  publicacion_id: string;
  titulo: string;
  lenguaje: string;
  con_quien: string;
  fecha: string;
}

export interface Habilidad {
  lenguaje: string;
  publicaciones: number;
  aportes: number;
}

export interface Destacado {
  propuesta_id: string;
  publicacion_id: string;
  titulo: string;
  lenguaje: string;
  autor_original: string;
  explicacion: string;
  fecha: string;
}

export interface Portafolio {
  perfil: PerfilEstudiante;
  totales: {
    publicaciones: number;
    propuestas_hechas: number;
    mejoras_aportadas: number;
    mejoras_recibidas: number;
    colaboradores: number;
    sesiones: number;
  };
  tasa_aceptacion: number | null;
  habilidades: Habilidad[];
  destacados: Destacado[];
  actividad: { fecha: string; total: number }[];
  historial: EventoHistorial[];
  contacto: { correo: string } | null;
  contacto_bloqueado: boolean;
}

export interface TarjetaTalento {
  id: string;
  nombre: string;
  ciudad: string;
  institucion: string;
  stack: string[];
  publicaciones: number;
  mejoras_aportadas: number;
}

export interface Suscripcion {
  id: string;
  periodo: 'mensual' | 'anual';
  inicia_en: string;
  termina_en: string;
  estado: string;
}

export const LENGUAJES = [
  { valor: 'go', etiqueta: 'go' },
  { valor: 'angular', etiqueta: 'angular' },
  { valor: 'typescript', etiqueta: 'typescript' },
  { valor: 'javascript', etiqueta: 'javascript' },
  { valor: 'python', etiqueta: 'python' },
  { valor: 'java', etiqueta: 'java' },
  { valor: 'php', etiqueta: 'php' },
  { valor: 'sql', etiqueta: 'sql' },
  { valor: 'otro', etiqueta: 'otro' },
];

/** "hace 5 min", "hace 2 h", "hace 3 días"... */
export function hace(fechaISO: string): string {
  const seg = Math.max(0, (Date.now() - new Date(fechaISO).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface SesionVivo {
  id: string;
  anfitrion_id: string;
  anfitrion_nombre: string;
  titulo: string;
  descripcion: string;
  inicia_en: string;
  sala: string;
  estado: 'programada' | 'en_vivo' | 'finalizada';
}

const NOMBRES_LENGUAJE: Record<string, string> = {
  go: 'Go', angular: 'Angular', typescript: 'TypeScript', javascript: 'JavaScript',
  python: 'Python', java: 'Java', php: 'PHP', sql: 'SQL', otro: 'Otro',
};

/** Nombre correcto para mostrar: "typescript" -> "TypeScript". */
export function nombreLenguaje(valor: string): string {
  return NOMBRES_LENGUAJE[valor] ?? valor.charAt(0).toUpperCase() + valor.slice(1);
}
