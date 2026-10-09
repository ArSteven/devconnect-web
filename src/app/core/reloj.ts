import { Injectable, signal } from '@angular/core';

/** Un solo reloj para toda la app: las cuentas regresivas leen este signal. */
@Injectable({ providedIn: 'root' })
export class Reloj {
  private readonly _ahora = signal(Date.now());
  readonly ahora = this._ahora.asReadonly();

  constructor() {
    setInterval(() => this._ahora.set(Date.now()), 1000);
  }
}

/**
 * Texto de cuenta regresiva hasta `iso`: "En 2 d 4 h", "En 1 h 05 min", "En 03:12" o
 * "Empieza ahora". Para fechas pasadas devuelve "".
 */
export function cuentaRegresiva(iso: string, ahora: number): string {
  const seg = Math.floor((new Date(iso).getTime() - ahora) / 1000);
  if (seg <= 0) return '';
  const d = Math.floor(seg / 86400);
  const h = Math.floor((seg % 86400) / 3600);
  const min = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  if (d > 0) return `En ${d} d ${h} h`;
  if (h > 0) return `En ${h} h ${String(min).padStart(2, '0')} min`;
  return `En ${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Fecha corta y legible: "Lun 12 oct · 3:00 p. m.", sin que la hora se parta en dos líneas. */
export function fechaCorta(iso: string): string {
  const f = new Date(iso);
  const dia = f.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
  const mes = f.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '');
  const hora = f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${f.getDate()} ${mes} · ${hora}`;
}
