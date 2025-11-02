import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import {
  TicketDto,
  IssuedTicketResponse,
  TicketDetailsDto,
} from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketsServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;

  // ===================== Get All Tickets =====================
  getAll(): Observable<TicketDto[]> {
    return this.http.get<any[]>(`${this.base}/Ticket`).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          id: r.id ?? r.Id,
          plate: r.plate ?? r.Plate,
          action: r.action ?? r.Action, // 'IN' | 'OUT'
          time: (r.time ?? r.Time ?? r.dateTime ?? r.DateTime) as string,
          gate: r.gate ?? r.Gate ?? '',
        }))
      ),
      catchError((err) => {
        console.error('GET /Ticket failed', err);
        return of([] as TicketDto[]);
      })
    );
  }

  // ===================== Add New Ticket (returns PNG file) =====================
  addTicket(): Observable<IssuedTicketResponse> {
    return this.http
      .post(`${this.base}/Ticket/AddTicket`, {}, { observe: 'response', responseType: 'blob' })
      .pipe(
        map((res) => {
          const blob = res.body as Blob;
          const objectUrl = URL.createObjectURL(blob);
          return {
            id: Number(res.headers.get('X-Ticket-Id') ?? 0),
            qrImageBase64: objectUrl,
            qrText: undefined,
          };
        }),
        catchError(() => of({ id: 0 } as IssuedTicketResponse))
      );
  }

  // ===================== Get Ticket By QR =====================
  getTicketByQr(code: string): Observable<TicketDetailsDto> {
    const params = new HttpParams().set('code', code);
    return this.http.get<any>(`${this.base}/Ticket/GetByQr`, { params }).pipe(
      map((res) => {
        const dateTime =
          res.dateTime ?? res.DateTime ?? res.start ?? res.Start ?? res.startDate ?? res.StartDate;
        const endDate =
          res.endDate ?? res.EndDate ?? res.end ?? res.End ?? res.finish ?? res.Finish;

        const price = Number(res.price ?? res.Price ?? 0);
        const exceedPrice = Number(res.exceedPrice ?? res.ExceedPrice ?? 0);
        const total =
          res.totalPrice ?? res.TotalPrice ?? Math.round((price + exceedPrice) * 100) / 100;

        return {
          id: res.id ?? res.Id,
          plate: res.plate ?? res.Plate ?? '',
          dateTime: typeof dateTime === 'string' ? dateTime : new Date(dateTime).toISOString(),
          endDate: typeof endDate === 'string' ? endDate : new Date(endDate).toISOString(),
          price,
          exceedPrice,
          totalPrice: Number(total),
        } as TicketDetailsDto;
      }),
      catchError((err) => {
        console.error('GET /Ticket/GetByQr failed', err);
        return of(null as unknown as TicketDetailsDto);
      })
    );
  }

  // ===================== Collect Ticket =====================
  collect(id: number): Observable<boolean> {
    return this.http.post<any>(`${this.base}/Ticket/Collect/${id}`, {}).pipe(
      map(() => true),
      catchError((err) => {
        console.error('POST /Ticket/Collect/{id} failed', err);
        return of(false);
      })
    );
  }
}
