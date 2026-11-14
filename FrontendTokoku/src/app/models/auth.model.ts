export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'User' | 'Admin' | 'SuperAdmin' | string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiration: string;
  user: User;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ResetPasswordRequestPayload {
  email: string;
}

export interface ResetPasswordConfirmPayload {
  email: string;
  token: string;
  newPassword: string;
}

export interface CreateSuperadminPayload {
  fullName: string;
  email: string;
  password: string;
  masterKey?: string;
}
