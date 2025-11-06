import { Inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language-service';
import { I18N_DICT, I18nDict } from './i18n.tokens';

@Pipe({
  name: 't',
  standalone: true,

  pure: false,
})
export class TranslatePipePipe implements PipeTransform {
  constructor(private lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}
  transform(key: string): string {
    const d = this.dict[this.lang.current] || {};
    return d[key] ?? key;
  }
}
