// Tipos que reflejan exactamente las respuestas JSON de la API en Go.

export type TipoPublicacion = 'pregunta' | 'reto';

/** Nivel opcional de un código publicado: ayuda a quien empieza a encontrar qué practicar. */
export type NivelPublicacion = 'principiante' | 'intermedio';

export const NIVELES_PUBLICACION: { valor: NivelPublicacion; etiqueta: string }[] = [
  { valor: 'principiante', etiqueta: 'Principiante' },
  { valor: 'intermedio', etiqueta: 'Intermedio' },
];

export function etiquetaNivel(valor: string): string {
  return NIVELES_PUBLICACION.find(n => n.valor === valor)?.etiqueta ?? '';
}

export interface Publicacion {
  id: string;
  autor_id: string;
  autor_nombre: string; // en un reto, la razón social de la empresa
  autor_institucion: string;
  autor_github: string;
  titulo: string;
  descripcion: string;
  lenguaje: string;
  codigo: string; // en el feed llegan solo las primeras líneas
  total_lineas: number;
  estado: 'abierta' | 'resuelta';
  tipo: TipoPublicacion;
  nivel: NivelPublicacion | null; // los retos no lo usan
  fecha_limite: string | null;
  total_propuestas: number;
  total_comentarios: number;
  creado_en: string;
  total_proponentes: number; // personas distintas que propusieron mejoras
  proponentes: Persona[]; // las primeras cuatro, para los avatares
  mejora: MejoraAceptada | null; // la mejora aceptada más reciente (solo en el feed)
}

/** Lo mínimo para mostrar a alguien: su avatar y su nombre. */
export interface Persona {
  id: string;
  nombre: string;
  github_url: string;
}

/** Tramo del código original y del mejorado alrededor de un cambio: el navegador hace el diff. */
export interface Ventana {
  original: string;
  codigo: string; // la versión mejorada
  desde_linea: number; // número de la primera línea de los dos tramos
  total_lineas: number; // líneas de la versión mejorada completa
}

export interface MejoraAceptada extends Ventana {
  autor: Persona;
}

/** Una mejora aceptada contada en el feed: quién mejoró el código de quién. */
export interface Actividad {
  propuesta_id: string;
  publicacion_id: string;
  titulo: string;
  lenguaje: string;
  tipo: TipoPublicacion;
  autor: Persona; // autor de la publicación (en un reto, la empresa)
  contribuyente: Persona;
  aceptada_en: string;
  cambio: Ventana;
}

export interface Propuesta {
  id: string;
  publicacion_id: string;
  autor_id: string;
  autor_nombre: string;
  autor_github: string;
  codigo: string;
  explicacion: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  creado_en: string;
  verificada_en?: string | null; // «Pruébalo»: otra persona la ejecutó y cambió el resultado
  // Solo en soluciones de retos, y solo para la empresa dueña del reto y quien envió la solución.
  uso_ia?: UsoIA;
  uso_ia_detalle?: string;
  defensa?: Defensa;
}

/** Lo que se envía al proponer. En un reto, la declaración de uso de IA es obligatoria. */
export interface NuevaPropuesta {
  codigo: string;
  explicacion: string;
  uso_ia?: UsoIA;
  uso_ia_detalle?: string;
}

export type UsoIA = 'no' | 'consulta' | 'codigo';

export const USOS_IA: { valor: UsoIA; etiqueta: string }[] = [
  { valor: 'no', etiqueta: 'No' },
  { valor: 'consulta', etiqueta: 'Sí, para consultar dudas' },
  { valor: 'codigo', etiqueta: 'Sí, para generar parte del código' },
];

/** Defensa en vivo: 15 minutos en una sala privada de Jitsi entre la empresa del reto y quien lo resolvió. */
export interface Defensa {
  id: string;
  propuesta_id: string;
  publicacion_id: string;
  titulo: string; // el reto
  empresa_id: string;
  empresa_nombre: string;
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_github: string;
  inicia_en: string;
  duracion_min: number;
  sala: string;
  estado: 'invitada' | 'realizada' | 'cancelada';
  aprobada: boolean;
}

/** Un tramo de lo que imprimió un programa. «aviso» es lo que señala go vet: no impide que corra. */
export interface SalidaEjecucion {
  flujo: 'stdout' | 'stderr' | 'aviso';
  texto: string;
}

/** El resultado de cada SELECT en «Pruébalo» con SQL. */
export interface TablaSql {
  columnas: string[];
  filas: (string | number | null)[][];
  recortada: boolean; // tenía más filas de las que se muestran
}

export interface ResultadoEjecucion {
  salida: SalidaEjecucion[];
  tablas?: TablaSql[];
  error: boolean; // no compiló o terminó con un error
  recortada: boolean; // la salida pasaba de 10.000 caracteres
  detenida?: boolean; // pasó el tiempo límite y se detuvo
  fallo?: string; // no llegó a ejecutarse (sin red, sin intérprete, límite de ejecuciones): no es un error del programa
  ms: number;
}

export interface Comentario {
  id: string;
  autor_id: string;
  autor_nombre: string;
  autor_github: string;
  autor_rol: string;
  texto: string;
  creado_en: string;
}

export interface DetallePublicacion extends Publicacion {
  propuestas: Propuesta[];
  comentarios: Comentario[];
}

export interface FiltroPublicaciones {
  q: string;
  lenguaje: string;
  institucion: string;
  estado: '' | 'abierta' | 'resuelta';
  tipo: '' | TipoPublicacion;
  nivel: '' | NivelPublicacion;
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
  contacto_visible: boolean; // false = las empresas no ven su correo
}

