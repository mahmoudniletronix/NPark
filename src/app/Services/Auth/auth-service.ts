import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, LoginResponse, LoginFirstTimeRequest } from '../../Domain/Auth/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://192.168.1.48:80/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private storage(remember: boolean) {
    return remember ? localStorage : sessionStorage;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  private saveSession(resp: LoginResponse, remember: boolean) {
    if (!resp?.token) throw new Error('No token in response');

    const store = this.storage(remember);
    store.setItem(TOKEN_KEY, resp.token);
    store.setItem(
      USER_KEY,
      JSON.stringify({
        role: resp.roleName || 'User',
      })
    );

    const other = remember ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  }
  login(dto: LoginRequest & { remember?: boolean }): Observable<LoginResponse> {
    const remember = !!dto.remember;
    const payload = { ...dto };
    delete (payload as any).remember;

    return this.http
      .post<LoginResponse>(`${API_BASE}/login`, payload)
      .pipe(tap((resp) => this.saveSession(resp, remember)));
  }

  loginFirstTime(dto: LoginFirstTimeRequest & { remember?: boolean }): Observable<LoginResponse> {
    const remember = !!dto.remember;
    const payload = { ...dto };
    delete (payload as any).remember;

    return this.http
      .post<LoginResponse>(`${API_BASE}/loginfirsttime`, payload)
      .pipe(tap((resp) => this.saveSession(resp, remember)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}
