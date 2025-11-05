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

      // ✅ Tickets parent with sub-routes
      {
        path: 'tickets',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'entry',
          },
          {
            path: 'entry',
            data: { mode: 'entry' },
            loadComponent: () =>
              import('./Feature/ticket-component/ticket-component').then((m) => m.TicketComponent),
          },
          {
            path: 'exit',
            data: { mode: 'exit' },
            loadComponent: () =>
              import('./Feature/ticket-component/ticket-component').then((m) => m.TicketComponent),
          },
        ],
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
      {
        path: 'exitgate',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./Feature/exitgate-component/exitgate-component').then(
            (m) => m.ExitgateComponent
          ),
      },
      {
        path: 'visitor',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./Feature/visitor-component/visitor-component').then((m) => m.VisitorComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
