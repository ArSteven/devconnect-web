import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { filasAportes, filasCodigo } from '../../core/aportes';
import { AuthService } from '../../core/auth/auth.service';
import { alias } from '../../core/github';
import { Publicacion, hace } from '../../core/modelos';
import { Reloj, cuentaRegresiva } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { EditorCodigo } from '../../shared/editor-codigo';
import { Tecnologia } from '../../shared/tecnologia';

/** Líneas de código en la tarjeta, como la demostración de la portada: las mismas que recorta la API. */
const LINEAS = 12;

const lineas = (n: number, texto: [string, string]) => `⋯ ${n} ${n === 1 ? texto[0] : texto[1]}`;

/** Publicación del feed contada como lo que es: una persona que pide mejoras y quienes se las proponen. */
@Component({
  selector: 'app-tarjeta-publicacion',
  imports: [RouterLink, Avatar, EditorCodigo, Tecnologia],
  template: `
    <article class="card pub card-interactiva aparecer" [class.reto]="esReto()">
      <header class="cabeza">
        <app-avatar [nombre]="p().autor_nombre" [github]="p().autor_github" [tamano]="40" />
        <div class="quien">
          <p class="accion">
            @if (esReto()) {
              <strong>{{ p().autor_nombre }}</strong> publicó un reto de
            } @else {
              <a class="alias" [routerLink]="['/portafolio', p().autor_id]" [title]="p().autor_nombre">{{ alias(p().autor_nombre, p().autor_github) }}</a>
              {{ p().estado === 'resuelta' ? 'pidió' : 'pide' }} mejoras para su código
            }
            <app-tecnologia [nombre]="p().lenguaje" [tamano]="18" />
          </p>
          <span class="cuando">{{ hace(p().creado_en) }}</span>
        </div>
      </header>

      <a class="titulo" [routerLink]="['/publicacion', p().id]">{{ p().titulo }}</a>
      @if (p().descripcion) {
        <p class="descripcion">{{ p().descripcion }}</p>
      }

      @if (editor(); as e) {
        <a class="vista-codigo" [routerLink]="['/publicacion', p().id]" tabindex="-1" aria-hidden="true">
          <app-editor-codigo [filas]="e.filas" [etiqueta]="e.etiqueta" [arriba]="e.arriba" [abajo]="e.abajo" />
        </a>
      }

      <footer class="pie">
        @if (p().proponentes.length) {
          <span class="pila" [title]="nombresProponentes()">
            @for (x of p().proponentes; track x.id) {
              <app-avatar [nombre]="x.nombre" [github]="x.github_url" [tamano]="28" />
            }
          </span>
        }
        @if (participacion().invitar) {
          <a class="invitar" [routerLink]="['/publicacion', p().id]" fragment="proponer">{{ participacion().texto }}</a>
        } @else {
          <span>{{ participacion().texto }}</span>
        }
        <span class="chip estado {{ estado().clase }}">{{ estado().texto }}</span>
      </footer>
    </article>
  `,
  styles: `
    :host { display: block; }
    .pub { padding: 20px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .pub.reto { box-shadow: 6px 6px 0 var(--coral); }
    .pub.reto:hover { box-shadow: 8px 8px 0 var(--coral); }
    .cabeza { display: flex; align-items: center; gap: 14px; }
    .quien { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .accion { font-size: 14px; line-height: 1.6; color: #3D3B36; overflow-wrap: anywhere; }
    .accion strong, .alias { font-weight: 800; color: var(--tinta); }
    .alias { text-decoration: none; }
    .alias:hover { color: var(--azul); text-decoration: underline; }
    .accion app-tecnologia { margin-left: 2px; font-size: 13px; color: var(--tinta); }
    .cuando { font-size: 12px; color: var(--tenue); }
    .titulo { font-size: 19px; font-weight: 800; line-height: 1.35; letter-spacing: -0.02em; text-decoration: none; overflow-wrap: anywhere; }
    .descripcion { font-size: 14px; line-height: 1.6; color: #3D3B36; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .vista-codigo { display: block; text-decoration: none; color: inherit; }
    .pie { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; min-height: 44px; font-size: 13px; color: var(--tenue); }
    .pila { display: inline-flex; padding-left: 8px; }
    .pila app-avatar { margin-left: -8px; }
    .invitar { display: inline-flex; align-items: center; min-height: 44px; font-weight: 800; color: var(--azul); }
    .estado { margin-left: auto; }
    @media (max-width: 520px) {
      .pub { padding: 16px; }
      .titulo { font-size: 17px; }
    }
  `,
})
export class TarjetaPublicacion {
  private auth = inject(AuthService);
  private reloj = inject(Reloj);

