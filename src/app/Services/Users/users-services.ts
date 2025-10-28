import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay, of } from 'rxjs';
import { UserDto } from '../../Domain/Users/user.model';

@Injectable({
  providedIn: 'root',
})
export class UsersServices {
  private _list = new BehaviorSubject<UserDto[]>([
    { id: 1, name: 'Admin User', email: 'admin@np.com', role: 'Admin', active: true },
    { id: 2, name: 'Normal User', email: 'user@np.com', role: 'User', active: true },
    { id: 3, name: 'Viewer One', email: 'viewer@np.com', role: 'User', active: false },
  ]);

  getAll(): Observable<UserDto[]> {
    return this._list.asObservable().pipe(delay(150));
  }

  add(u: Omit<UserDto, 'id'>): Observable<UserDto> {
    const list = this._list.value;
    const created: UserDto = { ...u, id: Math.max(...list.map((x) => x.id)) + 1 };
    this._list.next([...list, created]);
    return of(created).pipe(delay(150));
  }

  update(u: UserDto): Observable<UserDto> {
    const list = this._list.value.map((x) => (x.id === u.id ? u : x));
    this._list.next(list);
    return of(u).pipe(delay(150));
  }
}
