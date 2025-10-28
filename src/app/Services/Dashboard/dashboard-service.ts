import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay } from 'rxjs';
import {
  StationSummary,
  UsersSummary,
  Ticket,
} from '../../Domain/dashboard-entity/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  getStations() {
    // summary: total/full/empty
    return of({ total: 120, full: 78, empty: 42 }).pipe(delay(200));
  }
  getUsers() {
    return of({ subscribers: 5400, visitors: 1280 }).pipe(delay(200));
  }
  getTickets() {
    return of([
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
    ]).pipe(delay(200));
  }
  getInOutSeries() {
    return of([
      { label: '08', in: 20, out: 5 },
      { label: '09', in: 35, out: 12 },
      { label: '10', in: 40, out: 18 },
      { label: '11', in: 38, out: 25 },
      { label: '12', in: 30, out: 29 },
      { label: '13', in: 27, out: 34 },
      { label: '14', in: 25, out: 31 },
    ]).pipe(delay(200));
  }
}
