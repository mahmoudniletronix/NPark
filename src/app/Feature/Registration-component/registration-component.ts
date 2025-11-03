import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

type DurationType = 'Hours' | 'Days' | 'Monthly';

interface PlateGroup {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}

interface DocumentItem {
  name: string;
  mime: string;
  size: number;
  dataUrl: string; // data:*/*;base64,...
  isImage: boolean;
}

interface RegistrationPayload {
  cardNo: string;
  plate: PlateGroup;
  subscriberName: string;
  phone: string;
  nationalId: string;
  durationType: DurationType;
  dateFrom: string | null;
  dateTo: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  price: number | null;
  orderPriority: number | null;
  documents: Array<{
    fileName: string;
    mime: string;
    size: number;
    base64: string; // بدون header
  }>;
}

@Component({
  selector: 'app-registration-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-component.html',
  styleUrl: './registration-component.css',
})
export class RegistrationComponent {
  private fb = inject(FormBuilder);

  saving = signal(false);

  // مستندات
  documents = signal<DocumentItem[]>([]);
  previewOpen = signal(false);
  currentPreview = signal<DocumentItem | null>(null);

  form: FormGroup = this.fb.group(
    {
      cardNo: ['', [Validators.required, Validators.pattern(/^\d{6,}$/)]],
      plate: this.fb.group({
        p1: ['', [Validators.required, Validators.maxLength(1)]],
        p2: ['', [Validators.required, Validators.maxLength(1)]],
        p3: ['', [Validators.required, Validators.maxLength(1)]],
        p4: ['', [Validators.required, Validators.maxLength(4), Validators.pattern(/^\d{1,4}$/)]],
      }),
      subscriberName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+?\d{7,15})$/)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{10,16}$/)]],

      durationType: ['Monthly' as DurationType, Validators.required],
      dateFrom: [null],
      dateTo: [null],
      timeFrom: ['09:00'],
      timeTo: ['15:30'],
      price: [null],
      orderPriority: [1, [Validators.min(1)]],
    },
    { validators: [timeRangeValidator] }
  );

  isHours = computed(() => this.form.get('durationType')?.value === 'Hours');
  isDaysOrMonthly = computed(() => this.form.get('durationType')?.value !== 'Hours');

  constructor() {
    effect(() => {
      const hours = this.isHours();
      const timeFrom = this.form.get('timeFrom')!;
      const timeTo = this.form.get('timeTo')!;
      const dateFrom = this.form.get('dateFrom')!;
      const dateTo = this.form.get('dateTo')!;

      if (hours) {
        timeFrom.enable({ emitEvent: false });
        timeTo.enable({ emitEvent: false });
      } else {
        timeFrom.disable({ emitEvent: false });
        timeTo.disable({ emitEvent: false });
      }

      if (this.isDaysOrMonthly()) {
        dateFrom.setValidators([Validators.required]);
        dateTo.setValidators([Validators.required]);
      } else {
        dateFrom.clearValidators();
        dateTo.clearValidators();
      }
      dateFrom.updateValueAndValidity({ emitEvent: false });
      dateTo.updateValueAndValidity({ emitEvent: false });
    });
  }

  // ===== رفع المستندات المتعددة =====
  async onPickDocuments(ev: Event) {
    const files = (ev.target as HTMLInputElement).files;
    if (!files || !files.length) return;

    const addeds: DocumentItem[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      addeds.push({
        name: f.name,
        mime: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
        isImage: isImageMime(f.type),
      });
    }
    // دمج مع الموجود
    this.documents.set([...this.documents(), ...addeds]);
    // تنظيف الـ input ليستقبل نفس الملف لاحقاً إن لزم
    (ev.target as HTMLInputElement).value = '';
  }

  openPreview(d: DocumentItem) {
    this.currentPreview.set(d);
    this.previewOpen.set(true);
    // لإتاحة Esc
    queueMicrotask(() => {
      const overlay = document.querySelector('.preview-overlay') as HTMLElement | null;
      overlay?.focus();
    });
  }
  closePreview(evt?: MouseEvent) {
    // click-outside
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }
  forceClose() {
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }

  removeDocument(index: number) {
    const arr = [...this.documents()];
    arr.splice(index, 1);
    this.documents.set(arr);
  }

  // حفظ
  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.getRawValue();

    const docsPayload = this.documents().map((d) => {
      const base64 = d.dataUrl.split(',')[1] || '';
      return {
        fileName: d.name,
        mime: d.mime,
        size: d.size,
        base64,
      };
    });

    const payload: RegistrationPayload = {
      cardNo: v.cardNo,
      plate: v.plate,
      subscriberName: (v.subscriberName ?? '').trim(),
      phone: v.phone,
      nationalId: v.nationalId,
      durationType: v.durationType,
      dateFrom: toIsoDateOrNull(v.dateFrom),
      dateTo: toIsoDateOrNull(v.dateTo),
      timeFrom: this.isHours() ? v.timeFrom : null,
      timeTo: this.isHours() ? v.timeTo : null,
      price: v.price,
      orderPriority: v.orderPriority,
      documents: docsPayload,
    };

    // TODO: استبدلها بنداء الـ API الحقيقي
    await fakeDelay(600);
    console.log('Registration payload', payload);

    this.saving.set(false);
    alert('تم حفظ الاشتراك بنجاح ✅');
    this.reset();
  }

  reset() {
    this.form.reset({
      durationType: 'Monthly',
      timeFrom: '09:00',
      timeTo: '15:30',
      orderPriority: 1,
    });
    this.documents.set([]);
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }

  hasErr(ctrlName: string, err?: string) {
    const c = this.form.get(ctrlName);
    if (!c) return false;
    return err ? !!(c.touched && c.errors?.[err]) : !!(c.touched && c.invalid);
  }

  humanSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }
}

/* ===== Helpers ===== */
function toIsoDateOrNull(value: any): string | null {
  if (!value) return null;
  return value;
}
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function isImageMime(mime: string) {
  return !!mime && mime.startsWith('image/');
}
function fakeDelay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function timeRangeValidator(group: AbstractControl) {
  const type = group.get('durationType')?.value as DurationType;
  if (type !== 'Hours') return null;
  const from = group.get('timeFrom')?.value as string | null;
  const to = group.get('timeTo')?.value as string | null;
  if (!from || !to) return null;

  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  return end > start ? null : { timerange: true };
}
