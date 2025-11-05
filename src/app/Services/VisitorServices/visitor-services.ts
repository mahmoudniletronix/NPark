import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError, switchMap } from 'rxjs';
import { RepeatedPricingDto } from '../../Domain/VisitorDTO/visitorPriceSchema.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class VisitorServices {
  private http = inject(HttpClient);
  private baseUrl = `${environment.baseUrl}/PricingSchema`;

  /** Get all repeated pricing schemas */
  getRepeated(): Observable<RepeatedPricingDto[]> {
    return this.http.get<RepeatedPricingDto[]>(`${this.baseUrl}/GetRepeated`).pipe(
      catchError((err) => {
        console.error('Error loading repeated pricing schemas:', err);
        return throwError(() => err);
      })
    );
  }

  /** Get the saved order */
  getOrder(): Observable<RepeatedPricingDto[]> {
    return this.http.get<RepeatedPricingDto[]>(`${this.baseUrl}/GetOrder`).pipe(
      catchError((err) => {
        console.error('Error loading order:', err);
        return throwError(() => err);
      })
    );
  }

  /** optional helpers for future use */
  getById(id: string): Observable<RepeatedPricingDto> {
    return this.http.get<RepeatedPricingDto>(`${this.baseUrl}/GetById/${id}`).pipe(
      catchError((err) => {
        console.error('Error loading item:', err);
        return throwError(() => err);
      })
    );
  }

  addOrder(orderSchema: { pricingSchemaId: string; count: number }[]) {
    const url = `${environment.baseUrl}/PricingSchema/AddOrder`;
    return this.http.post(url, { orderSchema });
    
  }
}
