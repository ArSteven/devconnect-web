import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { SesionVivo } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

/** Las salas se abren en meet.jit.si en otra pestaña: embebidas, Jitsi las corta a los 5 minutos. */
const URL_JITSI = 'https://meet.jit.si/';

@Component({
  selector: 'app-sesiones',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="contenedor">
      <div class="cabecera">
        <h1>Sesiones en vivo</h1>
        @if (esEstudiante() && !creando()) {
          <button class="btn btn-primario" type="button" (click)="creando.set(true)">+ Programar sesión</button>
        }
      </div>
      <p class="bajada">Un estudiante explica un tema en vivo y los demás preguntan. Dictar sesiones suma a tu portafolio.</p>

      @if (creando()) {
        <form class="card formulario" [formGroup]="form" (ngSubmit)="crear()" novalidate>
          <h2>Programar sesión</h2>
          <label class="campo">Título<input type="text" formControlName="titulo" maxlength="150" placeholder="Ej.: Punteros en Go sin miedo"></label>
          <label class="campo">Fecha y hora<input type="datetime-local" formControlName="inicia_en"></label>
          <label class="campo">Descripción (opcional)<textarea formControlName="descripcion" rows="3" maxlength="1000"></textarea></label>
          @if (errorForm()) {
            <p class="error" role="alert">{{ errorForm() }}</p>
          }
          <div class="acciones">
            <button class="btn btn-primario" type="submit" [disabled]="enviando()">Programar</button>
            <button class="btn btn-secundario" type="button" (click)="creando.set(false)">Cancelar</button>
          </div>
        </form>
      }

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <div class="lista">
        @for (s of sesiones(); track s.id) {
          <article class="card sesion" [class.envivo]="s.estado === 'en_vivo'">
            <div class="estado">
              @if (s.estado === 'en_vivo') {
                <span class="punto"></span> EN VIVO
              } @else {
                {{ fecha(s.inicia_en) }}
              }
            </div>
            <h3>{{ s.titulo }}</h3>
            @if (s.descripcion) {
              <p class="descripcion">{{ s.descripcion }}</p>
            }
            <p class="anfitrion">Dicta <a [routerLink]="['/portafolio', s.anfitrion_id]">&#64;{{ s.anfitrion_nombre }}</a></p>

            <div class="acciones">
              @if (s.estado === 'en_vivo') {
                <a class="btn btn-primario" [href]="urlSala(s)" target="_blank" rel="noopener">Entrar a la sala ↗</a>
              }
              @if (esAnfitrion(s)) {
                @if (s.estado === 'programada') {
                  <button class="btn btn-primario" type="button" (click)="cambiar(s, 'en_vivo')">Iniciar ahora</button>
                  <button class="btn btn-secundario" type="button" (click)="cambiar(s, 'finalizada')">Cancelar</button>
                } @else {
                  <button class="btn btn-secundario" type="button" (click)="cambiar(s, 'finalizada')">Finalizar</button>
                }
              }
            </div>
          </article>
        } @empty {
          @if (!cargando()) {
            <div class="card vacio">No hay sesiones programadas. {{ esEstudiante() ? 'Programa la primera.' : '' }}</div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 22px; max-width: 900px; }
    .cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; }
    h1 { font-size: clamp(30px, 4.5vw, 44px); line-height: 1.12; }
    h2 { font-size: 22px; } h3 { font-size: 20px; line-height: 1.3; }
    .bajada { font-size: 15px; line-height: 1.7; color: #3D3B36; }
    .formulario { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
    .lista { display: flex; flex-direction: column; gap: 18px; }
    .sesion { padding: 22px; display: flex; flex-direction: column; gap: 10px; }
    .sesion.envivo { box-shadow: 6px 6px 0 var(--verde); }
    .estado { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--tenue); }
    .envivo .estado { color: var(--verde-texto); }
    .punto { width: 10px; height: 10px; border-radius: 50%; background: var(--verde); animation: parpadeo 1.4s steps(1) infinite; }
    .descripcion { font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
    .anfitrion { font-size: 13px; color: var(--tenue); }
    .anfitrion a { color: var(--tinta); font-weight: 700; text-decoration: none; }
    .vacio { padding: 24px; font-size: 14px; color: var(--tenue); }
  `,
})
export class Sesiones {
  private api = inject(Api);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  protected sesiones = signal<SesionVivo[]>([]);
  protected cargando = signal(true);
  protected error = signal('');
  protected creando = signal(false);
  protected enviando = signal(false);
  protected errorForm = signal('');

  protected esEstudiante = computed(() => this.auth.usuario()?.rol === 'estudiante');

  protected form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    inicia_en: ['', Validators.required],
    descripcion: ['', Validators.maxLength(1000)],
  });

  constructor() {
    this.cargar();
  }

  esAnfitrion(s: SesionVivo): boolean {
    return s.anfitrion_id === this.auth.usuario()?.id;
  }

  urlSala(s: SesionVivo): string {
    return URL_JITSI + s.sala;
  }

  fecha(iso: string): string {
    return new Date(iso).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  }

  crear(): void {
    if (this.form.invalid) {
      this.errorForm.set('El título necesita al menos 5 caracteres y la fecha es obligatoria.');
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.errorForm.set('');
    // datetime-local da la hora local; se envía en ISO con zona horaria.
    this.api.crearSesion({ ...v, inicia_en: new Date(v.inicia_en).toISOString() }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.creando.set(false);
        this.form.reset();
        this.cargar();
      },
      error: err => {
        this.errorForm.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  cambiar(s: SesionVivo, estado: 'en_vivo' | 'finalizada'): void {
    this.api.cambiarEstadoSesion(s.id, estado).subscribe({
      next: () => {
        if (estado === 'en_vivo') window.open(this.urlSala(s), '_blank', 'noopener');
        this.cargar();
      },
      error: err => this.error.set(mensajeDeError(err)),
    });
  }

  private cargar(): void {
    this.api.sesiones().subscribe({
      next: lista => {
        this.sesiones.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
