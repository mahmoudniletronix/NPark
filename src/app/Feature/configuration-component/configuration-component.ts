import { Component, EventEmitter, Output } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  ParkingConfigurationDto,
  PriceType,
  PrintType,
  VehiclePassengerData,
  GateConfigDto,
} from '../../Domain/parking-config/parking-config.model';

import {
  Configurationervices,
  PricingSchemaDto,
} from '../../Services/configuration/configurationervices';

type Mode = 'entry' | 'exit';

export interface FeeTier {
  fromHour: number;
  toHour: number;
  price: number;
}

const ipRegex = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.|$)){4}$/; // بسيط: IPv4 فقط

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
    MatCheckboxModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatTableModule,
    MatSlideToggleModule,
  ],
  templateUrl: './configuration-component.html',
  styleUrl: './configuration-component.css',
})
export class ConfigurationComponent {
  @Output() submitted = new EventEmitter<ParkingConfigurationDto>();
  private readonly EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

  pricingSchemas: PricingSchemaDto[] = [];
  stepIndex = 0;
  modeCtrl = new FormControl<Mode>('entry', { nonNullable: true });

  step1Form: FormGroup;
  step2Form: FormGroup;
  tierCols = ['idx', 'from', 'to', 'price', 'act'];
  saving = false;

  constructor(private fb: FormBuilder, private svc: Configurationervices) {
    /* ===== Step 1 ===== */
    this.step1Form = this.fb.group({
      entryGatesCount: [1, [Validators.required, Validators.min(1)]],
      exitGatesCount: [1, [Validators.required, Validators.min(1)]],
      allowedParkingSlots: [100, [Validators.required, Validators.min(1)]],
      gracePeriodMinutes: [15, [Validators.required, Validators.min(0)]], // NEW
    });

    /* ===== Step 2 ===== */
    this.step2Form = this.fb.group({
      captureTargets: this.fb.group({ vehicle: [true], passenger: [true] }),
      captureMode: ['LPR', Validators.required],
      printType: ['QR', Validators.required],

      // flattened ticket card controls for simpler binding
      startDate: [new Date(), Validators.required],
      ticketIdPrefix: ['TK'],

      onceFee: [20, [Validators.required, Validators.min(0)]],
      tiers: this.fb.array([]),

      dateTimeFlag: [true],
      ticketIdFlag: [true],
      feesFlag: [true],

      pricingSchemaId: [''],

      // NEW: gates arrays
      entryGates: this.fb.array([]),
      exitGates: this.fb.array([]),
    });

    // Seed example tiers
    this.addTier(0, 2, 10);
    this.addTier(2, 6, 25);

    // Sync gate arrays whenever counts change
    this.step1Form.get('entryGatesCount')!.valueChanges.subscribe(() => this.syncGateArrays());
    this.step1Form.get('exitGatesCount')!.valueChanges.subscribe(() => this.syncGateArrays());
  }

  ngOnInit() {
    this.loadPricingSchemas();
    this.syncGateArrays(); // initial fill
  }

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

  /* ===== Getters ===== */
  get tiers(): FormArray {
    return this.step2Form.get('tiers') as FormArray;
  }
  get tiersControls(): FormGroup[] {
    return this.tiers.controls as FormGroup[];
  }
  get entryGatesFA(): FormArray {
    return this.step2Form.get('entryGates') as FormArray;
  }
  get exitGatesFA(): FormArray {
    return this.step2Form.get('exitGates') as FormArray;
  }
  get entryGatesControls(): FormGroup[] {
    return this.entryGatesFA.controls as FormGroup[];
  }
  get exitGatesControls(): FormGroup[] {
    return this.exitGatesFA.controls as FormGroup[];
  }

  /* ===== Tiers helpers ===== */
  addTier(fromHour = 0, toHour = 1, price = 0) {
    this.tiers.push(
      this.fb.group({
        fromHour: [fromHour, [Validators.required, Validators.min(0)]],
        toHour: [toHour, [Validators.required, Validators.min(0)]],
        price: [price, [Validators.required, Validators.min(0)]],
      })
    );
  }
  removeTier(i: number) {
    this.tiers.removeAt(i);
  }

