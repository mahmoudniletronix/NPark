import { Component, EventEmitter, Output, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import {
  ParkingConfigurationUpdateCommand,
  PriceType,
  PrintType,
  VehiclePassengerData,
  ParkingConfigurationView,
} from '../../Domain/parking-config/parking-config.model';
import {
  Configurationervices,
  PricingSchemaDto,
} from '../../Services/configuration/configurationervices';
import { finalize } from 'rxjs/operators';

type Mode = 'entry' | 'exit';

// IPv4 strict
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

// Host OR IPv4
const HOST_OR_IP_REGEX =
  /^(?=.{1,253}$)(?:(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,63}|(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d))$/;

@Component({
  selector: 'app-configuration-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule,
  ],
  templateUrl: './configuration-component.html',
  styleUrls: ['./configuration-component.css'],
})
export class ConfigurationComponent implements OnInit {
  @Output() submitted = new EventEmitter<ParkingConfigurationUpdateCommand>();

  pricingSchemas: PricingSchemaDto[] = [];
  stepIndex = 0;
  modeCtrl = new FormControl<Mode>('entry', { nonNullable: true });

  step1Form: FormGroup;
  step2Form: FormGroup;
  saving = false;
  loading = false;

  constructor(private fb: FormBuilder, private svc: Configurationervices) {
    // ===== Step 1
    this.step1Form = this.fb.group({
      entryGatesCount: [1, [Validators.required, Validators.min(1)]],
      exitGatesCount: [1, [Validators.required, Validators.min(1)]],
      allowedParkingSlots: [100, [Validators.required, Validators.min(1)]],
      gracePeriodMinutes: [15, [Validators.required, Validators.min(0)]],
    });

    // ===== Step 2
    this.step2Form = this.fb.group({
      // enums mapped by UI-friendly fields
      captureMode: ['LPR', Validators.required], // LPR | SCANNER
      printType: ['QR', Validators.required], // QR | RFID

      // ticket card
      startDate: [new Date(), Validators.required],
      ticketIdPrefix: ['TK', [Validators.maxLength(10)]],

      // fees/schema
      onceFee: [20, [Validators.required, Validators.min(0)]],
      tiers: this.fb.array([]), // لو هتستخدمها لاحقًا
      dateTimeFlag: [true],
      ticketIdFlag: [true],
      feesFlag: [true],

      pricingSchemaId: ['', Validators.required],

      // gates
      entryGates: this.fb.array([]),
      exitGates: this.fb.array([]),
    });

    // keep arrays sized with counts
    this.step1Form.get('entryGatesCount')?.valueChanges.subscribe(() => this.syncGateArrays());
    this.step1Form.get('exitGatesCount')?.valueChanges.subscribe(() => this.syncGateArrays());
  }

  ngOnInit() {
    this.loadPricingSchemas();
    this.syncGateArrays();
    this.loadExistingConfigAndPatch();
  }

