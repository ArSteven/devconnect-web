import { Component, computed, input } from '@angular/core';
import { Progreso } from '../core/ejecucion';
import { ResultadoEjecucion } from '../core/modelos';

const duracion = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} s`);

/** Consola de «Pruébalo»: lo que imprimió el programa (stdout y stderr), las tablas de SQL y cuánto tardó. */
@Component({
  selector: 'app-consola',
  template: `
    <div class="consola">
      <div class="barra">
        <span>Consola</span>
        <span class="estado" [class.mal]="mal()" role="status">{{ estado() }}</span>
      </div>
      @if (salida().length) {
        <pre class="salida" tabindex="0" aria-label="Salida del programa">@for (s of salida(); track $index) {<span class="{{ s.flujo }}">{{ s.texto }}</span>}</pre>
      }
      @for (t of tablas(); track $index) {
        <div class="tabla" tabindex="0" role="region" [attr.aria-label]="'Resultado de la consulta ' + ($index + 1)">
          <table>
            <thead><tr>@for (c of t.columnas; track $index) { <th scope="col">{{ c }}</th> }</tr></thead>
            <tbody>
              @for (f of t.filas; track $index) {
                <tr>@for (v of f; track $index) { <td [class.nulo]="v === null">{{ v === null ? 'NULL' : v }}</td> }</tr>
              } @empty {
                <tr><td class="vacia" [attr.colspan]="t.columnas.length">Sin filas</td></tr>
              }
            </tbody>
          </table>
          @if (t.recortada) { <p class="nota">Se muestran las primeras 200 filas.</p> }
        </div>
      }
      @if (nota(); as n) { <p class="nota">{{ n }}</p> }
    </div>
  `,
  styles: `
    :host { display: block; }
    .consola { background: var(--editor); border-radius: 8px; overflow: hidden; color: var(--editor-texto); font-size: 13px; }
    .barra { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; padding: 8px 14px; background: var(--editor-barra); color: var(--editor-tenue); font-size: 12px; }
    .estado { font-weight: 700; color: #7EE2B8; }
    .estado.mal { color: #FF8A6E; }
    .salida { margin: 0; padding: 12px 14px; max-height: 260px; overflow: auto; font: inherit; line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
    .stderr { color: #FF8A6E; }
    .aviso { color: var(--editor-tenue); }
    .tabla { padding: 10px 14px; overflow-x: auto; }
    table { border-collapse: collapse; font-size: 12px; }
    th, td { padding: 4px 10px; border: 1px solid #3A3A3A; text-align: left; white-space: nowrap; }
    th { color: #C3CBFF; background: #1E1E1E; }
    .nulo, .vacia { color: var(--editor-tenue); font-style: italic; }
    .nota { padding: 8px 14px 12px; color: var(--editor-tenue); font-size: 12px; line-height: 1.5; }
    .tabla .nota { padding: 6px 0 0; }
  `,
})
export class Consola {
  readonly resultado = input<ResultadoEjecucion | null>(null);
  readonly progreso = input<Progreso | null>(null);
  readonly ejecutando = input(false);

  protected salida = computed(() => (this.ejecutando() ? (this.progreso()?.salida ?? []) : (this.resultado()?.salida ?? [])));
  protected tablas = computed(() => (this.ejecutando() ? [] : (this.resultado()?.tablas ?? [])));

  protected estado = computed(() => {
    if (this.ejecutando()) return this.progreso()?.estado ?? 'Preparando…';
    const r = this.resultado();
    if (!r) return 'Sin ejecutar';
    if (r.fallo) return 'No se ejecutó';
    if (r.detenida) return 'Se detuvo a los 5 s';
    return r.error ? `Terminó con error · ${duracion(r.ms)}` : `Terminó en ${duracion(r.ms)}`;
  });

  protected mal = computed(() => {
    const r = this.resultado();
    return !this.ejecutando() && !!r && (r.error || !!r.detenida || !!r.fallo);
  });

  protected nota = computed(() => {
    if (this.ejecutando()) return '';
    const r = this.resultado();
    if (!r) return 'Pulsa «▶ Ejecutar» para ver lo que imprime.';
    if (r.fallo) return r.fallo;
    if (r.detenida) return 'El programa no terminó en 5 segundos (¿un ciclo que no acaba?) y se detuvo. Arriba está lo que alcanzó a imprimir.';
    if (r.recortada) return 'La salida se recortó a 10.000 caracteres.';
    if (!r.salida.length && !r.tablas?.length) return 'El programa no imprimió nada.';
    return '';
  });
}
