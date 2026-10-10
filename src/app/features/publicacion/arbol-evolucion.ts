import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { MEDIDAS, NodoEvolucion, disponer } from '../../core/evolucion';
import { alias } from '../../core/github';
import { Avatar } from '../../shared/avatar';

const fecha = (iso: string | null): string => {
  if (!iso) return '';
  const f = new Date(iso);
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (f.getFullYear() !== new Date().getFullYear()) opciones.year = 'numeric';
  return f.toLocaleDateString('es-CO', opciones).replace(/\./g, '');
};

/**
 * Cómo evolucionó el código: la versión original como tronco y cada propuesta como una rama, con
 * el color de su estado. Las ramas son SVG; los nodos son botones, para usarlos con teclado.
 */
@Component({
  selector: 'app-arbol-evolucion',
  imports: [Avatar],
  template: `
    @if (disposicion(); as d) {
      <div class="lienzo" [style.width.px]="d.ancho" [style.height.px]="d.alto">
        <svg class="ramas" [attr.width]="d.ancho" [attr.height]="d.alto" aria-hidden="true">
          @for (r of d.ramas; track r.id) { <path class="rama {{ r.estado }}" [attr.d]="r.d" /> }
        </svg>
        @for (n of d.nodos; track n.nodo.id) {
          <button type="button" class="nodo {{ n.nodo.tipo }} {{ n.nodo.estado ?? '' }}"
                  [style.left.px]="n.x" [style.top.px]="n.y" [style.width.px]="n.ancho" [style.--prof]="n.profundidad"
                  [attr.aria-label]="etiqueta(n.nodo)" [attr.aria-describedby]="activo() === n.nodo.id ? 'globo-evolucion' : null"
                  (pointerdown)="puntero = $event.pointerType" (keydown)="puntero = 'teclado'"
                  (mouseenter)="alPasar(n.nodo.id)" (mouseleave)="alSalir(n.nodo.id)"
                  (focus)="activo.set(n.nodo.id)" (blur)="alSalir(n.nodo.id, true)" (click)="pulsar(n.nodo)">
            <app-avatar [nombre]="n.nodo.persona.nombre" [github]="n.nodo.persona.github" [tamano]="32" />
            <span class="textos">
              <strong>{{ titulo(n.nodo) }}</strong>
              <span>{{ detalle(n.nodo) }}</span>
            </span>
            @if (n.nodo.estado; as estado) { <span class="sello {{ estado }}" aria-hidden="true">{{ sello(estado) }}</span> }
          </button>
        }
        @if (globo(); as g) {
          <div class="globo" id="globo-evolucion" role="tooltip" [style.left.px]="g.x" [style.top.px]="g.y">{{ g.texto }}</div>
        }
      </div>
      <p class="resumen">{{ resumen() }}</p>
    }
  `,
  styles: `
    :host { display: block; }
    .lienzo { position: relative; margin: 14px 0 10px; }
    .ramas { position: absolute; inset: 0; overflow: visible; animation: revelar-h .8s ease-out both; }
    :host(.vertical) .ramas { animation-name: revelar-v; }
    .rama { fill: none; stroke-width: 2.5; stroke-linecap: round; }
    .rama.aceptada, .rama.actual { stroke: var(--azul); stroke-width: 5; }
    .rama.pendiente { stroke: var(--tenue); stroke-dasharray: 7 7; }
    .rama.rechazada { stroke: #CFCABE; }
    .rama.tronco { stroke: var(--tinta); }

    /* Altos iguales a MEDIDAS en core/evolucion.ts: 66 px en horizontal y 62 px en vertical. */
    .nodo {
      position: absolute; height: 66px; display: flex; align-items: center; gap: 10px; padding: 0 12px;
      background: var(--blanco); border: 2px solid var(--tinta); border-radius: 8px; box-shadow: 4px 4px 0 var(--tinta);
      color: var(--tinta); font: inherit; text-align: left; cursor: pointer;
      animation: nodo-h .35s ease-out both; animation-delay: calc(var(--prof) * 260ms);
    }
    :host(.vertical) .nodo { height: 62px; animation-name: nodo-v; }
    .nodo:hover { background: var(--papel); }
    .nodo.aceptada { border-color: var(--azul); box-shadow: 4px 4px 0 var(--azul); }
    .nodo.actual { border-color: var(--azul); background: var(--azul-fondo); box-shadow: 4px 4px 0 var(--azul); }
    .nodo.pendiente { border-style: dashed; border-color: var(--tenue); box-shadow: none; }
    .nodo.rechazada { border-color: #CFCABE; color: var(--tenue); box-shadow: none; }
    .textos { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .textos strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .textos span { font-size: 11px; color: var(--tenue); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sello {
      position: absolute; top: -11px; right: 10px; padding: 1px 8px; border-radius: 999px;
      background: var(--azul); color: #fff; font-size: 11px; font-weight: 800; white-space: nowrap;
    }
    .sello.pendiente { background: var(--blanco); color: var(--tenue); box-shadow: 0 0 0 2px var(--tenue); }
    .sello.rechazada { background: var(--linea); color: var(--tenue); }
    .globo {
      position: absolute; z-index: 5; width: min(300px, 100%); padding: 10px 12px; border-radius: 6px;
      background: var(--tinta); color: var(--papel); box-shadow: 4px 4px 0 var(--azul);
      font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; pointer-events: none;
    }
    .resumen { font-size: 13px; color: var(--tenue); }
    @keyframes revelar-h { from { clip-path: inset(0 100% 0 0); } }
    @keyframes revelar-v { from { clip-path: inset(0 0 100% 0); } }
    @keyframes nodo-h { from { opacity: 0; transform: translateX(-8px); } }
    @keyframes nodo-v { from { opacity: 0; transform: translateY(-6px); } }
  `,
  host: { '[class.vertical]': 'disposicion()?.vertical' },
})
export class ArbolEvolucion {
  readonly raiz = input.required<NodoEvolucion>();
  readonly esReto = input(false);
  /** El destino del nodo elegido: 'original' o el id de una propuesta. */
  readonly elegir = output<string>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private ancho = signal(0);
  protected activo = signal<string | null>(null);
  /** En pantallas táctiles el primer toque muestra la explicación y el segundo lleva a la propuesta. */
  protected puntero = '';
  private fijado = false;

