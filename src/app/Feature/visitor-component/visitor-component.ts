import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { VisitorServices } from './../../Services/VisitorServices/visitor-services';
import { DurationType } from '../../Domain/Subscription-type/subscription-type.models';
import { RepeatedPricingDto } from '../../Domain/VisitorDTO/visitorPriceSchema.model';

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

  // ===== State =====
  loading = signal(false);
  error = signal<string | null>(null);

  allItems = signal<RepeatedPricingDto[]>([]);
  picked = signal<RepeatedPricingDto[]>([]);
  active = signal<RepeatedPricingDto | null>(null);

  /**
   * qty: { itemId -> count }
   * يتم بناؤها دائمًا من ترتيب picked (1..N).
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
  /** أعِد بناء العدّ 1..N حسب ترتيب picked */
  private recomputeCounts() {
    const map: Record<string, number> = {};
    this.picked().forEach((it, idx) => (map[it.id] = idx + 1));
    this.qty.set(map);
  }

  mapDuration(d: number): string {
    switch (d) {
      case DurationType.Hours:
        return 'Hours';
      case DurationType.Days:
        return 'Days';
      case DurationType.Year:
        return 'Year';
      default:
        return 'Unknown';
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
        this.error.set('Failed to load data');
        this.loading.set(false);
      },
    });
  }

  loadOrder() {
    this.loading.set(true);
    this.error.set(null);

    this.visitorServices.getOrder().subscribe({
      next: (order: RepeatedPricingDto[]) => {
        // رتب حسب order القادم من API (لو موجود)
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
        this.recomputeCounts(); // تجاهل count المخزن، واجعل العدّ بحسب الترتيب الفعلي
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('فشل في تحميل الأوردر');
        this.loading.set(false);
      },
    });
  }

  submitOrder() {
    const items = this.picked();
    const orderSchema = items.map((p, idx) => ({
      pricingSchemaId: p.id,
      count: idx + 1, // العدّ يعكس الترتيب الحالي مباشرة
      order: idx + 1, // نفس الرقم للترتيب
    }));

    if (orderSchema.length === 0) {
      alert('Please select at least one pricing schema.');
      return;
    }

    this.visitorServices.addOrder(orderSchema).subscribe({
      next: () => {
        alert('Order added successfully!');
        this.clearPicked();
        this.loadOrder();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to add order.');
      },
    });
  }

  // ===== Actions =====
  select(item: RepeatedPricingDto) {
    this.active.set(item);
  }

  /** إضافة: ضيف العنصر آخر القائمة، ثم أبنِ العدّ من جديد */
  addToPicked(item: RepeatedPricingDto) {
    if (!this.picked().some((x) => x.id === item.id)) {
      this.picked.update((arr) => [...arr, item]);
      this.recomputeCounts();
    }
    this.active.set(item);
  }

  /** حذف: اشطب من picked ثم أعِد بناء العدّ */
  removeFromPicked(item: RepeatedPricingDto) {
    this.picked.update((arr) => arr.filter((x) => x.id !== item.id));
    this.recomputeCounts();
    if (this.active()?.id === item.id) this.active.set(null);
  }

  /** سحب-وإفلات: أعد ترتيب المصفوفة ثم أعِد بناء العدّ */
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
