import { Component, computed, input } from '@angular/core';
import { resaltarLineas } from '../core/resaltado';

/** Bloque de código resaltado y con números de línea. Con `maxLineas` muestra solo el comienzo. */
@Component({
  selector: 'app-codigo',
  template: `
    <pre class="bloque-codigo" [attr.aria-label]="'Código de ' + lenguaje()"><code>@for (l of visibles(); track $index) {<span class="fila"><span class="num" aria-hidden="true">{{ $index + 1 }}</span><span class="txt" [innerHTML]="l || ' '"></span></span>}</code></pre>
    @if (restantes() > 0) {
      <div class="mas-lineas">⋯ {{ restantes() }} {{ restantes() === 1 ? 'línea más' : 'líneas más' }}</div>
    }
  `,
  styles: `
    :host { display: block; }
    .mas-lineas { padding: 6px 16px 10px 60px; background: var(--editor); color: var(--editor-tenue); font-size: 12px; border-radius: 0 0 6px 6px; margin-top: -6px; }
  `,
})
export class Codigo {
  readonly codigo = input.required<string>();
  readonly lenguaje = input('');
  readonly maxLineas = input<number | null>(null);
  /** Total real de líneas cuando el código llega recortado desde la API (feed). */
  readonly totalLineas = input<number | null>(null);

  private lineas = computed(() => resaltarLineas(this.codigo().replace(/\n+$/, ''), this.lenguaje()));
  protected visibles = computed(() => {
    const max = this.maxLineas();
    return max ? this.lineas().slice(0, max) : this.lineas();
  });
  protected restantes = computed(() => Math.max(0, (this.totalLineas() ?? this.lineas().length) - this.visibles().length));
}
