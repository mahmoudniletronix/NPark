import { Routes } from '@angular/router';
import { LoginComponent } from './Feature/login-component/login-component';
import { authGuard } from './interceptors/Guard/auth.guard';
import { DashboardComponent } from './Feature/dashboard-component/dashboard-component';
import { ShellComponent } from './Feature/shell-component/shell-component';
import { Users } from './Feature/users/users';
import { TicketComponent } from './Feature/ticket-component/ticket-component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'users', component: Users },
      { path: 'tickets', component: TicketComponent },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
