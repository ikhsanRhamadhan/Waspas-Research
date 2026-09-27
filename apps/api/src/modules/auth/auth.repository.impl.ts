import { and, eq, isNull, or } from 'drizzle-orm';

import { db } from '../../db/client';
import { penduduk, users } from '../../db/schema';

import type { AuthUserProfile } from './auth.dto';
import type { AuthRepository, CreateUserParams, UserRecord } from './auth.repository';

const toUserProfile = (row: typeof penduduk.$inferSelect): AuthUserProfile => ({
  nik: row.nik,
  namaLengkap: row.namaLengkap,
  jenisKelamin: row.jenisKelamin,
  tanggalLahir: row.tanggalLahir,
  alamat: row.alamat,
  desa: row.desa,
  kecamatan: row.kecamatan,
  kabupaten: row.kabupaten,
  noTelp: row.noTelp,
  noRekening: row.noRekening,
  namaBank: row.namaBank,
});

const activeUserFilter = and(eq(users.deletedAt, isNull(users.deletedAt)));

export class DrizzleAuthRepository implements AuthRepository {
  async findByIdentifier(identifier: string): Promise<UserRecord | null> {
    const rows = await db
      .select()
      .from(users)
      .leftJoin(penduduk, eq(penduduk.userId, users.id))
      .where(and(activeUserFilter, or(eq(users.username, identifier), eq(users.email, identifier))))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.users.id,
      username: row.users.username,
      email: row.users.email,
      passwordHash: row.users.passwordHash,
      role: row.users.role,
      nama: row.users.nama,
      noTelp: row.users.noTelp,
      isActive: row.users.isActive,
      lastLogin: row.users.lastLogin,
      createdAt: row.users.createdAt,
      profile: row.penduduk ? toUserProfile(row.penduduk) : null,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const rows = await db
      .select()
      .from(users)
      .leftJoin(penduduk, eq(penduduk.userId, users.id))
      .where(and(eq(users.id, id), activeUserFilter))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.users.id,
      username: row.users.username,
      email: row.users.email,
      passwordHash: row.users.passwordHash,
      role: row.users.role,
      nama: row.users.nama,
      noTelp: row.users.noTelp,
      isActive: row.users.isActive,
      lastLogin: row.users.lastLogin,
      createdAt: row.users.createdAt,
      profile: row.penduduk ? toUserProfile(row.penduduk) : null,
    };
  }

  async existsByUsernameOrEmail(username: string, email: string): Promise<{ username: boolean; email: boolean }> {
    const rows = await db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(2);

    return {
      username: rows.some((row) => row.username === username),
      email: rows.some((row) => row.email === email),
    };
  }

  async createWithProfile(params: CreateUserParams): Promise<UserRecord> {
    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: params.username,
          email: params.email,
          passwordHash: params.passwordHash,
          role: params.role,
          nama: params.nama,
          noTelp: params.noTelp ?? null,
        })
        .returning();

      if (!user) throw new Error('Gagal membuat pengguna');

      if (params.profile) {
        await tx.insert(penduduk).values({
          userId: user.id,
          nik: params.profile.nik,
          namaLengkap: params.profile.namaLengkap,
          jenisKelamin: params.profile.jenisKelamin ?? null,
          tanggalLahir: params.profile.tanggalLahir ?? null,
          alamat: params.profile.alamat,
          desa: params.profile.desa ?? null,
          kecamatan: params.profile.kecamatan ?? null,
          kabupaten: params.profile.kabupaten ?? null,
          noTelp: params.profile.noTelp ?? null,
        });
      }

      const created = await this.findById(user.id);
      if (!created) throw new Error('Pengguna baru tidak dapat dibaca kembali');
      return created;
    });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateProfile(userId: string, data: Partial<AuthUserProfile> & { email?: string }): Promise<UserRecord> {
    await db.transaction(async (tx) => {
      const userFields: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
      if (data.email) userFields.email = data.email;
      if (data.namaLengkap) userFields.nama = data.namaLengkap;
      if (data.noTelp !== undefined) userFields.noTelp = data.noTelp ?? null;
      await tx.update(users).set(userFields).where(eq(users.id, userId));

      const profileFields: Partial<typeof penduduk.$inferInsert> = { updatedAt: new Date() };
      if (data.namaLengkap) profileFields.namaLengkap = data.namaLengkap;
      if (data.jenisKelamin !== undefined) profileFields.jenisKelamin = data.jenisKelamin ?? null;
      if (data.tanggalLahir !== undefined) profileFields.tanggalLahir = data.tanggalLahir ?? null;
      if (data.alamat) profileFields.alamat = data.alamat;
      if (data.desa !== undefined) profileFields.desa = data.desa ?? null;
      if (data.kecamatan !== undefined) profileFields.kecamatan = data.kecamatan ?? null;
      if (data.kabupaten !== undefined) profileFields.kabupaten = data.kabupaten ?? null;
      if (data.noTelp !== undefined) profileFields.noTelp = data.noTelp ?? null;
      if (data.noRekening !== undefined) profileFields.noRekening = data.noRekening ?? null;
      if (data.namaBank !== undefined) profileFields.namaBank = data.namaBank ?? null;

      await tx.update(penduduk).set(profileFields).where(eq(penduduk.userId, userId));
    });

    const updated = await this.findById(userId);
    if (!updated) throw new Error('Profil tidak ditemukan setelah diperbarui');
    return updated;
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async deactivate(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
