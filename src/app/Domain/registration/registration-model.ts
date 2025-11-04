export type DurationType = 'Hours' | 'Days' | 'Monthly';

export interface PlateGroup {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}

export interface DocumentItem {
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  isImage: boolean;
  file?: File | null;
}

export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
}

export interface AddParkingMembershipCommandFront {
  Name: string;
  Phone: string;
  NationalId: string;
  VehicleNumber: string;
  CardNumber: string;
  PricingSchemeId: string;
  VehicleImage?: File[];
}
