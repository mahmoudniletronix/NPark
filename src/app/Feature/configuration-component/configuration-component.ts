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
    });

    /* ===== Step 2 ===== */
    this.step2Form = this.fb.group({
      captureTargets: this.fb.group({ vehicle: [true], passenger: [true] }),
      captureMode: ['LPR', Validators.required],
      printType: ['QR', Validators.required],

      ticketCard: this.fb.group({
        startDate: [new Date(), Validators.required],
        ticketIdPrefix: ['TK'],
      }),

      onceFee: [20, [Validators.required, Validators.min(0)]],
      tiers: this.fb.array([]),

      dateTimeFlag: [true],
      ticketIdFlag: [true],
      feesFlag: [true],

      pricingSchemaId: [''],
    });

    this.addTier(0, 2, 10);
    this.addTier(2, 6, 25);
  }

  ngOnInit() {
    this.loadPricingSchemas();
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

  /* ===== Wizard ===== */
  goNext() {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
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
      s2.ticketCard.startDate instanceof Date
        ? s2.ticketCard.startDate.toISOString()
        : new Date(s2.ticketCard.startDate).toISOString();

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      mode,
      captureMode: s2.captureMode,
      printType: s2.printType,
      ticketCard: {
        startDate: startISO,
        fees: mode === 'entry' ? s2.onceFee : this.tiers.value,
        ticketIdPrefix: s2.ticketCard.ticketIdPrefix,
      },
      flags: {
        dateTimeFlag: s2.dateTimeFlag,
        ticketIdFlag: s2.ticketIdFlag,
        feesFlag: s2.feesFlag,
      },
      pricingSchemaId: s2.pricingSchemaId,
    };
  }

  private buildDto(): ParkingConfigurationDto {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.value as any;

    const dto: ParkingConfigurationDto = {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,

      priceType: this.modeCtrl.value === 'entry' ? PriceType.Entry : PriceType.Exit,
      vehiclePassengerData:
        s2.captureMode === 'LPR' ? VehiclePassengerData.Lpr : VehiclePassengerData.ScannerId,
      printType: s2.printType === 'QR' ? PrintType.QrCode : PrintType.Rfid,

      dateTimeFlag: !!s2.dateTimeFlag,
      ticketIdFlag: !!s2.ticketIdFlag,
      feesFlag: !!s2.feesFlag,

      pricingSchemaId:
        (s2.pricingSchemaId || '').toString().trim() || '00000000-0000-0000-0000-000000000000',
    };

    return dto;
  }

  save() {
    if (this.stepIndex !== 1) return;

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
