import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

const SANGRIA = '    ';

/** Saltos de línea de cualquier origen (Windows, Mac antiguo o separadores Unicode) como \n. */
const normalizarSaltos = (texto: string) => texto.replace(/\r\n?|[\u2028\u2029]/g, '\n');

/**
 * En los campos de código, Tab inserta sangría y Mayús+Tab la quita, como en un editor.
 * Para no atrapar a quien navega con teclado: Esc y luego Tab sale del campo.
 *
 * El valor del formulario es siempre el texto que se ve en el campo: se toma al escribir, al pegar,
 * al salir del campo y justo antes de enviar. Así cuenta también el texto que llega sin eventos de
 * escritura (un gestor de portapapeles, una extensión o una herramienta de automatización).
 */
@Directive({
  selector: 'textarea[appCampoCodigo]',
  host: {
    '(keydown)': 'tecla($event)',
    '(paste)': 'pegar($event)',
    '(change)': 'sincronizar()',
    '(blur)': 'salir = false; sincronizar()',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
  },
})
export class CampoCodigo {
  private campo = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
  private control = inject(NgControl, { self: true, optional: true });
  protected salir = false;

  constructor() {
    // En captura y sobre document: corre antes que el (ngSubmit) del formulario, en cualquier navegador.
    const alEnviar = (e: Event) => {
      if (e.target instanceof Node && e.target.contains(this.campo)) this.sincronizar();
    };
    document.addEventListener('submit', alEnviar, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('submit', alEnviar, true));
  }

  /** Pega el texto plano con sus saltos de línea y sangrías; los espacios duros de páginas web pasan a espacios. */
  pegar(e: ClipboardEvent): void {
    const texto = e.clipboardData?.getData('text/plain');
    if (!texto) return; // sin texto (una imagen, por ejemplo): decide el navegador
    e.preventDefault();
    escribir(this.campo, this.campo.selectionStart, this.campo.selectionEnd, normalizarSaltos(texto).replace(/\u00a0/g, ' '));
    this.sincronizar();
  }

  sincronizar(): void {
    const control = this.control?.control;
    const valor = normalizarSaltos(this.campo.value);
    if (!control || control.value === valor) return;
    // Sin devolverlo al campo: reescribirlo movería el cursor de quien está escribiendo.
    control.setValue(valor, { emitModelToViewChange: false });
    control.markAsDirty();
  }

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
