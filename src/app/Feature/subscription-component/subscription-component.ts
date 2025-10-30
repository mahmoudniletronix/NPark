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
  totalDays: FormControl<number | null>;
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

  // === Expose enum to template
  public DurationType = DurationType;

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
    isRepeated: this.fb.control<boolean>(false, { nonNullable: true }),
    repeatPrice: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    orderPriority: this.fb.control<number | null>(1, { validators: [Validators.min(1)] }),
    isActive: this.fb.control<boolean>(true, { nonNullable: true }),
    totalHours: this.fb.control<number | null>(null, {}),
    totalDays: this.fb.control<number | null>(1, { validators: [Validators.min(1)] }),
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

  // ====== UI flags ======
  isDays(): boolean {
    return this.form.controls.durationType.value === DurationType.Days;
  }
  isHours(): boolean {
    return this.form.controls.durationType.value === DurationType.Hours;
  }
  showIsRepeated(): boolean {
    return this.isHours();
  }
  showRangeWindow(): boolean {
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

    this.form.setErrors(null);
    this.form.controls.startTime.clearValidators();
    this.form.controls.endTime.clearValidators();

    // === أيام ===
    if (dt === DurationType.Days) {
      if (isRep) this.form.controls.isRepeated.setValue(false, { emitEvent: false });
      // ❌ لا نعدّل start/end هنا إطلاقًا
      if (!this.form.controls.totalDays.value || this.form.controls.totalDays.value < 1) {
        this.form.controls.totalDays.setValue(1, { emitEvent: false });
      }
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
    }

    // === ساعات + متكرر ===
    if (dt === DurationType.Hours && isRep === true) {
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
    }

    // === ساعات + نافذة ===
    const needsRange = dt === DurationType.Hours && isRep === false;
    if (needsRange) {
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.startTime.addValidators([Validators.required]);
      this.form.controls.endTime.addValidators([Validators.required]);

      const s = this.toHmsOrNull(this.form.controls.startTime.value);
      const e = this.toHmsOrNull(this.form.controls.endTime.value);
      if (!s || !e) this.form.setErrors({ rangeRequired: true });
      else {
        const [sh, sm] = s.split(':').map(Number);
        const [eh, em] = e.split(':').map(Number);
        if (eh * 60 + em <= sh * 60 + sm) this.form.setErrors({ invalidRangeOrder: true });
      }
    }

    this.form.controls.startTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.endTime.updateValueAndValidity({ emitEvent: false });
  }

  private normalizeRepeatPrice() {
    const dt = this.form.controls.durationType.value;
    const isRep = this.form.controls.isRepeated.value;

    if (dt === DurationType.Hours && isRep) {
      const price = this.form.controls.price.value ?? 0;
      const repeat = this.form.controls.repeatPrice.value;
      if (repeat == null) {
        this.form.controls.repeatPrice.setValue(price, { emitEvent: false });
      }
    } else {
      if (this.form.controls.repeatPrice.value != null) {
        this.form.controls.repeatPrice.setValue(null, { emitEvent: false });
      }
    }
  }

  private buildDto(): AddPricingSchemaCommand {
    const v = this.form.getRawValue();
    const isHours = v.durationType === DurationType.Hours;
    const isDays = v.durationType === DurationType.Days;
    const repeated = isHours ? !!v.isRepeated : false;
    const needsRange = isHours && !repeated;

    const s = this.toHmsOrNull(v.startTime);
    const e = this.toHmsOrNull(v.endTime);

    return {
      name: (v.name || '').trim(),
      durationType: v.durationType!,

      startTime: isDays ? null : needsRange ? s : null,
      endTime: isDays ? null : needsRange ? e : null,

      price: Number(v.price ?? 0),
      isRepeated: repeated,

      repeatPrice: isHours && repeated ? Number(v.repeatPrice ?? v.price ?? 0) : null,

      orderPriority: v.orderPriority ?? 1,
      isActive: v.isActive!,

      totalHours: isHours && repeated ? Number(v.totalHours ?? 0) : null,

      totalDays: isDays ? Number(v.totalDays ?? 1) : null,
    };
  }

  // ====== Lifecycle ======
  ngOnInit(): void {
    this.loadRows();
    this.form.controls.durationType.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.isRepeated.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.startTime.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.endTime.valueChanges.subscribe(() => this.updateTimeAndModeRules());
    this.form.controls.price.valueChanges.subscribe(() => this.normalizeRepeatPrice());

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
        const normalized = (data || []).map((r) => {
          const isHours = r.durationType === DurationType.Hours;
          const isDays = r.durationType === DurationType.Days;
          return {
            ...r,
            repeatPrice: r.repeatPrice ?? r.price,
            isActive: r.isActive ?? true,
            isRepeated: isDays ? false : !!r.isRepeated,
            startTime:
              isHours && r.isRepeated === false
                ? r.startTime ?? null
                : isDays
                ? r.startTime ?? '00:00:00'
                : null,
            endTime:
              isHours && r.isRepeated === false
                ? r.endTime ?? null
                : isDays
                ? r.endTime ?? '00:00:00'
                : null,
            totalDays: isDays ? r.totalDays ?? 1 : null,
          } as PricingRow;
        });
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
      isRepeated: false,
      repeatPrice: null,
      orderPriority: 1,
      isActive: true,
      totalHours: null,
      totalDays: 1,
    });
    this.editingRowId.set(null);
    this.updateTimeAndModeRules();
  }

  edit(r: PricingRow) {
    const isDays = (r.durationType ?? DurationType.Days) === DurationType.Days;
    const isHours = (r.durationType ?? DurationType.Days) === DurationType.Hours;

    this.form.reset({
      id: r.id ?? null,
      name: r.name ?? '',
      durationType: r.durationType ?? DurationType.Days,
      startTime:
        isHours && r.isRepeated === false
          ? r.startTime ?? null
          : isDays
          ? r.startTime ?? '00:00'
          : null,
      endTime:
        isHours && r.isRepeated === false
          ? r.endTime ?? null
          : isDays
          ? r.endTime ?? '00:00'
          : null,
      price: r.price ?? null,
      isRepeated: isDays ? false : !!r.isRepeated,
      repeatPrice: r.repeatPrice ?? r.price ?? null,
      orderPriority: r.orderPriority ?? 1,
      isActive: r.isActive ?? true,
      totalHours: r.totalHours ?? null,
      totalDays: isDays ? r.totalDays ?? 1 : null,
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
    console.log('AddPricingSchema DTO =>', dto);

    this.saving.set(true);
    this.api.add(dto).subscribe({
      next: (created) => {
        const safeCreated: PricingRow = {
          ...created,
          repeatPrice: created?.repeatPrice ?? dto.price,
          isActive: created?.isActive ?? true,
          isRepeated: created.durationType === DurationType.Days ? false : !!created.isRepeated,
        };
        const list = this.rows() ?? [];
        this.rows.set([safeCreated, ...list]);
        this.saving.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.saving.set(false);
        console.error('422 details:', err?.status, err?.error);
      },
    });
  }
}
