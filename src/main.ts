import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { withInterceptorsFromDi } from '@angular/common/http';
import { tokenInterceptor } from './app/interceptors/Auth/token.interceptor';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers ?? []),
    provideHttpClient(withInterceptorsFromDi()),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideRouter(routes),
    provideAnimations(),
  ],
}).catch((err) => console.error(err));
