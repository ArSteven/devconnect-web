import { Component, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Campo de contraseña con el botón "Mostrar" / "Ocultar". Va dentro de un <label class="campo">,
 * que nombra al input porque es el primer campo que contiene.
 */
@Component({
  selector: 'app-campo-contrasena',
  imports: [ReactiveFormsModule],
  template: `
    <input [type]="ver() ? 'text' : 'password'" [formControl]="control()" [attr.autocomplete]="autocomplete()">
    <button type="button" class="ver" (click)="ver.set(!ver())" [attr.aria-pressed]="ver()">{{ ver() ? 'Ocultar' : 'Mostrar' }}</button>
  `,
  styles: `
    :host { display: flex; }
    :host input { flex: 1; min-width: 0; border-radius: 4px 0 0 4px; }
    .ver { min-width: 92px; border: 2px solid var(--tinta); border-left: 0; border-radius: 0 4px 4px 0; background: var(--papel); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; color: var(--tinta); }
  `,
})
export class CampoContrasena {
  readonly control = input.required<FormControl<string>>();
  /** current-password al iniciar sesión; new-password al crear la cuenta, para que el gestor de contraseñas proponga una. */
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  protected ver = signal(false);
}
