import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { LENGUAJES } from '../../core/modelos';
import { mensajeDeError } from '../../core/api-error';

@Component({
  selector: 'app-publicar',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="contenedor">
      <a routerLink="/feed" class="volver">← volver al feed</a>
      <form class="card formulario" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <h1>publicar código</h1>
        <p class="tenue">Cuenta qué intentabas hacer y qué pasa. Otros estudiantes van a proponer cambios sobre tu código.</p>

        <label class="campo">
          Título
          <input type="text" formControlName="titulo" maxlength="150" placeholder="ej.: mi goroutine no imprime nada">
        </label>

        <label class="campo">
          Lenguaje
          <select formControlName="lenguaje">
            @for (l of lenguajes; track l.valor) {
              <option [value]="l.valor">{{ l.etiqueta }}</option>
            }
          </select>
        </label>

        <label class="campo">
          Descripción (opcional)
          <textarea formControlName="descripcion" rows="3" maxlength="2000" placeholder="qué esperabas que pasara y qué pasa en realidad"></textarea>
        </label>

        <label class="campo">
          Código
          <textarea formControlName="codigo" rows="12" class="mono" spellcheck="false" maxlength="20000"></textarea>
        </label>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button class="btn btn-primario" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'publicando…' : 'publicar →' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 16px; max-width: 820px; }
    .volver { font-size: 13px; }
    .formulario { padding: 28px; display: flex; flex-direction: column; gap: 18px; }
    h1 { font-size: 32px; }
    .tenue { color: var(--tenue); font-size: 14px; line-height: 1.6; }
    .mono { background: var(--editor) !important; color: var(--editor-texto) !important; font-size: 14px !important; line-height: 1.7; tab-size: 4; }
  `,
})
export class Publicar {
  private fb = inject(FormBuilder);
  private api = inject(Api);
  private router = inject(Router);

  protected lenguajes = LENGUAJES;
  protected enviando = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    lenguaje: ['go', Validators.required],
    descripcion: ['', Validators.maxLength(2000)],
    codigo: ['', [Validators.required, Validators.maxLength(20000)]],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.error.set('el título necesita al menos 5 caracteres y el código no puede estar vacío');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    this.api.crearPublicacion(this.form.getRawValue()).subscribe({
      next: p => this.router.navigate(['/publicacion', p.id]),
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
