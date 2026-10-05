import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegistroDatos } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/api-error';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="contenedor envoltura">
      <form class="card formulario" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <h1>crear cuenta</h1>

        <fieldset>
          <legend>Me registro como</legend>
          <div class="roles">
            <label class="opcion" [class.elegida]="form.controls.rol.value === 'estudiante'">
              <input type="radio" formControlName="rol" value="estudiante">
              <strong>estudiante</strong>
              <span>gratis, siempre</span>
            </label>
            <label class="opcion" [class.elegida]="form.controls.rol.value === 'empresa'">
              <input type="radio" formControlName="rol" value="empresa">
              <strong>empresa</strong>
              <span>busca talento</span>
            </label>
          </div>
        </fieldset>

        <label class="campo">
          {{ form.controls.rol.value === 'empresa' ? 'Tu nombre (quien maneja la cuenta)' : 'Nombre' }}
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
          <input type="password" formControlName="contrasena" autocomplete="new-password">
          <span class="ayuda">mínimo 8 caracteres</span>
        </label>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button class="btn btn-primario" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'creando…' : 'crear cuenta →' }}
        </button>
        <p class="pie">¿Ya tienes cuenta? <a routerLink="/login">inicia sesión</a></p>
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
    }
    .opcion input { position: absolute; opacity: 0; pointer-events: none; }
    .opcion:has(input:focus-visible) { outline: 3px solid var(--azul); outline-offset: 2px; }
    .opcion strong { font-size: 15px; }
    .opcion span { color: var(--tenue); }
    .opcion.elegida { border-color: var(--tinta); background: var(--blanco); box-shadow: 4px 4px 0 var(--azul); }
    .ayuda { font-size: 12px; }
    .pie { font-size: 13px; color: var(--tenue); text-align: center; }
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

  protected form = this.fb.nonNullable.group({
    rol: ['estudiante' as 'estudiante' | 'empresa', Validators.required],
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    razon_social: ['', Validators.maxLength(200)],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });

  ngOnInit(): void {
    if (this.rol() === 'empresa') {
      this.form.controls.rol.setValue('empresa');
    }
  }

  enviar(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || (v.rol === 'empresa' && !v.razon_social.trim())) {
      this.error.set('completa todos los campos; la contraseña debe tener al menos 8 caracteres');
      return;
    }
    const datos: RegistroDatos = { nombre: v.nombre, correo: v.correo, contrasena: v.contrasena, rol: v.rol };
    if (v.rol === 'empresa') {
      datos.razon_social = v.razon_social;
    }
    this.enviando.set(true);
    this.error.set('');
    this.auth.registro(datos).subscribe({
      next: () => this.router.navigateByUrl(this.auth.rutaInicio()),
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
