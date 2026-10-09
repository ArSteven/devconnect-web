import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Confirmacion, Toasts } from './shared/avisos-ui';
import { Encabezado } from './shared/encabezado';
import { Pie } from './shared/pie';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Encabezado, Pie, Toasts, Confirmacion],
  template: `
    <a class="saltar" href="#contenido">Saltar al contenido</a>
    <app-encabezado />
    <main id="contenido">
      <router-outlet />
    </main>
    <app-pie />
    <app-toasts />
    <app-confirmacion />
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }
  `,
})
export class App {}
