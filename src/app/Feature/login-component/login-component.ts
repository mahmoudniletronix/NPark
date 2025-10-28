import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../Services/Auth/auth-service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

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

    const userName = this.form.value.username!.trim();
    const password = this.form.value.password!;

    this.auth.login({ userName, password }).subscribe({
      next: (resp) => {
        this.loading = false;

        if (resp.mustChangePassword) {
          this.tmpUsername = userName;
          this.tmpPassword = password;
          this.showChangeModal = true;
          this.changeForm.reset();
          return;
        }

        this.navigateAfterLogin();
      },
      error: (err) => {
        this.loading = false;

        const mustChange = err?.error?.mustChangePassword === true;
        if (mustChange) {
          this.tmpUsername = userName;
          this.tmpPassword = password;
          this.showChangeModal = true;
          this.changeForm.reset();
          return;
        }

        this.error = err?.error?.message || err?.message || 'Login failed';
      },
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

    const newPassword = this.changeForm.value.newPassword!;
    this.auth
      .loginFirstTime({
        userName: this.tmpUsername,
        password: this.tmpPassword,
        newPassword,
      })
      .subscribe({
        next: (_) => {
          this.changeLoading = false;
          this.showChangeModal = false;
          this.navigateAfterLogin();
        },
        error: (err) => {
          this.changeLoading = false;
          this.changeError =
            err?.error?.message || err?.message || 'Error while updating credentials';
        },
      });
  }

  private navigateAfterLogin() {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }
}
