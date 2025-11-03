export enum DurationType {
  Days = 1,
  Hours = 2,
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
}

export interface PricingRow {
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
};
