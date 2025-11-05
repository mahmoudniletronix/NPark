import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  ParkingConfigurationUpdateCommand,
  ParkingConfigurationView,
} from '../../Domain/parking-config/parking-config.model';

export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class Configurationervices {
  private base = `${environment.baseUrl}/ParkingConfiguration`;
  private pricingBase = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  getConfiguration(): Observable<ParkingConfigurationView> {
    return this.http.get<ParkingConfigurationView>(`${this.base}/Get`);
  }

  updateConfig(dto: ParkingConfigurationUpdateCommand): Observable<any> {
    return this.http.post(`${this.base}/Update`, dto);
  }

  getPricingSchemas(): Observable<PricingSchemaDto[]> {
    return this.http.get<PricingSchemaDto[]>(`${this.pricingBase}/GetWithoudPagination`);
  }
}
