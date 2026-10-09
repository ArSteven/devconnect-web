import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { Avatar } from './avatar';
import { Logo } from './logo';

interface Enlace {
  ruta: string;
  texto: string;
}

@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, RouterLinkActive, Logo, Avatar],
  template: `
    <header>
      <a routerLink="/" class="marca" aria-label="DevConnect">
        <span class="logotipo"><app-logo [comoLetra]="true" /><span>evconnect</span></span>
        @if (auth.usuario()?.rol === 'empresa') { <span class="etiqueta">Empresas</span> }
      </a>

      <nav class="escritorio" aria-label="Principal">
        @for (e of enlaces(); track e.ruta) {
          <a [routerLink]="e.ruta" routerLinkActive="activo">{{ e.texto }}</a>
        }
      </nav>

      <div class="derecha">
        @if (auth.usuario(); as u) {
          <div class="cuenta">
            <button type="button" class="boton-avatar" [attr.aria-expanded]="menuCuenta()" aria-controls="menu-cuenta"
                    [attr.aria-label]="'Menú de la cuenta de ' + u.nombre" (click)="alternar('cuenta')">
              <app-avatar [nombre]="u.nombre" [github]="u.github_url" [tamano]="38" />
              <span class="flecha" aria-hidden="true">▾</span>
            </button>
            @if (menuCuenta()) {
              <div id="menu-cuenta" class="desplegable">
                <div class="quien">
                  <strong>{{ u.nombre }}</strong>
                  <span>{{ u.razon_social || u.correo }}</span>
                </div>
                @if (u.rol === 'estudiante') {
                  <a [routerLink]="['/portafolio', u.id]">Mi perfil</a>
                  <a [routerLink]="['/portafolio', u.id]" [queryParams]="{ editar: 1 }">Editar perfil</a>
                } @else if (u.rol === 'empresa') {
                  <a routerLink="/candidatos">Mis candidatos</a>
                  <a routerLink="/planes">Plan y suscripción</a>
                }
                <div class="legal">
                  <a routerLink="/terminos">Términos</a>
                  <a routerLink="/privacidad">Privacidad</a>
                </div>
                <button type="button" class="salir" (click)="auth.logout()">Salir</button>
              </div>
            }
          </div>
        } @else {
          <div class="invitado escritorio">
            <a class="secundario" routerLink="/registro" [queryParams]="{ rol: 'empresa' }">¿Buscas talento?</a>
            <a class="btn btn-secundario" routerLink="/login">Iniciar sesión</a>
            <a class="btn btn-primario" routerLink="/registro">Crear cuenta</a>
          </div>
        }
        <button type="button" class="hamburguesa" [attr.aria-expanded]="menuMovil()" aria-controls="menu-movil"
                aria-label="Abrir el menú" (click)="alternar('movil')">
          <span aria-hidden="true">{{ menuMovil() ? '✕' : '☰' }}</span>
        </button>
      </div>
    </header>

    @if (menuMovil()) {
      <nav id="menu-movil" class="movil" aria-label="Principal">
        @for (e of enlaces(); track e.ruta) {
          <a [routerLink]="e.ruta" routerLinkActive="activo">{{ e.texto }}</a>
        }
        @if (!auth.autenticado()) {
          <a routerLink="/login">Iniciar sesión</a>
          <a routerLink="/registro" class="destacado">Crear cuenta</a>
          <a routerLink="/registro" [queryParams]="{ rol: 'empresa' }">¿Buscas talento? Crea una cuenta de empresa</a>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      position: sticky; top: 0; z-index: 40; display: block;
      background: color-mix(in srgb, var(--papel) 92%, transparent); backdrop-filter: blur(6px);
      border-bottom: 2px solid var(--tinta);
    }
    header {
      display: flex; align-items: center; gap: 20px; max-width: 1340px; margin: 0 auto;
      padding: 10px clamp(16px, 4vw, 48px); min-height: 68px;
    }
    .marca { display: flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 800; font-size: 24px; letter-spacing: -0.03em; min-height: 44px; }
    /* La D del logo es la primera letra: pegada al texto y sobre la misma línea base. */
    .logotipo { display: inline-flex; align-items: baseline; }
    .etiqueta { padding: 2px 6px; background: var(--coral); color: var(--tinta); font-size: 11px; font-weight: 700; letter-spacing: 0; }
    nav.escritorio { display: flex; gap: 4px; flex: 1; }
    nav a, .desplegable a, .desplegable button {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0 12px;
      text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 4px; transition: background .15s, color .15s;
    }
    nav.escritorio a:hover { background: var(--blanco); color: var(--tinta); }
    nav a.activo { background: var(--tinta); color: var(--papel); }
    .derecha { display: flex; align-items: center; gap: 10px; margin-left: auto; }
    .invitado { display: flex; align-items: center; gap: 10px; }
    .invitado .btn { min-height: 44px; padding: 0 16px; font-size: 14px; }
    .secundario { font-size: 13px; color: var(--tenue); padding: 0 6px; min-height: 44px; display: inline-flex; align-items: center; }
    .cuenta { position: relative; }
    .boton-avatar {
      display: flex; align-items: center; gap: 6px; min-height: 44px; padding: 3px 6px 3px 3px;
      border: 0; border-radius: 999px; background: transparent; cursor: pointer; color: var(--tinta);
    }
    .boton-avatar:hover { background: var(--blanco); }
    .flecha { font-size: 12px; }
    .desplegable {
      position: absolute; right: 0; top: calc(100% + 8px); width: 250px; padding: 8px;
      display: flex; flex-direction: column; background: var(--blanco); border: 2px solid var(--tinta);
      border-radius: 6px; box-shadow: 6px 6px 0 var(--tinta); animation: caer .16s ease-out;
    }
    .desplegable a, .desplegable button { width: 100%; border: 0; background: none; font: inherit; font-size: 14px; font-weight: 700; color: var(--tinta); cursor: pointer; text-align: left; }
    .desplegable a:hover, .desplegable button:hover { background: var(--papel); color: var(--azul); }
    .quien { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px 12px; margin-bottom: 6px; border-bottom: 2px solid var(--linea); }
    .quien strong { font-size: 14px; }
    .quien span { font-size: 12px; color: var(--tenue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .legal { display: flex; margin: 6px 0; padding-top: 6px; border-top: 2px solid var(--linea); }
    .desplegable .legal a { width: auto; flex: 1; font-size: 13px; font-weight: 400; color: var(--tenue); }
    .salir { color: var(--coral-texto) !important; }
    .hamburguesa {
      display: none; width: 44px; height: 44px; align-items: center; justify-content: center;
      border: 2px solid var(--tinta); border-radius: 4px; background: var(--blanco); font-size: 20px; cursor: pointer; color: var(--tinta);
    }
    nav.movil {
      display: flex; flex-direction: column; padding: 8px clamp(16px, 4vw, 48px) 16px;
      border-top: 2px solid var(--linea); animation: caer .18s ease-out;
    }
    nav.movil a { min-height: 48px; font-size: 16px; border-bottom: 1px solid var(--linea); border-radius: 0; }
    nav.movil a.destacado { color: var(--azul); }
    @keyframes caer { from { opacity: 0; transform: translateY(-6px); } }
    @media (max-width: 860px) {
      .escritorio { display: none !important; }
      .hamburguesa { display: inline-flex; }
    }
    @media (max-width: 480px) {
      header { gap: 10px; }
      .marca { gap: 8px; font-size: 20px; }
      .etiqueta { padding: 2px 4px; font-size: 10px; }
      .flecha { display: none; }
      .derecha { gap: 8px; }
    }
  `,
  host: {
    '(document:click)': 'clicFuera($event)',
    '(document:keydown.escape)': 'cerrar()',
  },
})
export class Encabezado {
  protected auth = inject(AuthService);
  private elemento = inject(ElementRef<HTMLElement>);

