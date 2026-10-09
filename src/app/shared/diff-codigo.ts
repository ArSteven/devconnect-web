import { Component, computed, input, signal } from '@angular/core';
import { LineaDiff, TramoOculto, conContexto, diffLineas } from '../core/diff';
import { resaltarLineas } from '../core/resaltado';

type Fila = { tipo: 'linea'; l: LineaDiff; html: string } | { tipo: 'oculto'; clave: number; cantidad: number };

/**
 * Diff de una propuesta contra el código original: líneas agregadas en verde, eliminadas
 * en rojo y lo que no cambió plegado. Es lo que permite decidir de un vistazo.
 */
@Component({
  selector: 'app-diff-codigo',
  template: `
    <div class="diff">
      <div class="barra-diff">
        <span class="resumen">
          @if (agregadas() + eliminadas() === 0) {
            Sin cambios respecto al original
          } @else {
            <span class="mas">+{{ agregadas() }}</span> <span class="menos">−{{ eliminadas() }}</span>
            <span class="tenue-diff">{{ agregadas() + eliminadas() === 1 ? 'línea cambiada' : 'líneas cambiadas' }}</span>
          }
        </span>
        @if (hayOcultos() || completo()) {
          <button type="button" (click)="completo.set(!completo())">{{ completo() ? 'Solo los cambios' : 'Ver archivo completo' }}</button>
        }
      </div>
      <div class="cuerpo-diff">
        <div class="filas" aria-label="Cambios de la propuesta">
          @for (f of filas(); track $index) {
            @if (f.tipo === 'oculto') {
              <button type="button" class="plegado" (click)="desplegar(f.clave)">⋯ {{ f.cantidad }} líneas sin cambios · Mostrar</button>
            } @else {
              <div class="fd {{ f.l.tipo }}">
                <span class="n" aria-hidden="true">{{ f.l.original !== undefined ? f.l.original + 1 : '' }}</span>
                <span class="n" aria-hidden="true">{{ f.l.propuesta !== undefined ? f.l.propuesta + 1 : '' }}</span>
                <span class="signo">{{ f.l.tipo === 'agregada' ? '+' : f.l.tipo === 'eliminada' ? '−' : ' ' }}</span>
                <span class="txt" [innerHTML]="f.html || ' '"></span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .diff { background: var(--editor); border-radius: 6px; overflow: hidden; outline: 2px solid var(--tinta); }
    .barra-diff {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;
      padding: 8px 14px; background: var(--editor-barra); color: var(--editor-texto); font-size: 12px;
    }
    .resumen { display: inline-flex; flex-wrap: wrap; gap: 8px; }
    .mas { color: #7EE2B8; font-weight: 800; } .menos { color: #FF8A6E; font-weight: 800; }
    .tenue-diff { color: var(--editor-tenue); }
    .barra-diff button, .plegado {
      min-height: 32px; padding: 0 10px; border: 1px solid #4A4840; border-radius: 4px; background: transparent;
      color: var(--editor-tenue); font: inherit; font-size: 12px; cursor: pointer;
    }
    .barra-diff button:hover, .plegado:hover { color: var(--papel); border-color: var(--editor-tenue); }
    .cuerpo-diff { padding: 8px 0; overflow-x: auto; font-size: 13px; line-height: 1.75; tab-size: 4; }
    .filas { width: max-content; min-width: 100%; }
    .fd { display: grid; grid-template-columns: 40px 40px 22px 1fr; color: var(--editor-texto); }
    .n { padding-right: 10px; text-align: right; color: #5A5850; user-select: none; }
    .signo { text-align: center; user-select: none; color: var(--editor-tenue); }
    .txt { white-space: pre; padding-right: 16px; }
    .agregada { background: #16241C; }
    .agregada .signo, .agregada .n { color: #7EE2B8; }
    .agregada .txt { box-shadow: inset 3px 0 0 var(--verde); }
    .eliminada { background: #2A1712; }
    .eliminada .signo, .eliminada .n { color: #FF8A6E; }
    .eliminada .txt { box-shadow: inset 3px 0 0 var(--coral); text-decoration: line-through; text-decoration-color: rgba(255, 138, 110, .45); }
    .plegado { display: block; position: sticky; left: 14px; margin: 4px 14px; text-align: left; border-style: dashed; }
  `,
})
export class DiffCodigo {
  readonly original = input.required<string>();
  readonly propuesta = input.required<string>();
  readonly lenguaje = input('');

  protected completo = signal(false);
  private desplegados = signal<Set<number>>(new Set());

  private partir = (codigo: string) => codigo.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  private htmlA = computed(() => resaltarLineas(this.partir(this.original()), this.lenguaje()));
  private htmlB = computed(() => resaltarLineas(this.partir(this.propuesta()), this.lenguaje()));
  private diff = computed(() => {
    const a = this.partir(this.original());
    const b = this.partir(this.propuesta());
    return diffLineas(a ? a.split('\n') : [], b ? b.split('\n') : []);
  });

  protected agregadas = computed(() => this.diff().filter(l => l.tipo === 'agregada').length);
  protected eliminadas = computed(() => this.diff().filter(l => l.tipo === 'eliminada').length);

  private items = computed(() => (this.completo() ? this.diff() : conContexto(this.diff())));
  protected hayOcultos = computed(() => this.items().some(i => i.tipo === 'oculto'));

  protected filas = computed<Fila[]>(() => {
    const filas: Fila[] = [];
    const a = this.htmlA();
    const b = this.htmlB();
    const html = (l: LineaDiff) => (l.propuesta !== undefined ? b[l.propuesta] : a[l.original!]) ?? '';
    for (const item of this.items()) {
      if (item.tipo === 'oculto') {
        const tramo = item as TramoOculto;
        const clave = tramo.lineas[0].original ?? 0;
        if (this.desplegados().has(clave)) {
          for (const l of tramo.lineas) filas.push({ tipo: 'linea', l, html: html(l) });
        } else {
          filas.push({ tipo: 'oculto', clave, cantidad: tramo.cantidad });
        }
      } else {
        filas.push({ tipo: 'linea', l: item, html: html(item) });
      }
    }
    return filas;
  });

  protected desplegar(clave: number): void {
    this.desplegados.update(s => new Set(s).add(clave));
  }
}
