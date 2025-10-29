import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../Services/Auth/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginRequest } from '../../Domain/Auth/auth.models';
import { ToastServices } from '../../Services/Toster/toast-services';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastServices);

  loading = false;
  showPassword = false;
  error: string | null = null;
  changeError: string | null = null;
  errorToast: string | null = null;

  private firstUserName: string | null = null;
  private firstPassword: string | null = null;

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
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

    const userName = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    if ((userName === 'Admin' || userName === 'admin') && password === 'Admin123') {
      this.firstUserName = userName;
      this.firstPassword = password;
      this.loading = false;
      this.showChangeModal = true;
      this.changeForm.reset();
      return;
    }

    this.auth.login({ userName, password }).subscribe({
      next: () => {
        this.loading = false;
        this.toast?.success?.('تم تسجيل الدخول بنجاح');
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.loading = false;
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
      this.toast?.error?.('لا توجد بيانات أول مرة. أعد محاولة تسجيل الدخول بـ Admin / Admin123');
      return;
    }

    this.changeLoading = true;

    const payload = {
      userName: this.firstUserName,
      password: this.firstPassword,
      newPassword: this.changeForm.value.newPassword!,
    };

    this.auth.loginFirstTime(payload).subscribe({
      next: () => {
        this.auth
          .login({ userName: this.firstUserName!, password: payload.newPassword })
          .subscribe({
            next: () => {
              this.changeLoading = false;
              this.showChangeModal = false;
              this.toast?.success?.('تم تحديث كلمة المرور وتسجيل الدخول بنجاح');
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
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
