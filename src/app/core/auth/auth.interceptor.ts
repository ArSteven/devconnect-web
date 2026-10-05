import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Agrega el token a las llamadas a la API. Si la API responde 401 porque el token
 * venció (dura 15 minutos), pide uno nuevo y reintenta la petición una sola vez.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const esRutaDeSesion = req.url.startsWith('/api/v1/auth/') && !req.url.endsWith('/yo');
  const conToken = (r: HttpRequest<unknown>) => {
    const token = auth.token();
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(conToken(req)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || esRutaDeSesion) {
        return throwError(() => err);
      }
      return auth.refrescar().pipe(
        switchMap(token => {
          if (!token) {
            auth.sesionVencida();
            return throwError(() => err);
          }
          return next(conToken(req));
        }),
      );
    }),
  );
};
