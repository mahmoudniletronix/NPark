import { Injectable } from '@angular/core';
import { TicketDto } from '../../Domain/tickets/tickets.model';
import { of, delay } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TicketsServices {
  private mock: TicketDto[] = [
    { id: 1001, plate: 'س م ل 1234', action: 'IN', time: new Date().toISOString(), gate: 'G1' },
    {
      id: 1002,
      plate: 'ABC-567',
      action: 'OUT',
      time: new Date(Date.now() - 3e6).toISOString(),
      gate: 'G2',
    },
    {
      id: 1003,
      plate: 'JED-9087',
      action: 'IN',
      time: new Date(Date.now() - 6e6).toISOString(),
      gate: 'G1',
    },
    {
      id: 1004,
      plate: 'KSA-2211',
      action: 'OUT',
      time: new Date(Date.now() - 9e6).toISOString(),
      gate: 'G3',
    },
    {
      id: 1005,
      plate: 'XYZ-111',
      action: 'IN',
      time: new Date(Date.now() - 12e6).toISOString(),
      gate: 'G2',
    },
    {
      id: 1006,
      plate: 'JED-2233',
      action: 'IN',
      time: new Date(Date.now() - 15e6).toISOString(),
      gate: 'G3',
    },
    {
      id: 1007,
      plate: 'ABC-777',
      action: 'OUT',
      time: new Date(Date.now() - 18e6).toISOString(),
      gate: 'G1',
    },
  ];

  getAll() {
    return of(this.mock).pipe(delay(200));
  }
}
