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

import { LanguageService, AppLang } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-ticket-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-component.html',
  styleUrl: './ticket-component.css',
})
export class TicketComponent {
  svc = inject(TicketsServices);

  i18n = inject(LanguageService);
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      issue_ticket: 'إصدار تذكرة',
      entry: 'دخول',
      no_ticket_yet: 'لا توجد تذكرة بعد — اضغط "إضافة تذكرة جديدة"',
      add_new_ticket: 'إضافة تذكرة جديدة',
      print_ticket: 'طباعة التذكرة',
      ticket_id: 'رقم التذكرة',
      scan_admit: 'المسح والسماح بالدخول',
      scanner_ready: 'الماسح جاهز',
      scan_label: 'امسح QR / ألصق الكود',
      scan_placeholder: 'ضع المؤشر هنا ثم امسح...',
      fetching_details: 'جاري جلب تفاصيل التذكرة...',
      id: 'المعرّف',
      plate: 'اللوحة',
      start: 'البداية',
      end: 'النهاية',
      price: 'السعر',
      exceed: 'قيمة التجاوز',
      total: 'الإجمالي',
      admit: 'سماح بالدخول',
      tickets_entry_title: 'التذاكر — دخول',
      search_id_plate: 'بحث بالمعرّف / اللوحة',
      all_actions: 'كل الإجراءات',
      all_gates: 'كل البوابات',
      action_in: 'دخول',
      action_out: 'خروج',
      time: 'الوقت',
      action: 'الإجراء',
      gate: 'البوابة',
      no_tickets: 'لا توجد تذاكر',
      prev: 'السابق',
      next: 'التالي',
      showing: 'عرض',
      of: 'من',
      admit_done: 'تم التحصيل بنجاح',
      chip_entry: 'دخول',
      focus_to_scan: 'ضع المؤشر هنا ثم امسح...',
    },
    en: {
      issue_ticket: 'Issue Ticket',
      entry: 'ENTRY',
      no_ticket_yet: 'No ticket yet — click “Add New Ticket”',
      add_new_ticket: 'Add New Ticket',
      print_ticket: 'Print Ticket',
      ticket_id: 'Ticket ID',
      scan_admit: 'Scan & Admit',
      scanner_ready: 'Scanner ready',
      scan_label: 'Scan QR / Paste Code',
      scan_placeholder: 'Focus here then scan...',
      fetching_details: 'Fetching ticket details...',
      id: 'ID',
      plate: 'Plate',
      start: 'Start',
      end: 'End',
      price: 'Price',
      exceed: 'Exceed',
      total: 'Total',
      admit: 'Admit',
      tickets_entry_title: 'Tickets — Entry',
      search_id_plate: 'Search ID / Plate',
      all_actions: 'All actions',
      all_gates: 'All gates',
      action_in: 'IN',
      action_out: 'OUT',
      time: 'Time',
      action: 'Action',
      gate: 'Gate',
      no_tickets: 'No tickets',
      prev: 'Prev',
      next: 'Next',
      showing: 'Showing',
      of: 'of',
      admit_done: 'Collected successfully',
      chip_entry: 'ENTRY',
      focus_to_scan: 'Focus here then scan...',
    },
  };
  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

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
        alert(this.t('admit_done'));
      },
      complete: () => (this.collecting = false),
      error: () => (this.collecting = false),
    });
  }

  // ===== List / Filters =====
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
