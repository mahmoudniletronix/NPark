import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { Subscription } from 'rxjs';

import { LanguageService, AppLang } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-shell-component',
  standalone: true,
  imports: [RouterOutlet, CommonModule, PanelMenuModule, RouterModule],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.css',
})
export class ShellComponent implements OnDestroy {
  // ===== DI =====
  private router = inject(Router);
  public i18n = inject(LanguageService);

  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      overview: 'نظرة عامة',
      parking: 'المواقف',
      gate: 'بوابات',
      entryGate: 'بوابة الدخول',
      exitGate: 'بوابة الخروج',
      visitor: 'الزائر',
      altaeriffa: 'التعريفة',
      subscription: 'الاشتراك',
      management: 'الإدارة',
      users: 'المستخدمون',
      configuration: 'الإعدادات',
      parkingGuidanceDiagram: 'مخطط توجيه المواقف',
      dashboard: 'لوحة التحكم',
      welcome: 'مرحبًا بعودتك',
      version: 'إصدار',
      toggleSubmenu: 'تبديل القائمة الفرعية',
      brand: 'إن بارك',
      langButton: 'English',
    },
    en: {
      overview: 'Overview',
      parking: 'Parking',
      gate: 'Gate',
      entryGate: 'Entry Gate',
      exitGate: 'Exit Gate',
      visitor: 'Visitor',
      altaeriffa: 'Altaeriffa',
      subscription: 'Subscription',
      management: 'Management',
      users: 'Users',
      configuration: 'Configuration',
      parkingGuidanceDiagram: 'Parking Guidance Diagram',
      dashboard: 'Dashboard',
      welcome: 'Welcome back',
      version: 'v',
      toggleSubmenu: 'Toggle submenu',
      brand: 'NPark',
      langButton: 'العربية',
    },
  };

  t = (key: string) => this.dict[this.i18n.current]?.[key] ?? key;
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  gateOpen = false;
  private sub?: Subscription;

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.gateOpen = false;
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

  switchLang() {
    this.i18n.set(this.isRTL() ? 'en' : 'ar');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
