import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { Avisos } from '../../core/avisos';
import { Catalogos, DISPONIBILIDADES, MODALIDADES, PerfilEditable, PerfilEstudiante } from '../../core/modelos';
import { tecnologia } from '../../core/tecnologias';
import { Cargando } from '../../shared/cargando';
import { Tecnologia } from '../../shared/tecnologia';

const SUGERIDAS = ['Go', 'Angular', 'TypeScript', 'JavaScript', 'Python', 'Java', 'PHP', 'SQL', 'HTML', 'CSS', 'Git', 'React', 'Node.js', 'C#', 'PostgreSQL', 'MySQL', 'Docker'];

/** Onboarding corto del estudiante nuevo: dos pasos y al feed. Todo se puede cambiar después. */
@Component({
  selector: 'app-bienvenida',
  imports: [ReactiveFormsModule, Tecnologia, Cargando],
  template: `
    <section class="contenedor">
      @if (!perfil()) {
        <app-cargando texto="Preparando tu perfil…" />
      } @else {
        <form class="card formulario aparecer" [formGroup]="form" (ngSubmit)="paso() === 1 ? siguiente() : guardar()" novalidate>
          <div class="progreso" aria-hidden="true"><span [style.width]="paso() === 1 ? '50%' : '100%'"></span></div>
          <p class="paso">Paso {{ paso() }} de 2</p>

          @if (paso() === 1) {
            <h1>Hola, {{ primerNombre() }}. Cuéntale a las empresas dónde estudias.</h1>
            <p class="bajada">Con esto te encuentran en la búsqueda de talento. Te toma un minuto.</p>
            <div class="dos">
              <label class="campo">Institución
                <input type="text" formControlName="institucion" list="lista-instituciones" maxlength="150" placeholder="Ej.: Unidades Tecnológicas de Santander">
                <datalist id="lista-instituciones">@for (o of catalogos()?.instituciones ?? []; track o.valor) { <option [value]="o.valor"></option> }</datalist>
              </label>
              <label class="campo">Programa
                <input type="text" formControlName="programa" maxlength="150" placeholder="Ej.: Tecnología en Desarrollo de Sistemas Informáticos">
              </label>
              <label class="campo">Estado
                <select formControlName="estado_academico">
                  <option value="cursando">En curso</option>
                  <option value="egresado">Egresado</option>
                </select>
              </label>
              @if (form.controls.estado_academico.value !== 'egresado') {
                <label class="campo">Semestre actual
                  <input type="number" formControlName="semestre" min="1" max="12" inputmode="numeric">
                </label>
              }
              <label class="campo">Ciudad
                <input type="text" formControlName="ciudad" list="lista-ciudades" maxlength="100" placeholder="Ej.: Bucaramanga">
                <datalist id="lista-ciudades">
                  @for (c of ciudadesSugeridas; track c) { <option [value]="c"></option> }
                </datalist>
              </label>
            </div>
          } @else {
            <h1>¿Con qué tecnologías trabajas y qué buscas?</h1>
            <p class="bajada">Las que demuestres con aportes en DevConnect aparecerán como verificadas.</p>
            <fieldset>
              <legend>Tecnologías (elige las que uses)</legend>
              <div class="chips">
                @for (t of opciones(); track t) {
                  <button type="button" class="chip-tec" [class.on]="elegidas().includes(t)" [attr.aria-pressed]="elegidas().includes(t)" (click)="alternar(t)">
                    <app-tecnologia [nombre]="t" [tamano]="18" />
                  </button>
                }
              </div>
              <div class="otra">
                <label class="campo">Otra tecnología
                  <input #otra type="text" maxlength="30" placeholder="Ej.: Flutter" (keydown.enter)="$event.preventDefault(); agregar(otra)">
                </label>
                <button class="btn btn-secundario btn-pequeno" type="button" (click)="agregar(otra)">Agregar</button>
              </div>
            </fieldset>
            <div class="dos">
              <label class="campo">Disponibilidad
                <select formControlName="disponibilidad">
                  <option value="">Sin indicar</option>
                  @for (d of disponibilidades; track d.valor) { <option [value]="d.valor">{{ d.etiqueta }}</option> }
                </select>
              </label>
              <label class="campo">Modalidad preferida
                <select formControlName="modalidad">
                  <option value="">Sin indicar</option>
                  @for (m of modalidades; track m.valor) { <option [value]="m.valor">{{ m.etiqueta }}</option> }
                </select>
              </label>
            </div>
            <label class="campo">GitHub (opcional)
              <input type="url" formControlName="github_url" placeholder="https://github.com/tu-usuario">
              <span class="ayuda">Usamos tu foto de GitHub como avatar.</span>
            </label>
          }

          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

          <div class="acciones">
            @if (paso() === 2) {
              <button class="btn btn-secundario" type="button" (click)="paso.set(1)">← Atrás</button>
            }
            <button class="btn btn-primario" type="submit" [disabled]="guardando()">
              {{ paso() === 1 ? 'Continuar →' : guardando() ? 'Guardando…' : 'Guardar e ir al feed →' }}
            </button>
            <button class="omitir" type="button" (click)="omitir()">Omitir por ahora</button>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .contenedor { max-width: 760px; }
    .formulario { padding: clamp(22px, 4vw, 36px); display: flex; flex-direction: column; gap: 18px; }
    .progreso { height: 6px; background: var(--linea); border-radius: 3px; overflow: hidden; }
    .progreso span { display: block; height: 100%; background: var(--azul); transition: width .35s ease; }
    .paso { font-size: 12px; font-weight: 700; color: var(--tenue); }
    h1 { font-size: clamp(24px, 3.6vw, 32px); line-height: 1.2; }
    .bajada { font-size: 15px; line-height: 1.7; color: #3D3B36; }
    .dos { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 12px; }
    legend { font-size: 13px; color: var(--tenue); margin-bottom: 10px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip-tec {
      min-height: 44px; padding: 0 12px; border: 2px solid var(--linea); border-radius: 4px;
      background: var(--blanco); color: var(--tinta); font: inherit; font-size: 13px; cursor: pointer; transition: border-color .15s, box-shadow .15s;
    }
    .chip-tec:hover { border-color: var(--tinta); }
    .chip-tec.on { border-color: var(--tinta); box-shadow: 3px 3px 0 var(--azul); background: var(--azul-fondo); }
    .otra { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
    .otra .campo { flex: 1 1 220px; }
    .acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .omitir { margin-left: auto; min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--tenue); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; }
  `,
})
export class Bienvenida {
  private api = inject(Api);
  private auth = inject(AuthService);
  private avisos = inject(Avisos);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  protected disponibilidades = DISPONIBILIDADES.filter(d => d.valor !== 'no_disponible');
  protected modalidades = MODALIDADES;
  protected ciudadesSugeridas = ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta'];

