import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Encabezado } from './shared/encabezado';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Encabezado],
  template: `
    <app-encabezado />
    <main>
      <router-outlet />
    </main>
  `,
})
export class App {}
