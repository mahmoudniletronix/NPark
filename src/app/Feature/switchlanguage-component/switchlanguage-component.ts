import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-switch-language',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './switchlanguage-component.html',
  styleUrl: './switchlanguage-component.css',
})
export class SwitchlanguageComponent {
  private i18n = inject(LanguageService);
  isRTL = computed(() => this.i18n.current === 'ar');
  toggle() {
    this.i18n.toggle();
  }
  label = computed(() => (this.isRTL() ? 'English' : 'Arabic'));
}
