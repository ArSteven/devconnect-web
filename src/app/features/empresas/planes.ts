import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Suscripcion } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

// Ajusta estos valores con los de tu proyección financiera.
const PRECIO_MENSUAL = '[PRECIO MENSUAL]';
const PRECIO_ANUAL = '[PRECIO ANUAL]';

type Linea = { t: string; tipo: 'mas' | 'menos' | 'igual' };

@Component({
  selector: 'app-planes',
  imports: [RouterLink],
  template: `
    <section class="contenedor">
      <div class="intro">
        <h1>gratis para aprender.<br><span class="resaltado">pago para contratar.</span></h1>
        <p>Los estudiantes nunca pagan. Las empresas se suscriben para hablar con el talento que encuentran.</p>
      </div>

      @if (suscripcion(); as s) {
        <div class="card activa">
          <strong>✓ Tu suscripción {{ s.periodo }} está activa hasta el {{ fecha(s.termina_en) }}.</strong>
          <span>Ya puedes ver el contacto de cualquier estudiante desde su portafolio.</span>
          <a class="btn btn-primario" routerLink="/talento">buscar talento →</a>
        </div>
      }

      <div class="selector">
        <div class="grupo" role="group" aria-label="Plan">
          <button type="button" [class.on]="!verSuscripcion()" [attr.aria-pressed]="!verSuscripcion()" (click)="verSuscripcion.set(false)">gratuito</button>
          <button type="button" [class.on]="verSuscripcion()" [attr.aria-pressed]="verSuscripcion()" (click)="verSuscripcion.set(true)">suscripción</button>
        </div>
        @if (verSuscripcion()) {
          <div class="grupo" role="group" aria-label="Periodo">
            <button type="button" [class.on]="periodo() === 'mensual'" [attr.aria-pressed]="periodo() === 'mensual'" (click)="periodo.set('mensual')">mensual</button>
            <button type="button" [class.on]="periodo() === 'anual'" [attr.aria-pressed]="periodo() === 'anual'" (click)="periodo.set('anual')">anual</button>
          </div>
        }
      </div>

      <div class="editor">
        <div class="barra">
          <span>plan.yaml</span>
          <span>{{ verSuscripcion() ? 'diff: gratuito → suscripción' : 'sin cambios' }}</span>
        </div>
        <div class="codigo">
          @for (l of lineas(); track $index) {
            <div class="linea {{ l.tipo }}">{{ l.t }}</div>
          }
        </div>
        <div class="pie">
          <span>{{ verSuscripcion() ? '3 capacidades nuevas para tu equipo' : 'buscas y ves portafolios sin costo' }}</span>
          @if (verSuscripcion()) {
            @if (suscripcion()) {
              <span class="actual">tu plan actual</span>
            } @else {
              <button class="btn azul" type="button" [disabled]="enviando()" (click)="suscribirse()">
                {{ enviando() ? 'procesando…' : 'suscribirme →' }}
              </button>
            }
          } @else if (suscripcion() === null) {
            <span class="actual">tu plan actual</span>
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
    h1 { font-size: clamp(32px, 5.5vw, 58px); line-height: 1.12; }
    .resaltado { background: var(--azul); color: var(--papel); padding: 0 10px; }
    .intro p { font-size: 15px; line-height: 1.7; color: #3D3B36; max-width: 620px; }
    .activa { padding: 20px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; box-shadow: 6px 6px 0 var(--verde); }
    .activa span { font-size: 14px; color: var(--tenue); }
    .selector { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; }
    .grupo { display: flex; gap: 6px; }
    .grupo button {
      min-height: 44px; padding: 0 16px; border: 2px solid var(--tinta); border-radius: 4px;
      background: var(--blanco); color: var(--tinta); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .grupo button.on { background: var(--tinta); color: var(--papel); }
    .editor { background: var(--editor); border-radius: 6px; box-shadow: 8px 8px 0 var(--azul); overflow: hidden; }
    .barra { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 12px 18px; background: var(--editor-barra); color: var(--editor-tenue); font-size: 12px; }
    .codigo { padding: 16px 0; overflow-x: auto; font-size: clamp(12px, 1.6vw, 15px); line-height: 1.9; }
    .linea { padding: 0 18px; white-space: pre; color: var(--editor-texto); }
    .linea.mas { background: #16241C; color: #7EE2B8; }
    .linea.menos { background: #2A1712; color: #FF8A6E; }
    .pie { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 18px; border-top: 1px solid #2A2A2A; color: var(--editor-tenue); font-size: 13px; }
    .azul { background: var(--azul); border-color: var(--azul); color: #fff; }
    .actual { padding: 8px 12px; border: 1px solid #4A4840; }
    .nota { font-size: 12px; color: var(--tenue); }
  `,
})
export class Planes {
  private api = inject(Api);

  protected verSuscripcion = signal(true);
  protected periodo = signal<'mensual' | 'anual'>('mensual');
  protected suscripcion = signal<Suscripcion | null | undefined>(undefined);
  protected enviando = signal(false);
  protected error = signal('');

  protected lineas = computed<Linea[]>(() => {
    if (!this.verSuscripcion()) {
      return [
        { t: '  plan: gratuito', tipo: 'igual' },
        { t: '  precio: 0', tipo: 'igual' },
        { t: '  ver_portafolios: true', tipo: 'igual' },
        { t: '  filtros: [lenguaje, ciudad, mejoras]', tipo: 'igual' },
        { t: '  contactar_estudiantes: false', tipo: 'igual' },
        { t: '  publicar_retos: false', tipo: 'igual' },
        { t: '  patrocinar_sesiones: false', tipo: 'igual' },
      ];
    }
    const precio = this.periodo() === 'mensual' ? `${PRECIO_MENSUAL}  # COP por mes` : `${PRECIO_ANUAL}  # COP por año`;
    return [
      { t: '- plan: gratuito', tipo: 'menos' },
      { t: '+ plan: suscripcion', tipo: 'mas' },
      { t: '- precio: 0', tipo: 'menos' },
      { t: `+ precio: ${precio}`, tipo: 'mas' },
      { t: '  ver_portafolios: true', tipo: 'igual' },
      { t: '  filtros: [lenguaje, ciudad, mejoras]', tipo: 'igual' },
      { t: '- contactar_estudiantes: false', tipo: 'menos' },
      { t: '+ contactar_estudiantes: true', tipo: 'mas' },
      { t: '- publicar_retos: false', tipo: 'menos' },
      { t: '+ publicar_retos: true', tipo: 'mas' },
      { t: '- patrocinar_sesiones: false', tipo: 'menos' },
      { t: '+ patrocinar_sesiones: true', tipo: 'mas' },
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
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
