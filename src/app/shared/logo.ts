import { Component, input } from '@angular/core';

/**
 * Logo: la D formada por un cursor azul que parpadea (quien escribe) y un paréntesis coral (cierra lo que otro abrió).
 * Con comoLetra, el ícono es la D de "[D]evconnect": el viewBox se recorta al trazo para que mida
 * lo mismo que una mayúscula del texto que lo rodea y se apoye en la línea base.
 */
@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.width]="comoLetra() ? null : tamano()" [attr.height]="comoLetra() ? null : tamano()"
         [attr.viewBox]="comoLetra() ? '6 3.5 27 33' : '0 0 40 40'" fill="none" aria-hidden="true">
      <rect class="cursor" x="6" y="6" width="5" height="28" rx="1" fill="#2F4BFF"></rect>
      <path d="M17 6C35 6 35 34 17 34" stroke="#FF5A36" stroke-width="5" stroke-linecap="round"></path>
    </svg>
  `,
  styles: `
    :host { display: inline-flex; }
    :host(.letra) svg { width: auto; height: .73em; height: 1cap; }
    .cursor { animation: parpadeo 1s steps(1) infinite; }
  `,
  host: { '[class.letra]': 'comoLetra()' },
})
export class Logo {
  readonly tamano = input(34);
  readonly comoLetra = input(false);
}
