import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

/** Logo: un cursor de texto (quien escribe) y un paréntesis (cierra lo que otro abrió). */
@Component({
  selector: 'app-logo',
  template: `
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect class="cursor" x="6" y="6" width="5" height="28" rx="1" fill="#2F4BFF"></rect>
      <path d="M17 6C35 6 35 34 17 34" stroke="#FF5A36" stroke-width="5" stroke-linecap="round"></path>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }
    .cursor { animation: parpadeo 1s steps(1) infinite; }
  `,
})
export class Logo {}

@Component({
  selector: 'app-encabezado',
  imports: [RouterLink, RouterLinkActive, Logo],
  template: `
    <header>
      <a routerLink="/" class="marca" aria-label="devconnect, inicio">
        <app-logo />
        <span>devconnect</span>
        @if (auth.usuario()?.rol === 'empresa') {
          <span class="etiqueta">empresas</span>
        }
      </a>
      <nav aria-label="principal">
        @switch (auth.usuario()?.rol) {
          @case ('estudiante') {
            <a routerLink="/feed" routerLinkActive="activo">feed</a>
            <a routerLink="/sesiones" routerLinkActive="activo">en vivo</a>
            <a [routerLink]="['/portafolio', auth.usuario()!.id]" routerLinkActive="activo">portafolio</a>
          }
          @case ('empresa') {
            <a routerLink="/talento" routerLinkActive="activo">buscar talento</a>
            <a routerLink="/sesiones" routerLinkActive="activo">en vivo</a>
            <a routerLink="/planes" routerLinkActive="activo">planes</a>
          }
          @default {
            <a routerLink="/registro" [queryParams]="{ rol: 'empresa' }">para empresas</a>
            <a routerLink="/login" routerLinkActive="activo">iniciar sesión</a>
          }
        }
        @if (auth.autenticado()) {
          <button type="button" (click)="auth.logout()">salir</button>
        }
      </nav>
    </header>
  `,
  styles: `
    header {
      display: flex; flex-wrap: wrap; gap: 16px;
      justify-content: space-between; align-items: center;
      padding: 20px clamp(20px, 4vw, 48px);
    }
    .marca {
      display: flex; align-items: center; gap: 10px;
      text-decoration: none; font-weight: 800; font-size: 20px; letter-spacing: -0.03em;
    }
    .etiqueta {
      padding: 2px 6px; background: var(--coral); color: var(--tinta);
      font-size: 11px; font-weight: 700; letter-spacing: 0;
    }
    nav { display: flex; flex-wrap: wrap; gap: 8px 16px; font-size: 14px; align-items: center; }
    nav a, nav button {
      padding: 6px 8px; min-height: 36px; display: inline-flex; align-items: center;
      text-decoration: none; background: none; border: 0; font: inherit; color: inherit; cursor: pointer;
    }
    nav a.activo { background: var(--tinta); color: var(--papel); }
  `,
})
export class Encabezado {
  protected auth = inject(AuthService);
}
