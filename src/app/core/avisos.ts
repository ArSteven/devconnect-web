import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  texto: string;
  tipo: 'exito' | 'error' | 'info';
}

export interface PeticionConfirmacion {
  titulo: string;
  texto: string;
  aceptar: string;
  cancelar?: string;
  peligro?: boolean; // el botón de aceptar en coral: la acción no se puede deshacer
}

/**
 * Avisos de la app: toasts (mensajes que desaparecen solos) y el diálogo de confirmación.
 * Los componentes que los pintan viven una sola vez en App.
 */
@Injectable({ providedIn: 'root' })
export class Avisos {
  private siguiente = 1;
  readonly toasts = signal<Toast[]>([]);
  readonly confirmacion = signal<(PeticionConfirmacion & { responder: (si: boolean) => void }) | null>(null);

  exito(texto: string): void {
    this.mostrar(texto, 'exito');
  }

  error(texto: string): void {
    this.mostrar(texto, 'error');
  }

  info(texto: string): void {
    this.mostrar(texto, 'info');
  }

  cerrar(id: number): void {
    this.toasts.update(lista => lista.filter(t => t.id !== id));
  }

  /** Abre el diálogo y resuelve con true si la persona acepta. */
  confirmar(peticion: PeticionConfirmacion): Promise<boolean> {
    return new Promise(resolver => {
      this.confirmacion()?.responder(false);
      this.confirmacion.set({
        ...peticion,
        responder: si => {
          this.confirmacion.set(null);
          resolver(si);
        },
      });
    });
  }

  private mostrar(texto: string, tipo: Toast['tipo']): void {
    const id = this.siguiente++;
    this.toasts.update(lista => [...lista.slice(-2), { id, texto, tipo }]);
    setTimeout(() => this.cerrar(id), tipo === 'error' ? 6000 : 4000);
  }
}
