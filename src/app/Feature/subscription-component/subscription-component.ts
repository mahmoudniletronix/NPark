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

  // ====== State (signals) ======
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  rows = signal<PricingRow[]>([]);
  query = signal<string>('');
  private editingRowId = signal<number | null>(null);

  // ====== Form ======
  form = this.fb.group({
    id: this.fb.control<number | null>(null),
    name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    durationType: this.fb.control<DurationType>(DurationType.Days, {
      nonNullable: true,
    }),
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    price: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    isRepeated: this.fb.control<boolean>(true, { nonNullable: true }),
    repeatPrice: this.fb.control<number | null>(null, {
      validators: [Validators.min(0)],
    }),
    orderPriority: this.fb.control<number | null>(1, {
      validators: [Validators.min(1)],
    }),
    isActive: this.fb.control<boolean>(true, { nonNullable: true }),
  });

  // ====== Derived View ======
  filtered = computed(() => {
    const q = (this.query() || '').trim().toLowerCase();
    const data = this.rows();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        (r.durationType === DurationType.Hours ? 'ساعات' : 'أيام').toLowerCase().includes(q)
    );
  });

  // ====== Helpers ======
  private toTimeOrNull(value: string | null | undefined): string | null {
    if (!value) return null;
    return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  }

  private updateTimeValidators() {
    const durationType = this.form.controls.durationType.value;
    const isRepeated = this.form.controls.isRepeated.value;

    this.form.setErrors(null);
    this.form.controls.startTime.clearValidators();
    this.form.controls.endTime.clearValidators();

    const needsRange = durationType === DurationType.Hours && isRepeated === false;

    if (needsRange) {
      this.form.controls.startTime.addValidators([Validators.required]);
      this.form.controls.endTime.addValidators([Validators.required]);

      const start = this.form.controls.startTime.value;
      const end = this.form.controls.endTime.value;
      if (!start || !end) {
        this.form.setErrors({ rangeRequired: true });
      } else if (end <= start) {
        this.form.setErrors({ invalidRangeOrder: true });
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

  // ====== Effects ======
  private formEffect = effect(() => {
    const dt = this.form.controls.durationType.value;
    const isRep = this.form.controls.isRepeated.value;

    if (dt === DurationType.Days) {
      if (!isRep) {
        this.form.controls.isRepeated.setValue(true, { emitEvent: false });
      }
      if (!this.form.controls.isRepeated.disabled) {
        this.form.controls.isRepeated.disable({ emitEvent: false });
      }
    } else {
      if (this.form.controls.isRepeated.disabled) {
        this.form.controls.isRepeated.enable({ emitEvent: false });
      }
    }

    this.updateTimeValidators();
  });

  // ====== Lifecycle ======
  ngOnInit(): void {
    this.loadRows();

    this.form.controls.isRepeated.valueChanges.subscribe(() => this.updateTimeValidators());
    this.form.controls.startTime.valueChanges.subscribe(() => this.updateTimeValidators());
    this.form.controls.endTime.valueChanges.subscribe(() => this.updateTimeValidators());
    this.form.controls.price.valueChanges.subscribe(() => this.normalizeRepeatPrice());
  }

  // ====== UI Helpers ======
  showRangeWindow(): boolean {
    const dt = this.form.controls.durationType.value;
    const rep = this.form.controls.isRepeated.value;
    return dt === DurationType.Hours && rep === false;
  }

  editingId(): number | null {
    return this.editingRowId();
  }

  setMode(mode: DurationType) {
    this.form.controls.durationType.setValue(mode, { emitEvent: true });

    if (mode === DurationType.Days) {
      this.form.controls.isRepeated.setValue(true, { emitEvent: false });
      this.form.controls.isRepeated.disable({ emitEvent: false });
    } else {
      this.form.controls.isRepeated.enable({ emitEvent: false });
    }

    this.updateTimeValidators();
  }

  // ====== CRUD ======
  private loadRows() {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (res: any) => {
        const data: PricingRow[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const normalized = data.map((r) => ({
          ...r,
          repeatPrice: r.repeatPrice ?? r.price,
          isActive: r.isActive ?? true,
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
    });
    this.editingRowId.set(null);
    this.form.controls.isRepeated.disable({ emitEvent: false });
    this.updateTimeValidators();
  }

  edit(r: PricingRow) {
    const isDays = (r.durationType ?? DurationType.Days) === DurationType.Days;
    this.form.reset({
      id: r.id ?? null,
      name: r.name ?? '',
      durationType: r.durationType ?? DurationType.Days,
      startTime: r.startTime ?? null,
      endTime: r.endTime ?? null,
      price: r.price ?? null,
      isRepeated: isDays ? true : !!r.isRepeated,
      repeatPrice: r.repeatPrice ?? r.price ?? null,
      orderPriority: r.orderPriority ?? 1,
      isActive: r.isActive ?? true,
    });

    if (isDays) {
      this.form.controls.isRepeated.disable({ emitEvent: false });
    } else {
      this.form.controls.isRepeated.enable({ emitEvent: false });
    }

    this.editingRowId.set(r.id ?? null);
    this.updateTimeValidators();
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
      error: () => {
        this.saving.set(false);
      },
    });
  }

  private toHmsOrEmpty(v: string | null): string {
    if (!v) return '';
    if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
    return '';
  }

  private buildApiPayload(v: ReturnType<typeof this.form.getRawValue>): AddPricingSchemaCommand {
    const isDays = v.durationType === DurationType.Days;
    const isHours = v.durationType === DurationType.Hours;
    const needsRange = isHours && v.isRepeated === false;

    const start = needsRange ? this.toHmsOrEmpty(v.startTime) : '';
    const end = needsRange ? this.toHmsOrEmpty(v.endTime) : '';

    const totalDays = isDays ? 30 : 0;
    const totalHours = isHours && v.isRepeated ? 0 : 0;

    return {
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime: start,
      endTime: end,
      price: Number(v.price ?? 0),
      isRepeated: isDays ? true : !!v.isRepeated,
      orderPriority: v.orderPriority ?? 1,
      totalDays,
      totalHours,
      repeatPrice: Number(v.repeatPrice ?? 0),
    };
  }

  save() {
    this.updateTimeValidators();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const isHours = v.durationType === DurationType.Hours;
    const needsRange = isHours && v.isRepeated === false;

    if (needsRange) {
      const startOk = !!this.toHmsOrEmpty(v.startTime);
      const endOk = !!this.toHmsOrEmpty(v.endTime);
      if (!startOk) this.form.get('startTime')?.setErrors({ required: true });
      if (!endOk) this.form.get('endTime')?.setErrors({ required: true });
      if (!startOk || !endOk) return;
    }

    const payload: PricingRow = {
      id: v.id ?? undefined,
      name: v.name?.trim()!,
      durationType: v.durationType!,
      startTime: needsRange ? this.toHmsOrEmpty(v.startTime) : (null as any),
      endTime: needsRange ? this.toHmsOrEmpty(v.endTime) : (null as any),
      price: Number(v.price ?? 0),
      isRepeated: v.durationType === DurationType.Days ? true : !!v.isRepeated,
      repeatPrice: v.repeatPrice != null ? Number(v.repeatPrice) : Number(v.price ?? 0),
      orderPriority: v.orderPriority ?? 1,
      isActive: v.isActive!,
    };

    this.saving.set(true);

    if (!payload.id) {
      const apiPayload = this.buildApiPayload(v);

      this.api.add(apiPayload as any).subscribe({
        next: (created) => {
          const newRow: PricingRow = {
            ...created,
            repeatPrice: (created as any).repeatPrice ?? payload.price,
            isActive: (created as any).isActive ?? true,
          };
          this.rows.set([newRow, ...this.rows()]);
          this.saving.set(false);
          this.resetForm();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.api.update(payload).subscribe({
        next: (updated) => {
          const upd: PricingRow = {
            ...updated,
            repeatPrice: updated.repeatPrice ?? updated.price,
            isActive: updated.isActive ?? true,
          };
          this.rows.set(this.rows().map((x) => (x.id === upd.id ? upd : x)));
          this.saving.set(false);
          this.resetForm();
        },
        error: () => this.saving.set(false),
      });
    }
  }
}
