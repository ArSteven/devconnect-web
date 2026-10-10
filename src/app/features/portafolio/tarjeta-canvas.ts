/**
 * Tarjeta de talento dibujada en un canvas, con la identidad de DevConnect: papel cuadriculado,
 * bordes negros, sombra desplazada, azul y coral. No usa capturas del DOM: todo se dibuja aquí.
 */

export type Formato = 'historia' | 'publicacion';

export const FORMATOS: Record<Formato, { ancho: number; alto: number; nombre: string }> = {
  historia: { ancho: 1080, alto: 1920, nombre: 'Historia' },
  publicacion: { ancho: 1200, alto: 1200, nombre: 'Publicación' },
};

export interface ContenidoTarjeta {
  nombre: string;
  titular: string;
  formacion: string; // "Unidades Tecnológicas de Santander · 5.º semestre"
  cifras: { valor: string; etiqueta: string }[]; // ya sin las que valen cero
  lenguajes: { nombre: string; logo: HTMLImageElement | null }[]; // hasta 4
  mejora: { titulo: string; filas: { tipo: 'igual' | 'agregada' | 'eliminada'; texto: string }[] } | null;
  qr: { tamano: number; oscuro: (fila: number, columna: number) => boolean };
}

const C = {
  papel: '#F3F1EA', linea: '#E3DFD3', tinta: '#141414', tenue: '#5E5A50', texto: '#3D3B36', blanco: '#FFFDF8',
  azul: '#2F4BFF', coral: '#FF5A36', coralFondo: '#FFE3D9', verde: '#7EE2B8', verdeFondo: '#16241C',
  rojo: '#FF8A6E', rojoFondo: '#2A1712', editor: '#141414', editorTexto: '#E8E6E1',
};
const FUENTE = '"JetBrains Mono", ui-monospace, monospace';
const fuente = (peso: number, tam: number) => `${peso} ${tam}px ${FUENTE}`;

/** Un bloque de la tarjeta: se mide primero y se dibuja después, cuando ya se sabe dónde va. */
interface Bloque {
  alto: number;
  dibujar: (y: number) => void;
}

export function dibujarTarjeta(lienzo: HTMLCanvasElement, c: ContenidoTarjeta, formato: Formato): void {
  const { ancho: W, alto: H } = FORMATOS[formato];
  lienzo.width = W;
  lienzo.height = H;
  const ctx = lienzo.getContext('2d')!;
  fondo(ctx, W, H);

  // Se prueba a escala completa y, si no cabe, se reduce de a poco.
  for (let e = formato === 'historia' ? 1 : 0.8; e >= 0.5; e -= 0.05) {
    if (formato === 'historia') {
      const m = 80;
      const bloques = bloquesHistoria(ctx, c, m, W - 2 * m, e);
      if (apilar(bloques, m, H - m, 30 * e, 90 * e)) return;
    } else {
      const m = 64;
      const columna = (W - 2 * m - 56) / 2;
      const izquierda = [encabezado(ctx, m, columna, e), identidad(ctx, c, m, columna, e), cifras(ctx, c, m, columna, e)];
      const derecha = [lenguajes(ctx, c, m + columna + 56, columna, e), mejora(ctx, c, m + columna + 56, columna, e), cierre(ctx, c, m + columna + 56, columna, e)]
        .filter((b): b is Bloque => !!b);
      const cabe = (lista: Bloque[]) => total(lista) + 28 * e * (lista.length - 1) <= H - 2 * m;
      if (cabe(izquierda) && cabe(derecha)) {
        apilar(izquierda, m, H - m, 28 * e, 80 * e);
        apilar(derecha, m, H - m, 28 * e, 80 * e);
        return;
      }
    }
  }
}

function bloquesHistoria(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque[] {
  return [encabezado(ctx, x, w, e), identidad(ctx, c, x, w, e), cifras(ctx, c, x, w, e), lenguajes(ctx, c, x, w, e), mejora(ctx, c, x, w, e), cierre(ctx, c, x, w, e)]
    .filter((b): b is Bloque => !!b);
}

const total = (bloques: Bloque[]) => bloques.reduce((s, b) => s + b.alto, 0);

/** Reparte el espacio libre entre los bloques; si sobra mucho, la pila queda centrada. Devuelve false si no cabe. */
function apilar(bloques: Bloque[], arriba: number, abajo: number, minimo: number, maximo: number): boolean {
  const libre = abajo - arriba - total(bloques);
  const huecos = Math.max(1, bloques.length - 1);
  if (libre < minimo * huecos) return false;
  const hueco = Math.min(maximo, libre / huecos);
  let y = arriba + (libre - hueco * huecos) / 2;
  for (const b of bloques) {
    b.dibujar(y);
    y += b.alto + hueco;
  }
  return true;
}

// ── Piezas de dibujo ─────────────────────────────────────────────────────────

function fondo(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.fillStyle = C.papel;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.linea;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 54) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = 0; y <= H; y += 54) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

