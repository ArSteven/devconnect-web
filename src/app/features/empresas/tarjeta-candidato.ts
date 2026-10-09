import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaTalento, etiquetaDisponibilidad, etiquetaModalidad, nivelAcademico } from '../../core/modelos';
import { tecnologia } from '../../core/tecnologias';
import { Avatar } from '../../shared/avatar';
import { Tecnologia } from '../../shared/tecnologia';

/** Tarjeta de un estudiante tal como la lee un reclutador: quién es, dónde está y qué ha demostrado. */
@Component({
  selector: 'app-tarjeta-candidato',
  imports: [RouterLink, Avatar, Tecnologia],
  template: `
    <article class="card tarjeta card-interactiva">
      <header>
        <app-avatar [nombre]="t().nombre" [github]="t().github_url" [tamano]="52" />
        <div class="nombre">
          <a [routerLink]="['/portafolio', t().id]"><strong>{{ t().nombre }}</strong></a>
          @if (t().titular || t().programa) { <span>{{ t().titular || t().programa }}</span> }
        </div>
      </header>

      <ul class="datos">
        @if (estudio()) { <li>{{ estudio() }}</li> }
        @if (lugar()) { <li>{{ lugar() }}</li> }
        @if (disponibilidad()) { <li class="disponible">{{ disponibilidad() }}</li> }
      </ul>

      <div class="metricas">
        <div [class.destacada]="t().tasa_aceptacion !== null">
          <strong>{{ t().tasa_aceptacion !== null ? t().tasa_aceptacion + ' %' : '—' }}</strong>
          <span>{{ t().tasa_aceptacion !== null ? 'Aceptación (' + t().mejoras_aportadas + '/' + t().propuestas_hechas + ')' : 'Sin propuestas aún' }}</span>
        </div>
        <div><strong>{{ t().mejoras_aportadas }}</strong><span>Mejoras aceptadas</span></div>
        <div>
          <strong>{{ t().semanas_activas }}/8</strong><span>Semanas activas</span>
          <span class="barras" aria-hidden="true">@for (n of ocho; track n) { <i [class.on]="n < t().semanas_activas"></i> }</span>
        </div>
      </div>

      @if (t().verificadas.length || declaradas().length) {
        <div class="aptitudes">
          @for (v of t().verificadas; track v) {
            <span class="apt verificada" title="Verificada con actividad en DevConnect"><app-tecnologia [nombre]="v" [tamano]="16" /> ✓</span>
          }
          @for (d of declaradas(); track d) {
            <span class="apt" title="Declarada por el estudiante"><app-tecnologia [nombre]="d" [tamano]="16" /></span>
          }
        </div>
      }

      @if (correo()) {
        <a class="correo" [href]="'mailto:' + correo() + '?subject=' + asunto">{{ correo() }}</a>
      }

      <div class="acciones">
        <a class="btn btn-primario btn-pequeno" [routerLink]="['/portafolio', t().id]">Ver perfil</a>
        <button class="btn btn-pequeno" [class.btn-secundario]="!t().guardado" [class.guardado]="t().guardado" type="button"
                [disabled]="guardando()" [attr.aria-pressed]="t().guardado" (click)="alternarGuardado.emit()">
          {{ t().guardado ? (modoLista() ? 'Quitar' : '✓ Guardado') : 'Guardar' }}
        </button>
      </div>
    </article>
  `,
  styles: `
    :host { display: block; }
    .tarjeta { height: 100%; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
    header { display: flex; align-items: center; gap: 12px; }
    .nombre { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .nombre a { text-decoration: none; font-size: 17px; }
    .nombre span { font-size: 12px; color: var(--tenue); line-height: 1.4; }
    .datos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: #3D3B36; }
    .disponible { align-self: flex-start; margin-top: 4px; padding: 2px 8px; border-radius: 999px; background: var(--verde-fondo); color: var(--verde-texto); font-size: 12px; font-weight: 700; }
    .metricas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px 0; border-top: 2px solid var(--linea); border-bottom: 2px solid var(--linea); }
    .metricas div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metricas strong { font-size: 20px; letter-spacing: -0.03em; }
    .metricas .destacada strong { color: var(--azul); }
    .metricas span { font-size: 11px; color: var(--tenue); line-height: 1.35; }
    .barras { display: flex; gap: 2px; margin-top: 2px; }
    .barras i { width: 7px; height: 7px; border-radius: 1px; background: var(--linea); }
    .barras i.on { background: var(--verde); }
    .aptitudes { display: flex; flex-wrap: wrap; gap: 6px; }
    .apt { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border: 2px solid var(--linea); border-radius: 4px; font-size: 12px; }
    .apt.verificada { border-color: var(--verde-texto); color: var(--verde-texto); background: var(--verde-fondo); font-weight: 800; }
    .correo { font-size: 13px; font-weight: 700; word-break: break-all; display: inline-flex; align-items: center; min-height: 44px; }
    .acciones { display: flex; gap: 8px; margin-top: auto; }
    .acciones .btn { flex: 1; }
    .guardado { background: var(--verde-fondo); color: var(--verde-texto); border-color: var(--verde-texto); }
  `,
})
export class TarjetaCandidato {
  readonly t = input.required<TarjetaTalento>();
  readonly guardando = input(false);
  readonly correo = input<string | undefined>('');
  /** En "Mis candidatos" el botón dice Quitar en vez de Guardado. */
  readonly modoLista = input(false);
  readonly alternarGuardado = output<void>();

  protected ocho = [0, 1, 2, 3, 4, 5, 6, 7];
  protected asunto = encodeURIComponent('Oportunidad laboral: vimos tu perfil en DevConnect');
  /** "UTS · 5.º semestre" */
  protected estudio = computed(() => [this.t().institucion, nivelAcademico(this.t())].filter(Boolean).join(' · '));
  /** "Girón · Presencial" */
  protected lugar = computed(() => [this.t().ciudad, etiquetaModalidad(this.t().modalidad)].filter(Boolean).join(' · '));
  protected disponibilidad = computed(() => etiquetaDisponibilidad(this.t().disponibilidad));
  /** Lo que declara pero aún no demuestra; máximo 4 para no saturar la tarjeta. */
  protected declaradas = computed(() => {
    const verificadas = new Set(this.t().verificadas.map(v => tecnologia(v).nombre));
    return this.t().stack.filter(s => !verificadas.has(tecnologia(s).nombre)).slice(0, 4);
  });
}
