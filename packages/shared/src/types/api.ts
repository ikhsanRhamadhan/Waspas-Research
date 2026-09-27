import type { UserRole } from '../constants/role';

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession extends AuthTokens {
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  nama: string;
  noTelp: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccess<T> =>
  response.success;
