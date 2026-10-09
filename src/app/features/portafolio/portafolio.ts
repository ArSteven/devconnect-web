import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import {
  EventoHistorial, Portafolio as DatosPortafolio, etiquetaDisponibilidad, etiquetaModalidad, hace, nivelAcademico, nombreLenguaje,
} from '../../core/modelos';
import { tecnologia } from '../../core/tecnologias';
import { Avatar } from '../../shared/avatar';
import { Cargando } from '../../shared/cargando';
import { Tecnologia } from '../../shared/tecnologia';
import { EditarPerfil } from './editar-perfil';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface Aptitud {
  nombre: string;
  verificada: boolean;
  detalle: string;
}

/**
 * Perfil con estructura de hoja de vida: primero la persona (quién es, qué estudia,
 * disponibilidad, contacto) y después la evidencia de DevConnect que respalda lo que dice.
 */
@Component({
  selector: 'app-portafolio',
  imports: [RouterLink, EditarPerfil, Avatar, Tecnologia, Cargando],
  templateUrl: './portafolio.html',
  styleUrl: './portafolio.css',
})
export class Portafolio {
  private api = inject(Api);
  private auth = inject(AuthService);
  private avisos = inject(Avisos);
  private router = inject(Router);

  readonly id = input.required<string>();
  /** /portafolio/:id?editar=1 abre directamente el formulario (desde el menú del avatar). */
  readonly editar = input<string>();

  protected hace = hace;
  protected nombreLenguaje = nombreLenguaje;
  protected datos = signal<DatosPortafolio | null>(null);
  protected error = signal('');
  protected editando = signal(false);
  protected verTodo = signal(false);
  protected guardando = signal(false);

  protected esPropio = computed(() => this.auth.usuario()?.id === this.id());
  protected esEmpresa = computed(() => this.auth.usuario()?.rol === 'empresa');
  protected asunto = encodeURIComponent('Oportunidad laboral: vimos tu perfil en DevConnect');

  /** Si no escribió un titular, se arma uno con su formación. */
  protected titular = computed(() => {
    const p = this.datos()?.perfil;
    if (!p) return '';
    if (p.titular) return p.titular;
    const estudio = p.programa || p.institucion;
    return estudio ? `Estudiante de ${estudio}` : '';
  });

  /** Lo que un reclutador busca primero, en una línea: edad · ciudad · institución · semestre. */
  protected datosBasicos = computed(() => {
    const p = this.datos()?.perfil;
    if (!p) return [];
    return [p.edad !== null ? `${p.edad} años` : '', p.ciudad, p.institucion, nivelAcademico(p)].filter(Boolean);
  });

  protected disponibilidad = computed(() => {
    const p = this.datos()?.perfil;
    return p?.disponibilidad ? { valor: p.disponibilidad, etiqueta: etiquetaDisponibilidad(p.disponibilidad) } : null;
  });
  protected modalidad = computed(() => etiquetaModalidad(this.datos()?.perfil.modalidad ?? ''));

  protected formacion = computed(() => {
    const p = this.datos()?.perfil;
    if (!p || (!p.programa && !p.institucion)) return null;
    const estado = p.estado_academico === 'egresado' ? 'Egresado' : p.estado_academico === 'cursando' ? 'En curso' : '';
    const semestre = p.estado_academico !== 'egresado' && p.semestre ? `${p.semestre}.º semestre` : '';
    const anios = p.anio_inicio ? `${p.anio_inicio} – ${p.anio_fin ?? 'actualidad'}` : '';
    return { programa: p.programa, institucion: p.institucion, detalle: [estado, semestre, anios].filter(Boolean).join(' · ') };
  });

