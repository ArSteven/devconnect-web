import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api';
import { mensajeDeError } from './api-error';
import { ResultadoEjecucion, SalidaEjecucion, TablaSql } from './modelos';

/** Lenguajes que «Pruébalo» ejecuta: Go en el Go Playground (vía la API); el resto, en el navegador. */
export const EJECUTABLES = ['javascript', 'typescript', 'python', 'sql', 'go'];
export const ejecutable = (lenguaje: string) => EJECUTABLES.includes(lenguaje);

const MAX_SALIDA = 10_000;
const MAX_TABLAS = 20;
const MAX_FILAS = 200;
const MAX_COLUMNAS = 50;

/** Mientras corre: en qué va («Preparando Python…», «Ejecutando…») y lo que lleva impreso. */
export interface Progreso {
  estado: string;
  salida: SalidaEjecucion[];
}

interface Pendiente {
  estado: string;
  salida: SalidaEjecucion[];
  progreso?: (p: Progreso) => void;
  resolver: (r: ResultadoEjecucion) => void;
}

/**
 * Ejecuta código para «Pruébalo» sin que nada corra en el servidor de DevConnect.
 * JavaScript, TypeScript, Python y SQL van a public/ejecutor.html, un iframe con sandbox="allow-scripts"
 * y sin allow-same-origin: sin origen propio, el código no ve el DOM, las cookies ni la sesión. Un Worker
 * del mismo origen no bastaría: podría pedir /api/v1/auth/refresh con la cookie y leer el token.
 */
@Injectable({ providedIn: 'root' })
export class Ejecutor {
  private api = inject(Api);
  private marco: HTMLIFrameElement | null = null;
  private listo: Promise<void> | null = null;
  private avisarListo: (() => void) | null = null;
  private pendientes = new Map<string, Pendiente>();
  private siguiente = 0;

  constructor() {
    window.addEventListener('message', e => this.alMensaje(e));
  }

  async ejecutar(lenguaje: string, codigo: string, progreso?: (p: Progreso) => void): Promise<ResultadoEjecucion> {
    if (!ejecutable(lenguaje)) return sinEjecutar('Ejecución no disponible para este lenguaje todavía.');
    if (lenguaje === 'go') return this.go(codigo, progreso);
    progreso?.({ estado: 'Preparando…', salida: [] });
    try {
      await this.preparar();
    } catch {
      return sinEjecutar('No se pudo abrir el entorno de ejecución. Recarga la página e intenta de nuevo.');
    }
    const id = `e${++this.siguiente}`;
    return new Promise(resolver => {
      this.pendientes.set(id, { estado: 'Preparando…', salida: [], progreso, resolver });
      this.marco?.contentWindow?.postMessage({ tipo: 'ejecutar', id, lenguaje, codigo }, '*');
    });
  }

  private async go(codigo: string, progreso?: (p: Progreso) => void): Promise<ResultadoEjecucion> {
    progreso?.({ estado: 'Ejecutando en el Go Playground…', salida: [] });
    try {
      return sanear(await firstValueFrom(this.api.ejecutarGo(codigo)));
    } catch (err) {
      return sinEjecutar(mensajeDeError(err, 'No se pudo ejecutar en el Go Playground. Intenta de nuevo.'));
    }
  }

  /** El iframe se crea la primera vez y queda abierto: Python o SQL no se vuelven a descargar. */
  private preparar(): Promise<void> {
    if (this.listo) return this.listo;
    const marco = document.createElement('iframe');
    marco.src = '/ejecutor.html';
    marco.setAttribute('sandbox', 'allow-scripts');
    marco.title = 'Ejecutor de Pruébalo';
    marco.tabIndex = -1;
    marco.setAttribute('aria-hidden', 'true');
    marco.style.display = 'none';
    this.listo = new Promise<void>((resolver, rechazar) => {
      const espera = setTimeout(() => rechazar(new Error('El ejecutor no respondió')), 20_000);
      this.avisarListo = () => {
        clearTimeout(espera);
        resolver();
      };
    });
    this.listo.catch(() => {
      marco.remove();
      this.marco = null;
      this.listo = null;
    });
    this.marco = marco;
    document.body.appendChild(marco);
    return this.listo;
  }

