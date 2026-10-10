import { Component, computed, effect, inject, input, linkedSignal, signal, untracked, viewChildren } from '@angular/core';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { ejecutable, firmaSalida } from '../../core/ejecucion';
import { alias } from '../../core/github';
import { DetallePublicacion, Propuesta, ResultadoEjecucion } from '../../core/modelos';
import { PanelEjecucion } from '../../shared/panel-ejecucion';

// Un reto sin código inicial se compara contra un programa que no imprime nada.
const SIN_SALIDA: ResultadoEjecucion = { salida: [], tablas: [], error: false, recortada: false, ms: 0 };

/**
 * «Pruébalo»: el código original y la mejora aceptada lado a lado, cada uno con su consola. Si la mejora
 * corre sin errores y cambia la salida, y quien la prueba no es su autor, queda verificada en su perfil.
 */
@Component({
  selector: 'app-pruebalo',
  imports: [PanelEjecucion],
  template: `
    <section class="pruebalo" aria-labelledby="titulo-pruebalo">
      <div class="cabeza">
        <div>
          <h2 id="titulo-pruebalo">Pruébalo</h2>
          <p class="tenue">Ejecuta las dos versiones y compara lo que imprimen.</p>
        </div>
        @if (soportado()) {
          <button type="button" class="btn btn-primario btn-pequeno" (click)="ejecutarLasDos()">▶ Ejecutar las dos</button>
        }
      </div>
      <div class="paneles">
        <app-panel-ejecucion [titulo]="'Original de ' + autor()" [codigo]="publicacion().codigo" [lenguaje]="publicacion().lenguaje"
                             [mostrarCodigo]="true" sinCodigo="Este reto no trae código inicial: la solución se compara contra un programa que no imprime nada."
                             (termino)="original.set($event)" />
        <app-panel-ejecucion [titulo]="'Mejorado por ' + contribuyente()" [codigo]="mejora().codigo" [lenguaje]="publicacion().lenguaje"
                             [mostrarCodigo]="true" (termino)="mejorado.set($event)" />
      </div>
      @if (veredicto(); as v) {
        <p class="veredicto" [class.cambia]="v === 'cambia'" role="status">
          {{ v === 'cambia' ? 'La mejora cambia el resultado' : 'Ambas versiones producen la misma salida' }}
        </p>
      }
      @if (verificadaEn()) {
        <p class="sello">✓ Mejora verificada por ejecución</p>
      } @else if (esContribuyente() && veredicto() === 'cambia') {
        <p class="tenue nota">Cuando otra persona la ejecute y vea este resultado, quedará verificada en tu perfil.</p>
      }
    </section>
  `,
  styles: `
    .pruebalo { display: flex; flex-direction: column; gap: 14px; padding-top: 18px; border-top: 2px solid var(--tinta); }
    .cabeza { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 10px 16px; }
    h2 { font-size: 20px; }
    .cabeza .tenue { margin-top: 4px; font-size: 13px; }
    .paneles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .paneles app-panel-ejecucion { padding: 14px; background: var(--blanco); border: 2px solid var(--tinta); border-radius: 6px; }
    .veredicto { padding: 12px 14px; border: 2px solid var(--tinta); border-radius: 4px; background: var(--blanco); font-size: 14px; font-weight: 800; }
    .veredicto.cambia { border-color: var(--verde-texto); background: var(--verde-fondo); color: var(--verde-texto); }
    .sello { align-self: flex-start; padding: 6px 12px; border: 2px solid var(--verde-texto); border-radius: 999px; background: var(--verde-fondo); color: var(--verde-texto); font-size: 13px; font-weight: 800; }
    .nota { font-size: 13px; line-height: 1.6; }
    @media (max-width: 760px) {
      .paneles { grid-template-columns: minmax(0, 1fr); }
    }
  `,
})
export class Pruebalo {
  private api = inject(Api);
  private auth = inject(AuthService);

  readonly publicacion = input.required<DetallePublicacion>();
  /** La mejora aceptada (en un reto, la solución ganadora). */
  readonly mejora = input.required<Propuesta>();

  protected original = signal<ResultadoEjecucion | null>(null);
  protected mejorado = signal<ResultadoEjecucion | null>(null);
  protected verificadaEn = linkedSignal(() => this.mejora().verificada_en ?? null);
  private paneles = viewChildren(PanelEjecucion);
  private verificando = false;

  protected soportado = computed(() => ejecutable(this.publicacion().lenguaje));
  protected esContribuyente = computed(() => this.auth.usuario()?.id === this.mejora().autor_id);
  protected autor = computed(() => {
    const p = this.publicacion();
    return p.tipo === 'reto' ? p.autor_nombre : alias(p.autor_nombre, p.autor_github);
  });
  protected contribuyente = computed(() => alias(this.mejora().autor_nombre, this.mejora().autor_github));

  protected veredicto = computed<'cambia' | 'igual' | null>(() => {
    const a = this.publicacion().codigo.trim() ? this.original() : SIN_SALIDA;
    const b = this.mejorado();
    if (!a || !b || a.fallo || b.fallo) return null;
    return firmaSalida(a) === firmaSalida(b) ? 'igual' : 'cambia';
  });

  constructor() {
    effect(() => {
      const b = this.mejorado();
      if (this.veredicto() === 'cambia' && b && !b.error && !b.detenida) untracked(() => this.verificar());
    });
  }

  ejecutarLasDos(): void {
    for (const panel of this.paneles()) panel.ejecutar();
  }

  /** Quien hizo la mejora no se verifica a sí mismo: la constancia la deja otra persona al probarla. */
  private verificar(): void {
    if (this.verificadaEn() || this.verificando || !this.auth.usuario() || this.esContribuyente()) return;
    this.verificando = true;
    this.api.verificar(this.mejora().id).subscribe({
      next: en => this.verificadaEn.set(en),
      error: () => (this.verificando = false),
    });
  }
}
