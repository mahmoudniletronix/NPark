import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDto, UserRole } from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private svc = inject(UsersServices);
  users: UserDto[] = [];
  loading = false;

  // form state
  showForm = false;
  isEdit = false;
  model: Partial<UserDto> = { name: '', email: '', role: 'User', active: true };

  constructor() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.svc.getAll().subscribe((list) => {
      this.users = list;
      this.loading = false;
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
    this.showForm = false;
  }

  save() {
    if (!this.model.name?.trim() || !this.model.email?.trim() || !this.model.role) return;
    if (this.isEdit) {
      this.svc.update(this.model as UserDto).subscribe((_) => {
        this.showForm = false;
      });
    } else {
      const { name, email, role, active } = this.model;
      this.svc
        .add({ name: name!.trim(), email: email!.trim(), role: role as UserRole, active: !!active })
        .subscribe((_) => {
          this.showForm = false;
        });
    }
  }
}
