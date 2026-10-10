import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Rol } from './auth.service';

/**
 * Saca al login a quien no ha iniciado sesión y recuerda adónde iba (por ejemplo, un portafolio
 * abierto desde el QR de una tarjeta). Es comodidad: la protección real está en la API.
 */
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.autenticado() ? true : router.createUrlTree(['/login'], { queryParams: { volver: estado.url } });
};

/** Impide entrar a pantallas de otro tipo de cuenta (por ejemplo, un estudiante a /talento). */
export const rolGuard = (rol: Rol): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.usuario()?.rol === rol ? true : router.createUrlTree([auth.rutaInicio()]);
};

/** Si ya hay sesión, no tiene sentido ver login o registro: va directo a su inicio. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.autenticado() ? router.createUrlTree([auth.rutaInicio()]) : true;
};
