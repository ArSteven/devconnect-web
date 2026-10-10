import { Component, ElementRef, afterNextRender, afterRenderEffect, inject, input, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { filasCambio } from '../../core/aportes';
import { Api } from '../../core/api';
import { Avisos } from '../../core/avisos';
import { alias } from '../../core/github';
import { Portafolio, nivelAcademico } from '../../core/modelos';
import { tecnologia } from '../../core/tecnologias';
import { Cargando } from '../../shared/cargando';
import { ContenidoTarjeta, FORMATOS, Formato, dibujarTarjeta } from './tarjeta-canvas';

/** Carga una imagen que se pueda dibujar en el canvas sin "ensuciarlo"; si falla o tarda, no hay logo. */
function cargarImagen(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise(resolver => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const listo = (ok: boolean) => {
      clearTimeout(espera);
      resolver(ok ? img : null);
    };
    const espera = setTimeout(() => listo(false), 4000);
    img.onload = () => listo(true);
    img.onerror = () => listo(false);
    img.src = url;
  });
}

/** Tarjeta de talento para Instagram y LinkedIn: vista previa, descarga en PNG y menú para compartir. */
@Component({
  selector: 'app-compartir-tarjeta',
  imports: [Cargando],
  template: `
    <dialog #dialogo aria-labelledby="titulo-tarjeta" (close)="cerrar.emit()">
      <div class="cabeza">
        <h2 id="titulo-tarjeta">Compartir mi tarjeta</h2>
        <button type="button" class="cerrar" aria-label="Cerrar" (click)="dialogo.close()">✕</button>
      </div>
      <p class="bajada">Una imagen con tu evidencia en DevConnect, lista para Instagram o LinkedIn. No incluye tu correo.</p>

      <div class="formatos" role="group" aria-label="Formato de la vista previa">
        @for (f of formatos; track f.clave) {
          <button type="button" [class.on]="formato() === f.clave" [attr.aria-pressed]="formato() === f.clave" (click)="formato.set(f.clave)">
            {{ f.nombre }} <span>{{ f.ancho }} × {{ f.alto }}</span>
          </button>
        }
      </div>

      <div class="vista">
        @if (estado() === 'cargando') { <app-cargando texto="Preparando tu tarjeta…" /> }
        @if (estado() === 'error') { <p class="error" role="alert">No pudimos preparar tu tarjeta. Cierra y vuelve a intentarlo.</p> }
        <canvas #lienzo [hidden]="estado() !== 'lista'" role="img"
                [attr.aria-label]="'Vista previa de tu tarjeta en formato ' + (formato() === 'historia' ? 'historia' : 'publicación')"></canvas>
      </div>

      <div class="acciones">
        <button class="btn btn-primario" type="button" [disabled]="estado() !== 'lista'" (click)="descargar('historia')"
                aria-label="Descargar la tarjeta en formato historia, 1080 por 1920 píxeles">Descargar historia</button>
        <button class="btn btn-secundario" type="button" [disabled]="estado() !== 'lista'" (click)="descargar('publicacion')"
                aria-label="Descargar la tarjeta en formato publicación, 1200 por 1200 píxeles">Descargar publicación</button>
        @if (puedeCompartir()) {
          <button class="btn btn-secundario" type="button" [disabled]="estado() !== 'lista'" (click)="compartir()"
                  aria-label="Compartir la tarjeta con otra aplicación">Compartir</button>
        }
      </div>
    </dialog>
  `,
  styles: `
    dialog {
      width: min(760px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); padding: 22px; overflow: auto;
      border: 2px solid var(--tinta); border-radius: 8px; background: var(--blanco); color: var(--tinta); box-shadow: 8px 8px 0 var(--tinta);
    }
    dialog::backdrop { background: rgba(20, 20, 20, .5); }
    .cabeza { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    h2 { font-size: 22px; }
    .cerrar { width: 44px; height: 44px; flex: none; border: 2px solid var(--tinta); border-radius: 50%; background: var(--blanco); font: inherit; font-size: 16px; cursor: pointer; color: var(--tinta); }
    .bajada { margin: 6px 0 14px; font-size: 13px; line-height: 1.6; color: var(--tenue); }
    .formatos { display: inline-flex; border: 2px solid var(--tinta); border-radius: 999px; overflow: hidden; }
    .formatos button {
      min-height: 44px; padding: 0 16px; border: 0; background: var(--blanco); color: var(--tinta);
      font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .formatos button + button { border-left: 2px solid var(--tinta); }
    .formatos button.on { background: var(--tinta); color: var(--papel); }
    .formatos span { font-weight: 400; font-size: 11px; opacity: .75; }
    .vista { display: grid; place-items: center; min-height: 240px; margin: 16px 0; }
    canvas[hidden] { display: none; }
    canvas { display: block; max-width: 100%; max-height: min(56dvh, 620px); width: auto; height: auto; border: 2px solid var(--tinta); border-radius: 6px; }
    .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
    @media (max-width: 520px) {
      dialog { padding: 16px; }
      .acciones .btn { flex: 1 1 100%; }
    }
  `,
})
export class CompartirTarjeta {
  private api = inject(Api);
  private avisos = inject(Avisos);

