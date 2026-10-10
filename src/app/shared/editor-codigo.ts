import { Component, computed, input } from '@angular/core';
import { FilaEditor } from '../core/aportes';

/**
 * Código con el aspecto del editor de la portada: las líneas que aportó una mejora en verde,
 * con el @ de quien las hizo a la derecha, y en un diff corto las quitadas en rojo.
 */
@Component({
  selector: 'app-editor-codigo',
  template: `
    <div class="editor">
      @if (conAportes()) { <div class="aviso leyenda">✓ Líneas aportadas por {{ etiqueta() }}</div> }
      @if (arriba()) { <div class="aviso arriba">{{ arriba() }}</div> }
      <div class="codigo">
        <div class="filas" [style.--digitos]="digitos()">
          @for (f of filas(); track $index) {
            <div class="linea {{ f.tipo }}">
              @if (conAportes()) { <span class="marca" aria-hidden="true">{{ f.tipo === 'agregada' ? '✓' : '' }}</span> }
              <span class="num" aria-hidden="true">{{ f.n ?? '' }}</span>
              @if (conSignos()) {
                <span class="signo" aria-hidden="true">{{ f.tipo === 'agregada' ? '+' : f.tipo === 'eliminada' ? '−' : '' }}</span>
                @if (f.tipo !== 'igual') { <span class="sr-only">{{ f.tipo === 'agregada' ? 'Línea agregada:' : 'Línea quitada:' }}</span> }
              }
              <span class="txt" [innerHTML]="f.html || ' '"></span>
              @if (f.tipo === 'agregada' && etiqueta()) { <span class="etiqueta">✓ {{ etiqueta() }}</span> }
            </div>
          }
        </div>
      </div>
      @if (abajo()) { <div class="aviso abajo">{{ abajo() }}</div> }
    </div>
  `,
  styles: `
    :host { display: block; container-type: inline-size; }
    .editor { background: var(--editor); border-radius: 10px; outline: 2px solid var(--tinta); overflow: hidden; }
    .codigo { padding: 14px 0; font-size: 13px; line-height: 1.9; overflow-x: auto; tab-size: 4; }
    .filas { width: max-content; min-width: 100%; }
    .linea { display: flex; align-items: center; padding-left: 16px; color: var(--editor-texto); }
    .num { flex: none; width: calc(var(--digitos) * 1ch + 16px); padding-right: 16px; text-align: right; color: #5A5850; user-select: none; }
    .signo { flex: none; width: 2ch; color: var(--editor-tenue); user-select: none; }
    .txt { white-space: pre; padding-right: 16px; }
    .agregada { background: #16241C; }
    .agregada .signo { color: #7EE2B8; }
    .eliminada { background: #2A1712; }
    .eliminada .signo { color: #FF8A6E; }
    .eliminada .txt { text-decoration: line-through; text-decoration-color: rgba(255, 138, 110, .45); }
    /* Como en la portada: el @ de quien aportó la línea, a la derecha y siempre a la vista. */
    .etiqueta {
      position: sticky; right: 0; margin-left: auto; padding: 0 16px 0 14px;
      background: #16241C; color: var(--verde); font-size: 11px; white-space: nowrap;
    }
    .aviso { padding: 8px 16px; color: var(--editor-tenue); font-size: 12px; }
    .arriba, .leyenda { border-bottom: 1px solid #2A2A2A; }
    .abajo { border-top: 1px solid #2A2A2A; }
    .leyenda { display: none; color: var(--verde); }
    .marca { display: none; }
    /* En un bloque angosto (celular) la etiqueta taparía el código: queda una marca ✓ junto al
       número de línea y una sola leyenda arriba con quién aportó. */
    @container (max-width: 479px) {
      .etiqueta { display: none; }
      .leyenda { display: block; }
      .marca { display: inline-block; flex: none; width: 2ch; margin-left: -8px; color: var(--verde); }
    }
  `,
})
export class EditorCodigo {
  readonly filas = input.required<FilaEditor[]>();
  /** "@usuario" que se muestra a la derecha de cada línea aportada. */
  readonly etiqueta = input('');
  /** En un diff: un + o un − antes de cada línea cambiada. */
  readonly conSignos = input(false);
  readonly arriba = input('');
  readonly abajo = input('');

  /** Hay líneas aportadas por alguien con nombre: se marcan y, en angosto, se explica arriba. */
  protected conAportes = computed(() => !!this.etiqueta() && this.filas().some(f => f.tipo === 'agregada'));
  /** Ancho de la columna de números: el del número más largo (la tarjeta puede empezar en la línea 120). */
  protected digitos = computed(() => Math.max(2, ...this.filas().map(f => String(f.n ?? '').length)));
}
