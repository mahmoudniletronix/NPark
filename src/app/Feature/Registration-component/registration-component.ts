import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  DocumentItem,
  PagedResult,
  ParkingMembershipDto,
  PlateGroup,
} from '../../Domain/registration/registration-model';
import { DurationType } from '../../Domain/Subscription-type/subscription-type.models';
import {
  PricingSchemaDto,
  Registrationservice,
} from '../../Services/registration/registrationservice';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-registration-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipePipe],
  templateUrl: './registration-component.html',
  styleUrl: './registration-component.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          // ===== Form: subscriber =====
          subscriberCard: 'بيانات المشترك',
          newBadge: 'جديد',
          plateNumber: 'رقم السيارة',
          plateIncomplete: 'برجاء استكمال خانات لوحة السيارة',
          subscriberName: 'اسم المشترك',
          namePlaceholder: 'مثال: حسام خالد',
          nameRequired: 'الاسم مطلوب (3 أحرف فأكثر)',
          phone: 'رقم التليفون',
          phonePlaceholder: 'مثال: 01012345678',
          phoneInvalid: 'رقم هاتف غير صالح',
          nationalId: 'رقم البطاقة',
          nationalIdPlaceholder: 'مثال: 2980*********',
          nationalIdInvalid: 'رقم بطاقة غير صالح',

          // ===== subscription type =====
          subscriptionType: 'نوع الاشتراك',
          loadingSchemas: 'جاري التحميل…',
          chooseSubscription: 'اختر نوع الاشتراك',
          chooseSubscriptionPlaceholder: '— اختر نوع الاشتراك —',
          schemaRequired: 'اختيار نوع الاشتراك مطلوب',

          // ===== card data =====
          cardData: 'بيانات الكارت',
          cardNumber: 'رقم الكارت',
          cardInvalid: 'رقم الكارت يجب أن يكون أحرف/أرقام هيكس بين 6 و 16.',
          readCard: 'قراءة الكارت',
          reading: 'جاري القراءة…',
          readCardTitle: 'قراءة UID من القارئ',

          // ===== documents =====
          documents: 'المستندات',
          filesCount: 'ملف',
          uploadDocs: 'رفع مستندات',
          scanCamera: 'مسح بالمـاسـح/الكاميرا',
          delete: 'حذف',
          noDocs: 'لا توجد مستندات مرفوعة بعد.',
          notPreviewable: 'لا يمكن معاينة هذا النوع هنا. يمكنك تنزيله لفتحه محلياً.',
          download: 'تنزيل الملف',
          close: 'إغلاق',

          // ===== preview overlay =====
          previewCloseAria: 'إغلاق',

          // ===== submit =====
          saving: 'جاري الحفظ...',
          saveSubscription: 'حفظ الاشتراك',
          savedOk: 'تم حفظ الاشتراك بنجاح ✅',
          saveFail: 'تعذر حفظ الاشتراك. تأكد من الـ API والبيانات.',

          // ===== list =====
          memberships: 'الاشتراكات',
          pageSize: 'حجم الصفحة',
          nameCol: 'الاسم',
          phoneCol: 'الهاتف',
          nidCol: 'الرقم القومي',
          vehicleNumberCol: 'رقم المركبة',
          cardNoCol: 'رقم الكارت',
          usageTimeCol: 'وقت الاستخدام',
          createdAtCol: 'تاريخ الإنشاء',
          endDateCol: 'تاريخ الانتهاء',
          noData: 'لا توجد بيانات',
          total: 'إجمالي',
          page: 'صفحة',
          of: 'من',
          first: 'الأولى',
          prev: 'السابق',
          next: 'التالي',
          last: 'الأخيرة',

          // ===== plate helpers =====
          plateExampleNumbers: '5678',
          plateExampleLetters: 'أ ب ج',
          // ===== misc =====
          loading: 'جاري التحميل…',
        },
        en: {
          // ===== Form: subscriber =====
          subscriberCard: 'Subscriber details',
          newBadge: 'New',
          plateNumber: 'Plate number',
          plateIncomplete: 'Please complete the plate fields.',
          subscriberName: 'Subscriber name',
          namePlaceholder: 'e.g., Hussam Khaled',
          nameRequired: 'Name is required (min 3 chars).',
          phone: 'Phone number',
          phonePlaceholder: 'e.g., +201012345678',
          phoneInvalid: 'Invalid phone number',
          nationalId: 'National ID',
          nationalIdPlaceholder: 'e.g., 2980*********',
          nationalIdInvalid: 'Invalid national ID',

          // ===== subscription type =====
          subscriptionType: 'Subscription type',
          loadingSchemas: 'Loading…',
          chooseSubscription: 'Choose a subscription',
          chooseSubscriptionPlaceholder: '— Choose a subscription —',
          schemaRequired: 'Subscription is required',

          // ===== card data =====
          cardData: 'Card data',
          cardNumber: 'Card number',
          cardInvalid: 'Card number must be hex (6–16).',
          readCard: 'Read card',
          reading: 'Reading…',
          readCardTitle: 'Read UID from reader',

          // ===== documents =====
          documents: 'Documents',
          filesCount: 'file(s)',
          uploadDocs: 'Upload documents',
          scanCamera: 'Scan by camera',
          delete: 'Delete',
          noDocs: 'No documents yet.',
          notPreviewable: 'Preview is not available. You can download and open locally.',
          download: 'Download',
          close: 'Close',

          // ===== preview overlay =====
          previewCloseAria: 'Close',

          // ===== submit =====
          saving: 'Saving...',
          saveSubscription: 'Save membership',
          savedOk: 'Saved successfully ✅',
          saveFail: 'Failed to save. Check API & data.',

          // ===== list =====
          memberships: 'Memberships',
          pageSize: 'Page size',
          nameCol: 'Name',
          phoneCol: 'Phone',
          nidCol: 'National ID',
          vehicleNumberCol: 'Vehicle number',
          cardNoCol: 'Card number',
          usageTimeCol: 'Usage time',
          createdAtCol: 'Created at',
          endDateCol: 'End date',
          noData: 'No data',
          total: 'Total',
          page: 'Page',
          of: 'of',
          first: 'First',
          prev: 'Prev',
          next: 'Next',
          last: 'Last',

          // ===== plate helpers =====
          plateExampleNumbers: '5678',
          plateExampleLetters: 'A B C',
          // ===== misc =====
          loading: 'Loading…',
        },
      }) as I18nDict,
    },
  ],
})
export class RegistrationComponent implements OnInit {
  // ===== DI =====
  private fb = inject(FormBuilder);
  private svc = inject(Registrationservice);
  private nfc = inject(NfcReaderService);
  public lang = inject(LanguageService);

