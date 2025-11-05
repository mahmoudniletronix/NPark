enum DurationType {
  Hours = 0,
  Days = 1,
  Years = 2,
}
export interface RepeatedPricingDto {
  id: string;
  name: string;
  price: number;
  isRepeated: boolean;
  totalHours: number | null;
  durationType: DurationType;
  count?: number;
}
