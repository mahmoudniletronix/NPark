import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../Services/Auth/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoginRequest } from '../../Domain/Auth/auth.models';

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = false;
  error: string | null = null;
  showPassword = false;

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
  });
  showChangeModal = false;
  changeLoading = false;
  changeError: string | null = null;

  changeForm = this.fb.group(
    {
      newUsername: ['', [Validators.required, Validators.minLength(3)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatch }
  );

  private tmpUsername = '';
  private tmpPassword = '';

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const userName = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    // ✅ الحالة الأولى: أول تسجيل دخول للمستخدم الافتراضي
    if (userName === 'Admin' && password === 'Admin123') {
      const firstLoginData = {
        userName,
        password,
        newPassword: '',
        confirmedPassword: '',
      };

      localStorage.setItem('first_login_data', JSON.stringify(firstLoginData));
      localStorage.setItem(
        'auth_user',
        JSON.stringify({
          id: 1,
          name: userName,
          role: 'Admin',
          email: `${userName}@np.com`,
        })
      );
      localStorage.setItem('auth_token', 'local.temp.' + Date.now());

      this.loading = false;
      this.showChangeModal = true;
      this.changeForm.reset();
      return;
    }

    // ✅ الحالة الثانية: تسجيل دخول عادي -> استدعاء API
    const dto: LoginRequest = { userName, password };

this.auth.login({ userName, password }).subscribe({
  next: (resp) => {
    console.log('Login OK:', resp);   // { token, roleName }
  },
  error: (err) => {
    console.error('Login ERR:', err);
  }
});
  }

  public passwordsMatch(group: any) {
    return group.get('newPassword')?.value === group.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  saveNewCredentials() {
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }
    this.changeLoading = true;
    this.changeError = null;

    const stored = localStorage.getItem('first_login_data');
    const base = stored
      ? (JSON.parse(stored) as {
          userName: string;
          password: string;
          newPassword: string;
          confirmedPassword: string;
        })
      : null;

    if (!base) {
      this.changeLoading = false;
      this.changeError = 'No first-time data found.';
      return;
    }

    const payload = {
      userName: base.userName,
      password: base.password,
      newPassword: this.changeForm.value.newPassword!,
      confirmedPassword: this.changeForm.value.confirmPassword!,
    };

    this.auth.loginFirstTime(payload).subscribe({
      next: (resp) => {
        localStorage.removeItem('first_login_data');

        this.changeLoading = false;
        this.showChangeModal = false;
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.changeLoading = false;
        this.changeError = err?.error?.message || err?.message || 'Failed to update credentials';
      },
    });
  }

  private navigateAfterLogin() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
