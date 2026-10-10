import { Component, Injector, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import { mismoCodigo } from '../../core/diff';
import { arbolEvolucion } from '../../core/evolucion';
import { urlSala } from '../../core/jitsi';
import { Defensa, DetallePublicacion, NuevaPropuesta, Propuesta, USOS_IA, UsoIA, hace, nombreLenguaje } from '../../core/modelos';
import { Reloj, cuentaRegresiva, fechaCorta, paraInput } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { CampoCodigo } from '../../shared/campo-codigo';
import { Cargando } from '../../shared/cargando';
import { Codigo } from '../../shared/codigo';
import { DiffCodigo } from '../../shared/diff-codigo';
import { PanelEjecucion } from '../../shared/panel-ejecucion';
import { Tecnologia } from '../../shared/tecnologia';
import { ArbolEvolucion } from './arbol-evolucion';
import { Pruebalo } from './pruebalo';

/** Una solución de reto explica sus decisiones, no solo el resultado (la API exige lo mismo). */
const MIN_EXPLICACION_RETO = 100;

@Component({
  selector: 'app-detalle',
  imports: [ReactiveFormsModule, RouterLink, Avatar, Codigo, DiffCodigo, Tecnologia, CampoCodigo, Cargando, ArbolEvolucion, Pruebalo, PanelEjecucion],
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
  protected verEvolucion = signal(false);
  /** Lo que se acaba de elegir en el árbol: se marca un momento para encontrarlo en la página. */
  protected resaltada = signal<string | null>(null);
  private temporizador?: ReturnType<typeof setTimeout>;

  protected arbol = computed(() => {
    const p = this.pub();
    return p && p.propuestas.length ? arbolEvolucion(p) : null;
  });
  protected esReto = computed(() => this.pub()?.tipo === 'reto');
  protected esAutor = computed(() => !!this.pub() && this.pub()!.autor_id === this.auth.usuario()?.id);
  protected pendientes = computed(() => this.pub()?.propuestas.filter(p => p.estado === 'pendiente').length ?? 0);
  protected faltaParaCerrar = computed(() => {
    const limite = this.pub()?.fecha_limite;
    return limite ? cuentaRegresiva(limite, this.reloj.ahora()) : '';
  });
  protected retoCerrado = computed(() => this.esReto() && !this.faltaParaCerrar());
  protected puedeProponer = computed(() => this.auth.usuario()?.rol === 'estudiante' && !this.esAutor() && !this.retoCerrado());
  /** La mejora aceptada más reciente (en un reto, la solución ganadora): la que se compara en «Pruébalo». */
  protected mejoraAceptada = computed(() => this.pub()?.propuestas.filter(p => p.estado === 'aceptada').at(-1) ?? null);

  protected formPropuesta = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(20000)]],
    explicacion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    // Solo en retos: la declaración de uso de inteligencia artificial.
    uso_ia: ['' as UsoIA | ''],
    uso_ia_detalle: ['', Validators.maxLength(500)],
  });
  protected codigoPropuesta = toSignal(this.formPropuesta.controls.codigo.valueChanges, { initialValue: '' });
  private explicacionPropuesta = toSignal(this.formPropuesta.controls.explicacion.valueChanges, { initialValue: '' });
  protected usosIA = USOS_IA;
  protected minExplicacionReto = MIN_EXPLICACION_RETO;
  /** Caracteres de la explicación, contados como los cuenta la API (por letra, no por unidad UTF-16). */
  protected largoExplicacion = computed(() => [...this.explicacionPropuesta().trim()].length);

  // Defensa en vivo: la empresa abre el formulario de una solución a la vez.
  protected invitando = signal<string | null>(null);
  protected fechaDefensa = signal('');
  protected ocupadaDefensa = signal<string | null>(null);
  protected minDefensa = '';
  protected maxDefensa = '';

  protected formComentario = this.fb.nonNullable.group({
    texto: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id, true));
    });
  }

  /** Desde el árbol de evolución: baja hasta el código original o hasta la propuesta, y la resalta. */
  irA(destino: string): void {
    const el = document.getElementById(destino === 'original' ? 'codigo-original' : `propuesta-${destino}`);
    if (!el) return;
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    this.resaltada.set(destino);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.resaltada.set(null), 2600);
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
    const v = this.formPropuesta.getRawValue();
    if (this.formPropuesta.invalid) {
      this.errorPropuesta.set('Incluye tu código y una explicación de al menos 10 caracteres.');
      return;
    }
    if (this.esReto() && this.largoExplicacion() < MIN_EXPLICACION_RETO) {
      this.errorPropuesta.set('Explica tus decisiones en al menos 100 caracteres: qué cambiaste, qué alternativas descartaste y qué harías con más tiempo.');
      return;
    }
    if (this.esReto() && !v.uso_ia) {
      this.errorPropuesta.set('Indica si usaste inteligencia artificial para resolver el reto.');
      return;
    }
    if (mismoCodigo(v.codigo, this.pub()?.codigo ?? '')) {
      this.errorPropuesta.set('Tu versión es igual al código original: cambia algo antes de proponer.');
      return;
    }
    const datos: NuevaPropuesta = { codigo: v.codigo, explicacion: v.explicacion };
    if (this.esReto() && v.uso_ia) {
      datos.uso_ia = v.uso_ia;
      if (v.uso_ia_detalle.trim()) datos.uso_ia_detalle = v.uso_ia_detalle.trim();
    }
    this.enviando.set(true);
    this.errorPropuesta.set('');
    this.api.proponer(this.id(), datos).subscribe({
      next: () => {
        this.formPropuesta.reset({ codigo: this.pub()?.codigo ?? '', explicacion: '', uso_ia: '', uso_ia_detalle: '' });
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
            texto: `La propuesta de ${pr.autor_nombre} quedará en su perfil como ${this.esReto() ? 'solución ganadora de tu reto y el reto se marcará como resuelto' : 'mejora aceptada y tu código se marcará como mejorado'}. No se puede deshacer.`,
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

  etiquetaUsoIA(valor: UsoIA): string {
    return USOS_IA.find(u => u.valor === valor)?.etiqueta ?? valor;
  }

  sala(d: Defensa): string {
    return urlSala(d.sala, this.auth.usuario()?.nombre);
  }

  /** Por defecto, mañana a esta hora: la empresa la ajusta antes de enviar. */
  abrirInvitacion(pr: Propuesta): void {
    const ahora = Date.now();
    this.minDefensa = paraInput(new Date(ahora));
    this.maxDefensa = paraInput(new Date(ahora + 30 * 86_400_000));
    this.fechaDefensa.set(paraInput(new Date(ahora + 86_400_000)));
    this.invitando.set(pr.id);
  }

  invitarDefensa(pr: Propuesta): void {
    const fecha = new Date(this.fechaDefensa());
    if (!this.fechaDefensa() || Number.isNaN(fecha.getTime())) {
      this.avisos.error('Elige la fecha y la hora de la defensa.');
      return;
    }
    this.ocupadaDefensa.set(pr.id);
    this.api.invitarDefensa(pr.id, fecha.toISOString()).subscribe({
      next: () => {
        this.ocupadaDefensa.set(null);
        this.invitando.set(null);
        this.avisos.exito(`Invitación enviada. ${pr.autor_nombre} la ve en su feed y en «En vivo».`);
        this.cargar(this.id());
      },
      error: err => {
        this.ocupadaDefensa.set(null);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  async cambiarDefensa(pr: Propuesta, d: Defensa, estado: 'realizada' | 'cancelada', aprobada = false): Promise<void> {
    if (estado === 'cancelada') {
      const si = await this.avisos.confirmar({
        titulo: '¿Cancelar la defensa?',
        texto: `${pr.autor_nombre} verá la defensa como cancelada. Después puedes citarlo a otra fecha.`,
        aceptar: 'Sí, cancelar',
        cancelar: 'No',
        peligro: true,
      });
      if (!si) return;
    }
    this.ocupadaDefensa.set(pr.id);
    this.api.cambiarDefensa(d.id, estado, aprobada).subscribe({
      next: () => {
        this.ocupadaDefensa.set(null);
        this.avisos.exito(aprobada ? `Defensa aprobada: queda en el perfil de ${pr.autor_nombre} junto al reto.` : estado === 'cancelada' ? 'Defensa cancelada.' : 'Defensa marcada como realizada.');
        this.cargar(this.id());
      },
      error: err => {
        this.ocupadaDefensa.set(null);
        this.avisos.error(mensajeDeError(err));
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
        // Los datos llegan después de la navegación: el salto a #proponer o a una propuesta se hace al dibujarlos.
        const ancla = this.ruta.snapshot.fragment;
        if (primeraVez && ancla && (ancla === 'proponer' || ancla.startsWith('propuesta-'))) {
          afterNextRender(() => document.getElementById(ancla)?.scrollIntoView({ block: 'start' }), { injector: this.injector });
        }
      },
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar la publicación.')),
    });
  }
}
