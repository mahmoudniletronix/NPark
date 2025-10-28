import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  LoginRequest,
  LoginResponse,
  LoginFirstTimeRequest,
} from '../../Domain/Auth/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'https://localhost:7298/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient) {}



  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  isLoggedIn(): boolean {
    return !!this.token;
  }

login(dto: LoginRequest): Observable<LoginResponse> {
  return this.http.post(`${API_BASE}/login`, dto, { responseType: 'text' })
    .pipe(
      map(t => {
        if (!t) throw new Error('Empty response');
        return JSON.parse(t) as LoginResponse;
      })
    );
  }

  loginFirstTime(dto: LoginFirstTimeRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE}/loginfirsttime`, dto)
      .pipe();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }


}
