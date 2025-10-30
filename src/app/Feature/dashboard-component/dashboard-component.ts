import { Component, computed, ElementRef, signal, ViewChild } from '@angular/core';
import {
  StationSummary,
  UsersSummary,
  Ticket,
} from '../../Domain/dashboard-entity/dashboard.models';
import { DashboardService } from '../../Services/Dashboard/dashboard-service';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Chart } from 'chart.js';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard-component',
  imports: [CommonModule, TableModule, CardModule, ChartModule, TagModule, RouterLink],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.css',
})
export class DashboardComponent {
  stations: any = null;
  users: any = null;
  tickets: any[] = [];
  series: any[] = [];

  @ViewChild('stationsChart') stationsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('inoutChart') inoutChartRef!: ElementRef<HTMLCanvasElement>;
  private stationsChart?: Chart;
  private inoutChart?: Chart;
  parkingGuidanceDiagramComponent: any;

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
  }

  ngAfterViewInit(): void {
    this.drawStations();
    this.drawInOut();
  }

  private drawStations() {
    if (!this.stationsChartRef || !this.stations) return;
    this.stationsChart?.destroy();
    const ctx = this.stationsChartRef.nativeElement.getContext('2d')!;
    this.stationsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Full', 'Empty'],
        datasets: [{ data: [this.stations.full, this.stations.empty] }],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  private drawInOut() {
    if (!this.inoutChartRef || !this.series?.length) return;
    this.inoutChart?.destroy();
    const ctx = this.inoutChartRef.nativeElement.getContext('2d')!;
    this.inoutChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.series.map((x) => x.label),
        datasets: [
          {
            label: 'IN',
            data: this.series.map((x) => x.in),
            fill: false,
            borderWidth: 3,
            pointRadius: 3,
            tension: 0.35,
          },
          {
            label: 'OUT',
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
    this.parkingGuidanceDiagramComponent.detectSensorsFromPlan();
  }
}
