import { Location } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of } from 'rxjs';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { urlSala } from '../../core/jitsi';
import {
  Actividad, Catalogos, Defensa, EstudianteDestacado, FiltroPublicaciones, LENGUAJES, Publicacion, SesionVivo,
} from '../../core/modelos';
import { Reloj, cuentaRegresiva } from '../../core/reloj';
import { tecnologia } from '../../core/tecnologias';
import { Avatar } from '../../shared/avatar';
import { Cargando } from '../../shared/cargando';
import { Tecnologia } from '../../shared/tecnologia';
import { EmpiezaAqui } from './empieza-aqui';
import { TarjetaActividad } from './tarjeta-actividad';
import { TarjetaPublicacion } from './tarjeta-publicacion';

const POR_PAGINA = 20;

// Chips de filtro: cada grupo admite uno y pulsar el activo lo quita.
const TIPOS = [
  { valor: 'pregunta', texto: 'Código' },
  { valor: 'reto', texto: 'Retos' },
] as const;
const ESTADOS = [
  { valor: 'abierta', texto: 'Necesita mejoras' },
  { valor: 'resuelta', texto: 'Mejorado' },
] as const;

/** Lo que muestra el feed: las publicaciones y, intercaladas por fecha, las mejoras aceptadas. */
type Item = { tipo: 'publicacion'; clave: string; p: Publicacion } | { tipo: 'actividad'; clave: string; a: Actividad };

@Component({
  selector: 'app-feed',
  imports: [RouterLink, Avatar, Tecnologia, Cargando, TarjetaPublicacion, TarjetaActividad, EmpiezaAqui],
  templateUrl: './feed.html',
  styleUrl: './feed.css',
})
export class Feed implements OnInit {
  private api = inject(Api);
  private auth = inject(AuthService);
  private location = inject(Location);
  private reloj = inject(Reloj);

  // Los filtros viven en la URL (/feed?lenguaje=go): al volver de una publicación siguen ahí.
  readonly q = input<string>();
  readonly lenguaje = input<string>();
  readonly institucion = input<string>();
  readonly estado = input<string>();
  readonly tipo = input<string>();
  readonly nivel = input<string>();

  protected tipos = TIPOS;
  protected estados = ESTADOS;
  protected lenguajes = LENGUAJES.map(l => ({ ...l, conLogo: !!tecnologia(l.valor).logo }));

  protected texto = signal('');
  protected filtro = signal<FiltroPublicaciones>({ q: '', lenguaje: '', institucion: '', estado: '', tipo: '', nivel: '' });
  protected publicaciones = signal<Publicacion[]>([]);
  protected actividad = signal<Actividad[]>([]);
  protected cargando = signal(true);
  protected cargandoMas = signal(false);
  protected hayMas = signal(false);
  protected error = signal('');

  protected catalogos = signal<Catalogos | null>(null);
  protected sesiones = signal<SesionVivo[] | null>(null);
  protected destacados = signal<{ estudiantes: EstudianteDestacado[]; dias: number } | null>(null);
  private defensas = signal<Defensa[]>([]);

  protected esEstudiante = computed(() => this.auth.usuario()?.rol === 'estudiante');
  protected filtrosActivos = computed(() => {
    const f = this.filtro();
    return [f.lenguaje, f.institucion, f.estado, f.tipo, f.nivel].filter(Boolean).length;
  });
  /** Institución que llegó en la URL pero ya no está en el catálogo: se agrega para que el select la muestre. */
  protected institucionFuera = computed(() => {
    const inst = this.filtro().institucion;
    return !!inst && !(this.catalogos()?.instituciones ?? []).some(o => o.valor === inst);
  });

  /** El aviso de una defensa en vivo a la que citaron al estudiante va primero en la franja, hasta que termine. */
  protected defensa = computed(() => {
    const ahora = this.reloj.ahora();
    return this.defensas().find(d => d.estado === 'invitada' && new Date(d.inicia_en).getTime() + d.duracion_min * 60_000 > ahora) ?? null;
  });

  /** La sesión que más interesa ahora: una en vivo o, si no hay, la próxima. */
  protected sesion = computed(() => {
    const ahora = this.reloj.ahora();
    const lista = this.sesiones() ?? [];
    return lista.find(s => s.estado === 'en_vivo')
      ?? lista.find(s => s.estado === 'programada' && new Date(s.inicia_en).getTime() > ahora - 15 * 60_000)
      ?? null;
  });

  /**
   * Publicaciones y mejoras aceptadas en una sola línea de tiempo. Una mejora más antigua que la
   * última publicación cargada espera a la página siguiente, para no quedar fuera de lugar.
   */
  protected items = computed<Item[]>(() => {
    const pubs = this.publicaciones();
    const desde = this.hayMas() && pubs.length ? Date.parse(pubs[pubs.length - 1].creado_en) : -Infinity;
    const mejoras = this.actividad().filter(a => Date.parse(a.aceptada_en) >= desde);
    const items: Item[] = [];
    let i = 0;
    for (const p of pubs) {
      while (i < mejoras.length && Date.parse(mejoras[i].aceptada_en) >= Date.parse(p.creado_en)) {
        items.push({ tipo: 'actividad', clave: `a${mejoras[i].propuesta_id}`, a: mejoras[i++] });
      }
      items.push({ tipo: 'publicacion', clave: `p${p.id}`, p });
    }
    for (; i < mejoras.length; i++) items.push({ tipo: 'actividad', clave: `a${mejoras[i].propuesta_id}`, a: mejoras[i] });
    return items;
  });

