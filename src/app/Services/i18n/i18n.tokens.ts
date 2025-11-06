import { InjectionToken } from '@angular/core';
import { AppLang } from './language-service';

export type Dict = Record<string, string>;
export type I18nDict = Record<AppLang, Dict>;

export const I18N_DICT = new InjectionToken<I18nDict>('I18N_DICT');
export const I18N_LANG = new InjectionToken<AppLang>('I18N_LANG');
