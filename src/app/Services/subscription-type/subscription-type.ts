import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AddPricingSchemaCommand,
  PricingRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import { environment } from '../../Shared/environment/environment';

type ApiListResponse<T> = T[] | { items: T[] } | { data: T[] };

@Injectable({
  providedIn: 'root',
})
export class SubscriptionType {
  private base = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  list(): Observable<PricingRow[]> {
    return this.http
      .get<ApiListResponse<PricingRow>>(`${this.base}/GetAll`)
      .pipe(map(this.unwrapList));
  }

  getById(id: number): Observable<PricingRow> {
    return this.http.get<PricingRow>(`${this.base}/GetById/${id}`);
  }

  add(dto: AddPricingSchemaCommand): Observable<PricingRow> {
    return this.http.post<PricingRow>(`${this.base}/Add`, dto);
  }

  update(dto: AddPricingSchemaCommand | PricingRow): Observable<PricingRow> {
    const payload: AddPricingSchemaCommand = {
      name: dto.name,
      durationType: dto.durationType,
      startTime: dto.startTime,
      endTime: dto.endTime,
      price: dto.price,
      isRepeated: dto.isRepeated,
      repeatPrice: dto.repeatPrice,
      orderPriority: dto.orderPriority,
      isActive: dto.isActive,
    };
    return this.http.post<PricingRow>(`${this.base}/Update`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/Delete/${id}`, {});
  }

  private unwrapList<T>(res: ApiListResponse<T>): T[] {
    if (Array.isArray(res)) return res;
    return (res as any).items ?? (res as any).data ?? [];
  }
}