  private pagina = 1;
  private solicitud = 0;

  constructor() {
    // El buscador espera a que la persona deje de escribir antes de consultar.
    toObservable(this.texto)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(q => {
        if (q.trim() !== this.filtro().q) this.cambiar({ q: q.trim() });
      });
  }

  ngOnInit(): void {
    const valido = (v: string | undefined, permitidos: string[]) => (v && permitidos.includes(v) ? v : '');
    this.filtro.set({
      q: (this.q() ?? '').slice(0, 100),
      lenguaje: valido(this.lenguaje(), LENGUAJES.map(l => l.valor)),
      institucion: (this.institucion() ?? '').slice(0, 150),
      estado: valido(this.estado(), ['abierta', 'resuelta']) as FiltroPublicaciones['estado'],
      tipo: valido(this.tipo(), ['pregunta', 'reto']) as FiltroPublicaciones['tipo'],
      nivel: valido(this.nivel(), ['principiante', 'intermedio']) as FiltroPublicaciones['nivel'],
    });
    this.texto.set(this.filtro().q);
    this.cargar(true);

    this.api.catalogos().subscribe({ next: c => this.catalogos.set(c), error: () => {} });
    this.api.sesiones().subscribe({ next: s => this.sesiones.set(s), error: () => this.sesiones.set([]) });
    this.api.destacadosSemana().subscribe({ next: d => this.destacados.set(d), error: () => this.destacados.set({ estudiantes: [], dias: 7 }) });
    if (this.esEstudiante()) this.api.defensas().subscribe({ next: d => this.defensas.set(d), error: () => {} });
  }

  cambiar(cambios: Partial<FiltroPublicaciones>): void {
    this.filtro.update(f => ({ ...f, ...cambios }));
    const params = new URLSearchParams(Object.entries(this.filtro()).filter(([, v]) => v) as [string, string][]);
    this.location.replaceState('/feed', params.toString());
    this.cargar(true);
  }

  /** Pulsar un chip lo activa; pulsar el que ya está activo vuelve a mostrar todo. */
  alternar(clave: 'tipo' | 'estado' | 'lenguaje' | 'nivel', valor: string): void {
    this.cambiar({ [clave]: this.filtro()[clave] === valor ? '' : valor } as Partial<FiltroPublicaciones>);
  }

  limpiar(): void {
    this.texto.set('');
    this.cambiar({ q: '', lenguaje: '', institucion: '', estado: '', tipo: '', nivel: '' });
  }

  /** Desde «Empieza aquí»: solo los códigos de principiante que todavía necesitan mejoras. */
  practicar(): void {
    this.texto.set('');
    this.cambiar({ q: '', lenguaje: '', institucion: '', estado: 'abierta', tipo: '', nivel: 'principiante' });
    document.querySelector('.filtros')?.scrollIntoView({ block: 'start' });
  }

  cargarMas(): void {
    this.pagina++;
    this.cargar(false);
  }

  /** "Próxima sesión en 2 h 05 min". */
  cuenta(s: SesionVivo): string {
    const falta = cuentaRegresiva(s.inicia_en, this.reloj.ahora());
    return falta ? `Próxima sesión ${falta.charAt(0).toLowerCase()}${falta.slice(1)}` : 'Próxima sesión por empezar';
  }

  /** "en 1 d 2 h", "en 05:12" o, mientras dura, "ahora". */
  cuentaDefensa(d: Defensa): string {
    const falta = cuentaRegresiva(d.inicia_en, this.reloj.ahora());
    return falta ? `${falta.charAt(0).toLowerCase()}${falta.slice(1)}` : 'ahora';
  }

  sala(s: SesionVivo): string {
    return urlSala(s.sala, this.auth.usuario()?.nombre);
  }

  private cargar(desdeCero: boolean): void {
    if (desdeCero) {
      this.pagina = 1;
      this.cargando.set(true);
    } else {
      this.cargandoMas.set(true);
    }
    this.error.set('');
    const f = this.filtro();
    // La actividad cuenta mejoras aceptadas: no aplica al buscar texto ni al pedir lo que necesita
    // mejoras. Llega junto con la primera página y, si falla, el feed se muestra igual sin ella.
    const actividad$ = !desdeCero
      ? of(this.actividad())
      : f.q || f.estado === 'abierta'
        ? of([])
        : this.api.actividad(f).pipe(catchError(() => of([])));
    // Si llega una respuesta vieja (la persona ya cambió el filtro), se ignora.
    const esta = ++this.solicitud;
    forkJoin([this.api.listarPublicaciones(f, this.pagina), actividad$]).subscribe({
      next: ([lista, actividad]) => {
        if (esta !== this.solicitud) return;
        this.publicaciones.update(actual => (desdeCero ? lista : [...actual, ...lista]));
        this.actividad.set(actividad);
        this.hayMas.set(lista.length === POR_PAGINA);
        this.cargando.set(false);
        this.cargandoMas.set(false);
      },
      error: err => {
        if (esta !== this.solicitud) return;
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
        this.cargandoMas.set(false);
      },
    });
  }
}
