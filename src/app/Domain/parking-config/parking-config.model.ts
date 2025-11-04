// ===== Enums =====
export enum PriceType {
  Entry = 0,
  Exit = 1,
}

export enum VehiclePassengerData {
  Lpr = 0,
  ScannerId = 1,
}

export enum PrintType {
  QrCode = 0,
  Rfid = 1,
}

// NEW: لكل بوابة
export interface GateConfigDto {
  gateNumber: number;
  lprIp: string;
}

// NEW: بطاقة الطباعة (لأننا بنرسلها في الـDTO)
export interface TicketCardDto {
  startDate: string; // ISO
  ticketIdPrefix: string; // مثل TK
}

export interface ParkingConfigurationDto {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number;

  // NEW
  gracePeriodMinutes: number;

  priceType: PriceType;
  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string;

  // NEW
  ticketCard: TicketCardDto;

  // NEW
  entryGates: GateConfigDto[];
  exitGates: GateConfigDto[];
}
