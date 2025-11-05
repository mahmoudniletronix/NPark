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

  // Map: itemId -> 1-based order index (useful anywhere, not just in *ngFor)
  orderMap = computed<Record<string, number>>(() =>
    this.picked().reduce((acc, it, idx) => {
      acc[it.id] = idx + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  getOrderFor = (it: RepeatedPricingDto) => this.orderMap()[it.id] ?? 0;

  ngOnInit() {
    this.fetch();
    this.loadOrder();
  }

  constructor() {
    effect(() => {
      const a = this.active();
      if (!a) return;
      const stillExists =
        this.allItems().some((x) => x.id === a.id) || this.picked().some((x) => x.id === a.id);
      if (!stillExists) this.active.set(null);
    });
  }

  // ===== API =====
  loadOrder() {
    this.loading.set(true);
    this.error.set(null);

    this.visitorServices.getOrder().subscribe({
      next: (order: RepeatedPricingDto[]) => {
        // إذا API ترجع order/count، رتب على order واملأ الكميات
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

        const updatedQty: Record<string, number> = {};
        sorted.forEach((item: any) => {
          updatedQty[item.id] = Number(item?.count ?? 0);
        });
        this.qty.set(updatedQty);

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
    const orderSchema = items
      .map((p, idx) => ({
        pricingSchemaId: p.id,
        count: this.qty()[p.id] ?? 0,
        order: idx + 1, // الترتيب الديناميكي (1-based)
      }))
      .filter((x) => x.count > 0);

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

  setQty(item: RepeatedPricingDto, raw: any) {
    const num = Math.max(0, Math.floor(Number(raw) || 0));
    this.qty.update((q) => {
      const next = { ...q };
      if (num === 0) {
        delete next[item.id];
        this.picked.update((arr) => arr.filter((x) => x.id !== item.id));
        if (this.active()?.id === item.id) this.active.set(null);
      } else {
        next[item.id] = num;
        if (!this.picked().some((x) => x.id === item.id)) {
          this.picked.update((arr) => [...arr, item]);
        }
      }
      return next;
    });
  }

  onQtyChange(item: RepeatedPricingDto, value: any) {
    this.setQty(item, value);
  }

  inc(item: RepeatedPricingDto) {
    this.qty.update((q) => {
      const next = { ...q };
      next[item.id] = (next[item.id] ?? 0) + 1;
      return next;
    });
  }

  dec(item: RepeatedPricingDto) {
    this.qty.update((q) => {
      const next = { ...q };
      const current = next[item.id] ?? 0;
      const v = Math.max(0, current - 1);
      if (v === 0) {
        delete next[item.id];
        this.picked.update((arr) => arr.filter((x) => x.id !== item.id));
        if (this.active()?.id === item.id) this.active.set(null);
      } else {
        next[item.id] = v;
      }
      return next;
    });
  }

  // ===== Actions =====
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

  select(item: RepeatedPricingDto) {
    this.active.set(item);
  }

  addToPicked(item: RepeatedPricingDto) {
    if (!this.picked().some((x) => x.id === item.id)) {
      this.picked.update((arr) => [...arr, item]);
    }
    this.qty.update((q) => {
      const next = { ...q };
      next[item.id] = (next[item.id] ?? 0) + 1;
      return next;
    });
  }

  removeFromPicked(item: RepeatedPricingDto) {
    this.picked.update((arr) => arr.filter((x) => x.id !== item.id));
    this.qty.update((q) => {
      const next = { ...q };
      delete next[item.id];
      return next;
    });
    if (this.active()?.id === item.id) this.active.set(null);
  }

  clearPicked() {
    this.picked.set([]);
    this.qty.set({});
    this.active.set(null);
  }

  dropReorder(ev: CdkDragDrop<RepeatedPricingDto[]>) {
    const arr = [...this.picked()];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    this.picked.set(arr);
  }

  // ===== Helpers =====
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
}
