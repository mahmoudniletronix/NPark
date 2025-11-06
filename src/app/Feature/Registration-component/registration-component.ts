import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  PricingSchemaDto,
  Registrationservice,
} from '../../Services/registration/registrationservice';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import {
  DocumentItem,
  PagedResult,
  ParkingMembershipDto,
  PlateGroup,
} from '../../Domain/registration/registration-model';
import { DurationType } from '../../Domain/Subscription-type/subscription-type.models';

@Component({
  selector: 'app-registration-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registration-component.html',
  styleUrl: './registration-component.css',
})
export class RegistrationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(Registrationservice);
  private nfc = inject(NfcReaderService);

  // State
  loading = signal(false);
  pageNumber = signal(1);
  pageSize = signal(10);

  result = signal<PagedResult<ParkingMembershipDto> | null>(null);
  rows = computed(() => this.result()?.data ?? []);
  hasNext = computed(() => !!this.result()?.hasNextPage);
  hasPrev = computed(() => !!this.result()?.hasPreviousPage);
  totalItems = computed(() => this.result()?.totalItems ?? 0);
  totalPages = computed(() => this.result()?.totalPages ?? 0);

  saving = signal(false);

  documents = signal<DocumentItem[]>([]);
  previewOpen = signal(false);
  currentPreview = signal<DocumentItem | null>(null);

  schemas = signal<PricingSchemaDto[]>([]);
  loadingSchemas = signal(false);

  readingCard = signal(false);

  load() {
    this.loading.set(true);
    this.svc.getMemberships(this.pageNumber(), this.pageSize()).subscribe({
      next: (res) => this.result.set(res),
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }

  first() {
    if (this.pageNumber() === 1) return;
    this.pageNumber.set(1);
    this.load();
  }
  prev() {
    if (!this.hasPrev()) return;
    this.pageNumber.set(this.pageNumber() - 1);
    this.load();
  }
  next() {
    if (!this.hasNext()) return;
    this.pageNumber.set(this.pageNumber() + 1);
    this.load();
  }
  last() {
    const lastPage = this.totalPages();
    if (!lastPage || this.pageNumber() === lastPage) return;
    this.pageNumber.set(lastPage);
    this.load();
  }
  changePageSize(size: number) {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.load();
  }

  // === Validators ===
  plateRequiredValidator(group: AbstractControl) {
    const p1 = (group.get('p1')?.value || '').trim();
    const p2 = (group.get('p2')?.value || '').trim();
    const p3 = (group.get('p3')?.value || '').trim();
    const p4 = (group.get('p4')?.value || '').trim();

    return p1 || p2 || p3 || p4 ? null : { required: true };
  }

  form: FormGroup = this.fb.group(
    {
      cardNo: ['', [Validators.required, Validators.pattern(/^[0-9A-Fa-f]{6,16}$/)]],
      pricingSchemaId: [null, [Validators.required]],

      plate: this.fb.group(
        { p1: [''], p2: [''], p3: [''], p4: [''] },
        { validators: [this.plateRequiredValidator] }
      ),

      subscriberName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+?\d{7,15})$/)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{10,16}$/)]],

      durationType: [DurationType.Hours, Validators.required],
      dateFrom: [null],
      dateTo: [null],
      timeFrom: ['09:00'],
      timeTo: ['15:30'],
      price: [null],
      orderPriority: [1, [Validators.min(1)]],
    },
    { validators: [timeRangeValidator] }
  );

  isHours = computed(() => this.form.get('durationType')?.value === DurationType.Hours);
  isDaysOrMonthly = computed(() => this.form.get('durationType')?.value !== DurationType.Hours);

  constructor() {
    this.loadPricingSchemas();

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

  ngOnInit(): void {
    this.loadPricingSchemas();
    this.load();
  }

  private loadPricingSchemas() {
    this.loadingSchemas.set(true);
    this.svc.getAll().subscribe({
      next: (list) => this.schemas.set(list ?? []),
      error: () => this.loadingSchemas.set(false),
      complete: () => this.loadingSchemas.set(false),
    });
  }

  async readCard() {
    if (this.readingCard()) return;
    this.readingCard.set(true);
    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();
      this.form.get('cardNo')?.setValue(normalized);
      this.form.get('cardNo')?.markAsDirty();
      this.form.get('cardNo')?.markAsTouched();
      this.form.get('cardNo')?.updateValueAndValidity();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'تعذر قراءة الكارت. تأكد من تشغيل قارئ الـ NFC.');
    } finally {
      this.readingCard.set(false);
    }
  }

  openScanner(inputEl: HTMLInputElement) {
    try {
      inputEl.click();
    } catch {}
  }

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
        file: f,
      });
    }
    this.documents.set([...this.documents(), ...addeds]);
    (ev.target as HTMLInputElement).value = '';
  }

  openPreview(d: DocumentItem) {
    this.currentPreview.set(d);
    this.previewOpen.set(true);
    queueMicrotask(() => {
      const overlay = document.querySelector('.preview-overlay') as HTMLElement | null;
      overlay?.focus();
    });
  }
  closePreview(_: MouseEvent) {
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

  private normalizeLetters(raw: string): string {
    if (!raw) return '';
    const letters =
      raw
        .replace(/\s+/g, '')
        .toUpperCase()
        .match(/[A-Z\u0621-\u064A]/g) ?? [];
    return letters.join(' ');
  }

  formatLetters(ctrl: 'p2') {
    const group = this.form.get('plate');
    if (!group) return;
    const c = group.get(ctrl);
    const val = (c?.value ?? '') as string;
    const formatted = this.normalizeLetters(val);
    if (formatted !== val) {
      c?.setValue(formatted, { emitEvent: false });
      c?.markAsDirty();
    }
  }

  private joinPlate(plate: PlateGroup): string {
    const p1 = (plate?.p1 ?? '').toString().trim();
    const p2 = this.normalizeLetters(plate?.p2 ?? '');
    const p4 = (plate?.p4 ?? '').toString().trim();

    return [p1, p2, p4].filter(Boolean).join(' ');
  }

  // ====== SUBMIT ======
  save() {
    this.form.get('plate')?.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.getRawValue();

    const vehicleNumber = this.joinPlate(v.plate as PlateGroup);

    const fd = new FormData();
    fd.append('Name', (v.subscriberName ?? '').trim());
    fd.append('Phone', v.phone);
    fd.append('NationalId', v.nationalId);
    fd.append('VehicleNumber', vehicleNumber);
    fd.append('CardNumber', v.cardNo);
    fd.append('PricingSchemeId', v.pricingSchemaId);

    const imgs = this.documents().filter((d) => d.isImage && d.file);
    for (const img of imgs) {
      fd.append('VehicleImage', img.file as File, img.name);
    }

    this.svc.addMembership(fd).subscribe({
      next: () => {
        alert('تم حفظ الاشتراك بنجاح ✅');
        this.reset();
      },
      error: (err) => {
        console.error(err);
        alert('تعذر حفظ الاشتراك. تأكد من الـ API والبيانات.');
        this.saving.set(false);
      },
      complete: () => this.saving.set(false),
    });
  }

  reset() {
    this.form.reset({
      pricingSchemaId: null,
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

  // private joinPlate(plate: PlateGroup): string {
  //   const parts = [plate?.p1, plate?.p2, plate?.p3, plate?.p4]
  //     .map((x) => (x || '').toString().trim())
  //     .filter(Boolean);
  //   return parts.join(' ');
  // }
}

/* ===== Helpers ===== */
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
function timeRangeValidator(group: AbstractControl) {
  const type = group.get('durationType')?.value as DurationType;
  if (type !== DurationType.Hours) return null;
  const from = group.get('timeFrom')?.value as string | null;
  const to = group.get('timeTo')?.value as string | null;
  if (!from || !to) return null;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  return end > start ? null : { timerange: true };
}
