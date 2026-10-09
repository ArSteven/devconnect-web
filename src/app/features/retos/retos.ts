import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import { LENGUAJES, Publicacion, Suscripcion, hace } from '../../core/modelos';
import { Reloj, cuentaRegresiva, fechaCorta } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { CampoCodigo } from '../../shared/campo-codigo';
import { Cargando } from '../../shared/cargando';
import { Tecnologia } from '../../shared/tecnologia';

function paraInput(fecha: Date): string {
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Retos técnicos: las empresas con suscripción los publican y los estudiantes envían soluciones. */
@Component({
  selector: 'app-retos',
  imports: [ReactiveFormsModule, RouterLink, Avatar, Tecnologia, CampoCodigo, Cargando],
  templateUrl: './retos.html',
  styleUrl: './retos.css',
})
export class Retos {
  private api = inject(Api);
  private auth = inject(AuthService);
  private avisos = inject(Avisos);
  private reloj = inject(Reloj);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  protected lenguajes = LENGUAJES;
  protected hace = hace;
  protected fechaCorta = fechaCorta;

  protected retos = signal<Publicacion[]>([]);
  protected cargando = signal(true);
  protected error = signal('');
  protected hayMas = signal(false);
  /** undefined = cargando; null = sin suscripción. Solo aplica a empresas. */
  protected suscripcion = signal<Suscripcion | null | undefined>(undefined);
  protected creando = signal(false);
  protected enviando = signal(false);
  protected errorForm = signal('');
  protected minimo = paraInput(new Date(Date.now() + 3_600_000));
  protected maximo = paraInput(new Date(Date.now() + 90 * 86_400_000));
  private pagina = 1;

  protected esEmpresa = computed(() => this.auth.usuario()?.rol === 'empresa');
  protected yo = computed(() => this.auth.usuario()?.id);
  /** Abiertos primero (el que cierra antes, arriba); luego los cerrados. */
  protected ordenados = computed(() => {
    const ahora = this.reloj.ahora();
    const abierto = (p: Publicacion) => !!p.fecha_limite && new Date(p.fecha_limite).getTime() > ahora;
    return [...this.retos()].sort((a, b) => {
      if (abierto(a) !== abierto(b)) return abierto(a) ? -1 : 1;
      return abierto(a)
        ? new Date(a.fecha_limite!).getTime() - new Date(b.fecha_limite!).getTime()
        : new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime();
    });
  });

  protected form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    lenguaje: ['go', Validators.required],
    fecha_limite: ['', Validators.required],
    codigo: ['', Validators.maxLength(20000)],
  });

  constructor() {
    this.cargar(true);
    if (this.esEmpresa()) {
      this.api.suscripcionActual().subscribe({ next: s => this.suscripcion.set(s), error: () => this.suscripcion.set(null) });
    }
  }

  cierre(p: Publicacion): string {
    const falta = p.fecha_limite ? cuentaRegresiva(p.fecha_limite, this.reloj.ahora()) : '';
    return falta ? `Cierra ${falta.charAt(0).toLowerCase()}${falta.slice(1)}` : 'Cerrado';
  }

  abrirFormulario(): void {
    this.minimo = paraInput(new Date(Date.now() + 3_600_000));
    this.creando.set(true);
  }

  cargarMas(): void {
    this.pagina++;
    this.cargar(false);
  }

  publicar(): void {
    if (this.form.invalid) {
      this.errorForm.set('Revisa el título (mínimo 5 caracteres), la descripción (mínimo 20) y la fecha límite.');
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.errorForm.set('');
    this.api.crearReto({ ...v, fecha_limite: new Date(v.fecha_limite).toISOString() }).subscribe({
      next: p => {
        this.avisos.exito('Reto publicado. Los estudiantes ya pueden enviar soluciones.');
        this.router.navigate(['/publicacion', p.id]);
      },
      error: err => {
        this.errorForm.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  private cargar(desdeCero: boolean): void {
    if (desdeCero) this.pagina = 1;
    this.api.listarPublicaciones({ tipo: 'reto' }, this.pagina).subscribe({
      next: lista => {
        this.retos.update(actual => (desdeCero ? lista : [...actual, ...lista]));
        this.hayMas.set(lista.length === 20);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
