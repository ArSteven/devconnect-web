import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { mensajeDeError } from '../../core/api-error';
import { CampoContrasena } from '../../shared/campo-contrasena';
import { Logo } from '../../shared/logo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Logo, CampoContrasena],
  template: `
    <section class="contenedor envoltura">
      <form class="card formulario aparecer" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <app-logo [tamano]="44" />
        <h1>Iniciar sesión</h1>

        <label class="campo">
          Correo
          <input type="email" formControlName="correo" autocomplete="email" placeholder="tu@correo.com">
        </label>
        <label class="campo">
          Contraseña
          <app-campo-contrasena [control]="form.controls.contrasena" autocomplete="current-password" />
        </label>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button class="btn btn-primario" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando…' : 'Entrar →' }}
        </button>
        <p class="pie">¿No tienes cuenta? <a routerLink="/registro">Crear cuenta</a></p>
      </form>
    </section>
  `,
  styles: `
    .envoltura { display: flex; justify-content: center; padding-top: 40px; }
    .formulario { width: 100%; max-width: 440px; padding: 32px; display: flex; flex-direction: column; gap: 18px; }
    h1 { font-size: 32px; }
    .pie { font-size: 13px; color: var(--tenue); text-align: center; }
    .pie a { display: inline-block; padding: 12px 4px; }
  `,
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected enviando = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    const { correo, contrasena } = this.form.getRawValue();
    this.auth.login(correo, contrasena).subscribe({
      next: () => this.router.navigateByUrl(this.auth.rutaInicio()),
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
