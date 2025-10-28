import { Component, inject } from '@angular/core';
import { AuthService } from '../../Services/Auth/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
