import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  AddPricingSchemaCommand,
  DurationType,
  PricingRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import { environment } from '../../Shared/environment/environment';
import { PagedResult } from '../../Domain/PageResult/PagedResult';

type ApiListResponse<T> = T[] | { items: T[] } | { data: T[] };
export type UpdatePricingSchemaCommand = AddPricingSchemaCommand & { id: string };

@Injectable({ providedIn: 'root' })
export class SubscriptionType {
  private base = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 10, q = ''): Observable<PagedResult<PricingRow>> {
    const params = new HttpParams()
      .set('pageNumber', page.toString())
      .set('pageSize', pageSize.toString())
      .set('currentPage', page.toString())
      .set('q', q ?? '')
      .set('_', Date.now().toString());

    return this.http
      .get<PagedResult<PricingRow>>(`${this.base}/GetAll`, {
        params,
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        map((res: any) => ({
          currentPage: res.currentPage ?? page,
          pageSize: res.pageSize ?? pageSize,
          totalPages: res.totalPages ?? 1,
          totalItems: res.totalItems ?? res.data?.length ?? 0,
          data: res.data ?? res.items ?? res ?? [],
          hasPreviousPage: !!res.hasPreviousPage,
          hasNextPage: !!res.hasNextPage,
        }))
      );
  }

  getById(id: number): Observable<PricingRow> {
    return this.http.get<PricingRow>(`${this.base}/GetById/${id}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  add(dto: AddPricingSchemaCommand): Observable<PricingRow> {
    const payload = {
      ...dto,
      name: dto.name?.trim() || '',
      price: Number(dto.price) || 0,
      totalHours: dto.durationType === DurationType.Hours ? Number(dto.totalHours) || 1 : null,
      totalDays: dto.durationType === DurationType.Days ? Number(dto.totalDays) || 1 : null,
      isRepeated: dto.durationType === DurationType.Hours ? dto.isRepeated : false,
      orderPriority:
        dto.durationType === DurationType.Hours && dto.isRepeated ? dto.orderPriority || 1 : null,
    };

    return this.http.post<PricingRow>(`${this.base}/Add`, payload);
  }

  private toHms(t?: string | null): string | null {
    if (!t) return null;
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return null;
  }

  update(dto: UpdatePricingSchemaCommand): Observable<PricingRow> {
    const isHours = dto.durationType === DurationType.Hours;
    const isDays = dto.durationType === DurationType.Days;
    const repeated = isHours ? !!dto.isRepeated : false;

    const payload: UpdatePricingSchemaCommand = {
      id: dto.id,
      name: (dto.name ?? '').trim(),
      durationType: dto.durationType,
      startTime: isHours && !repeated ? this.toHms(dto.startTime) : null,
      endTime: isHours && !repeated ? this.toHms(dto.endTime) : null,
      price: Number(dto.price ?? 0),
      isRepeated: repeated,
      orderPriority: isHours && repeated ? dto.orderPriority ?? 1 : null,
      totalHours: isHours ? Number(dto.totalHours ?? 0) : null,
      totalDays: isDays ? Number(dto.totalDays ?? 0) : null,
    };

    return this.http.put<PricingRow>(`${this.base}/Update`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/Delete/${id}`, {});
  }
}
