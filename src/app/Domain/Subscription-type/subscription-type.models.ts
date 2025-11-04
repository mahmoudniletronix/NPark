export enum DurationType {
  Days = 1,
  Hours = 2,
  Years = 3,
}

export interface AddPricingSchemaCommand {
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  orderPriority: number | null;
  totalHours: number | null;
  totalDays: number | null;
  totalYears?: number | null;
}

export interface PricingRow {
  id: string;
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  orderPriority: number | null;
  totalHours: number | null;
  totalDays: number | null;
  totalYears?: number | null;
}
export type UpdatePricingSchemaCommand = {
  id: number;
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  orderPriority: number | null;
  totalHours: number | null;
  totalDays: number | null;
  totalYears?: number | null;
};
