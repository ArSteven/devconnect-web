import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegistroDatos } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/api-error';
import { CampoContrasena } from '../../shared/campo-contrasena';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, CampoContrasena],
  template: `
    <section class="contenedor envoltura">
      <form class="card formulario aparecer" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <h1>Crear cuenta</h1>

        <fieldset>
          <legend>Me registro como</legend>
          <div class="roles">
            <label class="opcion" [class.elegida]="form.controls.rol.value === 'estudiante'">
              <input type="radio" formControlName="rol" value="estudiante">
              <strong>Estudiante</strong>
              <span>Gratis</span>
            </label>
            <label class="opcion" [class.elegida]="form.controls.rol.value === 'empresa'">
              <input type="radio" formControlName="rol" value="empresa">
              <strong>Empresa</strong>
              <span>Busca talento</span>
            </label>
          </div>
        </fieldset>

        <label class="campo">
          {{ form.controls.rol.value === 'empresa' ? 'Tu nombre (quien maneja la cuenta)' : 'Nombre completo' }}
          <input type="text" formControlName="nombre" autocomplete="name">
        </label>
        @if (form.controls.rol.value === 'empresa') {
          <label class="campo">
            Razón social
            <input type="text" formControlName="razon_social" autocomplete="organization">
          </label>
        }
        <label class="campo">
          Correo
          <input type="email" formControlName="correo" autocomplete="email" placeholder="tu@correo.com">
        </label>
        <label class="campo">
          Contraseña
          <app-campo-contrasena [control]="form.controls.contrasena" autocomplete="new-password" />
          <span class="ayuda">Mínimo 8 caracteres.</span>
        </label>

        <!-- Los enlaces abren otra pestaña para no perder lo escrito en el formulario. -->
        <div class="terminos">
          <label class="casilla" for="acepta-terminos">
            <input type="checkbox" id="acepta-terminos" formControlName="acepta_terminos" (change)="errorTerminos.set('')"
                   [attr.aria-invalid]="errorTerminos() ? true : null"
                   [attr.aria-describedby]="errorTerminos() ? 'error-terminos' : null">
            <span>
              Acepto los <a routerLink="/terminos" target="_blank" rel="noopener">términos y condiciones</a>
              y autorizo el tratamiento de mis datos personales según la
              <a routerLink="/privacidad" target="_blank" rel="noopener">política de tratamiento de datos</a>.
            </span>
          </label>
          @if (errorTerminos()) {
            <p class="error" id="error-terminos" role="alert">{{ errorTerminos() }}</p>
          }
        </div>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button class="btn btn-primario" type="submit" [disabled]="enviando() || !form.controls.acepta_terminos.value">
          {{ enviando() ? 'Creando…' : 'Crear cuenta →' }}
        </button>
        <p class="pie">¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
      </form>
    </section>
  `,
  styles: `
    .envoltura { display: flex; justify-content: center; padding-top: 32px; }
    .formulario { width: 100%; max-width: 480px; padding: 32px; display: flex; flex-direction: column; gap: 18px; }
    h1 { font-size: 32px; }
    fieldset { margin: 0; padding: 0; border: 0; }
    legend { font-size: 13px; color: var(--tenue); margin-bottom: 8px; }
    .roles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
    .opcion {
      display: flex; flex-direction: column; gap: 4px; padding: 14px;
      position: relative; border: 2px solid var(--linea); border-radius: 4px; cursor: pointer; font-size: 13px;
      transition: border-color .15s, box-shadow .15s;
    }
    .opcion input { position: absolute; opacity: 0; pointer-events: none; }
    .opcion:has(input:focus-visible) { outline: 3px solid var(--azul); outline-offset: 2px; }
    .opcion strong { font-size: 15px; }
    .opcion span { color: var(--tenue); }
    .opcion.elegida { border-color: var(--tinta); background: var(--blanco); box-shadow: 4px 4px 0 var(--azul); }
    .terminos { display: flex; flex-direction: column; gap: 6px; }
    /* El margen de la casilla está dentro de la etiqueta: el área que se puede tocar mide 44 × 44 px. */
    .casilla { display: flex; align-items: flex-start; margin-left: -11px; font-size: 13px; line-height: 1.6; cursor: pointer; }
    .casilla input { flex: none; width: 22px; height: 22px; margin: 11px; accent-color: var(--azul); cursor: pointer; }
    .casilla span { padding: 10px 0; }
    .casilla a { font-weight: 700; }
    .pie { font-size: 13px; color: var(--tenue); text-align: center; }
    .pie a { display: inline-block; padding: 12px 4px; }
  `,
})
export class Registro implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  /** Viene de la URL: /registro?rol=empresa */
  readonly rol = input<string>();

  protected enviando = signal(false);
  protected error = signal('');
  protected errorTerminos = signal('');

  protected form = this.fb.nonNullable.group({
    rol: ['estudiante' as 'estudiante' | 'empresa', Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    razon_social: ['', Validators.maxLength(200)],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    // Ley 1581 de 2012: la autorización es expresa, así que la casilla empieza sin marcar.
    acepta_terminos: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    if (this.rol() === 'empresa') {
      this.form.controls.rol.setValue('empresa');
    }
  }

  enviar(): void {
    const v = this.form.getRawValue();
    if (!v.acepta_terminos) {
      this.errorTerminos.set('Debes aceptar los términos y condiciones y la política de tratamiento de datos.');
      return;
    }
    if (this.form.invalid || (v.rol === 'empresa' && !v.razon_social.trim())) {
      this.error.set('Completa todos los campos. La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    const datos: RegistroDatos = {
      nombre: v.nombre, correo: v.correo, contrasena: v.contrasena, rol: v.rol, acepta_terminos: v.acepta_terminos,
    };
    if (v.rol === 'empresa') {
      datos.razon_social = v.razon_social;
    }
    this.enviando.set(true);
    this.error.set('');
    this.errorTerminos.set('');
    this.auth.registro(datos).subscribe({
      // El estudiante nuevo completa su perfil antes de llegar al feed.
      next: u => this.router.navigateByUrl(u.rol === 'estudiante' ? '/bienvenida' : this.auth.rutaInicio()),
      error: err => {
        if (err instanceof HttpErrorResponse && err.error?.codigo === 'TERMINOS_NO_ACEPTADOS') {
          this.errorTerminos.set(mensajeDeError(err));
        } else {
          this.error.set(mensajeDeError(err));
        }
        this.enviando.set(false);
      },
    });
  }
}
