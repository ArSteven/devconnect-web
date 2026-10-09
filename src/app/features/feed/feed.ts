import { Location } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { urlSala } from '../../core/jitsi';
import {
  Catalogos, EstudianteDestacado, FiltroPublicaciones, LENGUAJES, Publicacion, SesionVivo, hace,
} from '../../core/modelos';
import { Reloj, cuentaRegresiva, fechaCorta } from '../../core/reloj';
import { Avatar } from '../../shared/avatar';
import { Cargando } from '../../shared/cargando';
import { Codigo } from '../../shared/codigo';
import { Tecnologia } from '../../shared/tecnologia';

const POR_PAGINA = 20;

@Component({
  selector: 'app-feed',
  imports: [RouterLink, Avatar, Codigo, Tecnologia, Cargando],
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

  protected lenguajes = LENGUAJES;
  protected hace = hace;
  protected fechaCorta = fechaCorta;

  protected texto = signal('');
  protected filtro = signal<FiltroPublicaciones>({ q: '', lenguaje: '', institucion: '', estado: '', tipo: '' });
  protected publicaciones = signal<Publicacion[]>([]);
  protected cargando = signal(true);
  protected cargandoMas = signal(false);
  protected hayMas = signal(false);
  protected error = signal('');
  protected filtrosAbiertos = signal(false);

  protected catalogos = signal<Catalogos | null>(null);
  protected sesiones = signal<SesionVivo[] | null>(null);
  protected destacados = signal<{ estudiantes: EstudianteDestacado[]; dias: number } | null>(null);

  protected esEstudiante = computed(() => this.auth.usuario()?.rol === 'estudiante');
  protected yo = computed(() => this.auth.usuario()?.id);
  protected filtrosActivos = computed(() => {
    const f = this.filtro();
    return [f.lenguaje, f.institucion, f.estado, f.tipo].filter(Boolean).length;
  });
  /** Institución que llegó en la URL pero ya no está en el catálogo: se agrega para que el select la muestre. */
  protected institucionFuera = computed(() => {
    const inst = this.filtro().institucion;
    return !!inst && !(this.catalogos()?.instituciones ?? []).some(o => o.valor === inst);
  });
  protected proximas = computed(() => {
    const ahora = this.reloj.ahora();
    return (this.sesiones() ?? [])
      .filter(s => s.estado === 'en_vivo' || new Date(s.inicia_en).getTime() > ahora - 15 * 60_000)
      .slice(0, 3);
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
    });
    this.texto.set(this.filtro().q);
    this.cargar(true);

    this.api.catalogos().subscribe({ next: c => this.catalogos.set(c), error: () => {} });
    this.api.sesiones().subscribe({ next: s => this.sesiones.set(s), error: () => this.sesiones.set([]) });
    this.api.destacadosSemana().subscribe({ next: d => this.destacados.set(d), error: () => this.destacados.set({ estudiantes: [], dias: 7 }) });
  }

  cambiar(cambios: Partial<FiltroPublicaciones>): void {
    this.filtro.update(f => ({ ...f, ...cambios }));
    const params = new URLSearchParams(Object.entries(this.filtro()).filter(([, v]) => v) as [string, string][]);
    this.location.replaceState('/feed', params.toString());
    this.cargar(true);
  }

  limpiar(): void {
    this.texto.set('');
    this.cambiar({ q: '', lenguaje: '', institucion: '', estado: '', tipo: '' });
  }

  cargarMas(): void {
    this.pagina++;
    this.cargar(false);
  }

  cuenta(s: SesionVivo): string {
    return cuentaRegresiva(s.inicia_en, this.reloj.ahora()) || 'Por empezar';
  }

  cierre(p: Publicacion): string {
    if (!p.fecha_limite) return '';
    const falta = cuentaRegresiva(p.fecha_limite, this.reloj.ahora());
    return falta ? `Cierra ${falta.charAt(0).toLowerCase()}${falta.slice(1)}` : 'Cerrado';
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
    // Si llega una respuesta vieja (la persona ya cambió el filtro), se ignora.
    const esta = ++this.solicitud;
    this.api.listarPublicaciones(this.filtro(), this.pagina).subscribe({
      next: lista => {
        if (esta !== this.solicitud) return;
        this.publicaciones.update(actual => (desdeCero ? lista : [...actual, ...lista]));
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
