type Ticket = {
  id: number;
  plate: string;
  action: 'IN' | 'OUT';
  gate: string;
  time: string;
};
