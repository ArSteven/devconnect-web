import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, rolGuard } from './core/auth/guards';

// Cada pantalla se descarga solo cuando se visita (carga diferida).
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio) },
  { path: 'login', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/login').then(m => m.Login) },
  { path: 'registro', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/registro').then(m => m.Registro) },
  {
    path: 'feed',
    canActivate: [authGuard],
    data: { titulo: 'feed' },
    loadComponent: () => import('./features/proximamente/proximamente').then(m => m.Proximamente),
  },
  {
    path: 'portafolio/:id',
    canActivate: [authGuard],
    data: { titulo: 'portafolio' },
    loadComponent: () => import('./features/proximamente/proximamente').then(m => m.Proximamente),
  },
  {
    path: 'talento',
    canActivate: [authGuard, rolGuard('empresa')],
    data: { titulo: 'buscar talento' },
    loadComponent: () => import('./features/proximamente/proximamente').then(m => m.Proximamente),
  },
  {
    path: 'planes',
    canActivate: [authGuard, rolGuard('empresa')],
    data: { titulo: 'planes' },
    loadComponent: () => import('./features/proximamente/proximamente').then(m => m.Proximamente),
  },
  { path: '**', redirectTo: '' },
];