  /* ===== Gates helpers ===== */
  private makeGateGroup(defaultNumber: number): FormGroup {
    return this.fb.group({
      gateNumber: [defaultNumber, [Validators.required, Validators.min(1)]],
      lprIp: ['', [Validators.required, Validators.pattern(ipRegex)]],
    });
  }

  private resizeFormArray(arr: FormArray, target: number, isEntry: boolean) {
    // add if short
    while (arr.length < target) {
      const nextIndex = arr.length + 1;
      arr.push(this.makeGateGroup(nextIndex));
    }
    // trim if longer
    while (arr.length > target) {
      arr.removeAt(arr.length - 1);
    }

    // ensure gate numbers are sequential defaults (user can change later)
    arr.controls.forEach((g, i) => {
      const ctrl = (g as FormGroup).get('gateNumber')!;
      if (!ctrl.value || ctrl.value < 1) ctrl.setValue(i + 1, { emitEvent: false });
    });
  }

  private syncGateArrays() {
    const entries = Number(this.step1Form.get('entryGatesCount')!.value || 0);
    const exits = Number(this.step1Form.get('exitGatesCount')!.value || 0);
    this.resizeFormArray(this.entryGatesFA, entries, true);
    this.resizeFormArray(this.exitGatesFA, exits, false);
  }

  /* ===== Wizard ===== */
  goNext() {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    this.syncGateArrays(); // re-sync just in case
    this.stepIndex = 1;
  }
  goBack() {
    if (this.stepIndex > 0) this.stepIndex--;
  }

  get summaryForView() {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.value as any;
    const mode = this.modeCtrl.value;

    const startISO =
      s2.startDate instanceof Date
        ? s2.startDate.toISOString()
        : new Date(s2.startDate).toISOString();

    const hasPricingSchema =
      !!(s2.pricingSchemaId && s2.pricingSchemaId.trim()) && s2.pricingSchemaId !== this.EMPTY_GUID;

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      gracePeriodMinutes: s1.gracePeriodMinutes,
      mode,
      captureMode: s2.captureMode,
      printType: s2.printType,
      ticketCard: {
        startDate: startISO,
        fees: mode === 'entry' ? s2.onceFee : this.tiers.value,
        ticketIdPrefix: s2.ticketIdPrefix,
      },
      flags: {
        dateTimeFlag: s2.dateTimeFlag,
        ticketIdFlag: s2.ticketIdFlag,
        feesFlag: s2.feesFlag,
        pricingSchemaIdFlag: hasPricingSchema,
      },
      pricingSchemaId: s2.pricingSchemaId,
      entryGates: s2.entryGates,
      exitGates: s2.exitGates,
    };
  }

  private buildDto(): ParkingConfigurationDto {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.value as any;

    const dto: ParkingConfigurationDto = {
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

      pricingSchemaId: (s2.pricingSchemaId || '').toString().trim() || this.EMPTY_GUID,

      ticketCard: {
        startDate: s2.startDate instanceof Date ? s2.startDate.toISOString() : s2.startDate,
        ticketIdPrefix: s2.ticketIdPrefix || 'TK',
      },

      // NEW: map gates arrays
      entryGates: (s2.entryGates || []).map((g: any) => ({
        gateNumber: Number(g.gateNumber),
        lprIp: String(g.lprIp || ''),
      })),
      exitGates: (s2.exitGates || []).map((g: any) => ({
        gateNumber: Number(g.gateNumber),
        lprIp: String(g.lprIp || ''),
      })),
    };

    return dto;
  }

  save() {
    if (this.stepIndex !== 1) return;

    if (this.step2Form.invalid) {
      this.step2Form.markAllAsTouched();
      return;
    }

    const dto = this.buildDto();

    this.saving = true;
    this.svc.updateConfig(dto).subscribe({
      next: () => {
        this.saving = false;
        this.submitted.emit(dto);
      },
      error: (err) => {
        this.saving = false;
        console.error('Update failed', err);
      },
    });
  }
}