  // ======= Data loading =======
  loadPricingSchemas() {
    this.svc.getPricingSchemas().subscribe({
      next: (list) => {
        this.pricingSchemas = (list || []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? '',
        }));
      },
      error: (err) => {
        console.error('Failed to load pricing schemas', err);
        this.pricingSchemas = [];
      },
    });
  }

  loadExistingConfigAndPatch() {
    this.loading = true;
    this.svc
      .getConfiguration() // now typed as ParkingConfigurationView
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (cfg: ParkingConfigurationView) => {
          if (!cfg) return;

          // Step1
          this.step1Form.patchValue({
            entryGatesCount: cfg.entryGatesCount ?? 1,
            exitGatesCount: cfg.exitGatesCount ?? 1,
            allowedParkingSlots: cfg.allowedParkingSlots ?? 100,
            gracePeriodMinutes: cfg.gracePeriodMinutes ?? 0,
          });

          // arrays before patch
          this.syncGateArrays();

          // derive UI fields from enums
          const captureMode =
            cfg.vehiclePassengerData === VehiclePassengerData.Lpr ? 'LPR' : 'SCANNER';
          const printType = cfg.printType === PrintType.QrCode ? 'QR' : 'RFID';

          this.step2Form.patchValue({
            captureMode,
            printType,
            startDate: cfg.ticketCard?.startDate ? new Date(cfg.ticketCard.startDate) : new Date(),
            ticketIdPrefix: cfg.ticketCard?.ticketIdPrefix ?? 'TK',
            dateTimeFlag: cfg.dateTimeFlag ?? true,
            ticketIdFlag: cfg.ticketIdFlag ?? true,
            feesFlag: cfg.feesFlag ?? true,
            pricingSchemaId: cfg.pricingSchemaId ?? '',
          });

          this.patchGateArray(this.entryGatesFA, cfg.entryGates || []);
          this.patchGateArray(this.exitGatesFA, cfg.exitGates || []);
        },
        error: (err) => {
          console.error('Failed to load existing configuration', err);
        },
      });
  }

  // ======= FormArray helpers =======
  get entryGatesFA(): FormArray<FormGroup> {
    return this.step2Form.get('entryGates') as FormArray<FormGroup>;
  }
  get exitGatesFA(): FormArray<FormGroup> {
    return this.step2Form.get('exitGates') as FormArray<FormGroup>;
  }
  get entryGatesControls(): FormGroup[] {
    return this.entryGatesFA.controls as FormGroup[];
  }
  get exitGatesControls(): FormGroup[] {
    return this.exitGatesFA.controls as FormGroup[];
  }

  private makeGateGroup(defaultNumber: number): FormGroup {
    return this.fb.group({
      gateNumber: [{ value: defaultNumber, disabled: true }, [Validators.min(1)]],
      lprIp: ['', [Validators.required, Validators.pattern(HOST_OR_IP_REGEX)]],
    });
  }

  private resizeFormArray(arr: FormArray, target: number) {
    while (arr.length < target) {
      arr.push(this.makeGateGroup(arr.length + 1));
    }
    while (arr.length > target) {
      arr.removeAt(arr.length - 1);
    }
  }

  private syncGateArrays() {
    const entries = Number(this.step1Form.get('entryGatesCount')!.value || 0);
    const exits = Number(this.step1Form.get('exitGatesCount')!.value || 0);
    this.resizeFormArray(this.entryGatesFA, entries);
    this.resizeFormArray(this.exitGatesFA, exits);
    // normalize numbering
    this.renumberGateArray(this.entryGatesFA);
    this.renumberGateArray(this.exitGatesFA);
  }

  private renumberGateArray(arr: FormArray<FormGroup>) {
    arr.controls.forEach((fg, i) => {
      fg.get('gateNumber')?.setValue(i + 1, { emitEvent: false });
    });
  }

  private patchGateArray(
    arr: FormArray<FormGroup>,
    data: Array<{ gateNumber: number; lprIp: string }>
  ) {
    const target = data?.length || arr.length;
    this.resizeFormArray(arr, target);
    arr.controls.forEach((fg, i) => {
      const src = data?.[i];
      fg.patchValue({
        gateNumber: i + 1,
        lprIp: src?.lprIp ?? '',
      });
    });
  }

  // ======= UX navigation =======
  goNext() {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    this.syncGateArrays();
    this.stepIndex = 1;
  }
  goBack() {
    if (this.stepIndex > 0) this.stepIndex--;
  }

  // ======= Summary (for preview cards) =======
  get summaryForView() {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.getRawValue() as any;
    const mode = this.modeCtrl.value;

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      gracePeriodMinutes: s1.gracePeriodMinutes,
      mode,
      captureMode: s2.captureMode,
      printType: s2.printType,
      ticketCard: {
        startDate: s2.startDate,
        ticketIdPrefix: s2.ticketIdPrefix,
      },
      flags: {
        dateTimeFlag: !!s2.dateTimeFlag,
        ticketIdFlag: !!s2.ticketIdFlag,
        feesFlag: !!s2.feesFlag,
        pricingSchemaIdFlag: !!(s2.pricingSchemaId && String(s2.pricingSchemaId).trim()),
      },
      pricingSchemaId: s2.pricingSchemaId,
      entryGates: s2.entryGates || [],
      exitGates: s2.exitGates || [],
    };
  }

  buildDto(): ParkingConfigurationUpdateCommand {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.getRawValue() as any;

    const entryGates = this.entryGatesFA.getRawValue().map((g, i) => ({
      gateNumber: i + 1,
      lprIp: (g['lprIp'] || '').trim(),
    }));
    const exitGates = this.exitGatesFA.getRawValue().map((g, i) => ({
      gateNumber: i + 1,
      lprIp: (g['lprIp'] || '').trim(),
    }));

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      gracePeriodMinutes: s1.gracePeriodMinutes,

      priceType: this.modeCtrl.value === 'entry' ? PriceType.Entry : PriceType.Exit,
      vehiclePassengerData:
        s2.captureMode === 'LPR' ? VehiclePassengerData.Lpr : VehiclePassengerData.ScannerId,
      printType: s2.printType === 'QR' ? PrintType.QrCode : PrintType.Rfid,

      dateTimeFlag: !!s2.dateTimeFlag,
      ticketIdFlag: !!s2.ticketIdFlag,
      feesFlag: !!s2.feesFlag,

      pricingSchemaId: s2.pricingSchemaId,

      ticketCard: {
        startDate: s2.startDate instanceof Date ? s2.startDate.toISOString() : s2.startDate,
        ticketIdPrefix: s2.ticketIdPrefix || 'TK',
      },

      entryGates,
      exitGates,
    };
  }

  save() {
    if (this.stepIndex !== 1) return;

    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    if (this.step2Form.invalid) {
      this.step2Form.markAllAsTouched();
      return;
    }

    const dto: ParkingConfigurationUpdateCommand = this.buildDto();
    this.saving = true;
    this.svc
      .updateConfig(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.submitted.emit(dto),
        error: (err) => console.error('Update failed', err),
      });
  }
}
