import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { EventoHistorial, Portafolio as DatosPortafolio, hace, nombreLenguaje } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

interface Celda {
  clave: string;
  nivel: number;
  etiqueta: string;
}

@Component({
  selector: 'app-portafolio',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './portafolio.html',
  styleUrl: './portafolio.css',
})
export class Portafolio {
  private api = inject(Api);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  /** Viene de la ruta /portafolio/:id */
  readonly id = input.required<string>();

  protected hace = hace;
  protected nombreLenguaje = nombreLenguaje;

  protected datos = signal<DatosPortafolio | null>(null);
  protected error = signal('');
  protected verTodo = signal(false);
  protected editando = signal(false);
  protected guardando = signal(false);
  protected errorForm = signal('');

  protected esPropio = computed(() => this.auth.usuario()?.id === this.id());
  protected esEmpresa = computed(() => this.auth.usuario()?.rol === 'empresa');

  protected iniciales = computed(() => {
    const nombre = this.datos()?.perfil.nombre ?? '';
    return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  });

  protected titular = computed(() => {
    const p = this.datos()?.perfil;
    return p ? [p.programa, p.institucion].filter(Boolean).join(' · ') : '';
  });

  /** Qué tan completo está el perfil: solo se le muestra al dueño. */
  protected completitud = computed(() => {
    const p = this.datos()?.perfil;
    if (!p) return 100;
    const campos = [p.programa, p.institucion, p.ciudad, p.biografia, p.stack.length ? 'si' : ''];
    return Math.round((campos.filter(Boolean).length / campos.length) * 100);
  });

  protected habilidades = computed(() => {
    const lista = this.datos()?.habilidades ?? [];
    const max = Math.max(1, ...lista.map(h => h.aportes + h.publicaciones));
    return lista.map(h => ({
      ...h,
      nombre: nombreLenguaje(h.lenguaje),
      anchoAportes: (h.aportes / max) * 100,
      anchoPublicaciones: (h.publicaciones / max) * 100,
    }));
  });

  /** Mapa de calor de los últimos 6 meses, columnas por semana como en GitHub. */
  protected mapa = computed(() => {
    const d = this.datos();
    const porDia = new Map((d?.actividad ?? []).map(a => [a.fecha, a.total]));
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 181);
    inicio.setDate(inicio.getDate() - inicio.getDay()); // arranca en domingo

    const celdas: Celda[] = [];
    for (const dia = new Date(inicio); dia <= hoy; dia.setDate(dia.getDate() + 1)) {
      const clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
      const n = porDia.get(clave) ?? 0;
      const nivel = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4;
      const fecha = dia.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      celdas.push({ clave, nivel, etiqueta: `${n} ${n === 1 ? 'contribución' : 'contribuciones'} el ${fecha}` });
    }
    const total = (d?.actividad ?? []).reduce((s, a) => s + a.total, 0);
    return { celdas, total };
  });

  protected recientes = computed(() => {
    const h = this.datos()?.historial ?? [];
    return this.verTodo() ? h : h.slice(0, 5);
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

  textoEvento(e: EventoHistorial): string {
    switch (e.tipo) {
      case 'publicacion': return `Publicó «${e.titulo}»`;
      case 'aporte': return `Mejoró el código de @${e.con_quien} en «${e.titulo}»`;
      case 'recibida': return `Recibió una mejora de @${e.con_quien} en «${e.titulo}»`;
      default: return `Dictó la sesión «${e.titulo}»`;
    }
  }

  abrirEdicion(): void {
    const p = this.datos()?.perfil;
    if (!p) return;
    this.form.setValue({
      programa: p.programa, institucion: p.institucion, ciudad: p.ciudad,
      stack: p.stack.join(', '), biografia: p.biografia,
    });
    this.errorForm.set('');
    this.editando.set(true);
  }

  guardar(): void {
    const v = this.form.getRawValue();
    const stack = v.stack.split(',').map(s => s.trim()).filter(Boolean);
    if (this.form.invalid || stack.length > 15) {
      this.errorForm.set('Revisa los campos: el stack admite hasta 15 tecnologías.');
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

  private cargar(id: string): void {
    this.error.set('');
    this.api.portafolio(id).subscribe({
      next: d => this.datos.set(d),
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar el portafolio.')),
    });
  }
}
