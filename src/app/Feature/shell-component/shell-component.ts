import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shell-component',
  imports: [RouterOutlet, CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.css',
})
export class ShellComponent implements OnDestroy {
  gateOpen = false;
  private sub?: Subscription;
  constructor(private router: Router) {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.gateOpen = false;
      }
    });
  }

  items = [
    { label: 'Overview', routerLink: ['/'], icon: 'pi pi-home' },
    {
      label: 'Parking',
      items: [
        { label: 'Dashboard', routerLink: ['/'], icon: 'pi pi-chart-line' },
        { label: 'Tickets', routerLink: ['/tickets'], icon: 'pi pi-ticket' },
      ],
    },
    { label: 'Users', routerLink: ['/users'], icon: 'pi pi-users' },
    { separator: true },
    { label: 'Settings', routerLink: ['/settings'], icon: 'pi pi-cog' },
  ];

  toggleGate() {
    this.gateOpen = !this.gateOpen;
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
