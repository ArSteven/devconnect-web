import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { Avisos } from '../../core/avisos';
import { Candidato, etiquetaDisponibilidad, etiquetaModalidad, nivelAcademico } from '../../core/modelos';
import { tecnologia } from '../../core/tecnologias';
import { Cargando } from '../../shared/cargando';
import { TarjetaCandidato } from './tarjeta-candidato';

/**
 * Celda de CSV segura: entre comillas, con las comillas internas duplicadas y sin
 * dejar que Excel interprete el texto como fórmula (=, +, -, @ al inicio).
 */
function celda(valor: string | number | null | undefined): string {
  let texto = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Lista de candidatos de la empresa: el puente con su proceso de selección. */
@Component({
  selector: 'app-candidatos',
  imports: [RouterLink, TarjetaCandidato, Cargando],
  template: `
    <section class="contenedor">
      <div class="cabecera">
        <div>
          <h1>Mis candidatos</h1>
          <p class="bajada">Los perfiles que guardaste. Expórtalos a una hoja de cálculo para llevarlos a tu proceso de selección.</p>
        </div>
        @if (candidatos().length) {
          <button class="btn btn-primario" type="button" (click)="exportar()">Exportar a CSV ↓</button>
        }
      </div>

      @if (!conCorreo() && candidatos().length) {
        <div class="aviso">
          <span>Con el plan gratuito el CSV no incluye el correo. Con la suscripción ves el contacto y lo exportas.</span>
          <a class="btn btn-secundario btn-pequeno" routerLink="/planes">Ver planes →</a>
        </div>
      }

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

      @if (cargando()) {
        <app-cargando texto="Cargando tus candidatos…" />
      } @else {
        <p class="conteo">{{ candidatos().length }} {{ candidatos().length === 1 ? 'candidato guardado' : 'candidatos guardados' }}</p>
        <div class="grilla">
          @for (c of candidatos(); track c.id; let i = $index) {
            <app-tarjeta-candidato class="aparecer" [style.--i]="i" [t]="c" [correo]="c.correo" [modoLista]="true"
                                   [guardando]="quitando() === c.id" (alternarGuardado)="quitar(c)" />
          } @empty {
            <div class="card vacio">
              <strong>Aún no guardas candidatos.</strong>
              <span>En Buscar talento, pulsa "Guardar" en los perfiles que te interesen. Aparecerán aquí para compararlos y exportarlos.</span>
              <a class="btn btn-primario btn-pequeno" routerLink="/talento">Buscar talento →</a>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 22px; max-width: 1240px; }
    .cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 14px; }
    h1 { font-size: clamp(30px, 4.5vw, 44px); }
    .bajada { margin-top: 8px; font-size: 15px; line-height: 1.7; color: #3D3B36; max-width: 640px; }
    .aviso { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; background: var(--coral-fondo); border: 2px solid var(--tinta); border-radius: 6px; font-size: 14px; line-height: 1.6; }
    .conteo { font-size: 14px; font-weight: 700; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
  `,
})
export class Candidatos {
  private api = inject(Api);
  private avisos = inject(Avisos);

  protected candidatos = signal<Candidato[]>([]);
  protected conCorreo = signal(false);
  protected cargando = signal(true);
  protected error = signal('');
  protected quitando = signal<string | null>(null);

  constructor() {
    this.api.candidatos().subscribe({
      next: r => {
        this.candidatos.set(r.candidatos);
        this.conCorreo.set(r.con_correo);
        this.cargando.set(false);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  async quitar(c: Candidato): Promise<void> {
    const si = await this.avisos.confirmar({
      titulo: `¿Quitar a ${c.nombre} de tus candidatos?`,
      texto: 'Podrás volver a guardarlo desde la búsqueda de talento.',
      aceptar: 'Sí, quitar',
      peligro: true,
    });
    if (!si) return;
    this.quitando.set(c.id);
    this.api.quitarCandidato(c.id).subscribe({
      next: () => {
        this.candidatos.update(l => l.filter(x => x.id !== c.id));
        this.quitando.set(null);
        this.avisos.exito(`${c.nombre} salió de tus candidatos.`);
      },
      error: err => {
        this.quitando.set(null);
        this.avisos.error(mensajeDeError(err));
      },
    });
  }

  /**
   * CSV separado por punto y coma y con BOM: así Excel en español (Colombia) lo abre
   * en columnas y con tildes sin pasos extra. Google Sheets lo detecta igual.
   */
  exportar(): void {
    const conCorreo = this.conCorreo();
    const encabezado = ['Nombre', 'Institución', 'Programa', 'Nivel', 'Ciudad', 'Disponibilidad', 'Modalidad',
      'Aptitudes verificadas', 'Tasa de aceptación (%)', 'Mejoras aceptadas', 'Semanas activas (de 8)', 'Enlace al perfil'];
    if (conCorreo) encabezado.push('Correo');
    const filas = this.candidatos().map(c => {
      const fila = [
        c.nombre, c.institucion, c.programa, nivelAcademico(c), c.ciudad,
        etiquetaDisponibilidad(c.disponibilidad), etiquetaModalidad(c.modalidad),
        c.verificadas.map(v => tecnologia(v).nombre).join(', '),
        c.tasa_aceptacion, c.mejoras_aportadas, c.semanas_activas,
        `${location.origin}/portafolio/${c.id}`,
      ];
      if (conCorreo) fila.push(c.correo ?? '');
      return fila.map(celda).join(';');
    });
    const csv = '﻿' + [encabezado.map(celda).join(';'), ...filas].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `candidatos-devconnect-${new Date().toISOString().slice(0, 10)}.csv`;
    // Algunos navegadores solo descargan si el enlace está en el documento.
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.avisos.exito(`Exportaste ${this.candidatos().length} ${this.candidatos().length === 1 ? 'candidato' : 'candidatos'}.`);
  }
}
