import { HttpErrorResponse } from '@angular/common/http';

/** Mayúscula inicial y punto final, venga el mensaje de donde venga. */
export function enOracion(texto: string): string {
  const t = texto.trim();
  if (!t) return t;
  const conMayuscula = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(conMayuscula) ? conMayuscula : conMayuscula + '.';
}

/** Traduce los errores de la API (formato {error, codigo}) a un mensaje para mostrar. */
export function mensajeDeError(err: unknown, porDefecto = 'Algo salió mal, intenta de nuevo.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
    const cuerpo = err.error as { error?: string; codigo?: string } | null;
    if (cuerpo?.codigo === 'DATOS_INVALIDOS') return 'Revisa los datos: hay campos incompletos o con formato inválido.';
    if (cuerpo?.codigo === 'NO_ENCONTRADO') return 'No encontramos lo que buscas. Puede que ya no exista.';
    if (cuerpo?.error) return enOracion(cuerpo.error);
  }
  return enOracion(porDefecto);
}
