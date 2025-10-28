export type UserRole = 'Admin' | 'User';
export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}
