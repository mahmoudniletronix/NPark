import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-footer-component',
  standalone: true,
  imports: [CommonModule, TranslatePipePipe],
  templateUrl: './footer-component.html',
  styleUrls: ['./footer-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          rights: 'جميع الحقوق محفوظة',
          followUs: 'تابعنا على',
        },
        en: {
          rights: 'All rights reserved.',
          followUs: 'Follow us on',
        },
      }) as I18nDict,
    },
  ],
})
export class FooterComponent {
  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}
  currentYear = new Date().getFullYear();
}
