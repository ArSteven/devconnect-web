import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { DetallePublicacion, hace } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

@Component({
  selector: 'app-detalle',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="contenedor">
      <a routerLink="/feed" class="volver">← volver al feed</a>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (pub(); as p) {
        <header class="encabezado">
          <div class="meta">
            <a [routerLink]="['/portafolio', p.autor_id]">&#64;{{ p.autor_nombre }}</a>
            <span>· {{ hace(p.creado_en) }}</span>
            <span class="chip">{{ p.lenguaje }}</span>
            <span class="estado" [class.resuelta]="p.estado === 'resuelta'">
              {{ p.estado === 'resuelta' ? '✓ resuelta' : 'abierta' }}
            </span>
          </div>
          <h1>{{ p.titulo }}</h1>
          @if (p.descripcion) {
            <p class="descripcion">{{ p.descripcion }}</p>
          }
        </header>

        <div class="editor">
          <div class="barra"><span>codigo · {{ p.lenguaje }}</span></div>
          <pre>@for (l of numerar(p.codigo); track $index) {<span class="num">{{ $index + 1 }}</span>{{ l }}
}</pre>
        </div>

        <section class="bloque">
          <h2>// propuestas de mejora ({{ p.propuestas.length }})</h2>
          @if (esAutor() && pendientes() > 0) {
            <p class="aviso">Eres el autor: revisa las propuestas y acepta la que resuelva tu problema. Quien la hizo la suma a su portafolio.</p>
          }

          @for (pr of p.propuestas; track pr.id) {
            <article class="card propuesta" [class.aceptada]="pr.estado === 'aceptada'" [class.rechazada]="pr.estado === 'rechazada'">
              <div class="meta">
                <a [routerLink]="['/portafolio', pr.autor_id]">&#64;{{ pr.autor_nombre }}</a>
                <span>· {{ hace(pr.creado_en) }}</span>
                <span class="estado-propuesta {{ pr.estado }}">
                  {{ pr.estado === 'aceptada' ? '✓ aceptada' : pr.estado === 'rechazada' ? 'rechazada' : 'pendiente' }}
                </span>
              </div>
              <p class="explicacion">{{ pr.explicacion }}</p>
              <pre class="codigo">{{ pr.codigo }}</pre>
              @if (esAutor() && pr.estado === 'pendiente') {
                <div class="decision">
                  <button class="btn btn-primario" type="button" [disabled]="decidiendo()" (click)="decidir(pr.id, 'aceptada')">aceptar mejora</button>
                  <button class="btn btn-secundario" type="button" [disabled]="decidiendo()" (click)="decidir(pr.id, 'rechazada')">rechazar</button>
                </div>
              }
            </article>
          } @empty {
            <p class="tenue">Todavía nadie ha propuesto una mejora.</p>
          }

          @if (puedeProponer()) {
            <form class="card formulario" [formGroup]="formPropuesta" (ngSubmit)="proponer()" novalidate>
              <h3>proponer una mejora</h3>
              <label class="campo">
                Tu versión del código
                <textarea formControlName="codigo" rows="8" class="mono" spellcheck="false"></textarea>
              </label>
              <label class="campo">
                Explica qué cambiaste y por qué
                <textarea formControlName="explicacion" rows="3"></textarea>
              </label>
              @if (errorPropuesta()) {
                <p class="error" role="alert">{{ errorPropuesta() }}</p>
              }
              <button class="btn btn-primario" type="submit" [disabled]="enviando()">proponer mejora →</button>
            </form>
          }
        </section>

        <section class="bloque">
          <h2>// comentarios ({{ p.comentarios.length }})</h2>
          @for (c of p.comentarios; track c.id) {
            <div class="comentario">
              <div class="meta">
                <a [routerLink]="['/portafolio', c.autor_id]">&#64;{{ c.autor_nombre }}</a>
                <span>· {{ hace(c.creado_en) }}</span>
              </div>
              <p>{{ c.texto }}</p>
            </div>
          }
          <form class="comentar" [formGroup]="formComentario" (ngSubmit)="comentar()" novalidate>
            <label class="campo">
              Tu comentario
              <textarea formControlName="texto" rows="2" maxlength="2000"></textarea>
            </label>
            <button class="btn btn-secundario" type="submit" [disabled]="enviando()">comentar</button>
          </form>
        </section>
      } @else if (!error()) {
        <p class="tenue">cargando…</p>
      }
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 24px; max-width: 900px; }
    .volver { font-size: 13px; }
    .encabezado { display: flex; flex-direction: column; gap: 12px; }
    h1 { font-size: clamp(28px, 4.5vw, 40px); line-height: 1.1; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
    .descripcion { font-size: 15px; line-height: 1.7; color: #3D3B36; }
    .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 13px; color: var(--tenue); }
    .meta a { color: var(--tinta); font-weight: 700; text-decoration: none; }
    .chip { padding: 1px 8px; border: 2px solid var(--tinta); color: var(--tinta); font-size: 12px; font-weight: 700; }
    .estado { font-weight: 700; }
    .estado.resuelta { color: var(--verde-texto); }
    .editor { background: var(--editor); border-radius: 8px; outline: 2px solid var(--tinta); box-shadow: 8px 8px 0 var(--tinta); overflow: hidden; }
    .barra { padding: 10px 16px; background: var(--editor-barra); color: var(--editor-tenue); font-size: 12px; }
    .editor pre { margin: 0; padding: 16px 0; color: var(--editor-texto); font: inherit; font-size: 14px; line-height: 1.8; overflow-x: auto; }
    .num { display: inline-block; width: 44px; padding-right: 14px; text-align: right; color: #5A5850; user-select: none; }
    .bloque { display: flex; flex-direction: column; gap: 16px; padding-top: 16px; border-top: 2px solid var(--tinta); }
    .aviso { padding: 12px 14px; background: #E5E9FF; border: 2px solid var(--azul); border-radius: 4px; font-size: 14px; line-height: 1.6; }
    .propuesta { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    .propuesta.aceptada { box-shadow: 6px 6px 0 var(--verde); }
    .propuesta.rechazada { opacity: .6; }
    .estado-propuesta { font-weight: 700; }
    .estado-propuesta.aceptada { color: var(--verde-texto); }
    .estado-propuesta.pendiente { color: var(--azul); }
    .explicacion { font-size: 14px; line-height: 1.7; }
    .codigo { margin: 0; padding: 14px 16px; background: var(--editor); color: var(--editor-texto); border-radius: 6px; font: inherit; font-size: 13px; line-height: 1.7; overflow-x: auto; }
    .decision { display: flex; flex-wrap: wrap; gap: 10px; }
    .formulario { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
    .mono { background: var(--editor) !important; color: var(--editor-texto) !important; font-size: 13px !important; line-height: 1.7; tab-size: 4; }
    .comentario { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; background: var(--blanco); border: 2px solid var(--linea); border-radius: 4px; }
    .comentario p { font-size: 14px; line-height: 1.6; }
    .comentar { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .comentar .campo { width: 100%; }
    .tenue { color: var(--tenue); font-size: 14px; }
  `,
})
export class Detalle {
  private api = inject(Api);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  /** Viene de la ruta /publicacion/:id */
  readonly id = input.required<string>();

  protected hace = hace;
  protected pub = signal<DetallePublicacion | null>(null);
  protected error = signal('');
  protected errorPropuesta = signal('');
  protected enviando = signal(false);
  protected decidiendo = signal(false);

  protected esAutor = computed(() => this.pub()?.autor_id === this.auth.usuario()?.id);
  protected pendientes = computed(() => this.pub()?.propuestas.filter(p => p.estado === 'pendiente').length ?? 0);
  protected puedeProponer = computed(() => this.auth.usuario()?.rol === 'estudiante' && !this.esAutor());

  protected formPropuesta = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(20000)]],
    explicacion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected formComentario = this.fb.nonNullable.group({
    texto: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id));
    });
  }

  numerar(codigo: string): string[] {
    return codigo.split('\n');
  }

  proponer(): void {
    if (this.formPropuesta.invalid) {
      this.errorPropuesta.set('incluye tu código y una explicación de al menos 10 caracteres');
      return;
    }
    this.enviando.set(true);
    this.errorPropuesta.set('');
    this.api.proponer(this.id(), this.formPropuesta.getRawValue()).subscribe({
      next: () => {
        this.formPropuesta.reset();
        this.enviando.set(false);
        this.cargar(this.id());
      },
      error: err => {
        this.errorPropuesta.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  decidir(propuestaId: string, estado: 'aceptada' | 'rechazada'): void {
    this.decidiendo.set(true);
    this.api.decidir(propuestaId, estado).subscribe({
      next: () => {
        this.decidiendo.set(false);
        this.cargar(this.id());
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.decidiendo.set(false);
      },
    });
  }

  comentar(): void {
    if (this.formComentario.invalid) return;
    this.enviando.set(true);
    this.api.comentar(this.id(), this.formComentario.getRawValue().texto).subscribe({
      next: () => {
        this.formComentario.reset();
        this.enviando.set(false);
        this.cargar(this.id());
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  private cargar(id: string): void {
    this.error.set('');
    this.api.detalle(id).subscribe({
      next: p => this.pub.set(p),
      error: err => this.error.set(mensajeDeError(err, 'no se pudo cargar la publicación')),
    });
  }
}
