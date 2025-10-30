import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  constructor(private s: DomSanitizer) {}
  transform(v: string): SafeHtml {
    return this.s.bypassSecurityTrustHtml(v);
  }
}