  protected disposicion = computed(() => (this.ancho() > 0 ? disponer(this.raiz(), this.ancho()) : null));

  protected globo = computed(() => {
    const d = this.disposicion();
    const id = this.activo();
    const n = d?.nodos.find(x => x.nodo.id === id);
    if (!d || !n) return null;
    const alto = d.vertical ? MEDIDAS.vertical.alto : MEDIDAS.horizontal.alto;
    return { x: Math.max(0, Math.min(n.x, d.ancho - 300)), y: n.y + alto + 10, texto: this.explicacion(n.nodo) };
  });

  protected resumen = computed(() => {
    const propuestas: NodoEvolucion[] = [];
    const juntar = (n: NodoEvolucion) => {
      if (n.tipo === 'propuesta') propuestas.push(n);
      n.hijos.forEach(juntar);
    };
    juntar(this.raiz());
    const personas = new Set(propuestas.map(p => p.persona.id)).size;
    const aceptadas = propuestas.filter(p => p.estado === 'aceptada').length;
    return this.esReto()
      ? `${personas} ${personas === 1 ? 'persona envió soluciones' : 'personas enviaron soluciones'} · ${aceptadas} ${aceptadas === 1 ? 'ganadora' : 'ganadoras'}`
      : `${personas} ${personas === 1 ? 'persona propuso mejoras' : 'personas propusieron mejoras'} · ${aceptadas} ${aceptadas === 1 ? 'aceptada' : 'aceptadas'}`;
  });

  constructor() {
    const observador = new ResizeObserver(([e]) => this.ancho.set(Math.floor(e.contentRect.width)));
    afterNextRender(() => observador.observe(this.host.nativeElement));
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }

  protected titulo(n: NodoEvolucion): string {
    if (n.tipo === 'original') return 'Versión original';
    if (n.tipo === 'actual') return 'Versión actual';
    return alias(n.persona.nombre, n.persona.github);
  }

  protected detalle(n: NodoEvolucion): string {
    if (n.tipo === 'original') return `${alias(n.persona.nombre, n.persona.github)} · ${fecha(n.fecha)}`;
    if (n.tipo === 'actual') return `Mejora de ${alias(n.persona.nombre, n.persona.github)}`;
    return `${fecha(n.fecha)} · +${n.agregadas} −${n.quitadas} líneas`;
  }

  /** La etiqueta del estado, en la esquina del nodo. */
  protected sello(estado: string): string {
    if (estado === 'aceptada') return this.esReto() ? '✓ Ganadora' : '✓ Aceptada';
    return estado === 'pendiente' ? 'Pendiente' : 'Rechazada';
  }

  protected etiqueta(n: NodoEvolucion): string {
    const estado = n.estado ? ` ${this.sello(n.estado).replace('✓ ', '')}.` : '';
    const ir = n.destino === 'original' ? 'Ir al código original.' : 'Ir a la propuesta.';
    return `${this.titulo(n)}. ${this.detalle(n)}.${estado} ${ir}`;
  }

  private explicacion(n: NodoEvolucion): string {
    const quien = alias(n.persona.nombre, n.persona.github);
    if (n.tipo === 'original') return `El código tal como lo publicó ${quien}.`;
    if (n.tipo === 'actual') return `La versión vigente del código: incluye la mejora de ${quien}.`;
    return n.explicacion || 'Sin explicación.';
  }

  protected alPasar(id: string): void {
    if (this.puntero !== 'touch') this.activo.set(id);
  }

  protected alSalir(id: string, perdioFoco = false): void {
    if (this.activo() === id && (perdioFoco || !this.fijado)) {
      this.activo.set(null);
      this.fijado = false;
    }
  }

  protected pulsar(n: NodoEvolucion): void {
    if (this.puntero === 'touch' && !(this.activo() === n.id && this.fijado)) {
      this.activo.set(n.id);
      this.fijado = true;
      return;
    }
    this.fijado = false;
    this.elegir.emit(n.destino);
  }
}
