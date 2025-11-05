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

// ===== Shared =====
export interface GateConfigDto {
  gateNumber: number;
  lprIp: string;
}
export interface TicketCardDto {
  startDate: string;
  ticketIdPrefix: string;
}

// ===== Update Payload =====
export interface ParkingConfigurationUpdateCommand {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number;

  gracePeriodMinutes: number | null;

  priceType: PriceType;
  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string;

  ticketCard?: TicketCardDto;

  entryGates: GateConfigDto[];
  exitGates: GateConfigDto[];
}

// ===== Get Response =====
export interface ParkingConfigurationView {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number;

  gracePeriodMinutes: number | null;

  priceType: PriceType;
  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string;
  pricingSchemaName?: string;

  ticketCard?: TicketCardDto;

  entryGates: GateConfigDto[];
  exitGates: GateConfigDto[];
}
