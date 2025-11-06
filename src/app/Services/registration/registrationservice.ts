import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { PagedResult } from '../../Domain/PageResult/PagedResult';
import { ParkingMembershipDto } from '../../Domain/registration/registration-model';

export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class Registrationservice {
  private pricingBase = `${environment.baseUrl}/PricingSchema`;
  private membershipsBase = `${environment.baseUrl}/ParkingMemberships`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PricingSchemaDto[]> {
    return this.http.get<PricingSchemaDto[]>(`${this.pricingBase}/GetWithoudPagination`);
  }

  addMembership(fd: FormData) {
    return this.http.post(`${this.membershipsBase}/Add`, fd);
  }

  getMemberships(pageNumber = 1, pageSize = 10): Observable<PagedResult<ParkingMembershipDto>> {
    const params = new HttpParams().set('pageNumber', pageNumber).set('pageSize', pageSize);
    return this.http.get<PagedResult<ParkingMembershipDto>>(`${this.membershipsBase}/GetAll`, {
      params,
    });
  }
}
