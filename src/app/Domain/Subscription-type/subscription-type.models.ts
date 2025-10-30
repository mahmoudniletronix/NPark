export enum DurationType {
  Days = 0,
  Hours = 1,
}

export interface AddPricingSchemaCommand {
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  repeatPrice: number | null;
  orderPriority: number;
  isActive?: boolean;
  totalHours: number | null;
  totalDays: number | null;
}

export interface PricingRow {
  id?: number;
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  repeatPrice: number | null;
  orderPriority: number;
  isActive: boolean;
  totalHours: number | null;
  totalDays: number | null;
}
