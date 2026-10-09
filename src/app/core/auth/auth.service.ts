import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';

export type Rol = 'estudiante' | 'empresa' | 'admin';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  github_url: string; // estudiantes: de aquí sale la foto del avatar
  razon_social?: string; // empresas
}

export interface RegistroDatos {
  nombre: string;
  correo: string;
  contrasena: string;
  rol: 'estudiante' | 'empresa';
  razon_social?: string;
  acepta_terminos: boolean;
}

interface RespuestaSesion {
  usuario: Usuario;
  token_acceso: string;
  expira_en: number;
}

/**
 * Maneja la sesión. El token de acceso vive solo en memoria (un signal), nunca en
 * localStorage. El refresh token está en una cookie HttpOnly que JavaScript no puede leer.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _usuario = signal<Usuario | null>(null);
  private _token = signal<string | null>(null);
  private refrescoEnCurso: Observable<string | null> | null = null;

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);

  token(): string | null {
    return this._token();
  }

  registro(datos: RegistroDatos): Observable<Usuario> {
    return this.http.post<RespuestaSesion>('/api/v1/auth/registro', datos).pipe(
      tap(r => this.guardar(r)),
      map(r => r.usuario),
    );
  }

  login(correo: string, contrasena: string): Observable<Usuario> {
    return this.http.post<RespuestaSesion>('/api/v1/auth/login', { correo, contrasena }).pipe(
      tap(r => this.guardar(r)),
      map(r => r.usuario),
    );
  }

  /** Pide un token nuevo con la cookie. Si varias peticiones lo piden a la vez, se hace una sola llamada. */
  refrescar(): Observable<string | null> {
    if (!this.refrescoEnCurso) {
      this.refrescoEnCurso = this.http.post<RespuestaSesion>('/api/v1/auth/refresh', {}).pipe(
        tap(r => this.guardar(r)),
        map(r => r.token_acceso),
        catchError(() => {
          this.limpiar();
          return of(null);
        }),
        finalize(() => (this.refrescoEnCurso = null)),
        shareReplay(1),
      );
    }
    return this.refrescoEnCurso;
  }

  /** Se ejecuta al abrir la app: si hay cookie válida, recupera la sesión sin pedir login. */
  restaurar(): Promise<void> {
    return firstValueFrom(this.refrescar()).then(() => undefined);
  }

  /** Tras editar el perfil, el encabezado muestra la foto nueva sin volver a iniciar sesión. */
  actualizarUsuario(cambios: Partial<Pick<Usuario, 'github_url'>>): void {
    this._usuario.update(u => (u ? { ...u, ...cambios } : u));
  }

  logout(): void {
    this.http.post('/api/v1/auth/logout', {}).subscribe({ error: () => {} });
    this.limpiar();
    this.router.navigateByUrl('/');
  }

  sesionVencida(): void {
    this.limpiar();
    this.router.navigateByUrl('/login');
  }

  rutaInicio(): string {
    return this._usuario()?.rol === 'empresa' ? '/talento' : '/feed';
  }

  private guardar(r: RespuestaSesion): void {
    this._usuario.set(r.usuario);
    this._token.set(r.token_acceso);
  }

  private limpiar(): void {
    this._usuario.set(null);
    this._token.set(null);
  }
}
