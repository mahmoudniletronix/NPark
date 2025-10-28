export type TicketAction = 'IN' | 'OUT';
export interface TicketDto {
  id: number;
  plate: string;
  action: TicketAction;
  time: string;
  gate: string;
}
