import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { LoginRequest, LoginResponse, LoginFirstTimeRequest } from '../../Domain/Auth/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://192.168.1.100:8080/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  constructor() {}

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  saveSession(resp: LoginResponse) {
    if (!resp?.token) throw new Error('No token in response');

    localStorage.setItem(TOKEN_KEY, resp.token);
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        name: 'Admin',
        role: resp.roleName || 'User',
        email: 'Admin@gmail.com',
      })
    );
  }

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post(`${API_BASE}/login`, dto, { responseType: 'text' }).pipe(
      map((t) => {
        if (!t) throw new Error('Empty response');
        return JSON.parse(t) as LoginResponse;
      }),
      tap((resp) => this.saveSession(resp))
    );
  }

  loginFirstTime(dto: LoginFirstTimeRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE}/loginfirsttime`, dto)
      .pipe(tap((resp) => this.saveSession(resp)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
