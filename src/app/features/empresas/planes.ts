import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { Avisos } from '../../core/avisos';
import { Suscripcion } from '../../core/modelos';

// Precios validados con la encuesta a empresas: nadie pagaría más de $100.000 al mes.
const PRECIO_MENSUAL = 90_000;
const PRECIO_ANUAL = 900_000; // 10 meses: 2 meses gratis

type Linea = { t: string; tipo: 'mas' | 'menos' | 'igual' };

const pesos = (n: number) => '$' + n.toLocaleString('es-CO');

@Component({
  selector: 'app-planes',
  imports: [RouterLink],
  template: `
    <section class="contenedor">
      <div class="intro">
        <h1>Gratis para aprender.<br><span class="resaltado">Pago para contratar.</span></h1>
        <p>Los estudiantes nunca pagan. Las empresas buscan y guardan talento sin costo, y se suscriben para contactarlo y publicar retos.</p>
      </div>

      @if (suscripcion(); as s) {
        <div class="card activa aparecer">
          <strong>✓ Tu suscripción {{ s.periodo }} está activa hasta el {{ fecha(s.termina_en) }}.</strong>
          <span>Ya ves el correo de cualquier estudiante y puedes publicar retos.</span>
          <div class="acciones">
            <a class="btn btn-primario" routerLink="/talento">Buscar talento →</a>
            <a class="btn btn-secundario" routerLink="/retos">Publicar un reto</a>
          </div>
        </div>
      }

      <div class="precios">
        <button type="button" class="card plan" [class.elegido]="periodo() === 'mensual'" [attr.aria-pressed]="periodo() === 'mensual'" (click)="periodo.set('mensual')">
          <span class="nombre-plan">Mensual</span>
          <strong>{{ mensual }}</strong>
          <span class="tenue">COP al mes</span>
        </button>
        <button type="button" class="card plan" [class.elegido]="periodo() === 'anual'" [attr.aria-pressed]="periodo() === 'anual'" (click)="periodo.set('anual')">
          <span class="nombre-plan">Anual <span class="ahorro">2 meses gratis</span></span>
          <strong>{{ anual }}</strong>
          <span class="tenue">COP al año · equivale a {{ anualPorMes }} al mes</span>
        </button>
      </div>

      <div class="editor">
        <div class="barra">
          <span>plan.yaml</span>
          <span>Diff: gratuito → suscripción {{ periodo() }}</span>
        </div>
        <div class="codigo">
          @for (l of lineas(); track $index) {
            <div class="linea {{ l.tipo }}">{{ l.t }}</div>
          }
        </div>
        <div class="pie">
          <span>2 capacidades nuevas para tu equipo</span>
          @if (suscripcion()) {
            <span class="actual">Tu plan actual</span>
          } @else if (suscripcion() === null) {
            <button class="btn azul" type="button" [disabled]="enviando()" (click)="suscribirse()">
              {{ enviando() ? 'Procesando…' : 'Suscribirme por ' + (periodo() === 'mensual' ? mensual + '/mes' : anual + '/año') + ' →' }}
            </button>
          }
        </div>
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <p class="nota">El pago es simulado en el prototipo: no se cobra nada.</p>
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 28px; max-width: 980px; }
    .intro { display: flex; flex-direction: column; gap: 14px; }
    h1 { font-size: clamp(32px, 5.5vw, 58px); line-height: 1.22; }
    .intro p { font-size: 15px; line-height: 1.7; color: #3D3B36; max-width: 640px; }
    .activa { padding: 20px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; box-shadow: 6px 6px 0 var(--verde); }
    .activa span { font-size: 14px; color: var(--tenue); }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
    .precios { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
    .plan {
      padding: 20px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left;
      font: inherit; color: var(--tinta); cursor: pointer; box-shadow: 4px 4px 0 var(--linea); transition: box-shadow .15s, transform .15s;
    }
    .plan:hover { transform: translate(-2px, -2px); }
    .plan.elegido { box-shadow: 6px 6px 0 var(--azul); border-color: var(--azul); }
    .nombre-plan { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; }
    .ahorro { padding: 2px 8px; border-radius: 999px; background: var(--verde-fondo); color: var(--verde-texto); font-size: 11px; }
    .plan strong { font-size: 32px; letter-spacing: -0.04em; }
    .plan .tenue { font-size: 12px; }
    .editor { background: var(--editor); border-radius: 6px; box-shadow: 8px 8px 0 var(--azul); overflow: hidden; }
    .barra { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 12px 18px; background: var(--editor-barra); color: var(--editor-tenue); font-size: 12px; }
    .codigo { padding: 16px 0; overflow-x: auto; font-size: clamp(12px, 1.6vw, 15px); line-height: 1.9; }
    .linea { padding: 0 18px; white-space: pre; color: var(--editor-texto); }
    .linea.mas { background: #16241C; color: #7EE2B8; }
    .linea.menos { background: #2A1712; color: #FF8A6E; }
    .pie { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border-top: 1px solid #2A2A2A; color: var(--editor-tenue); font-size: 13px; }
    .azul { background: var(--azul); border-color: var(--azul); color: #fff; }
    .azul:hover { background: #fff; color: var(--azul); }
    .actual { padding: 8px 12px; border: 1px solid #4A4840; }
    .nota { font-size: 12px; color: var(--tenue); }
  `,
})
export class Planes {
  private api = inject(Api);
  private avisos = inject(Avisos);

  protected mensual = pesos(PRECIO_MENSUAL);
  protected anual = pesos(PRECIO_ANUAL);
  protected anualPorMes = pesos(Math.round(PRECIO_ANUAL / 12));

  protected periodo = signal<'mensual' | 'anual'>('mensual');
  protected suscripcion = signal<Suscripcion | null | undefined>(undefined);
  protected enviando = signal(false);
  protected error = signal('');

  protected lineas = computed<Linea[]>(() => {
    const precio = this.periodo() === 'mensual' ? `${PRECIO_MENSUAL}  # COP por mes` : `${PRECIO_ANUAL}  # COP por año, 2 meses gratis`;
    return [
      { t: '- plan: gratuito', tipo: 'menos' },
      { t: `+ plan: suscripcion_${this.periodo()}`, tipo: 'mas' },
      { t: '- precio: 0', tipo: 'menos' },
      { t: `+ precio: ${precio}`, tipo: 'mas' },
      { t: '  ver_perfiles: true', tipo: 'igual' },
      { t: '  filtros: [tecnologia, nivel, institucion, ciudad, disponibilidad, modalidad]', tipo: 'igual' },
      { t: '  guardar_candidatos: true', tipo: 'igual' },
      { t: '- contacto_directo: false', tipo: 'menos' },
      { t: '+ contacto_directo: true   # correo visible y en el CSV', tipo: 'mas' },
      { t: '- publicar_retos: false', tipo: 'menos' },
      { t: '+ publicar_retos: true', tipo: 'mas' },
    ];
  });

  constructor() {
    this.api.suscripcionActual().subscribe({
      next: s => this.suscripcion.set(s),
      error: () => this.suscripcion.set(null),
    });
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  suscribirse(): void {
    this.enviando.set(true);
    this.error.set('');
    this.api.suscribirse(this.periodo()).subscribe({
      next: s => {
        this.suscripcion.set(s);
        this.enviando.set(false);
        this.avisos.exito('Suscripción activa. Ya puedes contactar estudiantes y publicar retos.');
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
