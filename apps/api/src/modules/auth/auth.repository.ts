import type { UserRole } from '@spk-bansos/shared';

import type { AuthUserProfile, RegisterRequestDto } from './auth.dto';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  nama: string;
  noTelp: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  profile: AuthUserProfile | null;
}

export interface CreateUserParams {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  nama: string;
  noTelp?: string | null;
  profile?: {
    nik: string;
    namaLengkap: string;
    jenisKelamin?: string | null;
    tanggalLahir?: string | null;
    alamat: string;
    desa?: string | null;
    kecamatan?: string | null;
    kabupaten?: string | null;
    noTelp?: string | null;
  };
}

/**
 * Kontrak repository modul auth. Controller tidak pernah menyentuh Drizzle
 * secara langsung, sehingga sumber data bisa diganti tanpa mengubah service.
 */
export interface AuthRepository {
  findByIdentifier(identifier: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  existsByUsernameOrEmail(username: string, email: string): Promise<{ username: boolean; email: boolean }>;
  createWithProfile(params: CreateUserParams): Promise<UserRecord>;
  touchLastLogin(userId: string): Promise<void>;
  updateProfile(userId: string, data: Partial<AuthUserProfile> & { email?: string }): Promise<UserRecord>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  deactivate(userId: string): Promise<void>;
}

export type { RegisterRequestDto };
