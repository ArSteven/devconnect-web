import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { EventoHistorial, Portafolio as DatosPortafolio, hace } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

type Filtro = 'todo' | EventoHistorial['tipo'];

interface Commit {
  evento: EventoHistorial;
  hash: string;
  mensaje: string;
  etiqueta: string;
  clase: string;
  enRama: boolean;
  fusion: boolean;
}

@Component({
  selector: 'app-portafolio',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="contenedor">
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (datos(); as d) {
        <header class="perfil">
          <span class="tenue">$ git log --author="{{ d.perfil.nombre }}"</span>
          <h1>{{ d.perfil.nombre }}</h1>
          @if (lugar()) {
            <p class="tenue">{{ lugar() }}</p>
          }
          @if (d.perfil.biografia) {
            <p class="bio">{{ d.perfil.biografia }}</p>
          }
          @if (d.perfil.stack.length) {
            <div class="stack">
              @for (s of d.perfil.stack; track s) {
                <span>{{ s }}</span>
              }
            </div>
          }
          @if (esPropio() && !editando()) {
            <button class="btn btn-secundario" type="button" (click)="abrirEdicion()">editar perfil</button>
          }
        </header>

        @if (editando()) {
          <form class="card formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
            <h2>editar perfil</h2>
            <div class="dos">
              <label class="campo">Programa<input type="text" formControlName="programa" maxlength="150"></label>
              <label class="campo">Institución<input type="text" formControlName="institucion" maxlength="150"></label>
              <label class="campo">Ciudad<input type="text" formControlName="ciudad" maxlength="100"></label>
              <label class="campo">Stack (separado por comas)<input type="text" formControlName="stack" placeholder="go, angular, postgresql"></label>
            </div>
            <label class="campo">Biografía<textarea formControlName="biografia" rows="3" maxlength="500"></textarea></label>
            @if (errorForm()) {
              <p class="error" role="alert">{{ errorForm() }}</p>
            }
            <div class="acciones">
              <button class="btn btn-primario" type="submit" [disabled]="guardando()">guardar</button>
              <button class="btn btn-secundario" type="button" (click)="editando.set(false)">cancelar</button>
            </div>
          </form>
        }

        @if (d.contacto) {
          <div class="contacto card">
            <span>contacto</span>
            <a href="mailto:{{ d.contacto.correo }}">{{ d.contacto.correo }}</a>
          </div>
        } @else if (d.contacto_bloqueado) {
          <div class="bloqueado">
            <span>Tu empresa está en el plan gratuito: ves el portafolio, pero contactar a este estudiante requiere suscripción.</span>
            <a class="btn btn-primario" routerLink="/planes">ver planes →</a>
          </div>
        }

        <section class="totales">
          <div class="card"><strong>{{ d.totales.publicaciones }}</strong><span>publicaciones propias</span></div>
          <div class="card"><strong class="azul">{{ d.totales.mejoras_aportadas }}</strong><span>mejoras aceptadas en código ajeno</span></div>
          <div class="card"><strong class="coral">{{ d.totales.mejoras_recibidas }}</strong><span>mejoras recibidas</span></div>
          <div class="card"><strong class="verde">{{ d.totales.sesiones }}</strong><span>sesiones en vivo</span></div>
        </section>

        <section class="historial">
          <div class="cabecera">
            <h2>historial</h2>
            <div class="filtros" role="group" aria-label="Filtrar historial">
              @for (f of filtros; track f.valor) {
                <button type="button" [class.activo]="filtro() === f.valor" [attr.aria-pressed]="filtro() === f.valor" (click)="filtro.set(f.valor)">
                  {{ f.etiqueta }}
                </button>
              }
            </div>
          </div>

          <div class="card log">
            @for (c of commits(); track c.evento.id + c.evento.tipo) {
              <div class="fila">
                <div class="grafo" aria-hidden="true">
                  <div class="tronco"></div>
                  @if (c.enRama) { <div class="rama {{ c.clase }}"></div> }
                  @if (c.fusion) { <div class="fusion {{ c.clase }}"></div> }
                  <div class="punto {{ c.clase }}" [class.enRama]="c.enRama"></div>
                </div>
                <div class="contenido">
                  <span class="hash">{{ c.hash }}</span>
                  @if (c.evento.publicacion_id) {
                    <a class="mensaje" [routerLink]="['/publicacion', c.evento.publicacion_id]">{{ c.mensaje }}</a>
                  } @else {
                    <span class="mensaje">{{ c.mensaje }}</span>
                  }
                  <span class="tipo {{ c.clase }}">{{ c.etiqueta }}</span>
                  <span class="fecha">{{ hace(c.evento.fecha) }}</span>
                </div>
              </div>
            } @empty {
              <p class="vacio">
                {{ esPropio() ? 'Tu historial empieza cuando publiques código o propongas una mejora.' : 'Este estudiante todavía no tiene actividad.' }}
              </p>
            }
          </div>
        </section>
      } @else if (!error()) {
        <p class="tenue">cargando…</p>
      }
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 32px; }
    .perfil { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
    h1 { font-size: clamp(36px, 6vw, 64px); }
    h2 { font-size: 22px; }
    .tenue { color: var(--tenue); font-size: 13px; }
    .bio { font-size: 15px; line-height: 1.7; max-width: 640px; }
    .stack { display: flex; flex-wrap: wrap; gap: 8px; }
    .stack span { padding: 4px 10px; border: 2px solid var(--tinta); background: var(--blanco); font-size: 13px; font-weight: 700; }
    .formulario { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .dos { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
    .contacto { padding: 16px 20px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; box-shadow: 6px 6px 0 var(--verde); }
    .contacto span { font-size: 13px; color: var(--tenue); }
    .contacto a { font-weight: 700; font-size: 16px; }
    .bloqueado {
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;
      padding: 14px 18px; background: #FFE3D9; border: 2px solid var(--tinta); border-radius: 6px; font-size: 14px; line-height: 1.6;
    }
    .totales { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .totales .card { padding: 18px; display: flex; flex-direction: column; gap: 4px; }
    .totales strong { font-size: 32px; font-weight: 800; }
    .totales span { font-size: 13px; color: var(--tenue); }
    .azul { color: var(--azul); } .coral { color: var(--coral-texto); } .verde { color: var(--verde-texto); }
    .historial { display: flex; flex-direction: column; gap: 16px; }
    .cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; }
    .filtros button {
      min-height: 40px; padding: 0 12px; border: 2px solid var(--tinta); border-radius: 4px;
      background: var(--blanco); color: var(--tinta); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .filtros button.activo { background: var(--tinta); color: var(--papel); }
    .log { overflow: hidden; }
    .fila { display: flex; border-bottom: 1px solid var(--linea); }
    .fila:last-child { border-bottom: 0; }
    .grafo { position: relative; width: 72px; flex-shrink: 0; min-height: 60px; }
    .tronco { position: absolute; left: 22px; top: 0; bottom: 0; width: 2px; background: var(--tinta); }
    .rama { position: absolute; left: 50px; top: 0; bottom: 0; width: 2px; opacity: .35; }
    .fusion { position: absolute; left: 22px; top: 29px; width: 30px; height: 2px; }
    .punto { position: absolute; left: 15px; top: 22px; width: 16px; height: 16px; border: 2px solid var(--tinta); border-radius: 2px; }
    .punto.enRama { left: 43px; border-radius: 50%; }
    .publicacion.punto, .publicacion.rama, .publicacion.fusion { background: var(--tinta); }
    .aporte.punto, .aporte.rama, .aporte.fusion { background: var(--azul); }
    .recibida.punto, .recibida.rama, .recibida.fusion { background: var(--coral); }
    .sesion.punto { background: var(--verde); border-radius: 50%; }
    .contenido { flex: 1; min-width: 0; padding: 14px 18px 14px 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
    .hash { font-size: 12px; color: var(--tenue); }
    .mensaje { font-size: 15px; font-weight: 700; text-decoration: none; }
    .tipo { padding: 1px 6px; border: 1px solid currentColor; font-size: 11px; font-weight: 700; }
    .tipo.publicacion { color: var(--tinta); } .tipo.aporte { color: var(--azul); }
    .tipo.recibida { color: var(--coral-texto); } .tipo.sesion { color: var(--verde-texto); }
    .fecha { margin-left: auto; font-size: 12px; color: var(--tenue); }
    .vacio { padding: 24px; font-size: 14px; color: var(--tenue); }
  `,
})
export class Portafolio {
  private api = inject(Api);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  /** Viene de la ruta /portafolio/:id */
  readonly id = input.required<string>();

  protected hace = hace;
  protected datos = signal<DatosPortafolio | null>(null);
  protected error = signal('');
  protected filtro = signal<Filtro>('todo');
  protected editando = signal(false);
  protected guardando = signal(false);
  protected errorForm = signal('');

  protected filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'todo', etiqueta: 'todo' },
    { valor: 'publicacion', etiqueta: 'publicaciones' },
    { valor: 'aporte', etiqueta: 'aportes' },
    { valor: 'recibida', etiqueta: 'recibidas' },
    { valor: 'sesion', etiqueta: 'sesiones' },
  ];

  protected esPropio = computed(() => this.auth.usuario()?.id === this.id());

  protected lugar = computed(() => {
    const p = this.datos()?.perfil;
    return p ? [p.programa, p.institucion, p.ciudad].filter(Boolean).join(' · ') : '';
  });

  protected commits = computed<Commit[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const f = this.filtro();
    return d.historial.filter(e => f === 'todo' || e.tipo === f).map(e => this.aCommit(e));
  });

  protected form = this.fb.nonNullable.group({
    programa: ['', Validators.maxLength(150)],
    institucion: ['', Validators.maxLength(150)],
    ciudad: ['', Validators.maxLength(100)],
    stack: [''],
    biografia: ['', Validators.maxLength(500)],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id));
    });
  }

  abrirEdicion(): void {
    const p = this.datos()?.perfil;
    if (!p) return;
    this.form.setValue({
      programa: p.programa,
      institucion: p.institucion,
      ciudad: p.ciudad,
      stack: p.stack.join(', '),
      biografia: p.biografia,
    });
    this.errorForm.set('');
    this.editando.set(true);
  }

  guardar(): void {
    const v = this.form.getRawValue();
    const stack = v.stack.split(',').map(s => s.trim()).filter(Boolean);
    if (this.form.invalid || stack.length > 15) {
      this.errorForm.set('revisa los campos; el stack admite hasta 15 tecnologías');
      return;
    }
    this.guardando.set(true);
    this.api.actualizarPerfil({ ...v, stack }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.editando.set(false);
        this.cargar(this.id());
      },
      error: err => {
        this.errorForm.set(mensajeDeError(err));
        this.guardando.set(false);
      },
    });
  }

  private aCommit(e: EventoHistorial): Commit {
    const hash = e.id.replace(/-/g, '').slice(0, 7);
    switch (e.tipo) {
      case 'publicacion':
        return { evento: e, hash, mensaje: `publicó «${e.titulo}»`, etiqueta: 'publicación', clase: 'publicacion', enRama: false, fusion: false };
      case 'aporte':
        return { evento: e, hash, mensaje: `mejoró el código de @${e.con_quien}`, etiqueta: 'mejora aportada', clase: 'aporte', enRama: true, fusion: false };
      case 'recibida':
        return { evento: e, hash, mensaje: `@${e.con_quien} mejoró «${e.titulo}»`, etiqueta: 'mejora recibida', clase: 'recibida', enRama: true, fusion: true };
      default:
        return { evento: e, hash, mensaje: `dictó «${e.titulo}»`, etiqueta: 'sesión en vivo', clase: 'sesion', enRama: false, fusion: false };
    }
  }

  private cargar(id: string): void {
    this.error.set('');
    this.api.portafolio(id).subscribe({
      next: d => this.datos.set(d),
      error: err => this.error.set(mensajeDeError(err, 'no se pudo cargar el portafolio')),
    });
  }
}
