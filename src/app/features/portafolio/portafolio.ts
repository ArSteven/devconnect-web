import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { DISPONIBILIDADES, EventoHistorial, MODALIDADES, Portafolio as DatosPortafolio, hace, nombreLenguaje } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';
import { EditarPerfil } from './editar-perfil';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

interface Aptitud {
  nombre: string;
  verificada: boolean;
  detalle: string;
}

/**
 * Portafolio con estructura de hoja de vida: primero la persona (quién es, qué estudia,
 * disponibilidad, contacto) y después la evidencia de DevConnect que respalda lo que dice.
 */
@Component({
  selector: 'app-portafolio',
  imports: [RouterLink, EditarPerfil],
  templateUrl: './portafolio.html',
  styleUrl: './portafolio.css',
})
export class Portafolio {
  private api = inject(Api);
  private auth = inject(AuthService);

  readonly id = input.required<string>();

  protected hace = hace;
  protected nombreLenguaje = nombreLenguaje;
  protected datos = signal<DatosPortafolio | null>(null);
  protected error = signal('');
  protected editando = signal(false);
  protected verTodo = signal(false);

  protected esPropio = computed(() => this.auth.usuario()?.id === this.id());

  protected iniciales = computed(() =>
    (this.datos()?.perfil.nombre ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join(''),
  );

  /** Si no escribió un titular, se arma uno con su formación. */
  protected titular = computed(() => {
    const p = this.datos()?.perfil;
    if (!p) return '';
    if (p.titular) return p.titular;
    const estudio = p.programa || p.institucion;
    return estudio ? `Estudiante de ${estudio}` : '';
  });

  /** Línea bajo el nombre: ciudad · edad · modalidad. */
  protected datosBasicos = computed(() => {
    const p = this.datos()?.perfil;
    if (!p) return [];
    const modalidad = MODALIDADES.find(m => m.valor === p.modalidad)?.etiqueta;
    return [p.ciudad, p.edad !== null ? `${p.edad} años` : '', modalidad ? `Trabajo ${modalidad.toLowerCase()}` : ''].filter(Boolean);
  });

  protected disponibilidad = computed(() => {
    const p = this.datos()?.perfil;
    return DISPONIBILIDADES.find(d => d.valor === p?.disponibilidad) ?? null;
  });

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
    const evidencia = new Map(d.habilidades.map(h => [h.lenguaje.toLowerCase(), h]));
    const nombres = new Set([...d.habilidades.map(h => h.lenguaje.toLowerCase()), ...d.perfil.stack.map(s => s.toLowerCase())]);
    const lista: Aptitud[] = [...nombres].map(n => {
      const h = evidencia.get(n);
      const partes = h
        ? [h.aportes ? `${h.aportes} ${h.aportes === 1 ? 'mejora aceptada' : 'mejoras aceptadas'}` : '',
           h.publicaciones ? `${h.publicaciones} ${h.publicaciones === 1 ? 'publicación' : 'publicaciones'}` : ''].filter(Boolean)
        : [];
      return { nombre: nombreLenguaje(n), verificada: !!h, detalle: partes.join(' · ') };
    });
    return lista.sort((a, b) => Number(b.verificada) - Number(a.verificada));
  });

  protected experiencia = computed(() =>
    (this.datos()?.perfil.experiencia ?? []).map(e => ({ ...e, periodo: `${this.mes(e.inicio)} – ${e.fin ? this.mes(e.fin) : 'actualidad'}` })),
  );

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
        meses.push(dia.getMonth() !== mesAnterior ? MESES[dia.getMonth()] : '');
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
  }

  textoEvento(e: EventoHistorial): string {
    switch (e.tipo) {
      case 'publicacion': return `Publicó «${e.titulo}»`;
      case 'aporte': return `Mejoró el código de @${e.con_quien} en «${e.titulo}»`;
      case 'recibida': return `Recibió una mejora de @${e.con_quien} en «${e.titulo}»`;
      default: return `Dictó la sesión «${e.titulo}»`;
    }
  }

  alGuardar(): void {
    this.editando.set(false);
    this.cargar(this.id());
  }

  private mes(aaaamm: string): string {
    const [a, m] = aaaamm.split('-').map(Number);
    return m ? `${MESES[m - 1]} ${a}` : aaaamm;
  }

  private cargar(id: string): void {
    this.error.set('');
    this.api.portafolio(id).subscribe({
      next: d => this.datos.set(d),
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar el perfil.')),
    });
  }
}
