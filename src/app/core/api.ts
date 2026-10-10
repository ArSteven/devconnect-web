import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Actividad, Candidato, Catalogos, Comentario, Defensa, DetallePublicacion, EstudianteDestacado, FiltroPublicaciones, FiltroTalento,
  NivelPublicacion, NuevaPropuesta, Portafolio, PerfilEditable, Propuesta, Publicacion, ResultadoEjecucion, SesionVivo, Suscripcion,
  TarjetaTalento,
} from './modelos';

/** Agrega solo los parámetros con valor: un filtro vacío no viaja. */
function parametros(valores: Record<string, string | number | boolean>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== '' && valor !== false) params = params.set(clave, valor);
  }
  return params;
}

/**
 * La API desplegada puede ir un paso atrás del frontend. Los campos que llegaron después se
 * completan aquí: así una versión anterior de la API no rompe la pantalla (sin proponentes, las
 * tarjetas del feed fallaban al dibujarse y sus enlaces quedaban sin destino).
 */
function completarPublicacion<T extends Publicacion>(p: T): T {
  return {
    ...p,
    proponentes: p.proponentes ?? [],
    total_proponentes: p.total_proponentes ?? p.total_propuestas,
    mejora: p.mejora ?? null,
    nivel: p.nivel ?? null,
  };
}

function completarPortafolio(p: Portafolio): Portafolio {
  return { ...p, contacto_oculto: p.contacto_oculto ?? false, totales: { ...p.totales, personas_ayudadas: p.totales.personas_ayudadas ?? 0 } };
}

