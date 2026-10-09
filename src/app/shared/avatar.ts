import { Component, computed, input, linkedSignal } from '@angular/core';
import { fotoGithub, iniciales } from '../core/github';

// Colores de la identidad para las iniciales, con el texto que contrasta en cada uno.
const COLORES = [
  { fondo: 'var(--azul)', texto: '#fff' },
  { fondo: 'var(--tinta)', texto: 'var(--papel)' },
  { fondo: 'var(--coral)', texto: 'var(--tinta)' },
  { fondo: 'var(--verde)', texto: 'var(--tinta)' },
];

/** Avatar circular: la foto de GitHub si el perfil la tiene; si no (o si falla), las iniciales. */
@Component({
  selector: 'app-avatar',
  template: `
    @if (foto() && !fallo()) {
      <img [src]="foto()" alt="" [width]="tamano()" [height]="tamano()" loading="lazy" decoding="async" (error)="fallo.set(true)">
    } @else {
      <span [style.background]="color().fondo" [style.color]="color().texto">{{ letras() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex; flex-shrink: 0; width: var(--t); height: var(--t);
      border-radius: 50%; overflow: hidden; box-shadow: 0 0 0 2px var(--tinta);
    }
    img, span { width: 100%; height: 100%; }
    img { object-fit: cover; background: var(--linea); }
    span { display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: calc(var(--t) * .38); letter-spacing: -0.02em; }
  `,
  host: { '[style.--t]': "tamano() + 'px'", 'aria-hidden': 'true' },
})
export class Avatar {
  readonly nombre = input.required<string>();
  readonly github = input<string | null | undefined>('');
  readonly tamano = input(36);

  protected foto = computed(() => fotoGithub(this.github(), this.tamano()));
  /** Si la foto no carga (usuario que no existe, sin red), se vuelve a las iniciales. */
  protected fallo = linkedSignal({ source: this.foto, computation: () => false });
  protected letras = computed(() => iniciales(this.nombre()));
  protected color = computed(() => {
    let h = 0;
    for (const c of this.nombre()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORES[h % COLORES.length];
  });
}
