import { Component, ElementRef, inject, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TicketDto, TicketAction, TicketDetailsDto } from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-exitgate-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exitgate-component.html',
  styleUrls: ['./exitgate-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          exitTicket: 'تذكرة الخروج',
          EXIT: 'خروج',
          readyToCollect: 'جاهز للتحصيل',
          scanHint: 'امسح التذكرة من اليمين لعرض التفاصيل والتحصيل',
          id: 'المعرف',
          plate: 'اللوحة',
          start: 'البداية',
          end: 'النهاية',
          price: 'السعر',
          exceed: 'الزيادة',
          total: 'الإجمالي',
          totalDue: 'الإجمالي المستحق',
          closeAndCollect: 'إغلاق وتحصيل',
          exitModeNote: 'في وضع الخروج لا يمكن إصدار تذاكر جديدة — فقط تحصيل وإغلاق.',
          scanAndCollect: 'مسح وتحصيل',
          scannerReady: 'الماسح جاهز',
          scanLabel: 'مسح QR / لصق الكود',
          scanPlaceholder: 'ضع المؤشر هنا ثم امسح...',
          fetching: 'جاري جلب تفاصيل التذكرة...',
          collect: 'تحصيل',
          emptyState: 'امسح تذكرة لعرض تفاصيلها والتحصيل.',
          ticketsExit: 'التذاكر — خروج',
          searchPlaceholder: 'بحث بالمعرف / اللوحة',
          allGates: 'كل البوابات',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          noTickets: 'لا توجد تذاكر',
          showing: 'عرض',
          of: 'من',
          prev: 'السابق',
          next: 'التالي',
          outOnlyTitle: 'بوابة الخروج تدعم OUT فقط',
          collectedOk: 'تم التحصيل وإغلاق التذكرة',
        },
        en: {
          exitTicket: 'Exit Ticket',
          EXIT: 'EXIT',
          readyToCollect: 'Ready to collect',
          scanHint: 'Scan the ticket on the right to view details and collect.',
          id: 'ID',
          plate: 'Plate',
          start: 'Start',
          end: 'End',
          price: 'Price',
          exceed: 'Exceed',
          total: 'Total',
          totalDue: 'Total Due',
          closeAndCollect: 'Close & Collect',
          exitModeNote: 'In Exit mode you cannot issue new tickets — only collect & close.',
          scanAndCollect: 'Scan & Collect',
          scannerReady: 'Scanner ready',
          scanLabel: 'Scan QR / Paste Code',
          scanPlaceholder: 'Focus here then scan...',
          fetching: 'Fetching ticket details...',
          collect: 'Collect',
          emptyState: 'Scan a ticket to show its details and collect payment.',
          ticketsExit: 'Tickets — Exit',
          searchPlaceholder: 'Search ID / Plate',
          allGates: 'All gates',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          noTickets: 'No tickets',
          showing: 'Showing',
          of: 'of',
          prev: 'Prev',
          next: 'Next',
          outOnlyTitle: 'Exit gate is OUT only',
          collectedOk: 'Collected and ticket closed',
        },
      }) as I18nDict,
    },
  ],
})
export class ExitgateComponent {
  private svc = inject(TicketsServices);
  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}

  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: TicketAction | '' = 'OUT';
  gate: string = '';

  page = 1;
  pageSize = 10;

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
        alert(this.t('collectedOk'));
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

  // ترجمة سريعة داخل TS
  private t(key: string) {
    return this.dict[this.lang.current]?.[key] ?? key;
  }
}
