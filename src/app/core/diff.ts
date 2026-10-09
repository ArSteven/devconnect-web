/** Una línea del diff: igual en los dos, agregada en la propuesta o eliminada del original. */
export interface LineaDiff {
  tipo: 'igual' | 'agregada' | 'eliminada';
  original?: number; // índice en el código original (0 en adelante)
  propuesta?: number; // índice en la propuesta
}

/** Bloque de líneas iguales que se esconde para que se vea solo lo que cambió. */
export interface TramoOculto {
  tipo: 'oculto';
  cantidad: number;
  lineas: LineaDiff[];
}

// Por encima de este tamaño la tabla de comparación ocuparía demasiada memoria.
const MAXIMO_CELDAS = 4_000_000;

/**
 * Diff por líneas con la subsecuencia común más larga (LCS). Primero recorta lo que
 * coincide al principio y al final, que en una propuesta típica es casi todo el código.
 */
export function diffLineas(a: string[], b: string[]): LineaDiff[] {
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let finA = a.length;
  let finB = b.length;
  while (finA > inicio && finB > inicio && a[finA - 1] === b[finB - 1]) {
    finA--;
    finB--;
  }

  const resultado: LineaDiff[] = [];
  for (let i = 0; i < inicio; i++) resultado.push({ tipo: 'igual', original: i, propuesta: i });

  const n = finA - inicio;
  const m = finB - inicio;
  if (n * m > MAXIMO_CELDAS) {
    for (let i = inicio; i < finA; i++) resultado.push({ tipo: 'eliminada', original: i });
    for (let j = inicio; j < finB; j++) resultado.push({ tipo: 'agregada', propuesta: j });
  } else {
    // lcs[i][j] = largo de la LCS entre a[inicio+i..finA) y b[inicio+j..finB)
    const ancho = m + 1;
    const lcs = new Uint32Array((n + 1) * ancho);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * ancho + j] = a[inicio + i] === b[inicio + j]
          ? lcs[(i + 1) * ancho + j + 1] + 1
          : Math.max(lcs[(i + 1) * ancho + j], lcs[i * ancho + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[inicio + i] === b[inicio + j]) {
        resultado.push({ tipo: 'igual', original: inicio + i, propuesta: inicio + j });
        i++;
        j++;
      } else if (lcs[(i + 1) * ancho + j] >= lcs[i * ancho + j + 1]) {
        resultado.push({ tipo: 'eliminada', original: inicio + i });
        i++;
      } else {
        resultado.push({ tipo: 'agregada', propuesta: inicio + j });
        j++;
      }
    }
    for (; i < n; i++) resultado.push({ tipo: 'eliminada', original: inicio + i });
    for (; j < m; j++) resultado.push({ tipo: 'agregada', propuesta: inicio + j });
  }

  for (let k = 0; finA + k < a.length; k++) resultado.push({ tipo: 'igual', original: finA + k, propuesta: finB + k });
  return resultado;
}

/** Deja `contexto` líneas iguales alrededor de cada cambio y agrupa el resto en tramos ocultos. */
export function conContexto(diff: LineaDiff[], contexto = 3): (LineaDiff | TramoOculto)[] {
  const cerca = diff.map(() => false);
  diff.forEach((l, k) => {
    if (l.tipo === 'igual') return;
    for (let d = Math.max(0, k - contexto); d <= Math.min(diff.length - 1, k + contexto); d++) cerca[d] = true;
  });
  const salida: (LineaDiff | TramoOculto)[] = [];
  let oculto: LineaDiff[] = [];
  const cerrar = () => {
    if (oculto.length === 0) return;
    // Esconder una o dos líneas no ahorra nada: se muestran.
    if (oculto.length <= 2) salida.push(...oculto);
    else salida.push({ tipo: 'oculto', cantidad: oculto.length, lineas: oculto });
    oculto = [];
  };
  diff.forEach((l, k) => {
    if (l.tipo === 'igual' && !cerca[k]) {
      oculto.push(l);
    } else {
      cerrar();
      salida.push(l);
    }
  });
  cerrar();
  return salida;
}
