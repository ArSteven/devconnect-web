import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { mensajeDeError } from '../../core/api-error';
import { Avisos } from '../../core/avisos';
import { LENGUAJES } from '../../core/modelos';
import { CampoCodigo } from '../../shared/campo-codigo';
import { Tecnologia } from '../../shared/tecnologia';

@Component({
  selector: 'app-publicar',
  imports: [ReactiveFormsModule, RouterLink, CampoCodigo, Tecnologia],
  template: `
    <section class="contenedor">
      <a routerLink="/feed" class="volver">← Volver al feed</a>
      <form class="card formulario aparecer" [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <h1>Publicar código</h1>
        <p class="tenue">Cuenta qué intentabas hacer y qué pasa. Otros estudiantes van a proponer cambios sobre tu código y tú eliges cuál aceptar.</p>

        <label class="campo">
          Título
          <input type="text" formControlName="titulo" maxlength="150" placeholder="Ej.: Mi goroutine no imprime nada">
        </label>

        <label class="campo">
          <span class="con-logo">Lenguaje <app-tecnologia [nombre]="lenguaje()" [tamano]="18" [conNombre]="false" /></span>
          <select formControlName="lenguaje">
            @for (l of lenguajes; track l.valor) {
              <option [value]="l.valor">{{ l.etiqueta }}</option>
            }
          </select>
        </label>

        <label class="campo">
          Descripción (opcional)
          <textarea formControlName="descripcion" rows="3" maxlength="2000" placeholder="Qué esperabas que pasara y qué pasa en realidad."></textarea>
        </label>

        <label class="campo">
          Código
          <textarea formControlName="codigo" rows="14" class="campo-codigo" appCampoCodigo maxlength="20000" aria-describedby="ayuda-tab"></textarea>
          <span class="ayuda" id="ayuda-tab">Tab agrega sangría. Para salir del campo con el teclado, pulsa Esc y luego Tab.</span>
        </label>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button class="btn btn-primario" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Publicando…' : 'Publicar →' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .contenedor { display: flex; flex-direction: column; gap: 16px; max-width: 860px; }
    .volver { display: inline-flex; align-items: center; min-height: 44px; font-size: 13px; align-self: flex-start; }
    .formulario { padding: clamp(20px, 4vw, 30px); display: flex; flex-direction: column; gap: 18px; }
    h1 { font-size: 32px; }
    .tenue { font-size: 14px; line-height: 1.6; }
    .con-logo { display: inline-flex; align-items: center; gap: 8px; }
    .formulario > .btn { align-self: flex-start; }
  `,
})
export class Publicar {
  private fb = inject(FormBuilder);
  private api = inject(Api);
  private router = inject(Router);
  private avisos = inject(Avisos);

  protected lenguajes = LENGUAJES;
  protected enviando = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    lenguaje: ['go', Validators.required],
    descripcion: ['', Validators.maxLength(2000)],
    codigo: ['', [Validators.required, Validators.maxLength(20000)]],
  });
  protected lenguaje = toSignal(this.form.controls.lenguaje.valueChanges, { initialValue: 'go' });

  enviar(): void {
    if (this.form.invalid) {
      this.error.set('El título necesita al menos 5 caracteres y el código no puede estar vacío.');
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    this.api.crearPublicacion(this.form.getRawValue()).subscribe({
      next: p => {
        this.avisos.exito('Publicado: ya está en el feed para que la comunidad proponga mejoras.');
        this.router.navigate(['/publicacion', p.id]);
      },
      error: err => {
        this.error.set(mensajeDeError(err));
        this.enviando.set(false);
      },
    });
  }
}