  protected menuCuenta = signal(false);
  protected menuMovil = signal(false);

  protected enlaces = computed<Enlace[]>(() => {
    switch (this.auth.usuario()?.rol) {
      case 'estudiante':
        return [
          { ruta: '/feed', texto: 'Feed' },
          { ruta: '/retos', texto: 'Retos' },
          { ruta: '/sesiones', texto: 'En vivo' },
        ];
      case 'empresa':
        return [
          { ruta: '/talento', texto: 'Buscar talento' },
          { ruta: '/candidatos', texto: 'Mis candidatos' },
          { ruta: '/retos', texto: 'Retos' },
          { ruta: '/sesiones', texto: 'En vivo' },
          { ruta: '/planes', texto: 'Planes' },
        ];
      default:
        return [];
    }
  });

  constructor() {
    // Al cambiar de pantalla, los menús se cierran solos.
    inject(Router).events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.cerrar());
  }

  alternar(cual: 'cuenta' | 'movil'): void {
    const abrirCuenta = cual === 'cuenta' && !this.menuCuenta();
    const abrirMovil = cual === 'movil' && !this.menuMovil();
    this.menuCuenta.set(abrirCuenta);
    this.menuMovil.set(abrirMovil);
  }

  cerrar(): void {
    this.menuCuenta.set(false);
    this.menuMovil.set(false);
  }

  clicFuera(e: MouseEvent): void {
    if (!this.elemento.nativeElement.contains(e.target as Node)) this.cerrar();
  }
}
