import { Component, input } from '@angular/core';

/** Pantalla temporal mientras se construye cada módulo. */
@Component({
  selector: 'app-proximamente',
  template: `
    <section class="contenedor">
      <div class="card caja">
        <span class="tenue">// en construcción</span>
        <h1>{{ titulo() }}</h1>
        <p>Esta pantalla llega en la siguiente entrega. La sesión ya funciona.</p>
      </div>
    </section>
  `,
  styles: `
    .caja { padding: 32px; display: flex; flex-direction: column; gap: 12px; max-width: 640px; }
    h1 { font-size: clamp(32px, 5vw, 48px); }
    .tenue { color: var(--tenue); font-size: 13px; }
  `,
})
export class Proximamente {
  readonly titulo = input('');
}
