import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Ejecutor, Progreso, ejecutable } from '../core/ejecucion';
import { ResultadoEjecucion } from '../core/modelos';
import { Codigo } from './codigo';
import { Consola } from './consola';

/** Un código con su botón «▶ Ejecutar» y su consola. En los formularios el código ya está a la vista y no se repite. */
@Component({
  selector: 'app-panel-ejecucion',
  imports: [Codigo, Consola],
  template: `
    <div class="panel">
      <div class="cabeza">
        @if (titulo()) { <h3>{{ titulo() }}</h3> }
        <button type="button" class="btn btn-secundario btn-pequeno" [disabled]="!soportado() || !hayCodigo() || ejecutando()" (click)="ejecutar()">
          {{ ejecutando() ? 'Ejecutando…' : '▶ Ejecutar' }}
        </button>
      </div>
      @if (mostrarCodigo()) {
        @if (hayCodigo()) {
          <div class="codigo"><app-codigo [codigo]="codigo()" [lenguaje]="lenguaje()" /></div>
        } @else {
          <p class="aviso">{{ sinCodigo() }}</p>
        }
      }
      @if (soportado()) {
        <app-consola [resultado]="resultado()" [progreso]="progreso()" [ejecutando]="ejecutando()" />
      } @else {
        <p class="aviso">Ejecución no disponible para este lenguaje todavía.</p>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .panel { display: flex; flex-direction: column; gap: 10px; height: 100%; }
    .cabeza { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px; }
    h3 { font-size: 15px; letter-spacing: -0.02em; overflow-wrap: anywhere; }
    .codigo { max-height: 320px; overflow: auto; border-radius: 8px; background: var(--editor); }
    .codigo ::ng-deep .bloque-codigo { border-radius: 0; }
    .aviso { padding: 12px 14px; border: 2px dashed var(--linea); border-radius: 6px; color: var(--tenue); font-size: 13px; line-height: 1.6; }
  `,
})
export class PanelEjecucion {
  private ejecutor = inject(Ejecutor);

  readonly codigo = input.required<string>();
  readonly lenguaje = input.required<string>();
  readonly titulo = input('');
  readonly mostrarCodigo = input(false);
  readonly sinCodigo = input('No hay código para ejecutar.');
  readonly termino = output<ResultadoEjecucion>();

  protected soportado = computed(() => ejecutable(this.lenguaje()));
  protected hayCodigo = computed(() => !!this.codigo().trim());
  protected ejecutando = signal(false);
  protected progreso = signal<Progreso | null>(null);
  protected resultado = signal<ResultadoEjecucion | null>(null);

  async ejecutar(): Promise<void> {
    if (!this.soportado() || !this.hayCodigo() || this.ejecutando()) return;
    this.ejecutando.set(true);
    this.progreso.set(null);
    const r = await this.ejecutor.ejecutar(this.lenguaje(), this.codigo(), p => this.progreso.set(p));
    this.resultado.set(r);
    this.ejecutando.set(false);
    this.termino.emit(r);
  }
}
