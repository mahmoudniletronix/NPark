import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserDto, UserRole } from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';

import { LanguageService, AppLang } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private svc = inject(UsersServices);
  i18n = inject(LanguageService);

  // i18n
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      users: 'المستخدمون',
      add_new: 'إضافة',
      id: '#',
      name: 'الاسم',
      email: 'البريد',
      role: 'الدور',
      status: 'الحالة',
      actions: 'إجراءات',
      admin: 'مشرف',
      user: 'مستخدم',
      active: 'نشط',
      inactive: 'غير نشط',
      edit: 'تعديل',
      no_users: 'لا يوجد مستخدمون',
      close: 'إغلاق',
      edit_user: 'تعديل مستخدم',
      add_user: 'إضافة مستخدم جديد',
      create: 'إنشاء',
      save: 'حفظ',
      cancel: 'إلغاء',
      invalid_email: 'بريد غير صالح',
      required: 'مطلوب',
      saving: 'جاري الحفظ...',
      loading: 'جاري التحميل...',
      created_ok: 'تم الإنشاء بنجاح',
      updated_ok: 'تم الحفظ بنجاح',
      failed_load: 'فشل تحميل المستخدمين',
      failed_save: 'تعذر الحفظ',
    },
    en: {
      users: 'Users',
      add_new: 'Add New',
      id: '#',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      actions: 'Actions',
      admin: 'Admin',
      user: 'User',
      active: 'Active',
      inactive: 'Inactive',
      edit: 'Edit',
      no_users: 'No users',
      close: 'Close',
      edit_user: 'Edit User',
      add_user: 'Add New User',
      create: 'Create',
      save: 'Save',
      cancel: 'Cancel',
      invalid_email: 'Invalid email',
      required: 'Required',
      saving: 'Saving...',
      loading: 'Loading...',
      created_ok: 'Created successfully',
      updated_ok: 'Saved successfully',
      failed_load: 'Failed to load users',
      failed_save: 'Failed to save',
    },
  };
  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

  // state
  users: UserDto[] = [];
  loading = false;
  saving = false;

  showForm = false;
  isEdit = false;
  model: Partial<UserDto> = { name: '', email: '', role: 'User', active: true };

  roles: UserRole[] = ['User', 'Admin'];

  constructor() {
    this.reload();
  }

  trackById = (_: number, u: UserDto) => u.id;

  reload() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.users = list ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert(this.t('failed_load'));
      },
    });
  }

  openAdd() {
    this.isEdit = false;
    this.model = { name: '', email: '', role: 'User', active: true };
    this.showForm = true;
  }

  openEdit(u: UserDto) {
    this.isEdit = true;
    this.model = { ...u };
    this.showForm = true;
  }

  cancel() {
    if (this.saving) return;
    this.showForm = false;
  }

  private isValidEmail(v?: string) {
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  save() {
    if (this.saving) return;

    const name = (this.model.name ?? '').trim();
    const email = (this.model.email ?? '').trim();
    const role = (this.model.role as UserRole) ?? 'User';
    const active = !!this.model.active;

    if (!name) {
      alert(`${this.t('name')}: ${this.t('required')}`);
      return;
    }
    if (!email || !this.isValidEmail(email)) {
      alert(`${this.t('email')}: ${this.t('invalid_email')}`);
      return;
    }

    this.saving = true;

    if (this.isEdit) {
      const payload: UserDto = {
        ...(this.model as UserDto),
        name,
        email,
        role,
        active,
      };
      this.svc.update(payload).subscribe({
        next: () => {
          alert(this.t('updated_ok'));
          this.showForm = false;
          this.reload();
          this.saving = false;
        },
        error: () => {
          this.saving = false;
          alert(this.t('failed_save'));
        },
      });
    } else {
      this.svc.add({ name, email, role, active }).subscribe({
        next: () => {
          alert(this.t('created_ok'));
          this.showForm = false;
          this.reload();
          this.saving = false;
        },
        error: () => {
          this.saving = false;
          alert(this.t('failed_save'));
        },
      });
    }
  }
}
