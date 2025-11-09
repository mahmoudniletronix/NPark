import { Injectable } from '@angular/core';
export type AppLang = 'ar' | 'en';
type Lang = AppLang;
import { BehaviorSubject } from 'rxjs';

type Dict = Record<string, string>;
type I18nDict = Record<AppLang, Dict>;

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly LS_KEY = 'app.lang';
  private _current: AppLang = this.getInitialLang();
  private langSubject = new BehaviorSubject<AppLang>(this._current);
  public lang$ = this.langSubject.asObservable();
  get current(): AppLang {
    return this._current;
  }

  set(lang: AppLang) {
    if (lang === this._current) return;
    this._current = lang;
    localStorage.setItem(this.LS_KEY, lang);
    this.applyDomDirection(lang);
    this.langSubject.next(lang);
  }

  toggle() {
    this.set(this._current === 'ar' ? 'en' : 'ar');
  }
  isRTL(lang: AppLang = this._current) {
    return lang === 'ar';
  }
  dir(lang: AppLang = this._current) {
    return this.isRTL(lang) ? 'rtl' : 'ltr';
  }

  private getInitialLang(): AppLang {
    const saved = localStorage.getItem(this.LS_KEY) as AppLang | null;
    const initial = saved ?? (navigator.language?.startsWith('ar') ? 'ar' : 'en');
    this.applyDomDirection(initial);
    return initial;
  }
  private applyDomDirection(lang: AppLang) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
  }
}