  protected perfil = signal<PerfilEstudiante | null>(null);
  protected catalogos = signal<Catalogos | null>(null);
  protected paso = signal<1 | 2>(1);
  protected elegidas = signal<string[]>([]);
  protected opciones = signal<string[]>(SUGERIDAS);
  protected guardando = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    institucion: ['', Validators.maxLength(150)],
    programa: ['', Validators.maxLength(150)],
    estado_academico: ['cursando'],
    semestre: [null as number | null, [Validators.min(1), Validators.max(12)]],
    ciudad: ['', Validators.maxLength(100)],
    disponibilidad: ['practicas'],
    modalidad: [''],
    github_url: ['', Validators.pattern(/^(https:\/\/(www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/?)?$/)],
  });

  constructor() {
    const id = this.auth.usuario()!.id;
    this.api.portafolio(id).subscribe({
      next: d => {
        const p = d.perfil;
        this.perfil.set(p);
        this.form.patchValue({
          institucion: p.institucion, programa: p.programa, estado_academico: p.estado_academico || 'cursando',
          semestre: p.semestre, ciudad: p.ciudad, disponibilidad: p.disponibilidad || 'practicas', modalidad: p.modalidad,
          github_url: p.github_url,
        });
        const propias = p.stack.map(s => tecnologia(s).nombre);
        this.elegidas.set(propias);
        this.opciones.set([...new Set([...SUGERIDAS, ...propias])]);
      },
      error: err => this.error.set(mensajeDeError(err, 'No se pudo cargar tu perfil.')),
    });
    this.api.catalogos().subscribe({ next: c => this.catalogos.set(c), error: () => {} });
  }

  protected primerNombre(): string {
    return (this.auth.usuario()?.nombre ?? '').split(/\s+/)[0];
  }

  alternar(t: string): void {
    this.elegidas.update(l => (l.includes(t) ? l.filter(x => x !== t) : l.length >= 15 ? l : [...l, t]));
  }

  agregar(campo: HTMLInputElement): void {
    const nombre = tecnologia(campo.value).nombre.trim();
    campo.value = '';
    if (!nombre) return;
    if (!this.opciones().includes(nombre)) this.opciones.update(l => [...l, nombre]);
    if (!this.elegidas().includes(nombre)) this.alternar(nombre);
  }

  siguiente(): void {
    if (this.form.controls.semestre.invalid) {
      this.error.set('El semestre debe estar entre 1 y 12.');
      return;
    }
    this.error.set('');
    this.paso.set(2);
  }

  guardar(): void {
    const p = this.perfil();
    if (!p) return;
    if (this.form.controls.github_url.invalid) {
      this.error.set('El enlace de GitHub debe verse así: https://github.com/tu-usuario.');
      return;
    }
    const v = this.form.getRawValue();
    // La API reemplaza el perfil completo: se parte de lo que ya tenía y se cambia solo lo de aquí.
    const datos: PerfilEditable = {
      titular: p.titular, fecha_nacimiento: p.fecha_nacimiento ?? '', biografia: p.biografia,
      anio_inicio: p.anio_inicio, anio_fin: p.anio_fin, linkedin_url: p.linkedin_url, sitio_url: p.sitio_url,
      idiomas: p.idiomas, experiencia: p.experiencia,
      institucion: v.institucion.trim(), programa: v.programa.trim(), ciudad: v.ciudad.trim(),
      estado_academico: v.estado_academico as PerfilEditable['estado_academico'],
      semestre: v.estado_academico === 'egresado' ? null : v.semestre || null,
      disponibilidad: v.disponibilidad as PerfilEditable['disponibilidad'],
      modalidad: v.modalidad as PerfilEditable['modalidad'],
      github_url: v.github_url.trim().replace(/\/$/, ''),
      stack: this.elegidas(),
    };
    this.guardando.set(true);
    this.error.set('');
    this.api.actualizarPerfil(datos).subscribe({
      next: () => {
        this.auth.actualizarUsuario({ github_url: datos.github_url });
        this.avisos.exito('¡Listo! Tu perfil ya aparece en la búsqueda de talento.');
        this.router.navigateByUrl('/feed');
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.guardando.set(false);
      },
    });
  }

  omitir(): void {
    this.avisos.info('Puedes completar tu perfil cuando quieras desde el menú de tu avatar.');
    this.router.navigateByUrl('/feed');
  }
}
