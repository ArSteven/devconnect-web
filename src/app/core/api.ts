import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Candidato, Catalogos, Comentario, DetallePublicacion, EstudianteDestacado, FiltroPublicaciones, FiltroTalento,
  Portafolio, PerfilEditable, Propuesta, Publicacion, SesionVivo, Suscripcion, TarjetaTalento,
} from './modelos';

/** Agrega solo los parámetros con valor: un filtro vacío no viaja. */
function parametros(valores: Record<string, string | number | boolean>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor !== '' && valor !== false) params = params.set(clave, valor);
  }
  return params;
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
      .pipe(map(r => r.publicaciones));
  }

  crearPublicacion(datos: { titulo: string; descripcion: string; lenguaje: string; codigo: string }): Observable<Publicacion> {
    return this.http.post<{ publicacion: Publicacion }>(`${this.base}/publicaciones`, datos).pipe(map(r => r.publicacion));
  }

  crearReto(datos: { titulo: string; descripcion: string; lenguaje: string; codigo: string; fecha_limite: string }): Observable<Publicacion> {
    return this.http.post<{ publicacion: Publicacion }>(`${this.base}/retos`, datos).pipe(map(r => r.publicacion));
  }

  detalle(id: string): Observable<DetallePublicacion> {
    return this.http.get<{ publicacion: DetallePublicacion }>(`${this.base}/publicaciones/${id}`).pipe(map(r => r.publicacion));
  }

  proponer(publicacionId: string, datos: { codigo: string; explicacion: string }): Observable<Propuesta> {
    return this.http
      .post<{ propuesta: Propuesta }>(`${this.base}/publicaciones/${publicacionId}/propuestas`, datos)
      .pipe(map(r => r.propuesta));
  }

  decidir(propuestaId: string, estado: 'aceptada' | 'rechazada'): Observable<unknown> {
    return this.http.patch(`${this.base}/propuestas/${propuestaId}`, { estado });
  }

  comentar(publicacionId: string, texto: string): Observable<Comentario> {
    return this.http
      .post<{ comentario: Comentario }>(`${this.base}/publicaciones/${publicacionId}/comentarios`, { texto })
      .pipe(map(r => r.comentario));
  }

  portafolio(estudianteId: string): Observable<Portafolio> {
    return this.http.get<{ portafolio: Portafolio }>(`${this.base}/estudiantes/${estudianteId}/portafolio`).pipe(map(r => r.portafolio));
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
