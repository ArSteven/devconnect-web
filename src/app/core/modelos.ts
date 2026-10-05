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

export interface PerfilEstudiante {
  id: string;
  nombre: string;
  programa: string;
  institucion: string;
  ciudad: string;
  stack: string[];
  biografia: string;
}

export interface EventoHistorial {
  tipo: 'publicacion' | 'aporte' | 'recibida' | 'sesion';
  id: string;
  publicacion_id: string;
  titulo: string;
  lenguaje: string;
  con_quien: string;
  fecha: string;
}

export interface Portafolio {
  perfil: PerfilEstudiante;
  totales: { publicaciones: number; mejoras_aportadas: number; mejoras_recibidas: number; sesiones: number };
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
