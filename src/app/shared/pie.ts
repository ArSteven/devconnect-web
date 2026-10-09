import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Pie de página: enlaces legales y créditos, incluida la atribución que pide la licencia MIT de Devicon. */
@Component({
  selector: 'app-pie',
  imports: [RouterLink],
  template: `
    <footer>
      <!-- &nbsp; antes de cada «·»: al saltar de línea en celular, ningún renglón empieza con el separador. -->
      <span>© 2026 DEVCONNECT LEARN&nbsp;· Floridablanca, Colombia&nbsp;· Prototipo desarrollado como trabajo de grado en las Unidades Tecnológicas de Santander</span>
      <nav class="legal" aria-label="Legal">
        <a routerLink="/terminos">Términos</a>
        <a routerLink="/privacidad">Privacidad</a>
      </nav>
      <span>
        Logos de tecnologías:
        <a href="https://devicon.dev" target="_blank" rel="noopener noreferrer">Devicon</a>
        (<a href="https://github.com/devicons/devicon/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">licencia MIT</a>).
        Las marcas pertenecen a sus dueños.
      </span>
    </footer>
  `,
  styles: `
    footer {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px;
      max-width: 1340px; margin: 0 auto; padding: 24px clamp(16px, 4vw, 48px) 32px;
      border-top: 2px solid var(--linea); font-size: 12px; line-height: 1.7; color: var(--tenue);
    }
    a { display: inline-block; padding: 2px 0; }
    .legal { display: flex; gap: 16px; margin: -8px 0; }
    .legal a { display: inline-flex; align-items: center; min-height: 44px; font-weight: 700; }
  `,
})
export class Pie {}
