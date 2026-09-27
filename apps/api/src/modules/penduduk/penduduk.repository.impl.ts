import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';

import { db } from '../../db/client';
import {
  dokumenVerifikasi,
  hasil,
  penduduk,
  pengajuan,
  perhitunganWaspas,
  users,
  verifikasi,
} from '../../db/schema';
import type { StatusPengajuan } from '@spk-bansos/shared';

import type { PageResult } from '../../shared/utils/pagination';
import type { ListPengajuanQuery } from './penduduk.validation';
import type { CreatePengajuanInput, UpdatePengajuanInput } from './penduduk.validation';

export interface PengajuanWithPeminjam {
  id: string;
  pendudukId: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  statusPengajuan: StatusPengajuan;
  catatanPenduduk: string | null;
  tanggalPengajuan: Date;
  updatedAt: Date;
  createdAt: Date;
  namaLengkap: string;
  nik: string;
  alamat: string;
  desa: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  noTelp: string | null;
  userId: string;
}

/**
 * Kontrak repository modul penduduk. Semua query milik satu pengguna (scoped by
 * userId) terkumpul di sini supaya tidak ada query yang lupa dibatasi.
 */
export interface PendudukRepository {
  findPendudukByUserId(userId: string): Promise<typeof penduduk.$inferSelect | null>;
  findPengajuanById(id: string): Promise<PengajuanWithPeminjam | null>;
  listPengajuan(userId: string, query: ListPengajuanQuery): Promise<PageResult<PengajuanWithPeminjam>>;
  createPengajuan(pendudukId: string, input: CreatePengajuanInput): Promise<PengajuanWithPeminjam>;
  updatePengajuan(id: string, input: UpdatePengajuanInput): Promise<PengajuanWithPeminjam>;
  countByStatus(userId: string): Promise<Record<string, number>>;
  findLatestPengajuan(userId: string): Promise<PengajuanWithPeminjam | null>;
  findStatusTerperiksa(userId: string): Promise<{
    verifikasi: { statusVerifikasi: string; tanggalVerifikasi: Date } | null;
    hasil: { ranking: number; skorWaspas: number; statusKeputusan: string; tanggalKeputusan: Date } | null;
    waspas: { skorWs: number; skorWp: number; skorAkhir: number; lambda: number; ranking: number | null } | null;
  } | null>;
  hitungTotalTerperiksa(): Promise<number>;
  getDokumenByPengajuanId(pengajuanId: string): Promise<{ id: string; jenis: string; namaFile: string }[]>;
  findVerifikasiByPengajuanId(pengajuanId: string): Promise<{
    statusVerifikasi: string;
    catatanVerifikasi: string | null;
    namaPetugas: string;
    tanggalVerifikasi: Date;
  } | null>;
  getPengajuanIdsByUser(userId: string): Promise<string[]>;
}

const selectPengajuanBase = {
  id: pengajuan.id,
  pendudukId: pengajuan.pendudukId,
  penghasilanBulanan: pengajuan.penghasilanBulanan,
  jumlahTanggungan: pengajuan.jumlahTanggungan,
  kondisiRumah: pengajuan.kondisiRumah,
  statusPengajuan: pengajuan.statusPengajuan,
  catatanPenduduk: pengajuan.catatanPenduduk,
  tanggalPengajuan: pengajuan.tanggalPengajuan,
  updatedAt: pengajuan.updatedAt,
  createdAt: pengajuan.createdAt,
  namaLengkap: penduduk.namaLengkap,
  nik: penduduk.nik,
  alamat: penduduk.alamat,
  desa: penduduk.desa,
  kecamatan: penduduk.kecamatan,
  kabupaten: penduduk.kabupaten,
  noTelp: penduduk.noTelp,
  userId: users.id,
} as const;

const aktifPengajuan = (): SQL => isNull(pengajuan.deletedAt);

const withJoin = () =>
  db
    .select(selectPengajuanBase)
    .from(pengajuan)
    .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
    .innerJoin(users, eq(users.id, penduduk.userId));

