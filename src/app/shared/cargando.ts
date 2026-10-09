import { Component, input } from '@angular/core';

/** Indicador de espera: la D del logo se dibuja y se borra en bucle, con un texto que dice qué se espera. */
@Component({
  selector: 'app-cargando',
  template: `
    <div class="cargando" role="status" aria-live="polite">
      <svg viewBox="0 0 40 40" [attr.width]="tamano()" [attr.height]="tamano()" aria-hidden="true">
        <rect class="cursor" x="6" y="6" width="5" height="28" rx="1"></rect>
        <path class="trazo" d="M17 6C35 6 35 34 17 34" pathLength="1"></path>
      </svg>
      <span>{{ texto() }}</span>
    </div>
  `,
  styles: `
    .cargando { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 28px 16px; color: var(--tenue); font-size: 14px; }
    .cursor { fill: var(--azul); animation: parpadeo 1s steps(1) infinite; }
    .trazo {
      fill: none; stroke: var(--coral); stroke-width: 5; stroke-linecap: round;
      stroke-dasharray: 1; stroke-dashoffset: 1; animation: dibujar 1.6s cubic-bezier(.6, 0, .3, 1) infinite;
    }
    @keyframes dibujar { 0% { stroke-dashoffset: 1; } 45%, 55% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -1; } }
    @media (prefers-reduced-motion: reduce) { .trazo { stroke-dashoffset: 0; } }
  `,
})
export class Cargando {
  readonly texto = input('Cargando…');
  readonly tamano = input(40);
}
