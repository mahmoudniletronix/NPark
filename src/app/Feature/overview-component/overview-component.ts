import { CommonModule } from '@angular/common';
import { Component, computed, signal, Inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '../../Services/i18n/language-service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

type Ticket = { id: number; plate: string; action: 'IN' | 'OUT'; gate: string; time: string };

@Component({
  selector: 'app-overview-component',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipePipe],
  templateUrl: './overview-component.html',
  styleUrls: ['./overview-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          overview: 'نظرة عامة',
          welcomeBack: 'مرحبًا بعودتك',
          seeAllUsers: 'عرض كل المستخدمين',
          logout: 'تسجيل الخروج',
          stations: 'المحطات',
          users: 'المستخدمون',
          full: 'ممتلئ',
          empty: 'فارغ',
          subscribers: 'المشتركين',
          visitors: 'الزائرين',
          recentTickets: 'آخر التذاكر',
          last10: 'آخر 10 سجلات',
          seeAllTickets: 'عرض كل التذاكر',
          id: 'المعرف',
          plate: 'اللوحة',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          occupancy: 'الإشغال',
          liveInOutToday: 'الدخول/الخروج (اليوم)',
          IN: 'دخول',
          OUT: 'خروج',
        },
        en: {
          overview: 'Overview',
          welcomeBack: 'Welcome back',
          seeAllUsers: 'See all users',
          logout: 'Logout',
          stations: 'Stations',
          users: 'Users',
          full: 'Full',
          empty: 'Empty',
          subscribers: 'Subscribers',
          visitors: 'Visitors',
          recentTickets: 'Recent Tickets',
          last10: 'Last 10 Records',
          seeAllTickets: 'See all tickets',
          id: 'ID',
          plate: 'Plate',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          occupancy: 'Occupancy',
          liveInOutToday: 'Live In/Out (today)',
          IN: 'IN',
          OUT: 'OUT',
        },
      }) as I18nDict,
    },
  ],
})
export class OverviewComponent {
  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}

  // KPIs
  stationsTotal = signal(120);
  stationsFull = signal(78);
  stationsEmpty = computed(() => this.stationsTotal() - this.stationsFull());

  usersTotal = signal(6680);
  subscribers = signal(5400);
  visitors = signal(1280);

  // Charts
  hours = [8, 9, 10, 11, 12, 13, 14];
  liveIn = signal<number[]>([10, 30, 40, 38, 28, 22, 25]);
  liveOut = signal<number[]>([2, 12, 20, 30, 35, 33, 26]);

  tickets = signal<Ticket[]>([
    { id: 1001, plate: 'س م ل 1234', action: 'IN', gate: 'G1', time: '11:20 AM' },
    { id: 1002, plate: 'ABC-567', action: 'OUT', gate: 'G2', time: '10:30 AM' },
    { id: 1003, plate: 'JED-9087', action: 'IN', gate: 'G1', time: '9:40 AM' },
    { id: 1004, plate: 'KSA-2211', action: 'OUT', gate: 'G3', time: '8:50 AM' },
  ]);

  donutRadius = 58;
  donutCirc = computed(() => 2 * Math.PI * this.donutRadius);
  fullPercent = computed(() => (this.stationsFull() / this.stationsTotal()) * 100);
  emptyPercent = computed(() => 100 - this.fullPercent());
  fullStroke = computed(() => (this.fullPercent() / 100) * this.donutCirc());
  emptyStroke = computed(() => (this.emptyPercent() / 100) * this.donutCirc());
  emptyRotateDeg = computed(() => -90 + (this.fullPercent() / 100) * 360);

  lineChartWidth = 320;
  lineChartHeight = 160;
  linePadding = 18;

  private maxY(arrs: number[][]) {
    return Math.max(...arrs.flat(), 1);
  }

  inPoints = computed(() => this.buildPoints(this.liveIn()));
  outPoints = computed(() => this.buildPoints(this.liveOut()));

  private buildPoints(series: number[]): string {
    const w = this.lineChartWidth - this.linePadding * 2;
    const h = this.lineChartHeight - this.linePadding * 2;
    const max = this.maxY([this.liveIn(), this.liveOut()]);
    const stepX = w / (series.length - 1 || 1);

    return series
      .map((v, i) => {
        const x = this.linePadding + i * stepX;
        const y = this.linePadding + (1 - v / max) * h;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
