import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/**
 * La pantalla de entrada vive en index.html para verse desde el primer instante. Se quita
 * cuando la app ya recuperó la sesión y la animación terminó (unos 1,4 s), lo que pase último.
 */
function quitarEntrada(): void {
  const entrada = document.getElementById('entrada');
  if (!entrada) return;
  const inicio = Number(entrada.dataset['inicio'] ?? 0);
  const minimo = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1400;
  const espera = Math.max(0, minimo - (performance.now() - inicio));
  setTimeout(() => {
    entrada.classList.add('fuera');
    setTimeout(() => entrada.remove(), 400);
  }, espera);
}

bootstrapApplication(App, appConfig)
  .then(quitarEntrada)
  .catch(err => {
    console.error(err);
    quitarEntrada();
  });
