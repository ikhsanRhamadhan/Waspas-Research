import type { AuthSession, AuthUser } from '@spk-bansos/shared';

export interface AuthSessionResponse extends AuthSession {
  profile: AuthUserProfile | null;
}

export interface AuthUserProfile {
  nik: string;
  namaLengkap: string;
  jenisKelamin: string | null;
  tanggalLahir: string | null;
  alamat: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  noTelp: string | null;
  noRekening: string | null;
  namaBank: string | null;
}

export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface RegisterRequestDto {
  nik: string;
  namaLengkap: string;
  email: string;
  noTelp?: string;
  username: string;
  password: string;
  jenisKelamin?: 'L' | 'P';
  tanggalLahir?: string;
  alamat: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
}
