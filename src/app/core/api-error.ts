import { HttpErrorResponse } from '@angular/common/http';

/** Traduce los errores de la API (formato {error, codigo}) a un mensaje para mostrar. */
export function mensajeDeError(err: unknown, porDefecto = 'algo salió mal, intenta de nuevo'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'no hay conexión con el servidor';
    const cuerpo = err.error as { error?: string; codigo?: string } | null;
    if (cuerpo?.codigo === 'DATOS_INVALIDOS') return 'revisa los datos: hay campos incompletos o con formato inválido';
    if (cuerpo?.error) return cuerpo.error;
  }
  return porDefecto;
}