  private alMensaje(e: MessageEvent): void {
    if (!this.marco || e.source !== this.marco.contentWindow) return;
    const m = e.data as { tipo?: unknown; id?: unknown; texto?: unknown; flujo?: unknown; resultado?: unknown } | null;
    if (m?.tipo === 'listo') {
      this.avisarListo?.();
      return;
    }
    const p = typeof m?.id === 'string' ? this.pendientes.get(m.id) : undefined;
    if (!m || !p) return;
    if (m.tipo === 'estado' && typeof m.texto === 'string') {
      p.estado = m.texto.slice(0, 80);
    } else if (m.tipo === 'salida' && typeof m.texto === 'string' && (m.flujo === 'stdout' || m.flujo === 'stderr')) {
      agregar(p.salida, m.flujo, m.texto);
    } else if (m.tipo === 'fin') {
      this.pendientes.delete(m.id as string);
      p.resolver(sanear(m.resultado));
      return;
    } else {
      return;
    }
    p.progreso?.({ estado: p.estado, salida: p.salida.map(s => ({ ...s })) });
  }
}

/** No llegó a ejecutarse: no es un error del programa y no cuenta para comparar versiones. */
function sinEjecutar(texto: string): ResultadoEjecucion {
  return { salida: [], error: false, recortada: false, ms: 0, fallo: texto };
}

/** Agrega texto a la salida respetando el límite de 10.000 caracteres. Devuelve false si recortó. */
function agregar(salida: SalidaEjecucion[], flujo: SalidaEjecucion['flujo'], texto: string): boolean {
  const usados = salida.reduce((n, s) => n + s.texto.length, 0);
  const cabe = texto.slice(0, Math.max(0, MAX_SALIDA - usados));
  if (cabe) {
    const ultimo = salida.at(-1);
    if (ultimo?.flujo === flujo) ultimo.texto += cabe;
    else salida.push({ flujo, texto: cabe });
  }
  return cabe.length === texto.length;
}

/**
 * El resultado llega de un documento aislado donde también corrió el código de otra persona: se toman
 * solo los campos esperados, con su tipo y dentro de los límites.
 */
function sanear(dato: unknown): ResultadoEjecucion {
  const r = (dato ?? {}) as Record<string, unknown>;
  const salida: SalidaEjecucion[] = [];
  let recortada = r['recortada'] === true;
  for (const s of Array.isArray(r['salida']) ? r['salida'] : []) {
    const flujo = s?.flujo;
    if ((flujo === 'stdout' || flujo === 'stderr' || flujo === 'aviso') && typeof s?.texto === 'string') {
      if (!agregar(salida, flujo, s.texto)) recortada = true;
    }
  }
  const tablas: TablaSql[] = (Array.isArray(r['tablas']) ? r['tablas'] : []).slice(0, MAX_TABLAS).map((t: unknown) => {
    const tabla = (t ?? {}) as Record<string, unknown>;
    const columnas = (Array.isArray(tabla['columnas']) ? tabla['columnas'] : []).slice(0, MAX_COLUMNAS).map(c => String(c));
    const filas = (Array.isArray(tabla['filas']) ? tabla['filas'] : []).slice(0, MAX_FILAS).map(f =>
      (Array.isArray(f) ? f : []).slice(0, columnas.length).map(v => (typeof v === 'number' || v === null ? v : String(v))),
    );
    return { columnas, filas, recortada: tabla['recortada'] === true };
  });
  return {
    salida,
    tablas,
    error: r['error'] === true,
    recortada,
    detenida: r['detenida'] === true,
    fallo: typeof r['fallo'] === 'string' ? r['fallo'].slice(0, 300) : undefined,
    ms: typeof r['ms'] === 'number' && Number.isFinite(r['ms']) ? Math.max(0, Math.round(r['ms'])) : 0,
  };
}

/**
 * Lo que identifica la salida de una ejecución, para comparar dos versiones. Como al comparar código,
 * no cuentan los finales de línea ni los espacios al final de cada línea; los avisos de go vet tampoco.
 */
export function firmaSalida(r: ResultadoEjecucion): string {
  const limpiar = (t: string) => t.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  const salida = r.salida.filter(s => s.flujo !== 'aviso').map(s => [s.flujo, limpiar(s.texto)]);
  return JSON.stringify([r.error, salida, r.tablas ?? []]);
}
