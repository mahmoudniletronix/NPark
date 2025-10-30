import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-overview-component',
  imports: [CommonModule, RouterLink],
  templateUrl: './overview-component.html',
  styleUrl: './overview-component.css',
})
export class OverviewComponent {
  stationsTotal = signal(120);
  stationsFull = signal(78);
  stationsEmpty = computed(() => this.stationsTotal() - this.stationsFull());

  usersTotal = signal(6680);
  subscribers = signal(5400);
  visitors = signal(1280);

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

  ngOnInit(): void {}
}
