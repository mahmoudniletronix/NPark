import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth-service';
import { ToastServices } from '../../Services/Toster/toast-services';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { GateType } from '../../Domain/Auth/auth.models';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipePipe],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          brandSuffix: 'Park',
          signInToContinue: 'سجّل الدخول للمتابعة',
          username: 'اسم المستخدم',
          password: 'كلمة المرور',
          usernamePh: 'admin',
          passwordPh: '••••••',
          usernameRequired: 'اسم المستخدم مطلوب.',
          passwordRequired: 'كلمة المرور مطلوبة.',
          rememberMe: 'تذكرني',
          forgotPassword: 'نسيت كلمة المرور؟',
          signIn: 'تسجيل الدخول',
          changeAdminCreds: 'تغيير بيانات المشرف',
          tempPasswordNotice: 'أنت تستخدم كلمة مرور مؤقتة، من فضلك أدخل كلمة مرور جديدة.',
          newPassword: 'كلمة المرور الجديدة',
          confirmPassword: 'تأكيد كلمة المرور',
          pwdMin: 'كلمة المرور مطلوبة (6 أحرف على الأقل).',
          pwdMismatch: 'كلمتا المرور غير متطابقتين.',
          cancel: 'إلغاء',
          save: 'حفظ',
          adminFirstTimeMissing:
            'لا توجد بيانات أول مرة. أعد محاولة تسجيل الدخول بـ Admin / Admin123',
          successLogin: 'تم تسجيل الدخول بنجاح',
          successPwdUpdated: 'تم تحديث كلمة المرور وتسجيل الدخول بنجاح',
          scannerReady: 'الماسح جاهز',

          gateType: 'نوع البوابة',
          entryGate: 'دخول',
          exitGate: 'خروج',
          gateNumber: 'رقم البوابة',
          gateNumberPh: 'مثال: 1',

          gateTypeRequired: 'نوع البوابة مطلوب.',
          gateNumberRequired: 'رقم البوابة مطلوب.',
        },
        en: {
          brandSuffix: 'Park',
          signInToContinue: 'Sign in to continue',
          username: 'Username',
          password: 'Password',
          usernamePh: 'admin',
          passwordPh: '••••••',
          usernameRequired: 'Username is required.',
          passwordRequired: 'Password is required.',
          rememberMe: 'Remember me',
          forgotPassword: 'Forgot password?',
          signIn: 'Sign In',
          changeAdminCreds: 'Change admin credentials',
          tempPasswordNotice: 'You are using a temporary password. Please create new credentials.',
          newPassword: 'New password',
          confirmPassword: 'Confirm password',
          pwdMin: 'Password required (min 6).',
          pwdMismatch: 'Passwords do not match.',
          cancel: 'Cancel',
          save: 'Save',
          adminFirstTimeMissing: 'No first-time data. Please login again with Admin / Admin123',
          successLogin: 'Logged in successfully',
          successPwdUpdated: 'Password updated and logged in successfully',
          scannerReady: 'Scanner ready',

          gateType: 'Gate Type',
          entryGate: 'Entry',
          exitGate: 'Exit',
          gateNumber: 'Gate Number',
          gateNumberPh: 'e.g. 1',

          gateTypeRequired: 'Gate type is required.',
          gateNumberRequired: 'Gate number is required.',
        },
      }) as I18nDict,
    },
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastServices);

  public lang = inject(LanguageService);

  loading = false;
  showPassword = false;
  changeError: string | null = null;
  errorToast: string | null = null;

  private firstUserName: string | null = null;
  private firstPassword: string | null = null;

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
    gateType: [GateType.Entrance, [Validators.required]],
    gateNumber: [1, [Validators.required, Validators.min(1)]],
  });

  showChangeModal = false;
  changeLoading = false;
  changeForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatch }
  );

  passwordsMatch(group: any) {
    return group.get('newPassword')?.value === group.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const dto = {
      userName: (this.form.value.username ?? '').trim(),
      password: this.form.value.password ?? '',
      gateType: this.form.value.gateType!,
      gateNumber: Number(this.form.value.gateNumber) || 1,
      remember: !!this.form.value.remember,
    };

    if ((dto.userName === 'Admin' || dto.userName === 'admin') && dto.password === 'Admin123') {
      this.firstUserName = dto.userName;
      this.firstPassword = dto.password;
      this.loading = false;
      this.showChangeModal = true;
      this.changeForm.reset();
      return;
    }

    this.auth.login(dto).subscribe({
      next: () => {
        this.loading = false;
        this.toast?.success?.(this.t('successLogin'));
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.loading = false;

        const detail = err?.error?.detail || err?.error?.title || '';
        if (err?.status === 422 && /Gate Already Occupied/i.test(detail)) {
          const typeLabel = dto.gateType === GateType.Entrance ? this.t('entry') : this.t('exit');
          const msg = this.t('gateOccupied')
            .replace('{{num}}', String(dto.gateNumber))
            .replace('{{type}}', typeLabel);
          this.toast?.warn?.(`${msg} ${this.t('chooseAnotherGate')}`);

          this.form.patchValue({ gateNumber: Number(dto.gateNumber || 1) + 1 });
          return;
        }

        this.toast?.fromProblem?.(err);
      },
    });
  }

  saveNewCredentials() {
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }
    if (!this.firstUserName || !this.firstPassword) {
      this.toast?.error?.(this.t('adminFirstTimeMissing'));
      return;
    }

    this.changeLoading = true;

    const gateType = this.form.value.gateType!;
    const gateNumber = Number(this.form.value.gateNumber) || 1;
    const remember = !!this.form.value.remember;

    const payload = {
      userName: this.firstUserName,
      password: this.firstPassword,
      newPassword: this.changeForm.value.newPassword!,
      gateType,
      gateNumber,
      remember,
    };

    this.auth.loginFirstTime(payload).subscribe({
      next: () => {
        this.auth
          .login({
            userName: this.firstUserName!,
            password: payload.newPassword,
            gateType,
            gateNumber,
            remember,
          })
          .subscribe({
            next: () => {
              this.changeLoading = false;
              this.showChangeModal = false;
              this.toast?.success?.(this.t('successPwdUpdated'));
              this.navigateAfterLogin();
            },
            error: (err) => {
              this.changeLoading = false;
              this.toast?.fromProblem?.(err);
            },
          });
      },
      error: (err) => {
        this.changeLoading = false;
        this.toast?.fromProblem?.(err);
      },
    });
  }

  private navigateAfterLogin() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/overview';
    this.router.navigateByUrl(returnUrl);
  }

  private t(key: string) {
    return (this as any).dict?.[this.lang.current]?.[key] ?? key;
  }

  constructor(@Inject(I18N_DICT) private dict: I18nDict) {}
}