  readonly p = input.required<Publicacion>();

  protected hace = hace;
  protected alias = alias;
  protected esReto = computed(() => this.p().tipo === 'reto');

  /** En un reto: "Cierra en 2 d 4 h" mientras recibe soluciones; después, "Cerrado". */
  private cierre = computed(() => {
    const limite = this.p().fecha_limite;
    if (!limite) return '';
    const falta = cuentaRegresiva(limite, this.reloj.ahora());
    return falta ? `Cierra ${falta.charAt(0).toLowerCase()}${falta.slice(1)}` : 'Cerrado';
  });
  private abierta = computed(() => (this.esReto() ? this.cierre() !== 'Cerrado' : this.p().estado === 'abierta'));
  private puedeProponer = computed(() => {
    const yo = this.auth.usuario();
    return yo?.rol === 'estudiante' && yo.id !== this.p().autor_id && this.abierta();
  });

  protected estado = computed(() => {
    if (this.esReto()) return { texto: this.cierre(), clase: this.abierta() ? 'chip-abierta' : '' };
    return this.p().estado === 'resuelta'
      ? { texto: '✓ Mejorado', clase: 'chip-resuelta' }
      : { texto: 'Necesita mejoras', clase: 'chip-abierta' };
  });

  /** "3 personas propusieron mejoras" o, si nadie lo ha hecho, la invitación a ser el primero. */
  protected participacion = computed(() => {
    const n = this.p().total_proponentes;
    if (this.esReto()) {
      if (n > 0) return { texto: n === 1 ? '1 persona envió una solución' : `${n} personas enviaron soluciones`, invitar: false };
      return this.puedeProponer()
        ? { texto: 'Sé el primero en enviar una solución', invitar: true }
        : { texto: 'Aún nadie envía soluciones', invitar: false };
    }
    if (n > 0) return { texto: n === 1 ? '1 persona propuso mejoras' : `${n} personas propusieron mejoras`, invitar: false };
    return this.puedeProponer()
      ? { texto: 'Sé el primero en proponer una mejora', invitar: true }
      : { texto: 'Aún nadie propone mejoras', invitar: false };
  });

  protected nombresProponentes = computed(() => {
    const p = this.p();
    const nombres = p.proponentes.map(x => x.nombre).join(', ');
    const resto = p.total_proponentes - p.proponentes.length;
    return resto > 0 ? `${nombres} y ${resto} más` : nombres;
  });

  /**
   * Con una mejora aceptada se ve el código resultante, con las líneas aportadas en verde y el @
   * de quien las hizo. Sin mejora, el comienzo del código publicado.
   */
  protected editor = computed(() => {
    const p = this.p();
    if (p.mejora) {
      const m = p.mejora;
      const filas = filasAportes(m, p.lenguaje);
      const antes = m.desde_linea - 1;
      const despues = m.total_lineas - antes - filas.length;
      return {
        filas,
        etiqueta: alias(m.autor.nombre, m.autor.github_url),
        arriba: antes > 0 ? lineas(antes, ['línea sin cambios', 'líneas sin cambios']) : '',
        abajo: despues > 0 ? lineas(despues, ['línea más', 'líneas más']) : '',
      };
    }
    const filas = filasCodigo(p.codigo, p.lenguaje, LINEAS);
    if (!filas.length) return null;
    const despues = p.total_lineas - filas.length;
    return { filas, etiqueta: '', arriba: '', abajo: despues > 0 ? lineas(despues, ['línea más', 'líneas más']) : '' };
  });
}
