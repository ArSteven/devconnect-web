import { LineaDiff, conContexto, diffLineas } from './diff';
import { Ventana } from './modelos';
import { resaltarLineas } from './resaltado';

/** Una fila del editor: número de línea, código resaltado y si la línea se agregó o se quitó. */
export interface FilaEditor {
  n: number | null; // null en las líneas quitadas: ya no existen en el código mejorado
  html: string;
  texto: string; // la misma línea sin resaltar (para dibujarla en un canvas)
  tipo: 'igual' | 'agregada' | 'eliminada';
}

// Igual que el diff de las propuestas: sin \r y sin saltos de línea al final.
const normalizar = (codigo: string) => codigo.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
const partir = (codigo: string) => (codigo ? codigo.split('\n') : []);
const resaltar = (codigo: string, lenguaje: string) => (codigo ? resaltarLineas(codigo, lenguaje) : []);
const esCambio = (l: { tipo: string }) => l.tipo === 'agregada' || l.tipo === 'eliminada';

/** Las primeras `max` líneas de un código, sin marcas. */
export function filasCodigo(codigo: string, lenguaje: string, max: number): FilaEditor[] {
  const texto = partir(normalizar(codigo));
  return resaltar(normalizar(codigo), lenguaje).slice(0, max).map((html, i) => ({ n: i + 1, html, texto: texto[i], tipo: 'igual' }));
}

/** El código mejorado con las líneas que aportó la mejora marcadas: es el diff contra el original. */
export function filasAportes(v: Ventana, lenguaje: string): FilaEditor[] {
  const codigo = normalizar(v.codigo);
  const texto = partir(codigo);
  const aportadas = new Set(
    diffLineas(partir(normalizar(v.original)), texto).filter(l => l.tipo === 'agregada').map(l => l.propuesta),
  );
  return resaltar(codigo, lenguaje).map((html, i) => ({
    n: v.desde_linea + i, html, texto: texto[i], tipo: aportadas.has(i) ? 'agregada' : 'igual',
  }));
}

/**
 * El primer cambio de una mejora como diff corto: una línea de contexto antes y después y como
 * mucho `max` filas. `recortado` avisa que la mejora cambió más de lo que se ve.
 */
export function filasCambio(v: Ventana, lenguaje: string, max = 6): { filas: FilaEditor[]; recortado: boolean } {
  const original = normalizar(v.original);
  const codigo = normalizar(v.codigo);
  const a = partir(original);
  const b = partir(codigo);
  const htmlA = resaltar(original, lenguaje);
  const htmlB = resaltar(codigo, lenguaje);
  const items = conContexto(diffLineas(a, b), 1);

  const primero = items.findIndex(esCambio);
  if (primero < 0) return { filas: [], recortado: false };
  let fin = primero > 0 && items[primero - 1].tipo === 'igual' ? primero - 1 : primero;
  const tramo: LineaDiff[] = [];
  for (; fin < items.length && items[fin].tipo !== 'oculto'; fin++) tramo.push(items[fin] as LineaDiff);

  const filas = tramo.slice(0, max).map<FilaEditor>(l =>
    l.tipo === 'eliminada'
      ? { n: null, html: htmlA[l.original!] ?? '', texto: a[l.original!], tipo: 'eliminada' }
      : { n: v.desde_linea + l.propuesta!, html: htmlB[l.propuesta!] ?? '', texto: b[l.propuesta!], tipo: l.tipo },
  );
  return { filas, recortado: tramo.length > max || items.slice(fin).some(esCambio) };
}
