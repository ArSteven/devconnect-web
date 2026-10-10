import { diffLineas } from './diff';
import { DetallePublicacion } from './modelos';

export type EstadoRama = 'pendiente' | 'aceptada' | 'rechazada';

/**
 * Un nodo del árbol de evolución del código. Hoy hay un solo nivel: la versión original como raíz,
 * una rama por propuesta y, al final de la aceptada, la versión actual. Cada nodo admite hijos:
 * cuando se puedan proponer mejoras sobre una mejora, el árbol crecerá sin cambiar el componente.
 */
export interface NodoEvolucion {
  id: string;
  tipo: 'original' | 'propuesta' | 'actual';
  persona: { id: string; nombre: string; github: string };
  fecha: string | null;
  estado?: EstadoRama;
  agregadas?: number;
  quitadas?: number;
  explicacion?: string;
  /** Qué se muestra en la página al elegir el nodo: 'original' o el id de una propuesta. */
  destino: string;
  hijos: NodoEvolucion[];
}

const lineas = (codigo: string) => {
  const c = codigo.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  return c ? c.split('\n') : [];
};

/** Arma el árbol con lo que el detalle ya trae: el código original y sus propuestas por fecha. */
export function arbolEvolucion(p: DetallePublicacion): NodoEvolucion {
  const original = lineas(p.codigo);
  const propuestas = [...p.propuestas].sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en));
  const vigente = [...propuestas].reverse().find(x => x.estado === 'aceptada');
  return {
    id: 'original',
    tipo: 'original',
    persona: { id: p.autor_id, nombre: p.autor_nombre, github: p.autor_github },
    fecha: p.creado_en,
    destino: 'original',
    hijos: propuestas.map(pr => {
      const diff = diffLineas(original, lineas(pr.codigo));
      const persona = { id: pr.autor_id, nombre: pr.autor_nombre, github: pr.autor_github };
      return {
        id: pr.id,
        tipo: 'propuesta' as const,
        persona,
        fecha: pr.creado_en,
        estado: pr.estado,
        agregadas: diff.filter(l => l.tipo === 'agregada').length,
        quitadas: diff.filter(l => l.tipo === 'eliminada').length,
        explicacion: pr.explicacion,
        destino: pr.id,
        hijos: pr === vigente ? [{ id: `actual-${pr.id}`, tipo: 'actual' as const, persona, fecha: null, destino: pr.id, hijos: [] }] : [],
      };
    }),
  };
}

export interface NodoDispuesto {
  nodo: NodoEvolucion;
  x: number;
  y: number;
  ancho: number;
  profundidad: number;
}

export interface RamaDispuesta {
  id: string;
  d: string; // camino SVG
  estado: EstadoRama | 'actual' | 'tronco';
}

export interface Disposicion {
  nodos: NodoDispuesto[]; // en orden de lectura: la raíz y luego cada rama
  ramas: RamaDispuesta[];
  ancho: number;
  alto: number;
  vertical: boolean;
}

/** Medidas en px. En horizontal cada nivel es una columna; en vertical, una sangría. */
export const MEDIDAS = {
  horizontal: { ancho: 236, alto: 66, fila: 86, columna: 296 },
  vertical: { alto: 62, fila: 78, sangria: 34, eje: 21 }, // eje: centro del avatar desde el borde del nodo
};

/**
 * Ubica los nodos y traza las ramas. Si el árbol no cabe a lo ancho (celular), pasa a vertical:
 * una lista con sangría por nivel, unida por un tronco a la izquierda.
 */
export function disponer(raiz: NodoEvolucion, anchoDisponible: number): Disposicion {
  const profundidad = (n: NodoEvolucion): number => (n.hijos.length ? 1 + Math.max(...n.hijos.map(profundidad)) : 0);
  const H = MEDIDAS.horizontal;
  const requerido = profundidad(raiz) * H.columna + H.ancho;
  return anchoDisponible >= requerido ? horizontal(raiz, requerido) : vertical(raiz, anchoDisponible);
}

function horizontal(raiz: NodoEvolucion, ancho: number): Disposicion {
  const H = MEDIDAS.horizontal;
  const y = new Map<string, number>();
  let fila = 0;
  // Las hojas ocupan una fila cada una; un nodo con hijos queda centrado frente a ellos.
  const ubicar = (n: NodoEvolucion): number => {
    const posicion = n.hijos.length
      ? (() => {
          const ys = n.hijos.map(ubicar);
          return (ys[0] + ys[ys.length - 1]) / 2;
        })()
      : fila++ * H.fila;
    y.set(n.id, posicion);
    return posicion;
  };
  ubicar(raiz);

  const nodos: NodoDispuesto[] = [];
  const ramas: RamaDispuesta[] = [];
  const recorrer = (n: NodoEvolucion, prof: number) => {
    const x = prof * H.columna;
    nodos.push({ nodo: n, x, y: y.get(n.id)!, ancho: H.ancho, profundidad: prof });
    for (const h of n.hijos) {
      const x1 = x + H.ancho;
      const y1 = y.get(n.id)! + H.alto / 2;
      const x2 = (prof + 1) * H.columna;
      const y2 = y.get(h.id)! + H.alto / 2;
      const medio = (x1 + x2) / 2;
      ramas.push({ id: h.id, d: `M ${x1} ${y1} C ${medio} ${y1}, ${medio} ${y2}, ${x2} ${y2}`, estado: estadoDe(h) });
      recorrer(h, prof + 1);
    }
  };
  recorrer(raiz, 0);
  return { nodos, ramas, ancho, alto: Math.max(0, fila - 1) * H.fila + H.alto, vertical: false };
}

function vertical(raiz: NodoEvolucion, ancho: number): Disposicion {
  const V = MEDIDAS.vertical;
  const nodos: NodoDispuesto[] = [];
  const ramas: RamaDispuesta[] = [];
  const troncos: RamaDispuesta[] = []; // se dibujan primero: las ramas de color quedan encima
  let i = 0;
  const recorrer = (n: NodoEvolucion, prof: number) => {
    const x = prof * V.sangria;
    const y = i++ * V.fila;
    nodos.push({ nodo: n, x, y, ancho: ancho - x, profundidad: prof });
    if (!n.hijos.length) return;
    // Un tronco neutro baja desde el avatar; cada rama sale de él con el color de su estado.
    const eje = x + V.eje;
    let ultimo = y;
    for (const h of n.hijos) {
      const yh = i * V.fila + V.alto / 2;
      ultimo = yh;
      ramas.push({ id: h.id, d: `M ${eje} ${yh - 12} Q ${eje} ${yh}, ${eje + 12} ${yh} H ${x + V.sangria}`, estado: estadoDe(h) });
      recorrer(h, prof + 1);
    }
    troncos.push({ id: `tronco-${n.id}`, d: `M ${eje} ${y + V.alto} V ${ultimo - 12}`, estado: 'tronco' });
  };
  recorrer(raiz, 0);
  return { nodos, ramas: [...troncos, ...ramas], ancho, alto: Math.max(0, i - 1) * V.fila + V.alto, vertical: true };
}

const estadoDe = (n: NodoEvolucion): RamaDispuesta['estado'] => (n.tipo === 'actual' ? 'actual' : (n.estado ?? 'pendiente'));