  readonly datos = input.required<Portafolio>();
  readonly cerrar = output<void>();

  protected formatos = (Object.keys(FORMATOS) as Formato[]).map(clave => ({ clave, ...FORMATOS[clave] }));
  protected formato = signal<Formato>('historia');
  protected estado = signal<'cargando' | 'lista' | 'error'>('cargando');
  protected puedeCompartir = signal(false);
  private contenido = signal<ContenidoTarjeta | null>(null);
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  constructor() {
    afterNextRender(() => {
      this.dialogo().nativeElement.showModal();
      this.preparar();
    });
    // La vista previa se redibuja al cambiar de formato.
    afterRenderEffect(() => {
      const contenido = this.contenido();
      if (contenido) dibujarTarjeta(this.lienzo().nativeElement, contenido, this.formato());
    });
  }

  protected async descargar(formato: Formato): Promise<void> {
    try {
      const url = URL.createObjectURL(await this.imagen(formato));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = this.nombreArchivo(formato);
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      this.avisos.error('No se pudo generar la imagen. Intenta de nuevo.');
    }
  }

  protected async compartir(): Promise<void> {
    const formato = this.formato();
    try {
      const archivo = new File([await this.imagen(formato)], this.nombreArchivo(formato), { type: 'image/png' });
      await navigator.share({ files: [archivo], title: 'Mi tarjeta de DevConnect', text: 'Mira mi portafolio verificado en DevConnect.' });
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') this.avisos.error('No se pudo abrir el menú para compartir.');
    }
  }

  private imagen(formato: Formato): Promise<Blob> {
    const lienzo = document.createElement('canvas');
    dibujarTarjeta(lienzo, this.contenido()!, formato);
    return new Promise((resolver, rechazar) => lienzo.toBlob(b => (b ? resolver(b) : rechazar(new Error('Sin imagen'))), 'image/png'));
  }

  /** devconnect-laura_gomez-historia.png */
  private nombreArchivo(formato: Formato): string {
    const p = this.datos().perfil;
    const usuario = alias(p.nombre, p.github_url).slice(1).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'estudiante';
    return `devconnect-${usuario}-${formato}.png`;
  }

