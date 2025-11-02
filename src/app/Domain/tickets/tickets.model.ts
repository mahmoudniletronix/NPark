export type TicketAction = 'IN' | 'OUT';

export interface TicketDto {
  id: number;
  plate: string;
  action: TicketAction;
  time: string;
  gate: string;
}

export interface IssuedTicketResponse {
  id: number;
  qrImageBase64?: string;
  qrText?: string;
}

export interface TicketDetailsDto {
  id: number;
  plate: string;
  dateTime: string;
  endDate: string;
  price: number;
  exceedPrice: number;
  totalPrice: number;
}
