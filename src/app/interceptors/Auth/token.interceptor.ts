import { HttpInterceptorFn } from '@angular/common/http';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');

  const isAuthCall =
    req.url.includes('/api/auth/login') || req.url.includes('/api/auth/loginfirsttime');

  if (token && !isAuthCall) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
