export interface StationSummary {
  total: number;
  full: number;
  empty: number;
}

export interface Ticket {
  id: number;
  plate: string;
  action: 'IN' | 'OUT';
  time: string;
  gate: string;
}

export interface UsersSummary {
  subscribers: number;
  visitors: number;
}
