import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api } from '../../core/api';
import { DISPONIBILIDADES, Experiencia, MODALIDADES, PerfilEditable, PerfilEstudiante } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

type GrupoExperiencia = FormGroup<{ [K in keyof Experiencia]: FormControl<Experiencia[K]> }>;

@Component({
  selector: 'app-editar-perfil',
  imports: [ReactiveFormsModule],
  template: `
    <form class="card formulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <h2>Editar perfil</h2>

      <fieldset>
        <legend>Presentación</legend>
        <label class="campo">Titular profesional
          <input type="text" formControlName="titular" maxlength="120" placeholder="Ej.: Desarrollador backend en formación · Go y Angular">
        </label>
        <div class="dos">
          <label class="campo">Ciudad<input type="text" formControlName="ciudad" maxlength="100" placeholder="Ej.: Bucaramanga"></label>
          <label class="campo">Fecha de nacimiento (opcional)
            <input type="date" formControlName="fecha_nacimiento">
            <span class="ayuda">Solo se muestra tu edad, nunca la fecha.</span>
          </label>
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
        <label class="campo">Acerca de ti
          <textarea formControlName="biografia" rows="4" maxlength="1000" placeholder="Qué te interesa, en qué has trabajado y qué buscas."></textarea>
        </label>
      </fieldset>

      <fieldset>
        <legend>Formación</legend>
        <div class="dos">
          <label class="campo">Programa<input type="text" formControlName="programa" maxlength="150" placeholder="Ej.: Tecnología en Desarrollo de Sistemas Informáticos"></label>
          <label class="campo">Institución<input type="text" formControlName="institucion" maxlength="150" placeholder="Ej.: Unidades Tecnológicas de Santander"></label>
          <label class="campo">Estado
            <select formControlName="estado_academico">
              <option value="">Sin indicar</option>
              <option value="cursando">En curso</option>
              <option value="egresado">Egresado</option>
            </select>
          </label>
          <label class="campo">Semestre actual<input type="number" formControlName="semestre" min="1" max="12"></label>
          <label class="campo">Año de inicio<input type="number" formControlName="anio_inicio" min="1990" max="2040"></label>
          <label class="campo">Año de finalización (o esperado)<input type="number" formControlName="anio_fin" min="1990" max="2045"></label>
        </div>
      </fieldset>

      <fieldset formArrayName="experiencia">
        <legend>Experiencia</legend>
        @for (grupo of experiencia.controls; track grupo; let i = $index) {
          <div class="experiencia" [formGroupName]="i">
            <div class="dos">
              <label class="campo">Cargo<input type="text" formControlName="cargo" maxlength="100"></label>
              <label class="campo">Empresa<input type="text" formControlName="empresa" maxlength="100"></label>
              <label class="campo">Desde<input type="month" formControlName="inicio" placeholder="AAAA-MM"></label>
              <label class="campo">Hasta (vacío si es tu trabajo actual)<input type="month" formControlName="fin" placeholder="AAAA-MM"></label>
            </div>
            <label class="campo">Qué hiciste<textarea formControlName="descripcion" rows="2" maxlength="500"></textarea></label>
            <button class="quitar" type="button" (click)="experiencia.removeAt(i)">Quitar esta experiencia</button>
          </div>
        }
        @if (experiencia.length < 10) {
          <button class="btn btn-secundario" type="button" (click)="agregarExperiencia()">+ Agregar experiencia</button>
        }
      </fieldset>

      <fieldset>
        <legend>Aptitudes, idiomas y enlaces</legend>
        <label class="campo">Tecnologías (separadas por comas)
          <input type="text" formControlName="stack" placeholder="Go, Angular, PostgreSQL, Git">
          <span class="ayuda">Las que tengan evidencia en DevConnect aparecerán como verificadas.</span>
        </label>
        <label class="campo">Idiomas (separados por comas)
          <input type="text" formControlName="idiomas" placeholder="Español nativo, Inglés B1">
          <span class="ayuda">Indica el nivel de cada idioma, como lo leería un reclutador: nativo, o A1 a C2.</span>
        </label>
        <div class="dos">
          <label class="campo">GitHub<input type="url" formControlName="github_url" placeholder="https://github.com/usuario"></label>
          <label class="campo">LinkedIn<input type="url" formControlName="linkedin_url" placeholder="https://www.linkedin.com/in/usuario"></label>
          <label class="campo">Sitio o portafolio personal<input type="url" formControlName="sitio_url" placeholder="https://..."></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Privacidad</legend>
        <div class="interruptor">
          <label for="contacto-visible">
            <input type="checkbox" role="switch" id="contacto-visible" formControlName="contacto_visible" aria-describedby="ayuda-contacto">
            <span>Mostrar mi correo a las empresas suscritas</span>
          </label>
          <span class="ayuda" id="ayuda-contacto">Si lo desactivas, las empresas verán tu portafolio pero no tu correo. Puedes cambiarlo cuando quieras.</span>
        </div>
      </fieldset>

      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

      <div class="acciones">
        <button class="btn btn-primario" type="submit" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar perfil' }}</button>
        <button class="btn btn-secundario" type="button" (click)="cancelado.emit()">Cancelar</button>
      </div>
    </form>
  `,
  styles: `
    .formulario { padding: 28px; display: flex; flex-direction: column; gap: 22px; }
    h2 { font-size: 24px; }
    fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 14px; }
    legend { font-size: 15px; font-weight: 800; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid var(--linea); width: 100%; }
    .dos { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
    .ayuda { font-size: 12px; }
    .experiencia { padding: 16px; border: 1px solid var(--linea); border-radius: 4px; display: flex; flex-direction: column; gap: 12px; }
    .quitar { align-self: flex-start; background: none; border: 0; padding: 4px 0; color: var(--coral-texto); font: inherit; font-size: 13px; cursor: pointer; text-decoration: underline; }
    .interruptor { display: flex; flex-direction: column; gap: 2px; }
    .interruptor label { display: flex; align-items: center; gap: 12px; min-height: 44px; font-size: 14px; font-weight: 700; cursor: pointer; }
    /* El círculo es un degradado de fondo: se desliza al activar, sin pseudo-elementos en el input. */
    .interruptor input {
      appearance: none; flex: none; width: 48px; height: 28px; margin: 0; cursor: pointer;
      border: 2px solid var(--tinta); border-radius: 999px;
      background: radial-gradient(circle, var(--blanco) 0 7px, var(--tinta) 7.5px 9px, transparent 9.5px) 0 50% / 24px 24px no-repeat var(--linea);
      transition: background-position .15s, background-color .15s;
    }
    .interruptor input:checked { background-color: var(--azul); background-position: 100% 50%; }
    .interruptor .ayuda { color: var(--tenue); line-height: 1.5; }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
  `,
})
export class EditarPerfil implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(Api);

  readonly perfil = input.required<PerfilEstudiante>();
  /** Emite el GitHub guardado para que el avatar del encabezado se actualice. */
  readonly guardado = output<string>();
  readonly cancelado = output<void>();

  protected disponibilidades = DISPONIBILIDADES;
  protected modalidades = MODALIDADES;
  protected guardando = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    titular: ['', Validators.maxLength(120)],
    ciudad: ['', Validators.maxLength(100)],
    fecha_nacimiento: [''],
    disponibilidad: [''],
    modalidad: [''],
    biografia: ['', Validators.maxLength(1000)],
    programa: ['', Validators.maxLength(150)],
    institucion: ['', Validators.maxLength(150)],
    estado_academico: [''],
    semestre: [null as number | null, [Validators.min(1), Validators.max(12)]],
    anio_inicio: [null as number | null, [Validators.min(1990), Validators.max(2040)]],
    anio_fin: [null as number | null, [Validators.min(1990), Validators.max(2045)]],
    experiencia: this.fb.array<GrupoExperiencia>([]),
    stack: [''],
    idiomas: [''],
    github_url: [''],
    linkedin_url: [''],
    sitio_url: [''],
    contacto_visible: [true],
  });

  get experiencia(): FormArray<GrupoExperiencia> {
    return this.form.controls.experiencia;
  }

  ngOnInit(): void {
    const p = this.perfil();
    this.form.patchValue({
      titular: p.titular, ciudad: p.ciudad, fecha_nacimiento: p.fecha_nacimiento ?? '',
      disponibilidad: p.disponibilidad, modalidad: p.modalidad, biografia: p.biografia,
      programa: p.programa, institucion: p.institucion, estado_academico: p.estado_academico,
      semestre: p.semestre, anio_inicio: p.anio_inicio, anio_fin: p.anio_fin,
      stack: p.stack.join(', '), idiomas: p.idiomas.join(', '),
      github_url: p.github_url, linkedin_url: p.linkedin_url, sitio_url: p.sitio_url,
      contacto_visible: p.contacto_visible,
    });
    p.experiencia.forEach(e => this.experiencia.push(this.grupoExperiencia(e)));
  }

  grupoExperiencia(e: Experiencia = { cargo: '', empresa: '', inicio: '', fin: '', descripcion: '' }): GrupoExperiencia {
    return this.fb.nonNullable.group({
      cargo: [e.cargo, [Validators.required, Validators.maxLength(100)]],
      empresa: [e.empresa, [Validators.required, Validators.maxLength(100)]],
      inicio: [e.inicio, [Validators.required, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
      fin: [e.fin, Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)],
      descripcion: [e.descripcion, Validators.maxLength(500)],
    });
  }

  agregarExperiencia(): void {
    this.experiencia.push(this.grupoExperiencia());
  }

  guardar(): void {
    if (this.form.invalid) {
      const nombres: Record<string, string> = {
        titular: 'Titular', ciudad: 'Ciudad', biografia: 'Acerca de ti', programa: 'Programa',
        institucion: 'Institución', semestre: 'Semestre (1 a 12)', anio_inicio: 'Año de inicio (desde 1990)',
        anio_fin: 'Año de finalización', experiencia: 'Experiencia (cargo, empresa y fechas como 2026-02)',
      };
      const malos = Object.entries(this.form.controls).filter(([, c]) => c.invalid).map(([k]) => nombres[k] ?? k);
      this.error.set(`Revisa estos campos: ${malos.join(', ')}.`);
      return;
    }
    const v = this.form.getRawValue();
    const lista = (texto: string) => texto.split(',').map(s => s.trim()).filter(Boolean);
    const datos: PerfilEditable = {
      ...v,
      disponibilidad: v.disponibilidad as PerfilEditable['disponibilidad'],
      modalidad: v.modalidad as PerfilEditable['modalidad'],
      estado_academico: v.estado_academico as PerfilEditable['estado_academico'],
      semestre: v.semestre || null,
      anio_inicio: v.anio_inicio || null,
      anio_fin: v.anio_fin || null,
      stack: lista(v.stack),
      idiomas: lista(v.idiomas),
    };
    this.guardando.set(true);
    this.error.set('');
    this.api.actualizarPerfil(datos).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardado.emit(datos.github_url);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.guardando.set(false);
      },
    });
  }
}