/** Tarjeta blanca con borde negro y sombra desplazada, como las del sitio. */
function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number,
  { relleno = C.blanco, borde = C.tinta, sombra = C.tinta as string | null, radio = 14 } = {}): void {
  const d = 10 * e;
  if (sombra) {
    ctx.fillStyle = sombra;
    ctx.beginPath();
    ctx.roundRect(x + d, y + d, w, h, radio * e);
    ctx.fill();
  }
  ctx.fillStyle = relleno;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radio * e);
  ctx.fill();
  ctx.lineWidth = 4 * e;
  ctx.strokeStyle = borde;
  ctx.stroke();
}

/** Texto en una línea: `arriba` es el borde superior de la línea; la base se calcula con la altura de la fuente. */
function texto(ctx: CanvasRenderingContext2D, t: string, x: number, arriba: number, tam: number, alturaLinea: number, color: string, peso = 400): void {
  ctx.font = fuente(peso, tam);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(t, x, arriba + (alturaLinea - tam) / 2 + tam * 0.8);
}

/** Corta un texto a lo ancho, palabra por palabra, en `max` líneas como mucho (con … al final). */
function partir(ctx: CanvasRenderingContext2D, t: string, ancho: number, max: number): string[] {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of t.trim().split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (!actual || ctx.measureText(prueba).width <= ancho) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  const visibles = lineas.length > max ? [...lineas.slice(0, max - 1), lineas.slice(max - 1).join(' ')] : lineas;
  return visibles.map(l => recortar(ctx, l, ancho));
}

function recortar(ctx: CanvasRenderingContext2D, t: string, ancho: number): string {
  if (ctx.measureText(t).width <= ancho) return t;
  let corto = t;
  while (corto.length > 1 && ctx.measureText(`${corto}…`).width > ancho) corto = corto.slice(0, -1);
  return `${corto.trimEnd()}…`;
}

