import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AddPricingSchemaCommand,
  DurationType,
  PricingRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import { SubscriptionType } from '../../Services/subscription-type/subscription-type';

type FormShape = {
  id?: FormControl<number | null>;
  name: FormControl<string>;
  durationType: FormControl<DurationType>;
  startTime: FormControl<string | null>;
  endTime: FormControl<string | null>;
  price: FormControl<number | null>;
  isRepeated: FormControl<boolean>;
  repeatPrice: FormControl<number | null>;
  orderPriority: FormControl<number | null>;
  isActive: FormControl<boolean>;
  totalHours: FormControl<number | null>;
};

@Component({
  selector: 'app-subscription-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './subscription-component.html',
  styleUrl: './subscription-component.css',
})
export class SubscriptionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(SubscriptionType);

  // ====== State ======
  loading = signal(false);
  saving = signal(false);
  rows = signal<PricingRow[]>([]);
  query = signal<string>('');
  private editingRowId = signal<number | null>(null);

  // ====== Form ======
  form = this.fb.group<FormShape>({
    id: this.fb.control<number | null>(null),
    name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    durationType: this.fb.control<DurationType>(DurationType.Days, { nonNullable: true }),
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    price: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    isRepeated: this.fb.control<boolean>(true, { nonNullable: true }),
    repeatPrice: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    orderPriority: this.fb.control<number | null>(1, { validators: [Validators.min(1)] }),
    isActive: this.fb.control<boolean>(true, { nonNullable: true }),
    totalHours: this.fb.control<number | null>(null, {}),
  });

  // ====== Derived ======
  filtered = computed(() => {
    const q = (this.query() || '').trim().toLowerCase();
    const data = this.rows();
    if (!q) return data;
    return data.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.durationType === DurationType.Hours ? 'ساعات' : 'أيام').includes(q)
    );
  });

  // ====== UI flags (لإظهار/إخفاء العناصر) ======
  isDays(): boolean {
    return this.form.controls.durationType.value === DurationType.Days;
  }
  isHours(): boolean {
    return this.form.controls.durationType.value === DurationType.Hours;
  }
  showIsRepeated(): boolean {
    // يظهر فقط في الساعات
    return this.isHours();
  }
  showRangeWindow(): boolean {
    // يظهر فقط في الساعات عندما isRepeated = false
    return this.isHours() && this.form.controls.isRepeated.value === false;
  }

  // ====== Helpers ======
  private toHmsOrNull(v: string | null | undefined): string | null {
    if (!v) return null;
    if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
    return null;
  }
  private toMinutes(v: string): number {
    const [hh, mm] = v.split(':');
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
  }

  private updateTimeAndModeRules() {
    const dt = this.form.controls.durationType.value;
    const isRep = this.form.controls.isRepeated.value;

    if (dt === DurationType.Days) {
      if (!isRep) this.form.controls.isRepeated.setValue(true, { emitEvent: false });
      if (this.form.controls.startTime.value)
        this.form.controls.startTime.setValue(null, { emitEvent: false });
      if (this.form.controls.endTime.value)
        this.form.controls.endTime.setValue(null, { emitEvent: false });
      if (this.form.controls.totalHours.value !== null) {
        this.form.controls.totalHours.setValue(null, { emitEvent: false });
      }
    }

    if (dt === DurationType.Hours && isRep === true) {
      if (this.form.controls.startTime.value)
        this.form.controls.startTime.setValue(null, { emitEvent: false });
      if (this.form.controls.endTime.value)
        this.form.controls.endTime.setValue(null, { emitEvent: false });
    }

    // Validators:
    this.form.setErrors(null);
    this.form.controls.startTime.clearValidators();
    this.form.controls.endTime.clearValidators();

    const needsRange = dt === DurationType.Hours && isRep === false;
    if (needsRange) {
      this.form.controls.startTime.addValidators([Validators.required]);
      this.form.controls.endTime.addValidators([Validators.required]);

      const s = this.toHmsOrNull(this.form.controls.startTime.value);
      const e = this.toHmsOrNull(this.form.controls.endTime.value);

      if (!s || !e) {
        this.form.setErrors({ rangeRequired: true });
      } else {
        const sMin = this.toMinutes(s);
        const eMin = this.toMinutes(e);
        if (eMin <= sMin) this.form.setErrors({ invalidRangeOrder: true });
      }
    }

    this.form.controls.startTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.endTime.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeRepeatPrice() {
    const price = this.form.controls.price.value ?? 0;
    const repeat = this.form.controls.repeatPrice.value;
    if (repeat == null) {
      this.form.controls.repeatPrice.setValue(price, { emitEvent: false });
    }
  }

  private buildDto(): AddPricingSchemaCommand {
    const v = this.form.getRawValue();
    const isDays = v.durationType === DurationType.Days;
    const isHours = v.durationType === DurationType.Hours;
    const needsRange = isHours && v.isRepeated === false;

    const start = needsRange ? this.toHmsOrNull(v.startTime) : null;
    const end = needsRange ? this.toHmsOrNull(v.endTime) : null;

    return {
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime: start,
      endTime: end,
      price: Number(v.price ?? 0),
      isRepeated: isDays ? true : !!v.isRepeated,
      repeatPrice: Number(v.repeatPrice ?? v.price ?? 0),
      orderPriority: v.orderPriority ?? 1,
      isActive: v.isActive!,
      totalHours: isHours ? (v.totalHours != null ? Number(v.totalHours) : 0) : undefined, // NEW
      totalDays: undefined,  
    };
  }

  // ====== Lifecycle ======
  ngOnInit(): void {
    this.loadRows();
    // تأثيرات التزامن مع القواعد
    this.form.controls.durationType.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.isRepeated.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.startTime.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.endTime.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.price.valueChanges.subscribe(() => this.normalizeRepeatPrice());

    // أول ضبط
    this.updateTimeAndModeRules();
  }

  // ====== UI Helpers ======
  editingId(): number | null {
    return this.editingRowId();
  }

  setMode(mode: DurationType) {
    this.form.controls.durationType.setValue(mode, { emitEvent: true });
  }

  // ====== CRUD ======
  private loadRows() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (data) => {
        const normalized = (data || []).map((r) => ({
          ...r,
          repeatPrice: r.repeatPrice ?? r.price,
          isActive: r.isActive ?? true,
          // نضمن أن start/end يظهروا فقط لما تكون ساعات + not repeated
          startTime:
            r.durationType === DurationType.Hours && r.isRepeated === false ? r.startTime : null,
          endTime:
            r.durationType === DurationType.Hours && r.isRepeated === false ? r.endTime : null,
        }));
        this.rows.set(normalized);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.rows.set([]);
      },
    });
  }

  resetForm() {
    this.form.reset({
      id: null,
      name: '',
      durationType: DurationType.Days,
      startTime: null,
      endTime: null,
      price: null,
      isRepeated: true,
      repeatPrice: null,
      orderPriority: 1,
      isActive: true,
      totalHours: null,
    });
    this.editingRowId.set(null);
    this.updateTimeAndModeRules();
  }

  edit(r: PricingRow) {
    const isDays = (r.durationType ?? DurationType.Days) === DurationType.Days;
    this.form.reset({
      id: r.id ?? null,
      name: r.name ?? '',
      durationType: r.durationType ?? DurationType.Days,
      startTime:
        r.durationType === DurationType.Hours && r.isRepeated === false
          ? r.startTime ?? null
          : null,
      endTime:
        r.durationType === DurationType.Hours && r.isRepeated === false ? r.endTime ?? null : null,
      price: r.price ?? null,
      isRepeated: isDays ? true : !!r.isRepeated,
      repeatPrice: r.repeatPrice ?? r.price ?? null,
      orderPriority: r.orderPriority ?? 1,
      isActive: r.isActive ?? true,
      totalHours: r.totalHours ?? null,
    });

    this.editingRowId.set(r.id ?? null);
    this.updateTimeAndModeRules();
  }

  remove(r: PricingRow) {
    if (!r?.id) return;
    if (!confirm('هل أنت متأكد من الحذف؟')) return;

    this.saving.set(true);
    this.api.delete(r.id).subscribe({
      next: () => {
        this.rows.set(this.rows().filter((x) => x.id !== r.id));
        this.saving.set(false);
        if (this.editingRowId() === r.id) this.resetForm();
      },
      error: () => this.saving.set(false),
    });
  }

  save() {
    this.updateTimeAndModeRules();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.buildDto();
    this.saving.set(true);

    //const currentId = this.form.controls.id.value; // ممكن تكون null

    // ADD

    this.api.add(dto).subscribe({
      next: (created) => {
        const safeCreated: PricingRow = {
          ...created,
          repeatPrice: created?.repeatPrice ?? dto.price,
          isActive: created?.isActive ?? true,
        };
        const list = this.rows() ?? []; // أمان احتياطي
        this.rows.set([safeCreated, ...list]);
        this.saving.set(false);
        this.resetForm();
      },
      error: () => this.saving.set(false),
    });
    return;
  }
}
