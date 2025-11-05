import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { TicketDto, TicketAction, TicketDetailsDto } from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exitgate-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './exitgate-component.html',
  styleUrl: './exitgate-component.css',
})
export class ExitgateComponent {
  private svc = inject(TicketsServices);

  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: TicketAction | '' = 'OUT';
  gate: string = '';

  page = 1;
  pageSize = 10;

  currentIssuedQr: string | null = null;
  currentIssuedQrType: 'image' | 'text' | null = null;
  lastIssuedTicketId: number | null = null;

  scanBuffer = '';
  scanning = false;
  scannedTicket: TicketDetailsDto | null = null;
  collecting = false;

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.tickets = list.filter((t) => t.action === 'OUT').sort((a, b) => b.id - a.id);
        this.applyFilters();
      },
      complete: () => (this.loading = false),
      error: () => (this.loading = false),
    });
  }

  // ===== Scanner =====
  selectAll(el: HTMLInputElement) {
    setTimeout(() => el.select(), 0);
  }

  onScanEnter() {
    const code = this.scanBuffer?.trim();
    if (!code) return;
    this.fetchTicketByQr(code);
  }

  fetchTicketByQr(code: string) {
    this.scanning = true;
    this.scannedTicket = null;

    this.svc.getTicketByQr(code).subscribe({
      next: (t) => (this.scannedTicket = t),
      complete: () => (this.scanning = false),
      error: () => (this.scanning = false),
    });
  }

  collect(t: TicketDetailsDto) {
    this.collecting = true;
    this.svc.collect(t.id).subscribe({
      next: () => {
        alert('تم التحصيل وإغلاق التذكرة');
        this.scanBuffer = '';
        this.scannedTicket = null;
        this.reloadList();
      },
      complete: () => (this.collecting = false),
      error: () => (this.collecting = false),
    });
  }

  // ===== List =====
  reloadList() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.tickets = list.filter((x) => x.action === 'OUT').sort((a, b) => b.id - a.id);
        this.applyFilters();
      },
      complete: () => (this.loading = false),
      error: () => (this.loading = false),
    });
  }

  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters() {
    const q = this.q.trim().toLowerCase();
    this.filtered = this.tickets.filter((t) => {
      const okQ = !q || t.plate.toLowerCase().includes(q) || String(t.id).includes(q);
      const okG = !this.gate || t.gate === this.gate;
      return okQ && okG;
    });
    this.page = 1;
  }

  pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  pagesCount() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }
}
