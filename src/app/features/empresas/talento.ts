import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { Avisos } from '../../core/avisos';
import {
  AREA_METROPOLITANA, Catalogos, DISPONIBILIDADES, FiltroTalento, LENGUAJES, MODALIDADES, NIVELES, Suscripcion, TarjetaTalento,
} from '../../core/modelos';
import { Cargando } from '../../shared/cargando';
import { Tecnologia } from '../../shared/tecnologia';
import { TarjetaCandidato } from './tarjeta-candidato';

const VACIO: FiltroTalento = { lenguajes: [], ciudad: '', institucion: '', nivel: '', disponibilidad: '', modalidad: '', conMejoras: false };

@Component({
  selector: 'app-talento',
  imports: [RouterLink, Tecnologia, TarjetaCandidato, Cargando],
  templateUrl: './talento.html',
  styleUrl: './talento.css',
})
export class Talento {
  private api = inject(Api);
  private avisos = inject(Avisos);

  protected lenguajes = LENGUAJES.filter(l => l.valor !== 'otro');
  protected niveles = NIVELES;
  protected disponibilidades = DISPONIBILIDADES.filter(d => d.valor !== 'no_disponible');
  protected modalidades = MODALIDADES;
  protected AMB = AREA_METROPOLITANA;

  protected filtro = signal<FiltroTalento>({ ...VACIO });
  protected resultados = signal<TarjetaTalento[]>([]);
  protected catalogos = signal<Catalogos | null>(null);
  protected cargando = signal(true);
  protected error = signal('');
  /** undefined = todavía cargando; null = plan gratuito */
  protected suscripcion = signal<Suscripcion | null | undefined>(undefined);
  protected guardando = signal<string | null>(null);

  protected activos = computed(() => {
    const f = this.filtro();
    return f.lenguajes.length + [f.ciudad, f.institucion, f.nivel, f.disponibilidad, f.modalidad].filter(Boolean).length + (f.conMejoras ? 1 : 0);
  });
  /** Ciudades que aparecen en los perfiles; el área metropolitana completa tiene su propia opción arriba. */
  protected otrasCiudades = computed(() => this.catalogos()?.ciudades ?? []);

  private solicitud = 0;

  constructor() {
    this.api.suscripcionActual().subscribe({
      next: s => this.suscripcion.set(s),
      error: () => this.suscripcion.set(null),
    });
    this.api.catalogos().subscribe({ next: c => this.catalogos.set(c), error: () => {} });
    this.buscar();
  }

  alternarLenguaje(valor: string): void {
    this.cambiar({
      lenguajes: this.filtro().lenguajes.includes(valor) ? this.filtro().lenguajes.filter(v => v !== valor) : [...this.filtro().lenguajes, valor],
    });
  }

  cambiar(cambios: Partial<FiltroTalento>): void {
    this.filtro.update(f => ({ ...f, ...cambios }));
    this.buscar();
  }

  limpiar(): void {
    this.filtro.set({ ...VACIO });
    this.buscar();
  }

  alternarGuardado(t: TarjetaTalento): void {
    this.guardando.set(t.id);
    const peticion = t.guardado ? this.api.quitarCandidato(t.id) : this.api.guardarCandidato(t.id);
    peticion.subscribe({
      next: () => {
        this.resultados.update(lista => lista.map(x => (x.id === t.id ? { ...x, guardado: !t.guardado } : x)));
        this.guardando.set(null);
        this.avisos.exito(t.guardado ? `${t.nombre} salió de tus candidatos.` : `${t.nombre} quedó en Mis candidatos.`);
      },
      error: err => {
        this.guardando.set(null);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  private buscar(): void {
    this.cargando.set(true);
    this.error.set('');
    const esta = ++this.solicitud;
    this.api.talento(this.filtro()).subscribe({
      next: lista => {
        if (esta !== this.solicitud) return;
        this.resultados.set(lista);
        this.cargando.set(false);
      },
      error: err => {
        if (esta !== this.solicitud) return;
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }
}
