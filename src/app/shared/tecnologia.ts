import { Component, computed, input, linkedSignal } from '@angular/core';
import { tecnologia } from '../core/tecnologias';

/**
 * Logo de una tecnología (Devicon) con su nombre. Si no hay logo, o no carga,
 * queda una insignia con el nombre: nunca un hueco.
 */
@Component({
  selector: 'app-tecnologia',
  template: `
    @if (info().logo && !fallo()) {
      <img [src]="info().logo" [alt]="conNombre() ? '' : info().nombre" [title]="conNombre() ? '' : info().nombre"
           [width]="tamano()" [height]="tamano()" loading="lazy" decoding="async" (error)="fallo.set(true)">
      @if (conNombre()) { <span class="nombre">{{ info().nombre }}</span> }
    } @else {
      <span class="insignia">{{ info().nombre }}</span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; min-width: 0; }
    img { flex-shrink: 0; object-fit: contain; }
    .nombre { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .insignia {
      padding: 1px 7px; border: 2px solid currentColor; border-radius: 3px;
      font-size: 11px; font-weight: 800; letter-spacing: .02em; white-space: nowrap; line-height: 1.5;
    }
  `,
})
export class Tecnologia {
  readonly nombre = input.required<string>();
  readonly tamano = input(18);
  readonly conNombre = input(true);

  protected info = computed(() => tecnologia(this.nombre()));
  protected fallo = linkedSignal({ source: this.info, computation: () => false });
}
