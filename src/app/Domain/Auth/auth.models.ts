export enum GateType {
  Entrance = 1,
  Exit = 2,
}

export interface LoginRequest {
  userName: string;
  password: string;
  gateType: GateType;
  gateNumber: number;
}

export interface LoginFirstTimeRequest {
  userName: string;
  password: string;
  newPassword: string;
  gateType: GateType;
  gateNumber: number;
}

export interface LoginResponse {
  token: string;
  roleName: string;
}
