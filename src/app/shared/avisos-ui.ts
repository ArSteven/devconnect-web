import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Avisos } from '../core/avisos';

/** Toasts: aparecen abajo, se van solos y se pueden cerrar. */
@Component({
  selector: 'app-toasts',
  template: `
    <div class="pila" aria-live="polite">
      @for (t of avisos.toasts(); track t.id) {
        <div class="toast {{ t.tipo }}" [attr.role]="t.tipo === 'error' ? 'alert' : 'status'">
          <span class="icono" aria-hidden="true">{{ t.tipo === 'exito' ? '✓' : t.tipo === 'error' ? '!' : 'i' }}</span>
          <span class="texto">{{ t.texto }}</span>
          <button type="button" aria-label="Cerrar aviso" (click)="avisos.cerrar(t.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: `
    .pila {
      position: fixed; z-index: 60; left: 50%; bottom: 20px; transform: translateX(-50%);
      display: flex; flex-direction: column; gap: 10px; width: min(460px, calc(100vw - 32px));
    }
    .toast {
      display: flex; align-items: center; gap: 12px; padding: 10px 8px 10px 14px;
      background: var(--tinta); color: var(--papel); border-radius: 6px; box-shadow: 5px 5px 0 var(--azul);
      font-size: 14px; line-height: 1.5; animation: subir .25s cubic-bezier(.2, .9, .3, 1.2);
    }
    .toast.exito { box-shadow: 5px 5px 0 var(--verde); }
    .toast.error { box-shadow: 5px 5px 0 var(--coral); }
    .icono {
      width: 24px; height: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      border-radius: 50%; background: var(--azul); color: #fff; font-weight: 800; font-size: 13px;
    }
    .exito .icono { background: var(--verde); color: var(--tinta); }
    .error .icono { background: var(--coral); color: var(--tinta); }
    .texto { flex: 1; }
    button { width: 44px; height: 44px; flex-shrink: 0; border: 0; background: none; color: var(--editor-tenue); font-size: 16px; cursor: pointer; }
    button:hover { color: var(--papel); }
    @keyframes subir { from { opacity: 0; transform: translateY(16px) scale(.97); } }
  `,
})
export class Toasts {
  protected avisos = inject(Avisos);
}

/** Diálogo de confirmación con <dialog> nativo: atrapa el foco y se cierra con Esc. */
@Component({
  selector: 'app-confirmacion',
  template: `
    <dialog #dialogo (cancel)="responder(false, $event)" aria-labelledby="titulo-confirmacion">
      @if (avisos.confirmacion(); as c) {
        <h2 id="titulo-confirmacion">{{ c.titulo }}</h2>
        <p>{{ c.texto }}</p>
        <div class="acciones">
          <button class="btn btn-secundario" type="button" autofocus (click)="responder(false)">{{ c.cancelar ?? 'Cancelar' }}</button>
          <button class="btn" [class.btn-primario]="!c.peligro" [class.peligro]="c.peligro" type="button" (click)="responder(true)">{{ c.aceptar }}</button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(480px, calc(100vw - 32px)); padding: 26px; border: 2px solid var(--tinta); border-radius: 8px;
      background: var(--blanco); color: var(--tinta); box-shadow: 8px 8px 0 var(--tinta);
    }
    dialog[open] { animation: entrar .2s cubic-bezier(.2, .9, .3, 1.15); }
    dialog::backdrop { background: rgba(20, 20, 20, .45); }
    h2 { font-size: 22px; margin-bottom: 10px; }
    p { font-size: 14px; line-height: 1.7; color: #3D3B36; }
    .acciones { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; margin-top: 22px; }
    .peligro { background: var(--coral); border-color: var(--tinta); color: var(--tinta); }
    .peligro:hover { background: var(--coral-texto); color: #fff; }
    @keyframes entrar { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  `,
})
export class Confirmacion {
  protected avisos = inject(Avisos);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    effect(() => {
      const d = this.dialogo().nativeElement;
      if (this.avisos.confirmacion() && !d.open) d.showModal();
      if (!this.avisos.confirmacion() && d.open) d.close();
    });
  }

  responder(si: boolean, evento?: Event): void {
    evento?.preventDefault();
    this.avisos.confirmacion()?.responder(si);
  }
}
