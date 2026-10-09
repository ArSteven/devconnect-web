import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

const sinMovimiento = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Cada pantalla nueva empieza arriba; volver atrás recupera dónde estaba.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Transición suave entre rutas (si el navegador la soporta y la persona no pidió menos movimiento).
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          // Si la ventana cambia de tamaño a mitad de la transición, el navegador la aborta: no es un error de la app.
          transition.ready.catch(() => {});
          transition.finished.catch(() => {});
          if (sinMovimiento) transition.skipTransition();
        },
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Antes de mostrar la primera pantalla, intenta recuperar la sesión con la cookie.
    provideAppInitializer(() => inject(AuthService).restaurar()),
  ],
};
