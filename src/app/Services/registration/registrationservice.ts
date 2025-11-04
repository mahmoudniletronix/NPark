import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
}
@Injectable({
  providedIn: 'root',
})
export class Registrationservice {
  private base = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PricingSchemaDto[]> {
    return this.http.get<PricingSchemaDto[]>(`${this.base}/GetWithoudPagination`);
  }
}
