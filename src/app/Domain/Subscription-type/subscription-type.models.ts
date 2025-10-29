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
  repeatPrice: number;
  orderPriority: number;
  isActive?: boolean;
  totalHours?: number;
  totalDays?: number;
}

export type PricingRow = AddPricingSchemaCommand & {
  id?: number;
  isActive?: boolean;
};
