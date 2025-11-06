import { Component, ElementRef, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { Chart } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

import { DashboardService } from '../../Services/Dashboard/dashboard-service';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    ChartModule,
    TagModule,
    RouterLink,
    TranslatePipePipe,
  ],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          dashboard: 'لوحة التحكم',
          detectSensors: 'اكتشاف الحساسات',
          stations: 'المحطات',
          full: 'ممتلئ',
          empty: 'فارغ',
          users: 'المستخدمون',
          seeAllUsers: 'عرض كل المستخدمين',
          usersTotalNote: 'إجمالي المستخدمين (مشتركين + زائرين)',
          subscribers: 'المشتركين',
          visitors: 'الزائرين',
          liveInOutToday: 'الدخول/الخروج (اليوم)',
          recentTickets: 'آخر التذاكر',
          last10: 'آخر 10 سجلات',
          seeAllTickets: 'عرض كل التذاكر',
          id: 'المعرف',
          plate: 'اللوحة',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          noData: 'لا توجد بيانات',
          IN: 'دخول',
          OUT: 'خروج',
        },
        en: {
          dashboard: 'Dashboard',
          detectSensors: 'Detect sensors',
          stations: 'Stations',
          full: 'Full',
          empty: 'Empty',
          users: 'Users',
          seeAllUsers: 'See all users',
          usersTotalNote: 'Total users (Subscribers + Visitors)',
          subscribers: 'Subscribers',
          visitors: 'Visitors',
          liveInOutToday: 'Live In/Out (today)',
          recentTickets: 'Recent Tickets',
          last10: 'Last 10 Records',
          seeAllTickets: 'See all tickets',
          id: 'ID',
          plate: 'Plate',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          noData: 'No data',
          IN: 'IN',
          OUT: 'OUT',
        },
      }) as I18nDict,
    },
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  public lang = inject(LanguageService);

  stations: any = null;
  users: any = null;
  tickets: any[] = [];
  series: any[] = [];

  @ViewChild('stationsChart') stationsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inoutChart') inoutChartRef!: ElementRef<HTMLCanvasElement>;
  private stationsChart?: Chart;
  private inoutChart?: Chart;

  constructor(private ds: DashboardService) {}

  ngOnInit(): void {
    this.ds.getStations().subscribe((v) => {
      this.stations = v;
      this.drawStations();
    });
    this.ds.getUsers().subscribe((v) => (this.users = v));
    this.ds.getTickets().subscribe((v) => (this.tickets = v));
    this.ds.getInOutSeries().subscribe((v) => {
      this.series = v;
      this.drawInOut();
    });

    this.lang.lang$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.drawStations(true);
      this.drawInOut(true);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stationsChart?.destroy();
    this.inoutChart?.destroy();
  }

  ngAfterViewInit(): void {
    this.drawStations();
    this.drawInOut();
  }

  private drawStations(force = false) {
    if (!this.stationsChartRef || !this.stations) return;
    if (this.stationsChart && !force) return;
    this.stationsChart?.destroy();

    const ctx = this.stationsChartRef.nativeElement.getContext('2d')!;
    const fullLabel = this.translate('full');
    const emptyLabel = this.translate('empty');

    this.stationsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [fullLabel, emptyLabel],
        datasets: [
          {
            data: [this.stations.full, this.stations.empty],
            backgroundColor: ['#22c55e', '#3b82f6'],
            hoverBackgroundColor: ['#16a34a', '#2563eb'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 10 },
          },
        },
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  private drawInOut(force = false) {
    if (!this.inoutChartRef || !this.series?.length) return;
    if (this.inoutChart && !force) return;
    this.inoutChart?.destroy();

    const ctx = this.inoutChartRef.nativeElement.getContext('2d')!;
    const inLbl = this.translate('IN');
    const outLbl = this.translate('OUT');

    this.inoutChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.series.map((x) => x.label),
        datasets: [
          {
            label: inLbl,
            data: this.series.map((x) => x.in),
            fill: false,
            borderWidth: 3,
            pointRadius: 3,
            tension: 0.35,
          },
          {
            label: outLbl,
            data: this.series.map((x) => x.out),
            fill: false,
            borderWidth: 3,
            pointRadius: 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 10 } } },
        scales: {
          x: { grid: { color: 'rgba(15,23,42,.06)' } },
          y: { beginAtZero: true, grid: { color: 'rgba(15,23,42,.08)' } },
        },
      },
    });
  }

  usersTotal() {
    return (this.users?.subscribers ?? 0) + (this.users?.visitors ?? 0);
  }

  detectSensorsFromPlan() {
    (this as any).parkingGuidanceDiagramComponent?.detectSensorsFromPlan?.();
  }

  private translate(key: string) {
    const dict = (this as any).__dict as I18nDict | undefined;
    if (dict) {
      const lang = this.lang.current;
      return dict[lang]?.[key] ?? key;
    }
    return key;
  }
}
