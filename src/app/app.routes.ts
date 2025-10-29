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
    ],
  },

  { path: '**', redirectTo: 'login' },
];
