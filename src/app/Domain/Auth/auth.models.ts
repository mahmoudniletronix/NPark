export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginFirstTimeRequest {
  userName: string;
  password: string;
  newPassword: string;
}


export interface LoginResponse {
  token: string;
  roleName: string;
}
