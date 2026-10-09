import { Component, Injector, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import { DetallePublicacion, Propuesta, hace, nombreLenguaje } from '../../core/modelos';
import { Reloj, cuentaRegresiva, fechaCorta } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { CampoCodigo } from '../../shared/campo-codigo';
import { Cargando } from '../../shared/cargando';
import { Codigo } from '../../shared/codigo';
import { DiffCodigo } from '../../shared/diff-codigo';
import { Tecnologia } from '../../shared/tecnologia';

@Component({
  selector: 'app-detalle',
  imports: [ReactiveFormsModule, RouterLink, Avatar, Codigo, DiffCodigo, Tecnologia, CampoCodigo, Cargando],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class Detalle {
  private api = inject(Api);
  protected auth = inject(AuthService);
  private avisos = inject(Avisos);
  private fb = inject(FormBuilder);
  private reloj = inject(Reloj);
  private ruta = inject(ActivatedRoute);
  private injector = inject(Injector);

  /** Viene de la ruta /publicacion/:id */
  readonly id = input.required<string>();

  protected hace = hace;
  protected nombreLenguaje = nombreLenguaje;
  protected fechaCorta = fechaCorta;
  protected pub = signal<DetallePublicacion | null>(null);
  protected error = signal('');
  protected errorPropuesta = signal('');
  protected errorDecision = signal<{ id: string; texto: string } | null>(null);
  protected enviando = signal(false);
  protected comentando = signal(false);
  protected decidiendo = signal<string | null>(null);
  /** Propuestas que se ven como código completo en vez de diff. */
  protected verCompleto = signal<Set<string>>(new Set());
  protected verMisCambios = signal(false);

  protected esReto = computed(() => this.pub()?.tipo === 'reto');
  protected esAutor = computed(() => !!this.pub() && this.pub()!.autor_id === this.auth.usuario()?.id);
  protected pendientes = computed(() => this.pub()?.propuestas.filter(p => p.estado === 'pendiente').length ?? 0);
  protected faltaParaCerrar = computed(() => {
    const limite = this.pub()?.fecha_limite;
    return limite ? cuentaRegresiva(limite, this.reloj.ahora()) : '';
  });
  protected retoCerrado = computed(() => this.esReto() && !this.faltaParaCerrar());
  protected puedeProponer = computed(() => this.auth.usuario()?.rol === 'estudiante' && !this.esAutor() && !this.retoCerrado());

  protected formPropuesta = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(20000)]],
    explicacion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });
  protected codigoPropuesta = toSignal(this.formPropuesta.controls.codigo.valueChanges, { initialValue: '' });

  protected formComentario = this.fb.nonNullable.group({
    texto: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id, true));
    });
  }

  alternarVista(id: string): void {
    this.verCompleto.update(s => {
      const nuevo = new Set(s);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  copiar(codigo: string): void {
    navigator.clipboard?.writeText(codigo).then(
      () => this.avisos.exito('Código copiado.'),
      () => this.avisos.error('No se pudo copiar. Selecciona el código y usa Ctrl+C.'),
    );
  }

  restaurarOriginal(): void {
    this.formPropuesta.controls.codigo.setValue(this.pub()?.codigo ?? '');
  }

  proponer(): void {
    if (this.formPropuesta.invalid) {
      this.errorPropuesta.set('Incluye tu código y una explicación de al menos 10 caracteres.');
      return;
    }
    // Solo se ignoran saltos de línea y espacios al final: un cambio de sangría también es un cambio.
    const normalizar = (c: string) => c.replace(/\r\n?/g, '\n').trimEnd();
    if (normalizar(this.formPropuesta.getRawValue().codigo) === normalizar(this.pub()?.codigo ?? '')) {
      this.errorPropuesta.set('Tu versión es igual al código original: cambia algo antes de proponer.');
      return;
    }
    this.enviando.set(true);
    this.errorPropuesta.set('');
    this.api.proponer(this.id(), this.formPropuesta.getRawValue()).subscribe({
      next: () => {
        this.formPropuesta.reset({ codigo: this.pub()?.codigo ?? '', explicacion: '' });
        this.verMisCambios.set(false);
        this.enviando.set(false);
        this.avisos.exito(this.esReto() ? 'Solución enviada. La empresa la revisará antes del cierre.' : 'Propuesta enviada. El autor la verá en su publicación.');
        this.cargar(this.id());
      },
      error: err => {
        this.errorPropuesta.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }

  async decidir(pr: Propuesta, estado: 'aceptada' | 'rechazada'): Promise<void> {
    const aceptar = estado === 'aceptada';
    const si = await this.avisos.confirmar(
      aceptar
        ? {
            titulo: this.esReto() ? '¿Elegir esta solución?' : '¿Aceptar esta mejora?',
            texto: `La propuesta de ${pr.autor_nombre} quedará en su perfil como ${this.esReto() ? 'solución ganadora de tu reto' : 'mejora aceptada'} y la publicación se marcará como resuelta. No se puede deshacer.`,
            aceptar: this.esReto() ? 'Sí, elegir' : 'Sí, aceptar',
          }
        : {
            titulo: '¿Rechazar esta propuesta?',
            texto: `${pr.autor_nombre} verá su propuesta como rechazada. No se puede deshacer.`,
            aceptar: 'Sí, rechazar',
            peligro: true,
          },
    );
    if (!si) return;
    this.decidiendo.set(pr.id);
    this.errorDecision.set(null);
    this.api.decidir(pr.id, estado).subscribe({
      next: () => {
        this.decidiendo.set(null);
        this.avisos.exito(aceptar ? `Aceptada. ${pr.autor_nombre} suma esta mejora a su perfil.` : 'Propuesta rechazada.');
        this.cargar(this.id());
      },
      error: err => {
        this.errorDecision.set({ id: pr.id, texto: mensajeDeError(err) });
        this.decidiendo.set(null);
      },
    });
  }

  comentar(): void {
    if (this.formComentario.invalid) return;
    this.comentando.set(true);
    this.api.comentar(this.id(), this.formComentario.getRawValue().texto).subscribe({
      next: () => {
        this.formComentario.reset();
        this.comentando.set(false);
        this.avisos.exito('Comentario publicado.');
        this.cargar(this.id());
      },
      error: err => {
        this.avisos.error(mensajeDeError(err));
        this.comentando.set(false);
      },
    });
  }

  private cargar(id: string, primeraVez = false): void {
    this.error.set('');
    this.api.detalle(id).subscribe({
      next: p => {
        this.pub.set(p);
        // La propuesta parte del código original: solo se cambia lo necesario y el diff queda limpio.
        if (primeraVez && !this.formPropuesta.controls.codigo.dirty) {
          this.formPropuesta.controls.codigo.setValue(p.codigo);
        }
        if (primeraVez && this.ruta.snapshot.fragment === 'proponer') {
          afterNextRender(() => document.getElementById('proponer')?.scrollIntoView({ block: 'start' }), { injector: this.injector });
        }
      },
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar la publicación.')),
    });
  }
}
