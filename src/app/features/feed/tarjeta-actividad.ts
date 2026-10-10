import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { filasCambio } from '../../core/aportes';
import { alias } from '../../core/github';
import { Actividad, hace } from '../../core/modelos';
import { Avatar } from '../../shared/avatar';
import { EditorCodigo } from '../../shared/editor-codigo';

/** Momento del feed en que se aceptó una mejora: quién mejoró el código de quién, y qué cambió. */
@Component({
  selector: 'app-tarjeta-actividad',
  imports: [RouterLink, Avatar, EditorCodigo],
  template: `
    <article class="card actividad aparecer">
      <header class="cabeza">
        <span class="avatares" aria-hidden="true">
          <app-avatar [nombre]="a().contribuyente.nombre" [github]="a().contribuyente.github_url" [tamano]="40" />
          <app-avatar class="autor" [nombre]="a().autor.nombre" [github]="a().autor.github_url" [tamano]="24" />
        </span>
        <div class="quien">
          <p class="accion">
            <a class="alias" [routerLink]="['/portafolio', a().contribuyente.id]" [title]="a().contribuyente.nombre">{{ alias(a().contribuyente.nombre, a().contribuyente.github_url) }}</a>
            @if (esReto()) {
              resolvió el reto de <strong>{{ a().autor.nombre }}</strong>
            } @else {
              mejoró el código de
              <a class="alias" [routerLink]="['/portafolio', a().autor.id]" [title]="a().autor.nombre">{{ alias(a().autor.nombre, a().autor.github_url) }}</a>
            }
            <span class="separador" aria-hidden="true">·</span>
            <span class="aporte">{{ esReto() ? '+1 reto resuelto' : '+1 aporte aceptado' }}</span>
          </p>
          <span class="cuando">{{ hace(a().aceptada_en) }}</span>
        </div>
      </header>

      @if (cambio().filas.length) {
        <app-editor-codigo [filas]="cambio().filas" [conSignos]="true" [abajo]="cambio().recortado ? '⋯ La mejora tiene más cambios' : ''" />
      }
      <a class="ver" [routerLink]="['/publicacion', a().publicacion_id]">Ver «{{ a().titulo }}» →</a>
    </article>
  `,
  styles: `
    :host { display: block; }
    .actividad { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; min-width: 0; box-shadow: 6px 6px 0 var(--verde); }
    .cabeza { display: flex; align-items: center; gap: 12px; }
    .avatares { position: relative; flex: none; width: 50px; height: 44px; }
    .autor { position: absolute; right: 0; bottom: 0; }
    .quien { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .accion { font-size: 14px; line-height: 1.6; color: #3D3B36; overflow-wrap: anywhere; }
    .accion strong, .alias { font-weight: 800; color: var(--tinta); }
    .alias { text-decoration: none; }
    .alias:hover { color: var(--azul); text-decoration: underline; }
    .separador { margin: 0 4px; color: var(--tenue); }
    .aporte { padding: 1px 8px; border-radius: 999px; background: var(--verde-fondo); color: var(--verde-texto); font-size: 12px; font-weight: 800; white-space: nowrap; }
    .cuando { font-size: 12px; color: var(--tenue); }
    .ver { align-self: flex-start; display: inline-flex; align-items: center; min-height: 44px; font-size: 13px; font-weight: 800; color: var(--azul); overflow-wrap: anywhere; }
    @media (max-width: 520px) {
      .actividad { padding: 14px 16px; }
    }
  `,
})
export class TarjetaActividad {
  readonly a = input.required<Actividad>();

  protected hace = hace;
  protected alias = alias;
  protected esReto = computed(() => this.a().tipo === 'reto');
  /** El primer cambio de la mejora, como diff de hasta seis líneas. */
  protected cambio = computed(() => filasCambio(this.a().cambio, this.a().lenguaje));
}
