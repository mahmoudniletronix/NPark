import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

type ApiOk = { message?: string; data?: string };
type ApiErr = { message?: string; error?: string };

@Injectable({ providedIn: 'root' })
export class NfcReaderService {
  private url = `${environment.nfcBaseUrl}/Cards/read`;

  constructor(private http: HttpClient) {}

  async readUID(): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ message?: string; data?: string }>(this.url, { observe: 'response' })
      );
      console.log('NFC response', res.status, res.body);
      const uid = res.body?.data?.toString().trim();
      if (uid) return uid.toUpperCase();
      throw new Error('لم يتم استلام UID صالح من قارئ الـ NFC.');
    } catch (e) {
      const err = e as HttpErrorResponse;

      if (typeof err?.error === 'string') {
        const maybeUid = this.extractFromText(err.error);
        if (maybeUid) return maybeUid;
        try {
          const parsed = JSON.parse(err.error) as ApiErr | ApiOk;
          const uid = this.pickUid(parsed);
          if (uid) return uid;
          if ((parsed as ApiErr)?.message || (parsed as ApiErr)?.error) {
            throw new Error(this.formatApiError(parsed as ApiErr));
          }
        } catch {}
      }

      if (err?.error && typeof err.error === 'object') {
        const body = err.error as ApiErr | ApiOk;
        const uid = this.pickUid(body);
        if (uid) return uid;
        throw new Error(this.formatApiError(body as ApiErr));
      }

      try {
        const asText = await firstValueFrom(this.http.get(this.url, { responseType: 'text' }));
        const uid = this.extractFromText(asText);
        if (uid) return uid;
      } catch {}

      throw new Error('تعذّر قراءة الكارت: تحقق من توصيل القارئ وتشغيل الخدمة.');
    }
  }

  private pickUid(x?: Partial<ApiOk> | null): string | null {
    if (!x) return null;
    const candidate = (x as ApiOk).data;
    return candidate ? String(candidate).trim() : null;
  }

  private extractFromText(t?: string): string | null {
    if (!t) return null;
    const s = String(t).trim();
    if (/^[0-9A-Fa-f]+$/.test(s)) return s;
    const m = s.match(/"data"\s*:\s*"([^"]+)"/i);
    return m?.[1]?.trim() ?? null;
  }

  private formatApiError(err: ApiErr): string {
    const msg = err?.message?.trim();
    const det = err?.error?.trim();

    if (msg || det) {
      return `تعذّر قراءة الكارت: ${msg ?? ''}${msg && det ? ' — ' : ''}${det ?? ''}`;
    }
    return 'تعذّر قراءة الكارت: فشل غير معروف من القارئ.';
  }
}
