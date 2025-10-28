import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  LoginRequest,
  LoginResponse,
  UserInfo,
  LoginFirstTimeRequest,
} from '../../Domain/Auth/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser$ = new BehaviorSubject<UserInfo | null>(this.getStoredUser());
  currentUser$ = this._currentUser$.asObservable();

  constructor(private http: HttpClient) {}

  private getStoredUser(): UserInfo | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  isLoggedIn(): boolean {
    return !!this.token;
  }

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/login`, dto).pipe(
      tap((r) => {
        if (!r.mustChangePassword) this.persistAuth(r);
      })
    );
  }

  loginFirstTime(dto: LoginFirstTimeRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE}/loginfirsttime`, dto)
      .pipe(tap((r) => this.persistAuth(r)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._currentUser$.next(null);
  }

  private persistAuth(r: LoginResponse) {
    localStorage.setItem(TOKEN_KEY, r.token);
    localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    this._currentUser$.next(r.user);
  }
}
