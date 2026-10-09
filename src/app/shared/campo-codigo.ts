import { Directive } from '@angular/core';

const SANGRIA = '    ';

/**
 * En los campos de código, Tab inserta sangría y Mayús+Tab la quita, como en un editor.
 * Para no atrapar a quien navega con teclado: Esc y luego Tab sale del campo.
 */
@Directive({
  selector: 'textarea[appCampoCodigo]',
  host: {
    '(keydown)': 'tecla($event)',
    '(blur)': 'salir = false',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
  },
})
export class CampoCodigo {
  protected salir = false;

  tecla(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.salir = true;
      return;
    }
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) {
      if (e.key !== 'Shift') this.salir = false;
      return;
    }
    if (this.salir) {
      this.salir = false; // este Tab mueve el foco normalmente
      return;
    }
    e.preventDefault();
    const campo = e.target as HTMLTextAreaElement;
    const { selectionStart: inicio, selectionEnd: fin, value } = campo;

    // Sin selección de varias líneas: Tab escribe la sangría donde está el cursor.
    if (!e.shiftKey && !value.slice(inicio, fin).includes('\n')) {
      escribir(campo, inicio, fin, SANGRIA);
      return;
    }

    // Con varias líneas (o Mayús+Tab): se mueve el bloque completo.
    const desde = value.lastIndexOf('\n', inicio - 1) + 1;
    const bloque = value.slice(desde, fin);
    const nuevo = e.shiftKey
      ? bloque.replace(/^( {1,4}|\t)/gm, '')
      : bloque.replace(/^/gm, SANGRIA);
    escribir(campo, desde, fin, nuevo);
    campo.setSelectionRange(desde, desde + nuevo.length);
  }
}

/** Reemplaza un tramo del texto conservando el historial de deshacer cuando el navegador lo permite. */
function escribir(campo: HTMLTextAreaElement, inicio: number, fin: number, texto: string): void {
  campo.setSelectionRange(inicio, fin);
  // execCommand mantiene Ctrl+Z; si el navegador ya no lo soporta, se usa setRangeText.
  if (!document.execCommand?.('insertText', false, texto)) {
    campo.setRangeText(texto, inicio, fin, 'end');
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
