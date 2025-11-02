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

export interface ParkingConfigurationDto {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number;

  priceType: PriceType;
  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string;
}