  // ===== State (list/paging) =====
  loading = signal(false);
  pageNumber = signal(1);
  pageSize = signal(10);

  result = signal<PagedResult<ParkingMembershipDto> | null>(null);
  rows = computed(() => this.result()?.data ?? []);
  hasNext = computed(() => !!this.result()?.hasNextPage);
  hasPrev = computed(() => !!this.result()?.hasPreviousPage);
  totalItems = computed(() => this.result()?.totalItems ?? 0);
  totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ===== State (form) =====
  saving = signal(false);

  documents = signal<DocumentItem[]>([]);
  previewOpen = signal(false);
  currentPreview = signal<DocumentItem | null>(null);

  schemas = signal<PricingSchemaDto[]>([]);
  loadingSchemas = signal(false);

  readingCard = signal(false);

  // ===== Form & Validators =====
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
    // dynamic enable/disable & validators based on duration type
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

  // ===== Data =====
  private loadPricingSchemas() {
    this.loadingSchemas.set(true);
    this.svc.getAll().subscribe({
      next: (list) => this.schemas.set(list ?? []),
      error: () => this.loadingSchemas.set(false),
      complete: () => this.loadingSchemas.set(false),
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getMemberships(this.pageNumber(), this.pageSize()).subscribe({
      next: (res) => this.result.set(res),
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false),
    });
  }

  // ===== Paging actions =====
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

  // ===== Validators =====
  plateRequiredValidator(group: AbstractControl) {
    const p1 = (group.get('p1')?.value || '').trim();
    const p2 = (group.get('p2')?.value || '').trim();
    const p3 = (group.get('p3')?.value || '').trim();
    const p4 = (group.get('p4')?.value || '').trim();
    return p1 || p2 || p3 || p4 ? null : { required: true };
  }

  // ===== NFC read =====
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

  // ===== Documents (upload/preview) =====
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

  // ===== Plate helpers =====
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

  // ===== Submit =====
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
}

/* ===== Helpers (file utils + time range) ===== */
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