/** Un solo lugar para todas las llamadas a la API. El token lo agrega el interceptor. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private base = '/api/v1';

  listarPublicaciones(filtro: Partial<FiltroPublicaciones>, pagina: number): Observable<Publicacion[]> {
    const params = parametros({ ...filtro, pagina });
    return this.http
      .get<{ publicaciones: Publicacion[] }>(`${this.base}/publicaciones`, { params })
      .pipe(map(r => r.publicaciones.map(completarPublicacion)));
  }

  /** Las últimas mejoras aceptadas, con los filtros del feed que les aplican. */
  actividad(filtro: Pick<FiltroPublicaciones, 'lenguaje' | 'tipo' | 'institucion' | 'nivel'>): Observable<Actividad[]> {
    const params = parametros({ lenguaje: filtro.lenguaje, tipo: filtro.tipo, institucion: filtro.institucion, nivel: filtro.nivel });
    return this.http.get<{ actividad: Actividad[] }>(`${this.base}/actividad`, { params }).pipe(map(r => r.actividad));
  }

  crearPublicacion(datos: { titulo: string; descripcion: string; lenguaje: string; codigo: string; nivel?: NivelPublicacion }): Observable<Publicacion> {
    return this.http.post<{ publicacion: Publicacion }>(`${this.base}/publicaciones`, datos).pipe(map(r => r.publicacion));
  }

  crearReto(datos: { titulo: string; descripcion: string; lenguaje: string; codigo: string; fecha_limite: string }): Observable<Publicacion> {
    return this.http.post<{ publicacion: Publicacion }>(`${this.base}/retos`, datos).pipe(map(r => r.publicacion));
  }

  detalle(id: string): Observable<DetallePublicacion> {
    return this.http
      .get<{ publicacion: DetallePublicacion }>(`${this.base}/publicaciones/${id}`)
      .pipe(map(r => completarPublicacion(r.publicacion)));
  }

  proponer(publicacionId: string, datos: NuevaPropuesta): Observable<Propuesta> {
    return this.http
      .post<{ propuesta: Propuesta }>(`${this.base}/publicaciones/${publicacionId}/propuestas`, datos)
      .pipe(map(r => r.propuesta));
  }

  decidir(propuestaId: string, estado: 'aceptada' | 'rechazada'): Observable<unknown> {
    return this.http.patch(`${this.base}/propuestas/${propuestaId}`, { estado });
  }

  /** «Pruébalo» en Go: lo ejecuta el Go Playground oficial a través de la API. */
  ejecutarGo(codigo: string): Observable<ResultadoEjecucion> {
    return this.http.post<{ resultado: ResultadoEjecucion }>(`${this.base}/ejecutar/go`, { codigo }).pipe(map(r => r.resultado));
  }

  /** Constancia de que otra persona ejecutó la mejora aceptada y cambió el resultado. */
  verificar(propuestaId: string): Observable<string> {
    return this.http.post<{ verificada_en: string }>(`${this.base}/propuestas/${propuestaId}/verificacion`, {}).pipe(map(r => r.verificada_en));
  }

  invitarDefensa(propuestaId: string, iniciaEn: string): Observable<Defensa> {
    return this.http.post<{ defensa: Defensa }>(`${this.base}/propuestas/${propuestaId}/defensa`, { inicia_en: iniciaEn }).pipe(map(r => r.defensa));
  }

  cambiarDefensa(id: string, estado: 'realizada' | 'cancelada', aprobada = false): Observable<Defensa> {
    return this.http.patch<{ defensa: Defensa }>(`${this.base}/defensas/${id}`, { estado, aprobada }).pipe(map(r => r.defensa));
  }

  /** Las defensas en vivo de quien pregunta: las que cita (empresa) o a las que la citan (estudiante). */
  defensas(): Observable<Defensa[]> {
    return this.http.get<{ defensas: Defensa[] }>(`${this.base}/defensas`).pipe(map(r => r.defensas));
  }

  comentar(publicacionId: string, texto: string): Observable<Comentario> {
    return this.http
      .post<{ comentario: Comentario }>(`${this.base}/publicaciones/${publicacionId}/comentarios`, { texto })
      .pipe(map(r => r.comentario));
  }

  portafolio(estudianteId: string): Observable<Portafolio> {
    return this.http
      .get<{ portafolio: Portafolio }>(`${this.base}/estudiantes/${estudianteId}/portafolio`)
      .pipe(map(r => completarPortafolio(r.portafolio)));
  }

  actualizarPerfil(datos: PerfilEditable): Observable<unknown> {
    return this.http.put(`${this.base}/estudiantes/yo/perfil`, datos);
  }

  destacadosSemana(): Observable<{ estudiantes: EstudianteDestacado[]; dias: number }> {
    return this.http.get<{ estudiantes: EstudianteDestacado[]; dias: number }>(`${this.base}/estudiantes/destacados`);
  }

  catalogos(): Observable<Catalogos> {
    return this.http.get<Catalogos>(`${this.base}/catalogos`);
  }

  talento(filtro: FiltroTalento): Observable<TarjetaTalento[]> {
    const params = parametros({
      lenguaje: filtro.lenguajes.join(','),
      ciudad: filtro.ciudad,
      institucion: filtro.institucion,
      nivel: filtro.nivel,
      disponibilidad: filtro.disponibilidad,
      modalidad: filtro.modalidad,
      con_mejoras: filtro.conMejoras,
    });
    return this.http.get<{ talento: TarjetaTalento[] }>(`${this.base}/talento`, { params }).pipe(map(r => r.talento));
  }

  candidatos(): Observable<{ candidatos: Candidato[]; con_correo: boolean }> {
    return this.http.get<{ candidatos: Candidato[]; con_correo: boolean }>(`${this.base}/candidatos`);
  }

  guardarCandidato(estudianteId: string): Observable<unknown> {
    return this.http.put(`${this.base}/candidatos/${estudianteId}`, {});
  }

  quitarCandidato(estudianteId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/candidatos/${estudianteId}`);
  }

  suscripcionActual(): Observable<Suscripcion | null> {
    return this.http.get<{ suscripcion: Suscripcion | null }>(`${this.base}/suscripciones/actual`).pipe(map(r => r.suscripcion));
  }

  suscribirse(periodo: 'mensual' | 'anual'): Observable<Suscripcion> {
    return this.http.post<{ suscripcion: Suscripcion }>(`${this.base}/suscripciones`, { periodo }).pipe(map(r => r.suscripcion));
  }

  sesiones(): Observable<SesionVivo[]> {
    return this.http.get<{ sesiones: SesionVivo[] }>(`${this.base}/sesiones`).pipe(map(r => r.sesiones));
  }

  crearSesion(datos: { titulo: string; descripcion: string; inicia_en: string }): Observable<SesionVivo> {
    return this.http.post<{ sesion: SesionVivo }>(`${this.base}/sesiones`, datos).pipe(map(r => r.sesion));
  }

  cambiarEstadoSesion(id: string, estado: 'en_vivo' | 'finalizada'): Observable<unknown> {
    return this.http.patch(`${this.base}/sesiones/${id}`, { estado });
  }
}
