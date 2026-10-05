import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { LENGUAJES, Publicacion, hace } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

const POR_PAGINA = 20;

@Component({
  selector: 'app-feed',
  imports: [RouterLink],
  template: `
    <section class="contenedor">
      <div class="cabecera">
        <h1>lo último de la comunidad</h1>
        @if (esEstudiante()) {
          <a class="btn btn-primario" routerLink="/publicar">+ publicar código</a>
        }
      </div>

      <div class="filtros" role="group" aria-label="Filtrar por lenguaje">
        <button type="button" [class.activo]="lenguaje() === ''" [attr.aria-pressed]="lenguaje() === ''" (click)="filtrar('')">todos</button>
        @for (l of lenguajes; track l.valor) {
          <button type="button" [class.activo]="lenguaje() === l.valor" [attr.aria-pressed]="lenguaje() === l.valor" (click)="filtrar(l.valor)">
            {{ l.etiqueta }}
          </button>
        }
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <div class="lista">
        @for (p of publicaciones(); track p.id) {
          <article class="card pub">
            <div class="meta">
              <a [routerLink]="['/portafolio', p.autor_id]">&#64;{{ p.autor_nombre }}</a>
              <span>· {{ hace(p.creado_en) }}</span>
              <span class="chip">{{ p.lenguaje }}</span>
              @if (p.estado === 'resuelta') {
                <span class="resuelta">✓ resuelta</span>
              }
            </div>
            <a class="titulo" [routerLink]="['/publicacion', p.id]">{{ p.titulo }}</a>
            <pre class="codigo">{{ recorte(p.codigo) }}</pre>
            <div class="conteo">
              <span>{{ p.total_propuestas }} {{ p.total_propuestas === 1 ? 'propuesta' : 'propuestas' }}</span>
              <span>{{ p.total_comentarios }} {{ p.total_comentarios === 1 ? 'comentario' : 'comentarios' }}</span>
            </div>
          </article>
        } @empty {
          @if (!cargando()) {
            <div class="card vacio">
              <p><strong>todavía no hay publicaciones{{ lenguaje() ? ' en ' + lenguaje() : '' }}.</strong></p>
              @if (esEstudiante()) {
                <p>Sé el primero: publica un código que no te funcione o que quieras mejorar.</p>
                <a class="btn btn-primario" routerLink="/publicar">+ publicar código</a>
              }
            </div>
          }
        }
      </div>

      @if (cargando()) {
        <p class="tenue">cargando…</p>
      }
      @if (hayMas() && !cargando()) {
        <button class="btn btn-secundario" type="button" (click)="cargarMas()">cargar más</button>
      }
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 24px; }
    .cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
    h1 { font-size: clamp(30px, 4.5vw, 44px); }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; }
    .filtros button {
      min-height: 40px; padding: 0 14px; border: 2px solid var(--tinta); border-radius: 4px;
      background: var(--blanco); color: var(--tinta); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .filtros button.activo { background: var(--tinta); color: var(--papel); }
    .lista { display: flex; flex-direction: column; gap: 20px; }
    .pub { padding: 22px; display: flex; flex-direction: column; gap: 12px; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; color: var(--tenue); }
    .meta a { color: var(--tinta); font-weight: 700; text-decoration: none; }
    .chip { padding: 1px 8px; border: 2px solid var(--tinta); color: var(--tinta); font-size: 12px; font-weight: 700; }
    .resuelta { color: var(--verde-texto); font-weight: 700; }
    .titulo { font-size: 19px; font-weight: 700; line-height: 1.4; text-decoration: none; }
    .codigo {
      margin: 0; padding: 14px 16px; background: var(--editor); color: var(--editor-texto);
      border-radius: 6px; font: inherit; font-size: 13px; line-height: 1.7; overflow-x: auto;
    }
    .conteo { display: flex; gap: 18px; font-size: 13px; color: var(--tenue); }
    .vacio { padding: 28px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
    .tenue { color: var(--tenue); font-size: 14px; }
  `,
})
export class Feed {
  private api = inject(Api);
  private auth = inject(AuthService);

  protected lenguajes = LENGUAJES;
  protected hace = hace;

  protected lenguaje = signal('');
  protected publicaciones = signal<Publicacion[]>([]);
  protected cargando = signal(false);
  protected hayMas = signal(false);
  protected error = signal('');
  private pagina = 1;

  protected esEstudiante = computed(() => this.auth.usuario()?.rol === 'estudiante');

  constructor() {
    this.cargar(true);
  }

  filtrar(lenguaje: string): void {
    if (lenguaje === this.lenguaje()) return;
    this.lenguaje.set(lenguaje);
    this.cargar(true);
  }

  cargarMas(): void {
    this.pagina++;
    this.cargar(false);
  }

  /** Solo las primeras líneas en el feed; el código completo está en el detalle. */
  recorte(codigo: string): string {
    const lineas = codigo.split('\n');
    return lineas.length > 8 ? lineas.slice(0, 8).join('\n') + '\n…' : codigo;
  }

  private cargar(desdeCero: boolean): void {
    if (desdeCero) {
      this.pagina = 1;
      this.publicaciones.set([]);
    }
    this.cargando.set(true);
    this.error.set('');
    this.api.listarPublicaciones(this.lenguaje(), this.pagina).subscribe({
      next: lista => {
        this.publicaciones.update(actual => [...actual, ...lista]);
        this.hayMas.set(lista.length === POR_PAGINA);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
