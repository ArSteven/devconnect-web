import { Component, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth/auth.service';
import { Portafolio } from '../../core/modelos';

const clave = (id: string) => `devconnect:empieza-aqui-oculto:${id}`;

// La preferencia es una comodidad: si el navegador no deja guardarla, el panel sigue funcionando.
function leerOculto(id: string): boolean {
  try {
    return localStorage.getItem(clave(id)) === '1';
  } catch {
    return false;
  }
}

function guardarOculto(id: string): void {
  try {
    localStorage.setItem(clave(id), '1');
  } catch {
    // Sin almacenamiento: queda oculto solo mientras la página siga abierta.
  }
}

/**
 * «Empieza aquí»: tres pasos para el estudiante que todavía no ha enviado su primera propuesta.
 * El principal obstáculo de quienes empiezan es no saber qué practicar. Usa el portafolio propio,
 * que ya trae el perfil y los totales de publicaciones y propuestas.
 */
@Component({
  selector: 'app-empieza-aqui',
  imports: [RouterLink],
  template: `
    @if (visible() && datos(); as d) {
      <section class="panel aparecer" aria-labelledby="titulo-empieza">
        <div class="cabeza">
          <div>
            <h2 id="titulo-empieza">Empieza aquí</h2>
            <p class="avance">{{ hechos() }} de 3 pasos listos.</p>
          </div>
          <button type="button" class="ocultar" aria-label="Ocultar el panel Empieza aquí" (click)="ocultar($event)">Ocultar</button>
        </div>
        <ol class="pasos">
          <li [class.hecho]="perfilListo()">
            <span class="marca" aria-hidden="true">{{ perfilListo() ? '✓' : '1' }}</span>
            <div class="paso">
              <a [routerLink]="['/portafolio', d.perfil.id]" [queryParams]="{ editar: 1 }">Completa tu perfil</a>
              <span class="sr-only">{{ perfilListo() ? 'Listo.' : 'Pendiente.' }}</span>
              <p>Agrega tu titular, tu institución y al menos una tecnología.</p>
            </div>
          </li>
          <li [class.hecho]="propuso()">
            <span class="marca" aria-hidden="true">{{ propuso() ? '✓' : '2' }}</span>
            <div class="paso">
              <button type="button" class="enlace" (click)="practicar.emit()">Mejora un código de principiante</button>
              <span class="sr-only">{{ propuso() ? 'Listo.' : 'Pendiente.' }}</span>
              <p>Abre los códigos de principiante que necesitan mejoras y propón un cambio.</p>
            </div>
          </li>
          <li [class.hecho]="publico()">
            <span class="marca" aria-hidden="true">{{ publico() ? '✓' : '3' }}</span>
            <div class="paso">
              <a routerLink="/publicar">Publica tu primer código</a>
              <span class="sr-only">{{ publico() ? 'Listo.' : 'Pendiente.' }}</span>
              <p>Comparte un código que quieras mejorar: otros te propondrán cambios.</p>
            </div>
          </li>
        </ol>
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .panel {
      display: flex; flex-direction: column; gap: 14px; padding: 18px 20px;
      background: var(--blanco); border: 2px solid var(--tinta); border-radius: 6px; box-shadow: 6px 6px 0 var(--azul);
    }
    .cabeza { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    h2 { font-size: 20px; }
    .avance { margin-top: 4px; font-size: 13px; color: var(--tenue); }
    .ocultar {
      flex: none; min-height: 44px; padding: 0 14px; border: 2px solid var(--tinta); border-radius: 4px;
      background: var(--blanco); color: var(--tinta); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .ocultar:hover { background: var(--tinta); color: var(--papel); }
    .pasos { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
    .pasos li { display: flex; align-items: flex-start; gap: 12px; }
    .marca {
      flex: none; display: grid; place-items: center; width: 32px; height: 32px;
      border: 2px solid var(--azul); border-radius: 50%; color: var(--azul); font-size: 14px; font-weight: 800;
    }
    .hecho .marca { background: var(--azul); color: #fff; }
    .paso { min-width: 0; padding-top: 4px; }
    /* El relleno agranda el área táctil a 44 px y el margen negativo lo compensa: el texto no se mueve. */
    .paso a, .enlace {
      display: inline-block; padding: 11px 0; margin: -11px 0; border: 0; background: none;
      font: inherit; font-size: 15px; font-weight: 800; line-height: 1.5; color: var(--azul); text-align: left;
      text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
    }
    .hecho .paso a, .hecho .enlace { color: var(--tinta); }
    .paso p { margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--tenue); }
    @media (max-width: 480px) {
      .panel { padding: 16px; }
    }
  `,
})
export class EmpiezaAqui {
  private api = inject(Api);
  private auth = inject(AuthService);

  /** El feed aplica los filtros «Necesita mejoras» y «Principiante». */
  readonly practicar = output<void>();

  private id = this.auth.usuario()?.rol === 'estudiante' ? this.auth.usuario()!.id : null;
  protected oculto = signal(this.id ? leerOculto(this.id) : true);
  protected datos = signal<Portafolio | null>(null);

  protected perfilListo = computed(() => {
    const p = this.datos()?.perfil;
    return !!p && !!p.titular.trim() && !!p.institucion.trim() && p.stack.length > 0;
  });
  protected propuso = computed(() => (this.datos()?.totales.propuestas_hechas ?? 0) > 0);
  protected publico = computed(() => (this.datos()?.totales.publicaciones ?? 0) > 0);
  protected hechos = computed(() => [this.perfilListo(), this.propuso(), this.publico()].filter(Boolean).length);
  /** Solo hasta que envíe su primera propuesta de mejora, y si no lo ocultó. */
  protected visible = computed(() => !this.oculto() && !!this.datos() && !this.propuso());

  constructor() {
    if (this.id && !this.oculto()) {
      this.api.portafolio(this.id).subscribe({ next: d => this.datos.set(d), error: () => {} });
    }
  }

  ocultar(e: MouseEvent): void {
    if (this.id) guardarOculto(this.id);
    this.oculto.set(true);
    // Con teclado (un clic sin detalle) el foco no se pierde: pasa al título del feed.
    if (e.detail === 0) document.getElementById('titulo-feed')?.focus();
  }
}
