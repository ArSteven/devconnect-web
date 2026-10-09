import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, rolGuard } from './core/auth/guards';

// Cada pantalla se descarga solo cuando se visita (carga diferida).
export const routes: Routes = [
  { path: '', title: 'DevConnect · De "hola mundo" a tu primer empleo', loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio) },
  { path: 'login', title: 'Iniciar sesión · DevConnect', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/login').then(m => m.Login) },
  { path: 'registro', title: 'Crear cuenta · DevConnect', canActivate: [invitadoGuard], loadComponent: () => import('./features/auth/registro').then(m => m.Registro) },
  // Páginas legales: públicas, se leen con o sin sesión (el registro las enlaza).
  { path: 'terminos', title: 'Términos y condiciones · DevConnect', loadComponent: () => import('./features/legal/terminos').then(m => m.Terminos) },
  { path: 'privacidad', title: 'Política de tratamiento de datos · DevConnect', loadComponent: () => import('./features/legal/privacidad').then(m => m.Privacidad) },
  {
    path: 'bienvenida',
    title: 'Completa tu perfil · DevConnect',
    canActivate: [authGuard, rolGuard('estudiante')],
    loadComponent: () => import('./features/bienvenida/bienvenida').then(m => m.Bienvenida),
  },

  { path: 'feed', title: 'Feed · DevConnect', canActivate: [authGuard], loadComponent: () => import('./features/feed/feed').then(m => m.Feed) },
  {
    path: 'publicar',
    title: 'Publicar código · DevConnect',
    canActivate: [authGuard, rolGuard('estudiante')],
    loadComponent: () => import('./features/publicacion/publicar').then(m => m.Publicar),
  },
  { path: 'publicacion/:id', title: 'Publicación · DevConnect', canActivate: [authGuard], loadComponent: () => import('./features/publicacion/detalle').then(m => m.Detalle) },
  { path: 'retos', title: 'Retos de empresas · DevConnect', canActivate: [authGuard], loadComponent: () => import('./features/retos/retos').then(m => m.Retos) },
  { path: 'sesiones', title: 'Sesiones en vivo · DevConnect', canActivate: [authGuard], loadComponent: () => import('./features/sesiones/sesiones').then(m => m.Sesiones) },
  { path: 'portafolio/:id', title: 'Perfil · DevConnect', canActivate: [authGuard], loadComponent: () => import('./features/portafolio/portafolio').then(m => m.Portafolio) },

  {
    path: 'talento',
    title: 'Buscar talento · DevConnect',
    canActivate: [authGuard, rolGuard('empresa')],
    loadComponent: () => import('./features/empresas/talento').then(m => m.Talento),
  },
  {
    path: 'candidatos',
    title: 'Mis candidatos · DevConnect',
    canActivate: [authGuard, rolGuard('empresa')],
    loadComponent: () => import('./features/empresas/candidatos').then(m => m.Candidatos),
  },
  {
    path: 'planes',
    title: 'Planes · DevConnect',
    canActivate: [authGuard, rolGuard('empresa')],
    loadComponent: () => import('./features/empresas/planes').then(m => m.Planes),
  },
  { path: '**', redirectTo: '' },
];