function espaciado(ctx: CanvasRenderingContext2D, px: number): void {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

/** [D]evconnect: la D del logo es la primera letra, del alto de una mayúscula. */
function logotipo(ctx: CanvasRenderingContext2D, x: number, base: number, tam: number): void {
  const mayuscula = tam * 0.73;
  const s = mayuscula / 33;
  ctx.save();
  ctx.translate(x - 6 * s, base - mayuscula - 3.5 * s);
  ctx.scale(s, s);
  ctx.fillStyle = C.azul;
  ctx.beginPath();
  ctx.roundRect(6, 6, 5, 28, 1);
  ctx.fill();
  ctx.strokeStyle = C.coral;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(17, 6);
  ctx.bezierCurveTo(35, 6, 35, 34, 17, 34);
  ctx.stroke();
  ctx.restore();
  ctx.font = fuente(800, tam);
  ctx.fillStyle = C.tinta;
  ctx.textBaseline = 'alphabetic';
  espaciado(ctx, -0.03 * tam);
  ctx.fillText('evconnect', x + 27 * s, base);
  espaciado(ctx, 0);
}

// ── Bloques ──────────────────────────────────────────────────────────────────

/** Logo y eslogan: "De hola mundo / a tu primer empleo.", con el resaltado azul de la portada. */
function encabezado(ctx: CanvasRenderingContext2D, x: number, w: number, e: number): Bloque {
  const tamLogo = 58 * e;
  const tam = Math.min(54 * e, w / 13);
  const lh = tam * 1.3;
  return {
    alto: tamLogo + 30 * e + lh * 2,
    dibujar: y => {
      logotipo(ctx, x, y + tamLogo * 0.9, tamLogo);
      const y1 = y + tamLogo + 30 * e;
      ctx.font = fuente(800, tam);
      espaciado(ctx, -0.04 * tam);
      texto(ctx, 'De ', x, y1, tam, lh, C.tinta, 800);
      const ancho = ctx.measureText('De ').width;
      texto(ctx, 'hola mundo', x + ancho, y1, tam, lh, C.azul, 500);
      const segunda = 'a tu primer empleo.';
      ctx.font = fuente(800, tam);
      const w2 = ctx.measureText(segunda).width;
      ctx.fillStyle = C.azul;
      ctx.fillRect(x - 0.12 * tam, y1 + lh + 0.08 * tam, w2 + 0.24 * tam, lh - 0.16 * tam);
      texto(ctx, segunda, x, y1 + lh, tam, lh, C.papel, 800);
      espaciado(ctx, 0);
    },
  };
}

/** Quién es: nombre, titular y formación. */
function identidad(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque {
  const pad = 40 * e;
  const interior = w - 10 * e - 2 * pad;
  const tamNombre = 60 * e;
  const tamTitular = 30 * e;
  const tamFormacion = 26 * e;
  ctx.font = fuente(800, tamNombre);
  const nombre = partir(ctx, c.nombre, interior, 2);
  ctx.font = fuente(400, tamTitular);
  const titular = c.titular ? partir(ctx, c.titular, interior, 2) : [];
  ctx.font = fuente(700, tamFormacion);
  const formacion = c.formacion ? partir(ctx, c.formacion, interior, 2) : [];
  const alto = 2 * pad + nombre.length * tamNombre * 1.15
    + (titular.length ? 14 * e + titular.length * tamTitular * 1.45 : 0)
    + (formacion.length ? 14 * e + formacion.length * tamFormacion * 1.45 : 0);
  return {
    alto: alto + 10 * e,
    dibujar: y => {
      caja(ctx, x, y, w - 10 * e, alto, e);
      let t = y + pad;
      espaciado(ctx, -0.03 * tamNombre);
      for (const l of nombre) {
        texto(ctx, l, x + pad, t, tamNombre, tamNombre * 1.15, C.tinta, 800);
        t += tamNombre * 1.15;
      }
      espaciado(ctx, 0);
      if (titular.length) t += 14 * e;
      for (const l of titular) {
        texto(ctx, l, x + pad, t, tamTitular, tamTitular * 1.45, C.texto);
        t += tamTitular * 1.45;
      }
      if (formacion.length) t += 14 * e;
      for (const l of formacion) {
        texto(ctx, l, x + pad, t, tamFormacion, tamFormacion * 1.45, C.azul, 700);
        t += tamFormacion * 1.45;
      }
    },
  };
}

/** Las cifras grandes; si todas valen cero, un mensaje de comienzo. */
function cifras(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque {
  const ancho = w - 10 * e;
  if (!c.cifras.length) {
    const tam = 40 * e;
    const pad = 36 * e;
    ctx.font = fuente(800, tam);
    const lineas = partir(ctx, 'Empezando mi camino en DevConnect', ancho - 2 * pad, 3);
    const alto = 2 * pad + lineas.length * tam * 1.3;
    return {
      alto: alto + 10 * e,
      dibujar: y => {
        caja(ctx, x, y, ancho, alto, e, { relleno: C.coralFondo });
        lineas.forEach((l, i) => texto(ctx, l, x + pad, y + pad + i * tam * 1.3, tam, tam * 1.3, C.tinta, 800));
      },
    };
  }
  const columnas = c.cifras.length === 1 ? 1 : 2;
  const hueco = 24 * e;
  const celda = (ancho - hueco * (columnas - 1)) / columnas;
  const pad = 26 * e;
  const tamEtiqueta = 25 * e;
  ctx.font = fuente(700, tamEtiqueta);
  const etiquetas = c.cifras.map(x => partir(ctx, x.etiqueta, celda - 2 * pad, 2));
  const lineasEtiqueta = Math.max(...etiquetas.map(l => l.length));
  const tamNumero = (valor: string, ancho: number) => Math.min(96 * e, (ancho - 2 * pad) / (valor.length * 0.62));
  const altoCelda = 2 * pad + 96 * e + 10 * e + lineasEtiqueta * tamEtiqueta * 1.35;
  const filas = Math.ceil(c.cifras.length / columnas);
  return {
    alto: filas * altoCelda + (filas - 1) * hueco + 10 * e,
    dibujar: y => {
      c.cifras.forEach((cifra, i) => {
        const fila = Math.floor(i / columnas);
        const col = i % columnas;
        // Con un número impar de cifras, la última ocupa todo el ancho.
        const sola = i === c.cifras.length - 1 && c.cifras.length % 2 === 1 && columnas === 2;
        const cx = x + col * (celda + hueco);
        const cw = sola ? ancho : celda;
        const cy = y + fila * (altoCelda + hueco);
        caja(ctx, cx, cy, cw, altoCelda, e, { sombra: C.tinta, radio: 12 });
        const tam = tamNumero(cifra.valor, cw);
        espaciado(ctx, -0.04 * tam);
        texto(ctx, cifra.valor, cx + pad, cy + pad, tam, 96 * e, i === 0 ? C.azul : C.tinta, 800);
        espaciado(ctx, 0);
        ctx.font = fuente(700, tamEtiqueta); // se mide con la fuente de la etiqueta, no con la del número
        const lineas = sola ? partir(ctx, cifra.etiqueta, cw - 2 * pad, 2) : etiquetas[i];
        lineas.forEach((l, j) => texto(ctx, l, cx + pad, cy + pad + 106 * e + j * tamEtiqueta * 1.35, tamEtiqueta, tamEtiqueta * 1.35, C.tenue, 700));
      });
    },
  };
}

/** Hasta 4 lenguajes con su logo, según la actividad real. */
function lenguajes(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque | null {
  if (!c.lenguajes.length) return null;
  const tamRotulo = 24 * e;
  const alto = 72 * e;
  const logo = 40 * e;
  const tam = 28 * e;
  const hueco = 16 * e;
  ctx.font = fuente(700, tam);
  // Fichas en filas: cada una mide su logo y su nombre.
  const fichas = c.lenguajes.map(l => ({ ...l, ancho: 26 * e * 2 + (l.logo ? logo + 14 * e : 0) + ctx.measureText(l.nombre).width }));
  const filas: (typeof fichas)[] = [[]];
  let usado = 0;
  for (const f of fichas) {
    const ancho = Math.min(f.ancho, w - 6 * e);
    if (usado && usado + ancho > w - 6 * e) {
      filas.push([]);
      usado = 0;
    }
    filas[filas.length - 1].push({ ...f, ancho });
    usado += ancho + hueco;
  }
  return {
    alto: tamRotulo * 1.4 + 14 * e + filas.length * alto + (filas.length - 1) * hueco + 6 * e,
    dibujar: y => {
      texto(ctx, 'Lenguajes con evidencia', x, y, tamRotulo, tamRotulo * 1.4, C.tenue, 700);
      let fy = y + tamRotulo * 1.4 + 14 * e;
      for (const fila of filas) {
        let fx = x;
        for (const f of fila) {
          ctx.fillStyle = C.tinta;
          ctx.beginPath();
          ctx.roundRect(fx + 5 * e, fy + 5 * e, f.ancho, alto, alto / 2);
          ctx.fill();
          ctx.fillStyle = C.blanco;
          ctx.beginPath();
          ctx.roundRect(fx, fy, f.ancho, alto, alto / 2);
          ctx.fill();
          ctx.lineWidth = 3 * e;
          ctx.strokeStyle = C.tinta;
          ctx.stroke();
          let tx = fx + 26 * e;
          if (f.logo) {
            ctx.drawImage(f.logo, tx, fy + (alto - logo) / 2, logo, logo);
            tx += logo + 14 * e;
          }
          ctx.font = fuente(700, tam);
          texto(ctx, recortar(ctx, f.nombre, f.ancho - (tx - fx) - 20 * e), tx, fy, tam, alto, C.tinta, 700);
          fx += f.ancho + hueco;
        }
        fy += alto + hueco;
      }
    },
  };
}

/** La mejora más destacada: su título y unas líneas del diff, en el editor oscuro. */
function mejora(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque | null {
  if (!c.mejora || !c.mejora.filas.length) return null;
  const m = c.mejora;
  const tamRotulo = 24 * e;
  const tamTitulo = 32 * e;
  const tamCodigo = 25 * e;
  const filaAlto = 42 * e;
  const pad = 20 * e;
  const ancho = w - 10 * e;
  ctx.font = fuente(800, tamTitulo);
  const titulo = partir(ctx, `«${m.titulo}»`, ancho, 2);
  const altoEditor = 2 * pad + m.filas.length * filaAlto;
  const arribaEditor = tamRotulo * 1.4 + 10 * e + titulo.length * tamTitulo * 1.3 + 16 * e;
  return {
    alto: arribaEditor + altoEditor + 10 * e,
    dibujar: y => {
      texto(ctx, 'Mejora destacada', x, y, tamRotulo, tamRotulo * 1.4, C.tenue, 700);
      titulo.forEach((l, i) => texto(ctx, l, x, y + tamRotulo * 1.4 + 10 * e + i * tamTitulo * 1.3, tamTitulo, tamTitulo * 1.3, C.tinta, 800));
      const ey = y + arribaEditor;
      caja(ctx, x, ey, ancho, altoEditor, e, { relleno: C.editor, radio: 14 });
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x + 2 * e, ey + 2 * e, ancho - 4 * e, altoEditor - 4 * e, 12 * e);
      ctx.clip();
      m.filas.forEach((f, i) => {
        const fy = ey + pad + i * filaAlto;
        const colores = f.tipo === 'agregada' ? { fondo: C.verdeFondo, texto: C.verde, signo: '+' }
          : f.tipo === 'eliminada' ? { fondo: C.rojoFondo, texto: C.rojo, signo: '−' }
          : { fondo: null, texto: C.editorTexto, signo: ' ' };
        if (colores.fondo) {
          ctx.fillStyle = colores.fondo;
          ctx.fillRect(x, fy, ancho, filaAlto);
        }
        texto(ctx, colores.signo, x + 22 * e, fy, tamCodigo, filaAlto, colores.texto, 700);
        ctx.font = fuente(400, tamCodigo);
        const linea = recortar(ctx, f.texto.replace(/\t/g, '    ') || ' ', ancho - 90 * e);
        texto(ctx, linea, x + 60 * e, fy, tamCodigo, filaAlto, colores.texto);
        if (f.tipo === 'eliminada') {
          ctx.strokeStyle = 'rgba(255, 138, 110, .6)';
          ctx.lineWidth = 2 * e;
          ctx.beginPath();
          ctx.moveTo(x + 60 * e, fy + filaAlto / 2);
          ctx.lineTo(x + 60 * e + ctx.measureText(linea).width, fy + filaAlto / 2);
          ctx.stroke();
        }
      });
      ctx.restore();
    },
  };
}

/** El código QR al portafolio y las notas de cierre. */
function cierre(ctx: CanvasRenderingContext2D, c: ContenidoTarjeta, x: number, w: number, e: number): Bloque {
  const lado = 240 * e;
  const tam = 34 * e;
  const tamNota = 22 * e;
  const anchoTexto = w - lado - 10 * e - 40 * e;
  ctx.font = fuente(800, tam);
  const llamado = partir(ctx, 'Mira mi portafolio verificado', anchoTexto, 3);
  ctx.font = fuente(400, tamNota);
  const nota = partir(ctx, 'Datos verificados por la actividad en DevConnect', anchoTexto, 3);
  const altoTexto = llamado.length * tam * 1.3 + 18 * e + nota.length * tamNota * 1.5;
  return {
    alto: Math.max(lado + 10 * e, altoTexto),
    dibujar: y => {
      caja(ctx, x, y, lado, lado, e, { radio: 10 });
      const modulos = c.qr.tamano + 6; // margen blanco de tres módulos por lado: los lectores lo necesitan
      const celda = (lado - 8 * e) / modulos;
      ctx.fillStyle = C.tinta;
      for (let f = 0; f < c.qr.tamano; f++) {
        for (let col = 0; col < c.qr.tamano; col++) {
          if (c.qr.oscuro(f, col)) ctx.fillRect(x + 4 * e + (col + 3) * celda, y + 4 * e + (f + 3) * celda, Math.ceil(celda), Math.ceil(celda));
        }
      }
      const tx = x + lado + 10 * e + 40 * e;
      let ty = y + Math.max(0, (lado - altoTexto) / 2);
      for (const l of llamado) {
        texto(ctx, l, tx, ty, tam, tam * 1.3, C.tinta, 800);
        ty += tam * 1.3;
      }
      ty += 18 * e;
      for (const l of nota) {
        texto(ctx, l, tx, ty, tamNota, tamNota * 1.5, C.tenue);
        ty += tamNota * 1.5;
      }
    },
  };
}
