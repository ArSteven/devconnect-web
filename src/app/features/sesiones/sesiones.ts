import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import { urlSala } from '../../core/jitsi';
import { SesionVivo } from '../../core/modelos';
import { Reloj, cuentaRegresiva, fechaCorta } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { Cargando } from '../../shared/cargando';

/** "2026-10-06T15:30" en hora local, el formato que espera <input type="datetime-local">. */
function paraInput(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

@Component({
  selector: 'app-sesiones',
  imports: [ReactiveFormsModule, RouterLink, NgTemplateOutlet, Avatar, Cargando],
  templateUrl: './sesiones.html',
  styleUrl: './sesiones.css',
})
export class Sesiones implements OnInit {
  private api = inject(Api);
  private auth = inject(AuthService);
  private avisos = inject(Avisos);
  private reloj = inject(Reloj);
  private fb = inject(FormBuilder);

  /** /sesiones?programar=1 abre el formulario directamente (viene del feed). */
  readonly programar = input<string>();

  protected fechaCorta = fechaCorta;
  protected sesiones = signal<SesionVivo[]>([]);
  protected cargando = signal(true);
  protected error = signal('');
  protected creando = signal(false);
  protected enviando = signal(false);
  protected cambiando = signal<string | null>(null);
  protected errorForm = signal('');
  protected minimo = paraInput(new Date());
  protected maximo = paraInput(new Date(Date.now() + 90 * 86_400_000));

  protected esEstudiante = computed(() => this.auth.usuario()?.rol === 'estudiante');
  protected enVivo = computed(() => this.sesiones().filter(s => s.estado === 'en_vivo'));
  protected proximas = computed(() => this.sesiones().filter(s => s.estado === 'programada'));

  protected form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    inicia_en: ['', Validators.required],
    descripcion: ['', Validators.maxLength(1000)],
  });

  constructor() {
    this.cargar();
    // Cada minuto se actualiza la lista: así se ve cuando otra sesión pasa a "en vivo".
    const intervalo = setInterval(() => this.cargar(), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  ngOnInit(): void {
    if (this.programar() && this.esEstudiante()) this.abrirFormulario();
  }

  abrirFormulario(): void {
    this.minimo = paraInput(new Date());
    this.creando.set(true);
  }

  esAnfitrion(s: SesionVivo): boolean {
    return s.anfitrion_id === this.auth.usuario()?.id;
  }

  sala(s: SesionVivo): string {
    return urlSala(s.sala, this.auth.usuario()?.nombre);
  }

  cuenta(s: SesionVivo): string {
    return cuentaRegresiva(s.inicia_en, this.reloj.ahora()) || 'Debería empezar ya';
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
        this.avisos.exito('Sesión programada. Ya aparece en el feed para toda la comunidad.');
        this.cargar();
      },
      error: err => {
        this.errorForm.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  /**
   * La pestaña de Jitsi se abre en el mismo clic: si se abriera después de la respuesta
   * de la API, el navegador la bloquearía como ventana emergente.
   */
  iniciar(s: SesionVivo): void {
    const pestana = window.open(this.sala(s), '_blank');
    if (pestana) pestana.opener = null;
    this.cambiando.set(s.id);
    this.api.cambiarEstadoSesion(s.id, 'en_vivo').subscribe({
      next: () => {
        this.cambiando.set(null);
        this.avisos.exito(pestana ? 'Tu sesión está en vivo. La sala se abrió en otra pestaña.' : 'Tu sesión está en vivo. Pulsa "Entrar a la sala" para abrirla.');
        this.cargar();
      },
      error: err => {
        pestana?.close();
        this.cambiando.set(null);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  async terminar(s: SesionVivo): Promise<void> {
    const cancelar = s.estado === 'programada';
    const si = await this.avisos.confirmar(
      cancelar
        ? { titulo: '¿Cancelar la sesión?', texto: 'Desaparece de la lista y no cuenta en tu perfil.', aceptar: 'Sí, cancelar', cancelar: 'No', peligro: true }
        : { titulo: '¿Finalizar la sesión?', texto: 'La sala deja de mostrarse como en vivo y la sesión suma a tu perfil como dictada.', aceptar: 'Sí, finalizar' },
    );
    if (!si) return;
    this.cambiando.set(s.id);
    this.api.cambiarEstadoSesion(s.id, 'finalizada').subscribe({
      next: () => {
        this.cambiando.set(null);
        this.avisos.exito(cancelar ? 'Sesión cancelada.' : '¡Gracias por enseñar! La sesión ya cuenta en tu perfil.');
        this.cargar();
      },
      error: err => {
        this.cambiando.set(null);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  private cargar(): void {
    this.api.sesiones().subscribe({
      next: lista => {
        this.sesiones.set(lista);
        this.cargando.set(false);
        this.error.set('');
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