  private async preparar(): Promise<void> {
    try {
      const d = this.datos();
      const p = d.perfil;
      const t = d.totales;
      const lenguajes = d.habilidades.slice(0, 4).map(h => tecnologia(h.lenguaje));
      // Las fuentes deben estar cargadas antes de medir y dibujar texto en el canvas.
      const fuentes = Promise.all([400, 500, 700, 800].map(peso => document.fonts.load(`${peso} 40px "JetBrains Mono"`)))
        .then(() => document.fonts.ready);
      const [qr, logos, mejora] = await Promise.all([
        this.qr(`${location.origin}/portafolio/${p.id}`),
        Promise.all(lenguajes.map(l => cargarImagen(l.logo))),
        this.mejoraDestacada(d),
        fuentes,
      ]);
      const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);
      this.contenido.set({
        nombre: p.nombre,
        titular: p.titular || (p.programa ? `Estudiante de ${p.programa}` : ''),
        formacion: [p.institucion, nivelAcademico(p)].filter(Boolean).join(' · '),
        // Las cifras en cero no se muestran.
        cifras: [
          d.tasa_aceptacion ? { valor: `${d.tasa_aceptacion} %`, etiqueta: 'Tasa de aceptación' } : null,
          t.mejoras_aportadas ? { valor: `${t.mejoras_aportadas}`, etiqueta: plural(t.mejoras_aportadas, 'Mejora aceptada', 'Mejoras aceptadas') } : null,
          t.personas_ayudadas ? { valor: `${t.personas_ayudadas}`, etiqueta: plural(t.personas_ayudadas, 'Persona a la que ayudó', 'Personas a las que ayudó') } : null,
          t.sesiones ? { valor: `${t.sesiones}`, etiqueta: plural(t.sesiones, 'Sesión dictada', 'Sesiones dictadas') } : null,
        ].filter((c): c is { valor: string; etiqueta: string } => !!c),
        lenguajes: lenguajes.map((l, i) => ({ nombre: l.nombre, logo: logos[i] })),
        mejora,
        qr,
      });
      const prueba = new File([new Blob()], 'tarjeta.png', { type: 'image/png' });
      this.puedeCompartir.set(!!navigator.canShare?.({ files: [prueba] }));
      this.estado.set('lista');
    } catch (e) {
      console.error('No se pudo preparar la tarjeta de talento', e);
      this.estado.set('error');
    }
  }

  /** El QR se genera en el navegador con la librería qrcode (MIT); se carga solo al abrir la tarjeta. */
  private async qr(url: string): Promise<ContenidoTarjeta['qr']> {
    const modulo = await import('qrcode');
    // qrcode es CommonJS: según el empaquetador, sus funciones llegan sueltas o dentro de default.
    const { create } = (modulo as unknown as { default?: typeof modulo }).default ?? modulo;
    const codigo = create(url, { errorCorrectionLevel: 'M' });
    return { tamano: codigo.modules.size, oscuro: (fila, columna) => !!codigo.modules.get(fila, columna) };
  }

  /** La mejora más destacada (los retos primero) con 3 o 4 líneas de su diff. Si no se puede traer, se omite. */
  private async mejoraDestacada(d: Portafolio): Promise<ContenidoTarjeta['mejora']> {
    const destacada = d.destacados[0];
    if (!destacada) return null;
    try {
      const pub = await firstValueFrom(this.api.detalle(destacada.publicacion_id));
      const propuesta = pub.propuestas.find(x => x.id === destacada.propuesta_id);
      if (!propuesta) return null;
      const { filas } = filasCambio({ original: pub.codigo, codigo: propuesta.codigo, desde_linea: 1, total_lineas: 0 }, pub.lenguaje, 40);
      // De ese primer tramo, las 4 líneas con más cambios (sin líneas vacías): lo que de verdad aportó.
      const utiles = filas.filter(f => f.tipo !== 'igual' || f.texto.trim());
      const cambios = (desde: number) => utiles.slice(desde, desde + 4).filter(f => f.tipo !== 'igual').length;
      let inicio = 0;
      for (let i = 1; i + 4 <= utiles.length; i++) if (cambios(i) > cambios(inicio)) inicio = i;
      return { titulo: destacada.titulo, filas: utiles.slice(inicio, inicio + 4).map(f => ({ tipo: f.tipo, texto: f.texto })) };
    } catch {
      return null;
    }
  }
}
