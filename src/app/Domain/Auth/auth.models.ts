export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginFirstTimeRequest {
  userName: string;
  password: string;
  newPassword: string;
}

export interface UserInfo {
  id: number;
  name: string;
  role: 'Admin' | 'User';
  email: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
  mustChangePassword?: boolean;
}
