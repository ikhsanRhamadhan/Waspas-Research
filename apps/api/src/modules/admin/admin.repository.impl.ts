import { and, asc, count, countDistinct, desc, eq, ilike, inArray, isNull, or, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { STATUS_KEPUTUSAN_TO_PENGAJUAN, STATUS_PENGAJUAN_WASPAS } from '@spk-bansos/shared';

import { db } from '../../db/client';
import {
  auditLog,
  hasil,
  penduduk,
  pengajuan,
  perhitunganWaspas,
  perhitunganWaspasDetail,
  users,
  verifikasi,
} from '../../db/schema';
import type { PageResult } from '../../shared/utils/pagination';
import type { AuditLogQuery, DaftarPenerimaQuery, TetapkanInput } from './admin.validation';

export interface StatistikAdmin {
  totalPenduduk: number;
  totalPengajuan: number;
  menungguVerifikasi: number;
  terverifikasi: number;
  totalDiterima: number;
  totalSudahDihitung: number;
  /** Pengajuan yang sudah mendapat keputusan admin, apa pun hasilnya. */
  totalDiputuskan: number;
  rasioPenerima: number | null;
}

export interface BarisPenerima {
  pengajuanId: string;
  ranking: number;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  namaLengkap: string;
  nik: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  alamat: string;
  tanggalPengajuan: Date;
  statusKeputusan: string | null;
  tanggalKeputusan: Date | null;
  catatanAdmin: string | null;
  namaAdmin: string | null;
  userId: string;
}

export interface KandidatWaspas {
  id: string;
  pendudukId: string;
  penghasilanBulanan: number;
  jumlahTanggungan: number;
  kondisiRumah: string;
  namaLengkap: string;
  nik: string;
  userId: string;
}

export interface BarisPerhitungan {
  pengajuanId: string;
  lambda: number;
  skorWs: number;
  skorWp: number;
  skorAkhir: number;
  ranking: number;
  detail: {
    kriteriaId: string;
    namaKriteria: string;
    bobot: number;
    nilaiMentah: number | null;
    kodeNilai: string | null;
    score: number;
    kontribusiWs: number;
  }[];
}

export interface BarisAuditLog {
  id: string;
  userId: string | null;
  namaUser: string | null;
  role: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AdminRepository {
  statistik(): Promise<StatistikAdmin>;
  kandidatWaspas(): Promise<KandidatWaspas[]>;
  simpanPerhitungan(rows: BarisPerhitungan[], adminId: string): Promise<number>;
  tandaiDiproses(pengajuanIds: string[]): Promise<number>;
  daftarPenerima(query: DaftarPenerimaQuery): Promise<PageResult<BarisPenerima>>;
  semuaPenerima(query: DaftarPenerimaQuery): Promise<BarisPenerima[]>;
  tetapkanKeputusan(input: TetapkanInput, adminId: string): Promise<string[]>;
  ambilPenerimaTerpilih(pengajuanIds: string[]): Promise<BarisPenerima[]>;
  daftarAuditLog(query: AuditLogQuery): Promise<PageResult<BarisAuditLog>>;
}

const selectKandidat = {
  id: pengajuan.id,
  pendudukId: pengajuan.pendudukId,
  penghasilanBulanan: pengajuan.penghasilanBulanan,
  jumlahTanggungan: pengajuan.jumlahTanggungan,
  kondisiRumah: pengajuan.kondisiRumah,
  namaLengkap: penduduk.namaLengkap,
  nik: penduduk.nik,
  userId: users.id,
} as const;

/** `admin` = petugas yang menetapkan keputusan, `pemohon` = akun penduduk pengaju. */
const admin = alias(users, 'admin');
const pemohon = alias(users, 'pemohon');

const selectPenerima = {
  pengajuanId: pengajuan.id,
  ranking: perhitunganWaspas.ranking,
  skorWs: perhitunganWaspas.skorWs,
  skorWp: perhitunganWaspas.skorWp,
  skorAkhir: perhitunganWaspas.skorAkhir,
  namaLengkap: penduduk.namaLengkap,
  nik: penduduk.nik,
  penghasilanBulanan: pengajuan.penghasilanBulanan,
  jumlahTanggungan: pengajuan.jumlahTanggungan,
  kondisiRumah: pengajuan.kondisiRumah,
  alamat: penduduk.alamat,
  tanggalPengajuan: pengajuan.tanggalPengajuan,
  statusKeputusan: hasil.statusKeputusan,
  tanggalKeputusan: hasil.tanggalKeputusan,
  catatanAdmin: hasil.catatanAdmin,
  namaAdmin: admin.nama,
  userId: pemohon.id,
} as const;

export class DrizzleAdminRepository implements AdminRepository {
  async statistik(): Promise<StatistikAdmin> {
    const [jumlahPenduduk, jumlahPengajuan, menunggu, terverifikasi, sudahDihitung, sudahDiputuskan, diterima] =
      await Promise.all([
        db.select({ value: count() }).from(penduduk).where(isNull(penduduk.deletedAt)),
        db.select({ value: count() }).from(pengajuan).where(isNull(pengajuan.deletedAt)),
        db
          .select({ value: count() })
          .from(pengajuan)
          .where(and(eq(pengajuan.statusPengajuan, 'menunggu_verifikasi'), isNull(pengajuan.deletedAt))),
        db
          .select({ value: count() })
          .from(pengajuan)
          .where(and(eq(pengajuan.statusPengajuan, 'data_terverifikasi'), isNull(pengajuan.deletedAt))),
        db.select({ value: countDistinct(perhitunganWaspas.pengajuanId) }).from(perhitunganWaspas),
        db.select({ value: count() }).from(hasil),
        db.select({ value: count() }).from(hasil).where(eq(hasil.statusKeputusan, 'diterima')),
      ]);

    const totalSudahDihitung = sudahDihitung[0]?.value ?? 0;
    const totalDiputuskan = sudahDiputuskan[0]?.value ?? 0;
    const totalDiterima = diterima[0]?.value ?? 0;

    return {
      totalPenduduk: jumlahPenduduk[0]?.value ?? 0,
      totalPengajuan: jumlahPengajuan[0]?.value ?? 0,
      menungguVerifikasi: menunggu[0]?.value ?? 0,
      terverifikasi: terverifikasi[0]?.value ?? 0,
      totalDiterima,
      totalSudahDihitung,
      totalDiputuskan,
      rasioPenerima:
        totalDiputuskan > 0 ? Math.round((totalDiterima / totalDiputuskan) * 10_000) / 100 : null,
    };
  }

  /**
   * Kandidat WASPAS = pengajuan yang sudah lolos verifikasi petugas. Yang ditolak atau
   * masih menunggu sengaja tidak ikut, supaya ranking hanya memuat pemohon yang benar-benar
   * memenuhi syarat administratif.
   */
  async kandidatWaspas(): Promise<KandidatWaspas[]> {
    return db
      .select(selectKandidat)
      .from(pengajuan)
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .innerJoin(users, eq(users.id, penduduk.userId))
      .innerJoin(verifikasi, eq(verifikasi.pengajuanId, pengajuan.id))
      .where(
        and(
          eq(verifikasi.statusVerifikasi, 'valid'),
          isNull(pengajuan.deletedAt),
          inArray(pengajuan.statusPengajuan, [...STATUS_PENGAJUAN_WASPAS]),
        ),
      )
      .orderBy(asc(pengajuan.tanggalPengajuan));
  }

  /**
   * Satu pengajuan punya satu baris hitung, jadi penghitungan ulang berarti UPDATE.
   * Rincian per kriteria dihapus lalu ditulis ulang agar tidak menumpuk sisa konfigurasi lama.
   */
  async simpanPerhitungan(rows: BarisPerhitungan[], adminId: string): Promise<number> {
    const now = new Date();

    return db.transaction(async (trx) => {
      for (const row of rows) {
        const tersimpan = await trx
          .insert(perhitunganWaspas)
          .values({
            pengajuanId: row.pengajuanId,
            lambda: row.lambda,
            skorWs: row.skorWs,
            skorWp: row.skorWp,
            skorAkhir: row.skorAkhir,
            ranking: row.ranking,
            dihitungOleh: adminId,
            detail: row.detail,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: perhitunganWaspas.pengajuanId,
            set: {
              lambda: row.lambda,
              skorWs: row.skorWs,
              skorWp: row.skorWp,
              skorAkhir: row.skorAkhir,
              ranking: row.ranking,
              dihitungOleh: adminId,
              detail: row.detail,
              updatedAt: now,
            },
          })
          .returning({ id: perhitunganWaspas.id });

        const perhitunganId = tersimpan[0]?.id;
        if (!perhitunganId) continue;

        await trx
          .delete(perhitunganWaspasDetail)
          .where(eq(perhitunganWaspasDetail.perhitunganId, perhitunganId));

        await trx.insert(perhitunganWaspasDetail).values(
          row.detail.map((item) => ({
            perhitunganId,
            kriteriaId: item.kriteriaId,
            namaKriteria: item.namaKriteria,
            bobot: item.bobot,
            nilaiMentah: item.nilaiMentah,
            kodeNilai: item.kodeNilai,
            score: item.score,
            kontribusiWs: item.kontribusiWs,
          })),
        );
      }

      return rows.length;
    });
  }

  async tandaiDiproses(pengajuanIds: string[]): Promise<number> {
    if (pengajuanIds.length === 0) return 0;

    const updated = await db
      .update(pengajuan)
      .set({ statusPengajuan: 'diproses', updatedAt: new Date() })
      .where(
        and(
          inArray(pengajuan.id, pengajuanIds),
          eq(pengajuan.statusPengajuan, 'data_terverifikasi'),
        ),
      )
      .returning({ id: pengajuan.id });

    return updated.length;
  }

  private buildPenerimaWhere(query: DaftarPenerimaQuery): SQL | undefined {
    const conditions: SQL[] = [];

    if (query.status) conditions.push(eq(hasil.statusKeputusan, query.status));

    if (query.search) {
      const pola = `%${query.search}%`;
      const pencarian = or(ilike(penduduk.namaLengkap, pola), ilike(penduduk.nik, pola));
      if (pencarian) conditions.push(pencarian);
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private basePenerima(where: SQL | undefined) {
    return db
      .select(selectPenerima)
      .from(perhitunganWaspas)
      .innerJoin(pengajuan, eq(pengajuan.id, perhitunganWaspas.pengajuanId))
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .innerJoin(pemohon, eq(pemohon.id, penduduk.userId))
      .leftJoin(hasil, eq(hasil.pengajuanId, pengajuan.id))
      .leftJoin(admin, eq(admin.id, hasil.adminId))
      .where(where);
  }

  async daftarPenerima(query: DaftarPenerimaQuery): Promise<PageResult<BarisPenerima>> {
    const where = this.buildPenerimaWhere(query);

    const [items, totalRows] = await Promise.all([
      this.basePenerima(where)
        .orderBy(
          query.order === 'asc' ? asc(perhitunganWaspas.ranking) : desc(perhitunganWaspas.ranking),
        )
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ value: count() })
        .from(perhitunganWaspas)
        .innerJoin(pengajuan, eq(pengajuan.id, perhitunganWaspas.pengajuanId))
        .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
        .leftJoin(hasil, eq(hasil.pengajuanId, pengajuan.id))
        .where(where),
    ]);

    return { items, total: totalRows[0]?.value ?? 0 };
  }

  async ambilPenerimaTerpilih(pengajuanIds: string[]): Promise<BarisPenerima[]> {
    if (pengajuanIds.length === 0) return [];
    return this.basePenerima(inArray(pengajuan.id, pengajuanIds));
  }

  /**
   * PDF laporan memakai seluruh isi, bukan halaman pertama, jadi query ini sengaja
   * tanpa limit/offset. Urutannya tetap mengikuti ranking supaya isi PDF sama dengan
   * yang dibaca admin di layar.
   */
  async semuaPenerima(query: DaftarPenerimaQuery): Promise<BarisPenerima[]> {
    return this.basePenerima(this.buildPenerimaWhere(query)).orderBy(asc(perhitunganWaspas.ranking));
  }

  async daftarAuditLog(query: AuditLogQuery): Promise<PageResult<BarisAuditLog>> {
    const conditions: SQL[] = [];
    if (query.action) conditions.push(eq(auditLog.action, query.action));
    if (query.entityType) conditions.push(eq(auditLog.entityType, query.entityType));
    if (query.userId) conditions.push(eq(auditLog.userId, query.userId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: auditLog.id,
          userId: auditLog.userId,
          namaUser: users.nama,
          role: users.role,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          oldValues: auditLog.oldValues,
          newValues: auditLog.newValues,
          ipAddress: auditLog.ipAddress,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(users.id, auditLog.userId))
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db.select({ value: count() }).from(auditLog).where(where),
    ]);

    return { items, total: totalRows[0]?.value ?? 0 };
  }

  /**
   * Keputusan admin mengunci pengajuan: status pengajuan ikut mengikuti status keputusan
   * supaya tidak bisa dihitung ulang atau diedit setelah ditetapkan.
   */
  async tetapkanKeputusan(input: TetapkanInput, adminId: string): Promise<string[]> {
    const now = new Date();
    const terkunci: string[] = [];

    await db.transaction(async (trx) => {
      for (const item of input.daftarPenerima) {
        const w = await trx
          .select({ ranking: perhitunganWaspas.ranking, skorAkhir: perhitunganWaspas.skorAkhir })
          .from(perhitunganWaspas)
          .where(eq(perhitunganWaspas.pengajuanId, item.pengajuanId))
          .limit(1);

        const perhitungan = w[0];
        if (!perhitungan) continue;

        await trx
          .insert(hasil)
          .values({
            pengajuanId: item.pengajuanId,
            ranking: perhitungan.ranking,
            skorWaspas: perhitungan.skorAkhir,
            statusKeputusan: item.statusKeputusan,
            adminId,
            catatanAdmin: item.catatanAdmin ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: hasil.pengajuanId,
            set: {
              statusKeputusan: item.statusKeputusan,
              adminId,
              catatanAdmin: item.catatanAdmin ?? null,
              tanggalKeputusan: now,
              updatedAt: now,
            },
          });

        await trx
          .update(pengajuan)
          .set({
            statusPengajuan: STATUS_KEPUTUSAN_TO_PENGAJUAN[item.statusKeputusan],
            updatedAt: now,
          })
          .where(eq(pengajuan.id, item.pengajuanId));

        terkunci.push(item.pengajuanId);
      }
    });

    return terkunci;
  }
}
