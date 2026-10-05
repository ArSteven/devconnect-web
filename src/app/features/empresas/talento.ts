import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { LENGUAJES, Suscripcion, TarjetaTalento } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

@Component({
  selector: 'app-talento',
  imports: [RouterLink],
  template: `
    <section class="contenedor">
      @if (suscripcion() === null) {
        <div class="aviso">
          <span>Plan gratuito: ves portafolios, pero contactar estudiantes requiere suscripción.</span>
          <a class="btn btn-primario" routerLink="/planes">ver planes →</a>
        </div>
      }

      <h1>busca por lo que construyen,<br>no por lo que <span class="resaltado">dicen.</span></h1>

      <div class="terminal">
        <div class="comando">
          <span class="verde">$</span> devconnect buscar <span class="azul">{{ comando() }}</span><span class="cursor"></span>
        </div>

        <div class="fila">
          <span class="bandera">--lenguaje</span>
          @for (l of lenguajes; track l.valor) {
            <button type="button" [class.on]="elegidos().includes(l.valor)" [attr.aria-pressed]="elegidos().includes(l.valor)" (click)="alternarLenguaje(l.valor)">
              {{ l.etiqueta }}
            </button>
          }
        </div>

        <div class="fila">
          <label class="bandera" for="ciudad">--ciudad</label>
          <input id="ciudad" type="text" placeholder="ej.: bucaramanga" maxlength="100"
                 [value]="ciudad()" (change)="cambiarCiudad($any($event.target).value)">
        </div>

        <div class="fila">
          <span class="bandera">--opciones</span>
          <button type="button" [class.on]="conMejoras()" [attr.aria-pressed]="conMejoras()" (click)="alternarMejoras()">
            con mejoras aceptadas
          </button>
        </div>
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <p class="conteo">{{ cargando() ? 'buscando…' : resultados().length + (resultados().length === 1 ? ' perfil encontrado' : ' perfiles encontrados') }}</p>

      <div class="grilla">
        @for (t of resultados(); track t.id) {
          <article class="card tarjeta">
            <div class="nombre">
              <strong>{{ t.nombre }}</strong>
              @if (t.ciudad) { <span>{{ t.ciudad }}</span> }
            </div>
            @if (t.institucion) {
              <span class="tenue">{{ t.institucion }}</span>
            }
            @if (t.stack.length) {
              <div class="stack">
                @for (s of t.stack.slice(0, 5); track s) { <span>{{ s }}</span> }
              </div>
            }
            <div class="datos">
              <span><strong>{{ t.publicaciones }}</strong> publicaciones</span>
              <span><strong class="azul-texto">{{ t.mejoras_aportadas }}</strong> mejoras aceptadas</span>
            </div>
            <div class="acciones">
              <a class="btn btn-secundario" [routerLink]="['/portafolio', t.id]">portafolio</a>
              @if (suscripcion()) {
                <a class="btn btn-primario" [routerLink]="['/portafolio', t.id]">contactar</a>
              } @else {
                <a class="btn bloqueado" routerLink="/planes" aria-label="Contactar requiere suscripción">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
                  </svg>
                  contactar
                </a>
              }
            </div>
          </article>
        } @empty {
          @if (!cargando()) {
            <div class="card vacio">Ningún estudiante coincide con estos filtros. Prueba quitando alguno.</div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 24px; }
    .aviso {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;
      padding: 14px 18px; background: #FFE3D9; border: 2px solid var(--tinta); border-radius: 6px; font-size: 14px; line-height: 1.6;
    }
    h1 { font-size: clamp(30px, 5vw, 52px); line-height: 1.12; }
    .resaltado { background: var(--coral); padding: 0 8px; }
    .terminal { background: var(--editor); color: var(--papel); border-radius: 6px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
    .comando { font-size: clamp(13px, 1.6vw, 16px); line-height: 1.6; overflow-x: auto; white-space: nowrap; }
    .verde { color: #7EE2B8; } .azul { color: var(--azul-claro); }
    .cursor { display: inline-block; width: 9px; height: 18px; margin-left: 4px; vertical-align: middle; background: var(--papel); animation: parpadeo 1s steps(1) infinite; }
    .fila { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .bandera { width: 100px; font-size: 12px; color: var(--editor-tenue); }
    .fila button {
      min-height: 40px; padding: 0 12px; border: 1px solid #4A4840; border-radius: 4px;
      background: transparent; color: var(--papel); font: inherit; font-size: 13px; cursor: pointer;
    }
    .fila button.on { background: var(--papel); color: var(--tinta); border-color: var(--papel); }
    .fila input {
      min-height: 40px; padding: 0 12px; border: 1px solid #4A4840; border-radius: 4px;
      background: transparent; color: var(--papel); font: inherit; font-size: 13px; min-width: 220px;
    }
    .conteo { font-size: 14px; font-weight: 700; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 20px; }
    .tarjeta { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .nombre { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .nombre strong { font-size: 17px; }
    .nombre span, .tenue { font-size: 12px; color: var(--tenue); }
    .stack { display: flex; flex-wrap: wrap; gap: 6px; }
    .stack span { padding: 2px 8px; border: 2px solid var(--tinta); font-size: 12px; font-weight: 700; }
    .datos { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--tenue); }
    .datos strong { color: var(--tinta); }
    .datos .azul-texto { color: var(--azul); }
    .acciones { display: flex; gap: 8px; margin-top: auto; }
    .acciones .btn { flex: 1; min-height: 44px; padding: 0 10px; font-size: 13px; }
    .bloqueado { background: var(--linea); border-color: var(--linea); color: var(--tenue); }
    .vacio { padding: 24px; font-size: 14px; color: var(--tenue); }
  `,
})
export class Talento {
  private api = inject(Api);

  protected lenguajes = LENGUAJES.filter(l => l.valor !== 'otro');
  protected elegidos = signal<string[]>([]);
  protected ciudad = signal('');
  protected conMejoras = signal(false);
  protected resultados = signal<TarjetaTalento[]>([]);
  protected cargando = signal(false);
  protected error = signal('');
  /** undefined = todavía cargando; null = plan gratuito */
  protected suscripcion = signal<Suscripcion | null | undefined>(undefined);

  protected comando = computed(() => {
    const partes: string[] = [];
    if (this.elegidos().length) partes.push(`--lenguaje ${this.elegidos().join(',')}`);
    if (this.ciudad()) partes.push(`--ciudad ${this.ciudad().toLowerCase()}`);
    if (this.conMejoras()) partes.push('--con-mejoras');
    return partes.join(' ') || '--todos';
  });

  constructor() {
    this.api.suscripcionActual().subscribe({
      next: s => this.suscripcion.set(s),
      error: () => this.suscripcion.set(null),
    });
    this.buscar();
  }

  alternarLenguaje(valor: string): void {
    this.elegidos.update(lista => (lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]));
    this.buscar();
  }

  cambiarCiudad(valor: string): void {
    this.ciudad.set(valor.trim());
    this.buscar();
  }

  alternarMejoras(): void {
    this.conMejoras.update(v => !v);
    this.buscar();
  }

  private buscar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.api.talento({ lenguajes: this.elegidos(), ciudad: this.ciudad(), conMejoras: this.conMejoras() }).subscribe({
      next: lista => {
        this.resultados.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