export class DrizzlePendudukRepository implements PendudukRepository {
  async findPendudukByUserId(userId: string): Promise<typeof penduduk.$inferSelect | null> {
    const rows = await db
      .select()
      .from(penduduk)
      .where(and(eq(penduduk.userId, userId), isNull(penduduk.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findPengajuanById(id: string): Promise<PengajuanWithPeminjam | null> {
    const rows = await withJoin()
      .where(and(eq(pengajuan.id, id), aktifPengajuan()))
      .limit(1);
    return rows[0] ?? null;
  }

  async listPengajuan(userId: string, query: ListPengajuanQuery): Promise<PageResult<PengajuanWithPeminjam>> {
    const conditions: SQL[] = [eq(users.id, userId), aktifPengajuan()];

    if (query.status) conditions.push(eq(pengajuan.statusPengajuan, query.status));
    if (query.search) {
      const pola = `%${query.search}%`;
      const pencarian = or(ilike(pengajuan.catatanPenduduk, pola), ilike(penduduk.namaLengkap, pola));
      if (pencarian) conditions.push(pencarian);
    }

    const where = and(...conditions);
    const urut = query.order === 'asc' ? pengajuan.tanggalPengajuan : desc(pengajuan.tanggalPengajuan);
    const offset = (query.page - 1) * query.limit;

    const [items, totalRows] = await Promise.all([
      withJoin()
        .where(where)
        .orderBy(urut)
        .limit(query.limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(pengajuan)
        .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
        .innerJoin(users, eq(users.id, penduduk.userId))
        .where(where),
    ]);

    return { items, total: totalRows[0]?.value ?? 0 };
  }

  async createPengajuan(pendudukId: string, input: CreatePengajuanInput): Promise<PengajuanWithPeminjam> {
    const [created] = await db
      .insert(pengajuan)
      .values({
        pendudukId,
        penghasilanBulanan: input.penghasilanBulanan,
        jumlahTanggungan: input.jumlahTanggungan,
        kondisiRumah: input.kondisiRumah,
        catatanPenduduk: input.catatanPenduduk ?? null,
      })
      .returning({ id: pengajuan.id });

    if (!created) throw new Error('Pengajuan gagal dibuat');

    const found = await this.findPengajuanById(created.id);
    if (!found) throw new Error('Pengajuan yang baru dibuat tidak dapat dibaca kembali');
    return found;
  }

  async updatePengajuan(id: string, input: UpdatePengajuanInput): Promise<PengajuanWithPeminjam> {
    await db
      .update(pengajuan)
      .set({
        ...(input.penghasilanBulanan !== undefined ? { penghasilanBulanan: input.penghasilanBulanan } : {}),
        ...(input.jumlahTanggungan !== undefined ? { jumlahTanggungan: input.jumlahTanggungan } : {}),
        ...(input.kondisiRumah !== undefined ? { kondisiRumah: input.kondisiRumah } : {}),
        ...(input.catatanPenduduk !== undefined ? { catatanPenduduk: input.catatanPenduduk } : {}),
        updatedAt: new Date(),
      })
      .where(eq(pengajuan.id, id));

    const found = await this.findPengajuanById(id);
    if (!found) throw new Error('Pengajuan tidak ditemukan setelah diperbarui');
    return found;
  }

  async countByStatus(userId: string): Promise<Record<string, number>> {
    const rows = await db
      .select({ status: pengajuan.statusPengajuan, value: count() })
      .from(pengajuan)
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .where(and(eq(penduduk.userId, userId), aktifPengajuan()))
      .groupBy(pengajuan.statusPengajuan);

    return Object.fromEntries(rows.map((row) => [row.status, row.value]));
  }

  async findLatestPengajuan(userId: string): Promise<PengajuanWithPeminjam | null> {
    const rows = await withJoin()
      .where(and(eq(users.id, userId), aktifPengajuan()))
      .orderBy(desc(pengajuan.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findStatusTerperiksa(userId: string): Promise<{
    verifikasi: { statusVerifikasi: string; tanggalVerifikasi: Date } | null;
    hasil: { ranking: number; skorWaspas: number; statusKeputusan: string; tanggalKeputusan: Date } | null;
    waspas: { skorWs: number; skorWp: number; skorAkhir: number; lambda: number; ranking: number | null } | null;
  } | null> {
    const rows = await db
      .select({
        pengajuanId: pengajuan.id,
        statusVerifikasi: verifikasi.statusVerifikasi,
        tanggalVerifikasi: verifikasi.tanggalVerifikasi,
        hasilRanking: hasil.ranking,
        skorWaspas: hasil.skorWaspas,
        statusKeputusan: hasil.statusKeputusan,
        tanggalKeputusan: hasil.tanggalKeputusan,
        skorWs: perhitunganWaspas.skorWs,
        skorWp: perhitunganWaspas.skorWp,
        skorAkhir: perhitunganWaspas.skorAkhir,
        lambda: perhitunganWaspas.lambda,
        waspasRanking: perhitunganWaspas.ranking,
      })
      .from(pengajuan)
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .leftJoin(verifikasi, eq(verifikasi.pengajuanId, pengajuan.id))
      .leftJoin(perhitunganWaspas, eq(perhitunganWaspas.pengajuanId, pengajuan.id))
      .leftJoin(hasil, eq(hasil.pengajuanId, pengajuan.id))
      .where(and(eq(penduduk.userId, userId), aktifPengajuan()))
      .orderBy(desc(pengajuan.createdAt))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      verifikasi: row.statusVerifikasi
        ? { statusVerifikasi: row.statusVerifikasi, tanggalVerifikasi: row.tanggalVerifikasi as Date }
        : null,
      hasil:
        row.hasilRanking !== null
          ? {
              ranking: row.hasilRanking,
              skorWaspas: Number(row.skorWaspas),
              statusKeputusan: row.statusKeputusan as string,
              tanggalKeputusan: row.tanggalKeputusan as Date,
            }
          : null,
      waspas:
        row.skorAkhir !== null
          ? {
              skorWs: Number(row.skorWs),
              skorWp: Number(row.skorWp),
              skorAkhir: Number(row.skorAkhir),
              lambda: Number(row.lambda),
              ranking: row.waspasRanking,
            }
          : null,
    };
  }

  async hitungTotalTerperiksa(): Promise<number> {
    const rows = await db
      .select({ value: count() })
      .from(pengajuan)
      .where(inArray(pengajuan.statusPengajuan, ['data_terverifikasi', 'diproses', 'diterima']));
    return rows[0]?.value ?? 0;
  }

  async getDokumenByPengajuanId(pengajuanId: string): Promise<{ id: string; jenis: string; namaFile: string }[]> {
    return db
      .select({ id: dokumenVerifikasi.id, jenis: dokumenVerifikasi.jenis, namaFile: dokumenVerifikasi.namaFile })
      .from(dokumenVerifikasi)
      .innerJoin(verifikasi, eq(verifikasi.id, dokumenVerifikasi.verifikasiId))
      .where(eq(verifikasi.pengajuanId, pengajuanId));
  }

  async findVerifikasiByPengajuanId(pengajuanId: string): Promise<{
    statusVerifikasi: string;
    catatanVerifikasi: string | null;
    namaPetugas: string;
    tanggalVerifikasi: Date;
  } | null> {
    const rows = await db
      .select({
        statusVerifikasi: verifikasi.statusVerifikasi,
        catatanVerifikasi: verifikasi.catatanVerifikasi,
        tanggalVerifikasi: verifikasi.tanggalVerifikasi,
        namaPetugas: users.nama,
      })
      .from(verifikasi)
      .innerJoin(users, eq(users.id, verifikasi.petugasId))
      .where(eq(verifikasi.pengajuanId, pengajuanId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      statusVerifikasi: row.statusVerifikasi,
      catatanVerifikasi: row.catatanVerifikasi,
      namaPetugas: row.namaPetugas,
      tanggalVerifikasi: row.tanggalVerifikasi,
    };
  }

  async getPengajuanIdsByUser(userId: string): Promise<string[]> {
    const rows = await db
      .select({ id: pengajuan.id })
      .from(pengajuan)
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .where(and(eq(penduduk.userId, userId), aktifPengajuan()));
    return rows.map((row) => row.id);
  }
}
