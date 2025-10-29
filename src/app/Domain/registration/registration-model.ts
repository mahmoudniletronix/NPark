type DurationType = 'Hours' | 'Days' | 'Monthly';

interface RegistrationPayload {
  cardNo: string;
  plate: { p1: string; p2: string; p3: string; p4: string };
  subscriberName: string;
  phone: string;
  nationalId: string;
  carImageBase64?: string | null;

  durationType: DurationType;
  dateFrom: string | null;
  dateTo: string | null;
  timeFrom: string | null;
  timeTo: string | null;

  price?: number | null;
  orderPriority?: number | null;
}
