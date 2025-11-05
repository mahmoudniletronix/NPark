import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  DurationType,
  PricingSchemaAddDto,
  PricingSchemaUpdateDto,
  PricingSchemaRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import { PagedResult } from '../../Domain/PageResult/PagedResult';

type ApiListResponse<T> = T[] | { items: T[] } | { data: T[] };

@Injectable({ providedIn: 'root' })
export class SubscriptionType {
  private base = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 10, q = ''): Observable<PagedResult<PricingSchemaRow>> {
    const params = new HttpParams()
      .set('pageNumber', String(page))
      .set('pageSize', String(pageSize))
      .set('currentPage', String(page))
      .set('q', q ?? '')
      .set('_', Date.now().toString());

    return this.http
      .get<ApiListResponse<PricingSchemaRow> | any>(`${this.base}/GetAll`, {
        params,
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        map((res: any) => {
          const data: PricingSchemaRow[] = res?.data ?? res?.items ?? res ?? [];
          return {
            currentPage: res?.currentPage ?? page,
            pageSize: res?.pageSize ?? pageSize,
            totalPages: res?.totalPages ?? 1,
            totalItems: res?.totalItems ?? data.length ?? 0,
            data,
            hasPreviousPage: !!res?.hasPreviousPage,
            hasNextPage: !!res?.hasNextPage,
          } as PagedResult<PricingSchemaRow>;
        })
      );
  }

  getById(id: string): Observable<PricingSchemaRow> {
    return this.http.get<PricingSchemaRow>(`${this.base}/GetById/${encodeURIComponent(id)}`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  private toHms(t?: string | null): string | null {
    if (!t) return null;
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return null;
  }
  private static DAY_DEFAULT = '00:00:00';
  private static DAY_END = '23:59:59';

  add(dto: PricingSchemaAddDto) {
    const isHours = dto.durationType === DurationType.Hours;
    const isDays = dto.durationType === DurationType.Days;
    const repeated = isHours ? !!dto.isRepeated : false;

    const payload: PricingSchemaAddDto = {
      name: (dto.name ?? '').trim(),
      durationType: dto.durationType,
      startTime: isHours
        ? repeated
          ? null
          : this.toHms(dto.startTime)
        : SubscriptionType.DAY_DEFAULT,
      endTime: isHours ? (repeated ? null : this.toHms(dto.endTime)) : SubscriptionType.DAY_END,
      price: Number(dto.price ?? 0),
      isRepeated: isHours ? repeated : false,
      totalHours: isHours ? Number(dto.totalHours ?? 0) : null,
      totalDays: isDays ? Number(dto.totalDays ?? 0) : null,
    };

    return this.http.post<PricingSchemaRow>(`${this.base}/Add`, payload);
  }

  update(dto: PricingSchemaUpdateDto) {
    const isHours = dto.durationType === DurationType.Hours;
    const isDays = dto.durationType === DurationType.Days;
    const repeated = isHours ? !!dto.isRepeated : false;

    const payload: PricingSchemaUpdateDto = {
      id: dto.id,
      name: (dto.name ?? '').trim(),
      durationType: dto.durationType,
      startTime: isHours
        ? repeated
          ? null
          : this.toHms(dto.startTime)
        : SubscriptionType.DAY_DEFAULT,
      endTime: isHours ? (repeated ? null : this.toHms(dto.endTime)) : SubscriptionType.DAY_END,
      price: Number(dto.price ?? 0),
      isRepeated: isHours ? repeated : false,
      totalHours: isHours ? Number(dto.totalHours ?? 0) : null,
      totalDays: isDays ? Number(dto.totalDays ?? 0) : null,
    };

    return this.http.put<PricingSchemaRow>(`${this.base}/Update`, payload);
  }

  delete(id: string): Observable<void> {
    const sid = String(id).trim();

    const tryPostBody = () => this.http.post<void>(`${this.base}/Delete`, { id: sid });

    const tryDeleteQuery = () =>
      this.http.delete<void>(`${this.base}/Delete`, {
        params: new HttpParams().set('id', sid),
      });
    const tryDeletePath = () =>
      this.http.delete<void>(`${this.base}/Delete/${encodeURIComponent(sid)}`);
    const tryPostQuery = () =>
      this.http.post<void>(`${this.base}/Delete`, null, {
        params: new HttpParams().set('id', sid),
      });
    const tryPostPath = () =>
      this.http.post<void>(`${this.base}/Delete/${encodeURIComponent(sid)}`, {});

    return tryPostBody().pipe(
      catchError((e1) => {
        if (e1?.status === 404 || e1?.status === 405 || e1?.status === 422) {
          return tryDeleteQuery().pipe(
            catchError((e2) => {
              if (e2?.status === 404 || e2?.status === 405) {
                return tryDeletePath().pipe(
                  catchError((e3) => {
                    if (e3?.status === 404 || e3?.status === 405) {
                      return tryPostQuery().pipe(
                        catchError((e4) => {
                          if (e4?.status === 404 || e4?.status === 405) {
                            return tryPostPath();
                          }
                          return throwError(() => e4);
                        })
                      );
                    }
                    return throwError(() => e3);
                  })
                );
              }
              return throwError(() => e2);
            })
          );
        }
        return throwError(() => e1);
      })
    );
  }
}
