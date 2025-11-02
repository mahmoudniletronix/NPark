import { Routes } from '@angular/router';
import { authGuard } from './interceptors/Guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./Feature/login-component/login-component').then((m) => m.LoginComponent),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Feature/shell-component/shell-component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./Feature/dashboard-component/dashboard-component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./Feature/overview-component/overview-component').then(
            (m) => m.OverviewComponent
          ),
      },
      {
        path: 'users',
        loadComponent: () => import('./Feature/users/users').then((m) => m.Users),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./Feature/ticket-component/ticket-component').then((m) => m.TicketComponent),
      },
      {
        path: 'subscription',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./Feature/subscription-component/subscription-component').then(
            (m) => m.SubscriptionComponent
          ),
      },
      {
        path: 'parking-guidance-diagram',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './Feature/parking-guidance-diagram-component/parking-guidance-diagram-component'
          ).then((m) => m.ParkingGuidanceDiagramComponent),
      },
      {
        path: 'configuration',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./Feature/configuration-component/configuration-component').then(
            (m) => m.ConfigurationComponent
          ),
      },
      {
        path: 'registration',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./Feature/Registration-component/registration-component').then(
            (m) => m.RegistrationComponent
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
