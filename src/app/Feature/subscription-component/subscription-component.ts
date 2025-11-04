import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  AddPricingSchemaCommand,
  DurationType,
  PricingRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import {
  SubscriptionType,
  UpdatePricingSchemaCommand,
} from '../../Services/subscription-type/subscription-type';

type AddPricingSchemaCommandEx = AddPricingSchemaCommand & { totalYears?: number | null };
type UpdatePricingSchemaCommandEx = UpdatePricingSchemaCommand & { totalYears?: number | null };

type FormShape = {
  id: FormControl<string | null>;
  name: FormControl<string>;
  durationType: FormControl<DurationType>;
  startTime: FormControl<string | null>;
  endTime: FormControl<string | null>;
  price: FormControl<number | null>;
  isRepeated: FormControl<boolean>;
  orderPriority: FormControl<number | null>;
  totalHours: FormControl<number | null>;
  totalDays: FormControl<number | null>;
  totalYears: FormControl<number | null>;
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
  public DurationType = DurationType;

  page = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  hasPrev = computed(() => this.page() > 1);
  hasNext = signal(false);

  loading = signal(false);
  saving = signal(false);
  rows = signal<PricingRow[]>([]);
  query = signal<string>('');
  private editingRowId = signal<string | null>(null);

  form = this.fb.group<FormShape>({
    id: this.fb.control<string | null>(null),
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
    orderPriority: this.fb.control<number | null>(null),
    totalHours: this.fb.control<number | null>(null),
    totalDays: this.fb.control<number | null>(1, { validators: [Validators.min(1)] }),
    totalYears: this.fb.control<number | null>(null),
  });

  filtered = computed(() => {
    const q = (this.query() || '').trim().toLowerCase();
    const data = this.rows();
    if (!q) return data;
    return data.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) || this.durationLabel(r.durationType).includes(q)
    );
  });

  onSearch(q: string) {
    this.query.set(q);
    this.page.set(1);
    this.loadRows();
  }

  // ====== Flags ======
  isDays(): boolean {
    return this.form.controls.durationType.value === DurationType.Days;
  }
  isHours(): boolean {
    return this.form.controls.durationType.value === DurationType.Hours;
  }
  isYears(): boolean {
    return this.form.controls.durationType.value === DurationType.Years;
  }

  showIsRepeated(): boolean {
    return this.isHours();
  }
  showRangeWindow(): boolean {
    return this.isHours() && this.form.controls.isRepeated.value === false;
  }

  private toHmsOrNull(v: string | null | undefined): string | null {
    if (!v) return null;
    if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
    return null;
  }
  private toHms(t?: string | null): string | null {
    if (!t) return null;
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return null;
  }
  private toHmForInput(t?: string | null): string | null {
    if (!t) return null;
    const m = t.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    return m ? `${m[1]}:${m[2]}` : null;
  }

  // ====== Validation rules ======
  private updateTimeAndModeRules() {
    const dt = this.form.controls.durationType.value;
    const isRep = this.form.controls.isRepeated.value;

    this.form.controls.startTime.clearValidators();
    this.form.controls.endTime.clearValidators();
    this.form.controls.orderPriority.clearValidators();
    this.form.controls.totalDays.clearValidators();
    this.form.controls.totalHours.clearValidators();
    this.form.controls.totalYears.clearValidators();

    this.form.controls.price.setValidators([Validators.required, Validators.min(0)]);

    if (dt === DurationType.Days) {
      this.form.controls.totalDays.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.totalYears.setValue(null, { emitEvent: false });
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.isRepeated.setValue(false, { emitEvent: false });
      this.form.controls.orderPriority.setValue(null, { emitEvent: false });
    }

    if (dt === DurationType.Hours) {
      this.form.controls.totalHours.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
      this.form.controls.totalYears.setValue(null, { emitEvent: false });

      if (isRep) {
        this.form.controls.orderPriority.setValidators([Validators.required, Validators.min(1)]);
        this.form.controls.startTime.setValue(null, { emitEvent: false });
        this.form.controls.endTime.setValue(null, { emitEvent: false });
      } else {
        this.form.controls.startTime.setValidators([Validators.required]);
        this.form.controls.endTime.setValidators([Validators.required]);
      }
    }

    if (dt === DurationType.Years) {
      this.form.controls.totalYears.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.isRepeated.setValue(false, { emitEvent: false });
      this.form.controls.orderPriority.setValue(null, { emitEvent: false });
    }

    this.form.controls.startTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.endTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.totalDays.updateValueAndValidity({ emitEvent: false });
    this.form.controls.totalHours.updateValueAndValidity({ emitEvent: false });
    this.form.controls.totalYears.updateValueAndValidity({ emitEvent: false });
    this.form.controls.orderPriority.updateValueAndValidity({ emitEvent: false });
    this.form.controls.price.updateValueAndValidity({ emitEvent: false });
  }

  // ====== DTO builders ======
  private buildAddDto(): AddPricingSchemaCommandEx {
    const v = this.form.getRawValue();
    const isHours = v.durationType === DurationType.Hours;
    const isDays = v.durationType === DurationType.Days;
    const isYears = v.durationType === DurationType.Years;
    const isRep = !!v.isRepeated;

    const startTime = isHours && !isRep ? this.toHmsOrNull(v.startTime) : null;
    const endTime = isHours && !isRep ? this.toHmsOrNull(v.endTime) : null;

    return {
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime,
      endTime,
      price: Number(v.price ?? 0),
      isRepeated: isHours ? isRep : false,
      orderPriority: isHours && isRep ? v.orderPriority ?? null : null,
      totalHours: isHours ? Number(v.totalHours ?? 0) : null,
      totalDays: isDays ? Number(v.totalDays ?? 0) : null,
      // ===== (جديد) totalYears للسنوي
      totalYears: isYears ? Number(v.totalYears ?? 0) : null,
    };
  }

  private buildUpdateDto(): UpdatePricingSchemaCommandEx {
    const v = this.form.getRawValue();
    let id = this.editingRowId();
    if ((id === null || id === undefined) && v.id !== null && v.id !== undefined) {
      id = v.id;
    }
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Cannot update without a valid id');
    }

    const isHours = v.durationType === DurationType.Hours;
    const isDays = v.durationType === DurationType.Days;
    const isYears = v.durationType === DurationType.Years;
    const isRep = !!v.isRepeated;

    const startTime = isHours && !isRep ? this.toHms(v.startTime) : null;
    const endTime = isHours && !isRep ? this.toHms(v.endTime) : null;

    return {
      id,
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime,
      endTime,
      price: Number(v.price ?? 0),
      isRepeated: isHours ? isRep : false,
      orderPriority: isHours && isRep ? v.orderPriority ?? 1 : null,
      totalHours: isHours ? Number(v.totalHours ?? 0) : null,
      totalDays: isDays ? Number(v.totalDays ?? 0) : null,
      // ===== (جديد)
      totalYears: isYears ? Number(v.totalYears ?? 0) : null,
    };
  }

  // ====== OrderPriority uniqueness helpers ======
  private getTakenPriorities(excludeId?: string | null): Set<number> {
    const set = new Set<number>();
    for (const r of this.rows() ?? []) {
      const rid = this.normalizeId(r);
      if (excludeId !== undefined && excludeId !== null && rid === excludeId) continue;
      if (r?.isRepeated && typeof r.orderPriority === 'number' && r.orderPriority > 0) {
        set.add(r.orderPriority);
      }
    }
    return set;
  }

  private nextAvailablePriority(excludeId?: string | null): number {
    const taken = this.getTakenPriorities(excludeId);
    let p = 1;
    while (taken.has(p)) p++;
    return p;
  }

  private ensureUniqueOrderPriorityForAdd(
    dto: AddPricingSchemaCommandEx
  ): AddPricingSchemaCommandEx {
    if (!dto.isRepeated) {
      return { ...dto, orderPriority: null };
    }
    let p = dto.orderPriority ?? 0;
    if (typeof p !== 'number' || p <= 0) {
      p = this.nextAvailablePriority(null);
    }
    const taken = this.getTakenPriorities(null);
    if (taken.has(p)) {
      p = this.nextAvailablePriority(null);
    }
    return { ...dto, orderPriority: p };
  }

  private ensureUniqueOrderPriorityForUpdate(
    dto: UpdatePricingSchemaCommandEx
  ): UpdatePricingSchemaCommandEx {
    if (!dto.isRepeated) {
      return { ...dto, orderPriority: null };
    }
    const excludeId = dto.id;
    let p = dto.orderPriority ?? 0;
    if (typeof p !== 'number' || p <= 0) {
      p = this.nextAvailablePriority(excludeId);
    }
    const taken = this.getTakenPriorities(excludeId);
    if (taken.has(p)) {
      p = this.nextAvailablePriority(excludeId);
    }
    return { ...dto, orderPriority: p };
  }

  // ====== Lifecycle ======
  ngOnInit(): void {
    this.loadRows();

    this.form.controls.durationType.valueChanges.subscribe(() => {
      this.updateTimeAndModeRules();
    });
    this.form.controls.isRepeated.valueChanges.subscribe(() => {
      this.updateTimeAndModeRules();
    });

    this.updateTimeAndModeRules();
  }

  // ====== UI Helpers ======
  editingId(): string | null {
    return this.editingRowId();
  }

  setMode(mode: DurationType) {
    this.form.controls.durationType.setValue(mode, { emitEvent: true });
  }

  durationLabel(dt: DurationType | null | undefined): string {
    switch (dt) {
      case DurationType.Hours:
        return 'ساعات';
      case DurationType.Days:
        return 'أيام';
      case DurationType.Years:
        return 'سنوي';
      default:
        return '';
    }
  }

  // ====== CRUD ======
  private loadRows() {
    this.loading.set(true);
    this.api.list(this.page(), this.pageSize(), this.query()).subscribe({
      next: (res) => {
        this.rows.set(res.data ?? []);
        this.totalItems.set(res.totalItems ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
        this.hasNext.set(!!res.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.hasNext.set(false);
        this.loading.set(false);
      },
    });
  }

  goPrev() {
    if (!this.hasPrev()) return;
    this.page.update((p) => p - 1);
    this.loadRows();
  }
  goNext() {
    if (!this.hasNext()) return;
    this.page.update((p) => p + 1);
    this.loadRows();
  }

  resetForm() {
    this.form.reset({
      id: '',
      name: '',
      durationType: DurationType.Days,
      startTime: null,
      endTime: null,
      price: null,
      isRepeated: false,
      orderPriority: null,
      totalHours: null,
      totalDays: 1,
      // ===== (جديد)
      totalYears: null,
    });
    this.editingRowId.set(null);
    this.updateTimeAndModeRules();
  }

  remove(r: PricingRow) {
    const normId = this.normalizeId(r);
    if (normId === null || normId === undefined) return;
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    this.saving.set(true);
    this.api.delete(normId).subscribe({
      next: () => {
        this.loadRows();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  save() {
    this.updateTimeAndModeRules();
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      console.log('Form is invalid', this.form.errors);
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.log(`Field ${key} is invalid:`, control.errors);
        }
      });
      return;
    }

    const isEdit = this.editingRowId() !== null && this.editingRowId() !== undefined;
    this.saving.set(true);

    try {
      if (isEdit) {
        let dto = this.buildUpdateDto();
        console.log('Sending update DTO:', JSON.stringify(dto, null, 2));

        if (!this.validateDto(dto)) {
          this.saving.set(false);
          return;
        }

        dto = this.ensureUniqueOrderPriorityForUpdate(dto);

        this.api.update(dto).subscribe({
          next: () => {
            this.page.set(1);
            this.loadRows();
            this.saving.set(false);
            this.resetForm();
          },
          error: (err) => {
            this.saving.set(false);
            console.error('Update failed - Full error:', err);
            console.error('Error status:', err.status);
            console.error('Error message:', err.message);
            console.error('Error body:', err.error);
            this.handleApiError(err);
          },
        });
      } else {
        let dto = this.buildAddDto();
        console.log('Sending add DTO:', JSON.stringify(dto, null, 2));

        if (!this.validateDto(dto)) {
          this.saving.set(false);
          return;
        }

        dto = this.ensureUniqueOrderPriorityForAdd(dto);

        this.api.add(dto).subscribe({
          next: () => {
            this.page.set(1);
            this.loadRows();
            this.saving.set(false);
            this.resetForm();
          },
          error: (err) => {
            this.saving.set(false);
            console.error('Add failed - Full error:', err);
            console.error('Error status:', err.status);
            console.error('Error message:', err.message);
            console.error('Error body:', err.error);
            this.handleApiError(err);
          },
        });
      }
    } catch (error) {
      this.saving.set(false);
      console.error('Error building DTO:', error);
      alert('حدث خطأ في إعداد البيانات: ' + error);
    }
  }

  private validateDto(dto: any): boolean {
    const errors: string[] = [];

    if (!dto.name || dto.name.trim().length < 2) {
      errors.push('الاسم مطلوب ويجب أن يكون على الأقل حرفين');
    }

    if (dto.price === null || dto.price === undefined || dto.price < 0) {
      errors.push('السعر مطلوب ويجب أن يكون 0 أو أكثر');
    }

    if (dto.durationType === DurationType.Days) {
      if (!dto.totalDays || dto.totalDays < 1) {
        errors.push('إجمالي الأيام مطلوب ويجب أن يكون 1 أو أكثر');
      }
    } else if (dto.durationType === DurationType.Hours) {
      if (!dto.totalHours || dto.totalHours < 1) {
        errors.push('إجمالي الساعات مطلوب ويجب أن يكون 1 أو أكثر');
      }
      if (dto.isRepeated) {
        if (!dto.orderPriority || dto.orderPriority < 1) {
          errors.push('ترتيب الشريحة مطلوب عند اختيار حساب متكرر');
        }
      } else {
        if (!dto.startTime || !dto.endTime) {
          errors.push('وقت البداية والنهاية مطلوبان عندما لا يكون الحساب متكرر');
        }
      }
    } else if (dto.durationType === DurationType.Years) {
      if (!dto.totalYears || dto.totalYears < 1) {
        errors.push('إجمالي السنوات مطلوب ويجب أن يكون 1 أو أكثر');
      }
    }

    if (errors.length > 0) {
      alert('أخطاء في البيانات:\n' + errors.join('\n'));
      return false;
    }

    return true;
  }

  private handleApiError(err: any) {
    console.log('Full error response:', err);

    if (err?.error) {
      console.log('Error details:', err.error);

      let errorMessage = 'حدث خطأ في الخادم:\n\n';

      if (err.error.errors) {
        errorMessage += 'أخطاء التحقق:\n';
        Object.keys(err.error.errors).forEach((field) => {
          errorMessage += `• ${field}: ${err.error.errors[field].join(', ')}\n`;
        });
      } else if (err.error.title) {
        errorMessage += `العنوان: ${err.error.title}\n`;
      }

      if (err.error.status) {
        errorMessage += `الحالة: ${err.error.status}\n`;
      }

      if (err.error.traceId) {
        errorMessage += `رقم التتبع: ${err.error.traceId}\n`;
      }

      if (err.error.type) {
        errorMessage += `النوع: ${err.error.type}\n`;
      }

      alert(errorMessage);
    } else if (err?.message) {
      alert('خطأ في الاتصال: ' + err.message);
    } else {
      alert('حدث خطأ غير متوقع');
    }
  }

  cancelEdit() {
    this.resetForm();
  }

  private normalizeId(obj: any): string | null {
    const v = obj?.id ?? obj?.Id ?? obj?.pricingSchemaId ?? obj?.PricingSchemaId ?? null;
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  }

  private focusForm() {
    const el = document.querySelector('.subscription .card');
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  edit(r: PricingRow) {
    console.log('Editing row:', r);

    const dt = (r.durationType ?? DurationType.Days) as DurationType;
    const isHours = dt === DurationType.Hours;
    const isDays = dt === DurationType.Days;
    const isYears = dt === DurationType.Years;
    const rep = isHours ? !!r.isRepeated : false;

    this.editingRowId.set(r.id ?? null);

    const formValues: any = {
      id: r.id ?? null,
      name: r.name ?? '',
      durationType: dt,
      price: r.price ?? null,
      isRepeated: rep,
      orderPriority: isHours && rep ? r.orderPriority ?? 1 : null,
      totalHours: isHours ? r.totalHours ?? 1 : null,
      totalDays: isDays ? r.totalDays ?? 1 : null,
      // ===== (جديد)
      totalYears: isYears ? (r as any).totalYears ?? 1 : null,
    };

    if (isHours && !rep) {
      formValues.startTime = this.toHmForInput(r.startTime) || '00:00';
      formValues.endTime = this.toHmForInput(r.endTime) || '00:00';
    } else {
      formValues.startTime = null;
      formValues.endTime = null;
    }

    this.form.setValue(formValues);
    console.log('Form values after set:', this.form.value);

    this.updateTimeAndModeRules();
    this.focusForm();
  }
}