/** Lo que se envía al guardar el perfil. Si contacto_visible no va, la API no lo cambia. */
export type PerfilEditable = Omit<PerfilEstudiante, 'id' | 'nombre' | 'edad' | 'fecha_nacimiento' | 'contacto_visible'> & {
  fecha_nacimiento: string;
  contacto_visible?: boolean;
};

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

/** Rangos de nivel que piden las empresas: por semestre o egresado. */
export const NIVELES = [
  { valor: 'inicial', etiqueta: 'Semestres 1 a 3' },
  { valor: 'medio', etiqueta: 'Semestres 4 a 6' },
  { valor: 'avanzado', etiqueta: 'Semestre 7 o más' },
  { valor: 'egresado', etiqueta: 'Egresado' },
];

/** Valor especial del filtro de ciudad que la API traduce a los cuatro municipios. */
export const AREA_METROPOLITANA = 'area_metropolitana';

export interface EventoHistorial {
  tipo: 'publicacion' | 'aporte' | 'reto' | 'recibida' | 'sesion';
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
  es_reto: boolean;
  explicacion: string;
  fecha: string;
  verificada?: boolean; // «Mejora verificada por ejecución»
  defensa_aprobada?: boolean; // la empresa del reto aprobó su defensa en vivo
}

export interface Portafolio {
  perfil: PerfilEstudiante;
  totales: {
    publicaciones: number;
    propuestas_hechas: number;
    mejoras_aportadas: number;
    mejoras_recibidas: number;
    colaboradores: number;
    personas_ayudadas: number; // autores distintos cuyo código mejoró
    sesiones: number;
    retos_resueltos: number;
  };
  tasa_aceptacion: number | null;
  habilidades: Habilidad[];
  destacados: Destacado[];
  actividad: { fecha: string; total: number }[];
  historial: EventoHistorial[];
  contacto: { correo: string } | null;
  contacto_bloqueado: boolean;
  contacto_oculto: boolean; // el estudiante decidió no compartir su correo con empresas
  guardado: boolean;
}

export interface TarjetaTalento {
  id: string;
  nombre: string;
  titular: string;
  github_url: string;
  ciudad: string;
  institucion: string;
  programa: string;
  semestre: number | null;
  estado_academico: '' | 'cursando' | 'egresado';
  disponibilidad: Disponibilidad;
  modalidad: Modalidad;
  stack: string[];
  verificadas: string[];
  publicaciones: number;
  propuestas_hechas: number;
  mejoras_aportadas: number;
  tasa_aceptacion: number | null;
  semanas_activas: number;
  guardado: boolean;
}

export interface Candidato extends TarjetaTalento {
  correo?: string; // solo con suscripción activa
  guardado_en: string;
}

export interface FiltroTalento {
  lenguajes: string[];
  ciudad: string;
  institucion: string;
  nivel: string;
  disponibilidad: string;
  modalidad: string;
  conMejoras: boolean;
}

export interface Suscripcion {
  id: string;
  periodo: 'mensual' | 'anual';
  inicia_en: string;
  termina_en: string;
  estado: string;
}

export interface SesionVivo {
  id: string;
  anfitrion_id: string;
  anfitrion_nombre: string;
  anfitrion_github: string;
  titulo: string;
  descripcion: string;
  inicia_en: string;
  iniciada_en: string | null;
  sala: string;
  estado: 'programada' | 'en_vivo' | 'finalizada';
}

export interface EstudianteDestacado {
  id: string;
  nombre: string;
  institucion: string;
  github_url: string;
  mejoras: number;
}

export interface OpcionCatalogo {
  valor: string;
  total: number;
}

export interface Catalogos {
  instituciones: OpcionCatalogo[];
  ciudades: OpcionCatalogo[];
}

export const LENGUAJES = [
  { valor: 'go', etiqueta: 'Go' },
  { valor: 'angular', etiqueta: 'Angular' },
  { valor: 'typescript', etiqueta: 'TypeScript' },
  { valor: 'javascript', etiqueta: 'JavaScript' },
  { valor: 'python', etiqueta: 'Python' },
  { valor: 'java', etiqueta: 'Java' },
  { valor: 'php', etiqueta: 'PHP' },
  { valor: 'sql', etiqueta: 'SQL' },
  { valor: 'otro', etiqueta: 'Otro' },
];

const NOMBRES_LENGUAJE: Record<string, string> = Object.fromEntries(LENGUAJES.map(l => [l.valor, l.etiqueta]));

/** Nombre correcto para mostrar: "typescript" -> "TypeScript". */
export function nombreLenguaje(valor: string): string {
  return NOMBRES_LENGUAJE[valor] ?? capitalizar(valor);
}

/** Primera letra en mayúscula, el resto intacto. */
export function capitalizar(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

/** "Hace 5 min", "Hace 2 h", "Hace 3 días"... */
export function hace(fechaISO: string): string {
  const seg = Math.max(0, (Date.now() - new Date(fechaISO).getTime()) / 1000);
  if (seg < 60) return 'Hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? 'Hace 1 día' : `Hace ${d} días`;
  return new Date(fechaISO).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "5.º semestre", "Egresado" o vacío: el nivel como lo lee un reclutador. */
export function nivelAcademico(p: { semestre: number | null; estado_academico: string }): string {
  if (p.estado_academico === 'egresado') return 'Egresado';
  return p.semestre ? `${p.semestre}.º semestre` : '';
}

export function etiquetaDisponibilidad(valor: string): string {
  return DISPONIBILIDADES.find(d => d.valor === valor)?.etiqueta ?? '';
}

export function etiquetaModalidad(valor: string): string {
  return MODALIDADES.find(m => m.valor === valor)?.etiqueta ?? '';
}
