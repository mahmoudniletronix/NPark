import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TicketDto,
  TicketAction,
  IssuedTicketResponse,
  TicketDetailsDto,
} from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';

@Component({
  selector: 'app-ticket-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-component.html',
  styleUrl: './ticket-component.css',
})
export class TicketComponent {
  svc = inject(TicketsServices);

  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: '' | TicketAction = '';
  gate: string = '';

  page = 1;
  pageSize = 10;

  adding = false;
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
    this.svc.getAll().subscribe((list) => {
      this.tickets = list.sort((a, b) => b.id - a.id);
      this.applyFilters();
      this.loading = false;
    });
  }

  // ===== Left Panel =====
  addNewTicket() {
    this.adding = true;
    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;

    this.svc.addTicket().subscribe({
      next: (res) => {
        this.lastIssuedTicketId = (res as any)?.id ?? (res as any)?.Id ?? null;

        const img =
          this.normalizeQrImage((res as any)?.qrImageBase64) ||
          this.normalizeQrImage((res as any)?.qrUrl) ||
          null;

        if (img) {
          this.currentIssuedQr = img;
          this.currentIssuedQrType = 'image';
        } else if ((res as any)?.qrText) {
            this.currentIssuedQr = this.qrDataUrl((res as any).qrText);
          this.currentIssuedQrType = 'text';
        } else {
          console.warn('No QR returned from AddTicket response', res);
          this.currentIssuedQr = null;
          this.currentIssuedQrType = null;
        }
      },
      complete: () => (this.adding = false),
      error: (e) => {
        console.error('AddTicket error', e);
        this.adding = false;
      },
    });
  }

  printTicket() {
    if (!this.currentIssuedQr) return;

    const imgSrc =
      this.currentIssuedQrType === 'image'
        ? this.currentIssuedQr
        : this.qrDataUrl(this.currentIssuedQr);

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>Print Ticket</title>
          <style>
            body{margin:0;padding:16px;font-family:Arial, sans-serif;}
            .wrap{display:flex;flex-direction:column;align-items:center;gap:12px;}
            img{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px;padding:8px;}
            .id{font-size:14px;color:#555}
            .btn{display:none}
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="wrap">
            <img src="${imgSrc}" />
            ${this.lastIssuedTicketId ? `<div class="id">ID: ${this.lastIssuedTicketId}</div>` : ''}
          </div>
        </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  qrDataUrl(text: string) {
    return `data:text/plain,${encodeURIComponent(text)}`;
  }

  // ===== Right Panel =====
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
        alert('تم التحصيل بنجاح');
      },
      complete: () => (this.collecting = false),
      error: () => (this.collecting = false),
    });
  }

  // ===== List (unchanged) =====
  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters() {
    const q = this.q.trim().toLowerCase();
    this.filtered = this.tickets.filter((t) => {
      const okQ = !q || t.plate.toLowerCase().includes(q) || String(t.id).includes(q);
      const okA = !this.action || t.action === this.action;
      const okG = !this.gate || t.gate === this.gate;
      return okQ && okA && okG;
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

  private normalizeQrImage(value?: string | null): string | null {
    if (!value) return null;
    const v = String(value).trim();

    if (/^(data:image\/|blob:|https?:\/\/)/i.test(v)) return v;

    const clean = v.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return `data:image/png;base64,${clean}`;
    }
    return null;
  }
}
