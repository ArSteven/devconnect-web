import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, rolGuard } from './core/auth/guards';

// Cada pantalla se descarga solo cuando se visita (carga diferida).
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio) },
  { path: 'login', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/login').then(m => m.Login) },
  { path: 'registro', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/registro').then(m => m.Registro) },

  { path: 'feed', canActivate: [authGuard], loadComponent: () => import('./features/feed/feed').then(m => m.Feed) },
  {
    path: 'publicar',
    canActivate: [authGuard, rolGuard('estudiante')],
    loadComponent: () => import('./features/publicacion/publicar').then(m => m.Publicar),
  },
  { path: 'publicacion/:id', canActivate: [authGuard], loadComponent: () => import('./features/publicacion/detalle').then(m => m.Detalle) },
  { path: 'sesiones', canActivate: [authGuard], loadComponent: () => import('./features/sesiones/sesiones').then(m => m.Sesiones) },
  { path: 'portafolio/:id', canActivate: [authGuard], loadComponent: () => import('./features/portafolio/portafolio').then(m => m.Portafolio) },

  {
    path: 'talento',
    canActivate: [authGuard, rolGuard('empresa')],
    loadComponent: () => import('./features/empresas/talento').then(m => m.Talento),
  },
  {
    path: 'planes',
    canActivate: [authGuard, rolGuard('empresa')],
    loadComponent: () => import('./features/empresas/planes').then(m => m.Planes),
  },
  { path: '**', redirectTo: '' },
];