  /** Une lo que el estudiante declara con lo que demostró: lo demostrado va primero y marcado. */
  protected aptitudes = computed<Aptitud[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const porNombre = new Map<string, Aptitud>();
    for (const h of d.habilidades) {
      const partes = [
        h.aportes ? `${h.aportes} ${h.aportes === 1 ? 'mejora aceptada' : 'mejoras aceptadas'}` : '',
        h.publicaciones ? `${h.publicaciones} ${h.publicaciones === 1 ? 'publicación' : 'publicaciones'}` : '',
      ].filter(Boolean);
      porNombre.set(tecnologia(h.lenguaje).nombre, { nombre: h.lenguaje, verificada: true, detalle: partes.join(' · ') });
    }
    for (const s of d.perfil.stack) {
      const nombre = tecnologia(s).nombre;
      if (!porNombre.has(nombre)) porNombre.set(nombre, { nombre: s, verificada: false, detalle: '' });
    }
    return [...porNombre.values()].sort((a, b) => Number(b.verificada) - Number(a.verificada));
  });

  protected experiencia = computed(() =>
    (this.datos()?.perfil.experiencia ?? []).map(e => ({ ...e, periodo: `${this.mes(e.inicio)} – ${e.fin ? this.mes(e.fin) : 'actualidad'}` })),
  );

  /** Para visitantes se ocultan las secciones vacías: un perfil nuevo no se ve "en ceros". */
  protected hayEvidencia = computed(() => {
    const t = this.datos()?.totales;
    return !!t && t.publicaciones + t.propuestas_hechas + t.sesiones + t.mejoras_recibidas > 0;
  });

  /** Mapa de actividad de 6 meses con etiquetas de mes por columna. */
  protected mapa = computed(() => {
    const d = this.datos();
    const porDia = new Map((d?.actividad ?? []).map(a => [a.fecha, a.total]));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 181);
    inicio.setDate(inicio.getDate() - inicio.getDay());

    const celdas: { clave: string; nivel: number; etiqueta: string }[] = [];
    const meses: string[] = [];
    let mesAnterior = -1;
    for (const dia = new Date(inicio); dia <= hoy; dia.setDate(dia.getDate() + 1)) {
      if (dia.getDay() === 0) {
        const m = MESES[dia.getMonth()];
        meses.push(dia.getMonth() !== mesAnterior ? m.charAt(0).toUpperCase() + m.slice(1) : '');
        mesAnterior = dia.getMonth();
      }
      const clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
      const n = porDia.get(clave) ?? 0;
      celdas.push({
        clave,
        nivel: n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4,
        etiqueta: `${n} ${n === 1 ? 'contribución' : 'contribuciones'} el ${dia.getDate()} de ${MESES[dia.getMonth()]}`,
      });
    }
    return { celdas, meses, total: (d?.actividad ?? []).reduce((s, a) => s + a.total, 0) };
  });

  protected recientes = computed(() => {
    const h = this.datos()?.historial ?? [];
    return this.verTodo() ? h : h.slice(0, 5);
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.cargar(id));
    });
    // El formulario lo abre la URL (?editar=1): así funciona igual desde el menú del avatar y desde aquí.
    effect(() => {
      const editar = !!this.editar() && this.esPropio();
      untracked(() => this.editando.set(editar));
    });
  }

  textoEvento(e: EventoHistorial): string {
    switch (e.tipo) {
      case 'publicacion': return `Publicó «${e.titulo}»`;
      case 'aporte': return `Mejoró el código de ${e.con_quien} en «${e.titulo}»`;
      case 'reto': return `Resolvió el reto de ${e.con_quien}: «${e.titulo}»`;
      case 'recibida': return `Recibió una mejora de ${e.con_quien} en «${e.titulo}»`;
      default: return `Dictó la sesión «${e.titulo}»`;
    }
  }

  abrirEdicion(): void {
    this.router.navigate([], { queryParams: { editar: 1 } });
  }

  cerrarEdicion(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  alGuardar(github: string): void {
    this.auth.actualizarUsuario({ github_url: github });
    this.avisos.exito('Perfil actualizado.');
    this.cerrarEdicion();
    this.cargar(this.id());
  }

  alternarGuardado(): void {
    const d = this.datos();
    if (!d) return;
    this.guardando.set(true);
    const peticion = d.guardado ? this.api.quitarCandidato(this.id()) : this.api.guardarCandidato(this.id());
    peticion.subscribe({
      next: () => {
        this.datos.set({ ...d, guardado: !d.guardado });
        this.guardando.set(false);
        this.avisos.exito(d.guardado ? 'Salió de tus candidatos.' : 'Guardado en Mis candidatos.');
      },
      error: err => {
        this.guardando.set(false);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  private mes(aaaamm: string): string {
    const [a, m] = aaaamm.split('-').map(Number);
    if (!m) return aaaamm;
    const nombre = MESES[m - 1];
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${a}`;
  }

  private cargar(id: string): void {
    this.error.set('');
    this.api.portafolio(id).subscribe({
      next: d => this.datos.set(d),
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar el perfil.')),
    });
  }
}
