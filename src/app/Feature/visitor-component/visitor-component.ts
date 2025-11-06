import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { VisitorServices } from './../../Services/VisitorServices/visitor-services';
import { DurationType } from '../../Domain/Subscription-type/subscription-type.models';
import { RepeatedPricingDto } from '../../Domain/VisitorDTO/visitorPriceSchema.model';

// نفس خدمة اللغة المستخدمة في باقي الشاشات
import { LanguageService, AppLang } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-visitor-component',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag],
  templateUrl: './visitor-component.html',
  styleUrls: ['./visitor-component.css'],
})
export class VisitorComponent implements OnInit {
  // ===== DI =====
  private visitorServices = inject(VisitorServices);
  i18n = inject(LanguageService);

  // ===== i18n =====
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      all_records: 'كل السجلات',
      block1: 'بلوك 1',
      search_placeholder: 'ابحث...',
      reload: 'إعادة تحميل',
      no_results: 'لا توجد نتائج',
      try_another_keyword: 'جرّب كلمة أخرى',
      details: 'التفاصيل',
      block3: 'بلوك 3',
      pricing: 'التسعير',
      price: 'السعر',
      type: 'النوع',
      total: 'الإجمالي',
      repeated: 'متكرر',
      yes: 'نعم',
      no: 'لا',
      hint_click_update: 'اضغط على العناصر في البلوك 1 أو 2 لتحديث هذه اللوحة.',
      select_record: 'اختر سجلًا لعرض تفاصيله هنا.',
      selected_order: 'المختارة والترتيب',
      block2: 'بلوك 2',
      clear: 'مسح',
      drag_here: 'اسحب أو أرسل عناصر هنا لبناء الطلب',
      add_order: 'إضافة طلب',
      count: 'الترتيب',
      details_btn: 'تفاصيل',
      send_to_block2: 'إرسال للبلوك 2',
      hours: 'ساعات',
      days: 'أيام',
      year: 'سنة',
      unknown: 'غير معروف',
      repeated_badge_true: 'متكرر',
      repeated_badge_false: 'مرة واحدة',
      failed_load: 'فشل في تحميل البيانات',
      failed_load_order: 'فشل في تحميل الأوردر',
      please_select_one: 'برجاء اختيار عنصر واحد على الأقل.',
      order_added: 'تمت إضافة الطلب بنجاح!',
      failed_add_order: 'فشل في إضافة الطلب.',
      count_label: 'الترتيب',
    },
    en: {
      all_records: 'All Records',
      block1: 'Block 1',
      search_placeholder: 'Search...',
      reload: 'Reload',
      no_results: 'No results',
      try_another_keyword: 'Try another keyword',
      details: 'Details',
      block3: 'Block 3',
      pricing: 'Pricing',
      price: 'Price',
      type: 'Type',
      total: 'Total',
      repeated: 'Repeated',
      yes: 'Yes',
      no: 'No',
      hint_click_update: 'Click items in Block 1 or 2 to update this panel.',
      select_record: 'Select a record to see its full details here.',
      selected_order: 'Selected & Order',
      block2: 'Block 2',
      clear: 'Clear',
      drag_here: 'Drag or send items here to build your order',
      add_order: 'Add Order',
      count: 'Count',
      details_btn: 'Details',
      send_to_block2: 'Send to Block 2',
      hours: 'Hours',
      days: 'Days',
      year: 'Year',
      unknown: 'Unknown',
      repeated_badge_true: 'Repeated',
      repeated_badge_false: 'One-time',
      failed_load: 'Failed to load data',
      failed_load_order: 'Failed to load order',
      please_select_one: 'Please select at least one pricing schema.',
      order_added: 'Order added successfully!',
      failed_add_order: 'Failed to add order.',
      count_label: 'Count',
    },
  };
  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

  // ===== State =====
  loading = signal(false);
  error = signal<string | null>(null);

  allItems = signal<RepeatedPricingDto[]>([]);
  picked = signal<RepeatedPricingDto[]>([]);
  active = signal<RepeatedPricingDto | null>(null);

  /**
   * qty: { itemId -> count } (يعكس الترتيب 1..N في picked)
   */
  qty = signal<Record<string, number>>({});

  q = signal(''); // search keyword

  // Filtered view of block (1)
  filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    if (!term) return this.allItems();
    return this.allItems().filter((i) =>
      [i.name, String(i.price), i.totalHours ?? '', this.mapDuration(i.durationType)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });

  // Map: itemId -> 1-based order index
  orderMap = computed<Record<string, number>>(() =>
    this.picked().reduce((acc, it, idx) => {
      acc[it.id] = idx + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  getOrderFor = (it: RepeatedPricingDto) => this.orderMap()[it.id] ?? 0;

  // ===== Lifecycle =====
  ngOnInit() {
    this.fetch();
    this.loadOrder();
  }

  constructor() {
    // لو العنصر النشط اتشال من أي قائمة، فضّي الاختيار
    effect(() => {
      const a = this.active();
      if (!a) return;
      const stillExists =
        this.allItems().some((x) => x.id === a.id) || this.picked().some((x) => x.id === a.id);
      if (!stillExists) this.active.set(null);
    });
  }

  // ===== Helpers =====
  private recomputeCounts() {
    const map: Record<string, number> = {};
    this.picked().forEach((it, idx) => (map[it.id] = idx + 1));
    this.qty.set(map);
  }

  mapDuration(d: number): string {
    switch (d) {
      case DurationType.Hours:
        return this.t('hours');
      case DurationType.Days:
        return this.t('days');
      case DurationType.Year:
        return this.t('year');
      default:
        return this.t('unknown');
    }
  }

  badgeFor(item: RepeatedPricingDto): string {
    return `${this.mapDuration(item.durationType)}${
      item.totalHours ? ' · ' + item.totalHours : ''
    }`;
  }

  isActive(item: RepeatedPricingDto): boolean {
    return this.active()?.id === item.id;
  }

  trackById(_: number, it: RepeatedPricingDto) {
    return it.id;
  }

  // ===== API =====
  fetch() {
    this.loading.set(true);
    this.error.set(null);

    this.visitorServices.getRepeated().subscribe({
      next: (res) => {
        this.allItems.set(res ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set(this.t('failed_load'));
        this.loading.set(false);
      },
    });
  }

  loadOrder() {
    this.loading.set(true);
    this.error.set(null);

    this.visitorServices.getOrder().subscribe({
      next: (order: RepeatedPricingDto[]) => {
        const sorted = [...(order ?? [])].sort(
          (a: any, b: any) => ((a?.order ?? 9999) as number) - ((b?.order ?? 9999) as number)
        );

        if (!sorted || sorted.length === 0) {
          this.picked.set([]);
          this.qty.set({});
          this.loading.set(false);
          return;
        }

        this.picked.set(sorted);
        this.recomputeCounts(); // العدّ يعكس الترتيب الحالي دائمًا
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set(this.t('failed_load_order'));
        this.loading.set(false);
      },
    });
  }

  submitOrder() {
    const items = this.picked();
    const orderSchema = items.map((p, idx) => ({
      pricingSchemaId: p.id,
      count: idx + 1, // يرسل رقم الترتيب كـ count
      order: idx + 1, // ونفسه كـ order
    }));

    if (orderSchema.length === 0) {
      alert(this.t('please_select_one'));
      return;
    }

    this.visitorServices.addOrder(orderSchema).subscribe({
      next: () => {
        alert(this.t('order_added'));
        this.clearPicked();
        this.loadOrder();
      },
      error: (err) => {
        console.error(err);
        alert(this.t('failed_add_order'));
      },
    });
  }

  // ===== Actions =====
  select(item: RepeatedPricingDto) {
    this.active.set(item);
  }

  addToPicked(item: RepeatedPricingDto) {
    if (!this.picked().some((x) => x.id === item.id)) {
      this.picked.update((arr) => [...arr, item]);
      this.recomputeCounts();
    }
    this.active.set(item);
  }

  removeFromPicked(item: RepeatedPricingDto) {
    this.picked.update((arr) => arr.filter((x) => x.id !== item.id));
    this.recomputeCounts();
    if (this.active()?.id === item.id) this.active.set(null);
  }

  dropReorder(ev: CdkDragDrop<RepeatedPricingDto[]>) {
    const arr = [...this.picked()];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    this.picked.set(arr);
    this.recomputeCounts();
  }

  clearPicked() {
    this.picked.set([]);
    this.qty.set({});
    this.active.set(null);
  }
}
