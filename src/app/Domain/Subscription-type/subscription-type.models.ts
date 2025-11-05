export enum DurationType {
  Days = 1,
  Hours = 2,
  Year = 3,
}

export interface PricingSchemaAddDto {
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  totalDays: number | null;
  totalHours: number | null;
}

export interface PricingSchemaUpdateDto extends PricingSchemaAddDto {
  id: string;
}

export interface PricingSchemaRow {
  id: string;
  name: string;
  durationType: DurationType;
  startTime: string | null;
  endTime: string | null;
  price: number;
  isRepeated: boolean;
  totalDays: number | null;
  totalHours: number | null;
}
