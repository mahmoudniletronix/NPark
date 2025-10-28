import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shell-component',
  imports: [RouterOutlet, CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.css',
})
export class ShellComponent {
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
}
