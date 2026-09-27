import { and, asc, count, countDistinct, desc, eq, gte, ilike, isNull, lte, or, type SQL } from 'drizzle-orm';

import { db } from '../../db/client';
import { dokumenVerifikasi, hasil, penduduk, pengajuan, users, verifikasi } from '../../db/schema';
import type { DokumenVerifikasiRow } from '../../db/schema/verifikasi';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import type {
  BarisVerifikasi,
  InputDokumen,
  InputVerifikasi,
  LaporanHarian,
  PetugasRepository,
  StatistikPetugas,
} from './petugas.repository';
import type { ListVerifikasiQuery, LaporanQuery } from './petugas.validation';

const selectRincian = {
  pengajuanId: pengajuan.id,
  namaLengkap: penduduk.namaLengkap,
  nik: penduduk.nik,
  statusVerifikasi: verifikasi.statusVerifikasi,
  catatanVerifikasi: verifikasi.catatanVerifikasi,
  tanggalVerifikasi: verifikasi.tanggalVerifikasi,
  namaPetugas: users.nama,
} as const;

const selectBaris = {
  id: pengajuan.id,
  penghasilanBulanan: pengajuan.penghasilanBulanan,
  jumlahTanggungan: pengajuan.jumlahTanggungan,
  kondisiRumah: pengajuan.kondisiRumah,
  statusPengajuan: pengajuan.statusPengajuan,
  catatanPenduduk: pengajuan.catatanPenduduk,
  tanggalPengajuan: pengajuan.tanggalPengajuan,
  namaLengkap: penduduk.namaLengkap,
  nik: penduduk.nik,
  alamat: penduduk.alamat,
  desa: penduduk.desa,
  noTelp: penduduk.noTelp,
  statusVerifikasi: verifikasi.statusVerifikasi,
  catatanVerifikasi: verifikasi.catatanVerifikasi,
  namaPetugas: users.nama,
  tanggalVerifikasi: verifikasi.tanggalVerifikasi,
  jumlahDokumen: count(dokumenVerifikasi.id),
  keputusan: hasil.statusKeputusan,
} as const;

const groupByPengajuan = [pengajuan.id, penduduk.id, verifikasi.id, users.id, hasil.id] as const;

const baseQuery = () =>
  db
    .select(selectBaris)
    .from(pengajuan)
    .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
    .leftJoin(verifikasi, eq(verifikasi.pengajuanId, pengajuan.id))
    .leftJoin(users, eq(users.id, verifikasi.petugasId))
    .leftJoin(hasil, eq(hasil.pengajuanId, pengajuan.id))
    .leftJoin(dokumenVerifikasi, eq(dokumenVerifikasi.verifikasiId, verifikasi.id));

export class DrizzlePetugasRepository implements PetugasRepository {
  private buildConditions(query: ListVerifikasiQuery): SQL[] {
    const conditions: SQL[] = [isNull(pengajuan.deletedAt)];

    if (query.status) conditions.push(eq(pengajuan.statusPengajuan, query.status));
    if (query.kondisiRumah) conditions.push(eq(pengajuan.kondisiRumah, query.kondisiRumah));
    if (query.hasilVerifikasi) conditions.push(eq(verifikasi.statusVerifikasi, query.hasilVerifikasi));

    if (query.search) {
      const pola = `%${query.search}%`;
      const pencarian = or(
        ilike(penduduk.namaLengkap, pola),
        ilike(penduduk.nik, pola),
        ilike(penduduk.alamat, pola),
      );
      if (pencarian) conditions.push(pencarian);
    }

    return conditions;
  }

  async listVerifikasi(query: ListVerifikasiQuery): Promise<{ items: BarisVerifikasi[]; total: number }> {
    const where = and(...this.buildConditions(query));
    // Antrean verifikasi diurutkan dari pengajuan terlama agar tidak ada yang tertinggal.
    const urutan =
      query.status === 'menunggu_verifikasi'
        ? asc(pengajuan.tanggalPengajuan)
        : desc(pengajuan.tanggalPengajuan);

    const [items, totalRows] = await Promise.all([
      baseQuery()
        .where(where)
        .groupBy(...groupByPengajuan)
        .orderBy(urutan)
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ value: countDistinct(pengajuan.id) })
        .from(pengajuan)
        .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
        .leftJoin(verifikasi, eq(verifikasi.pengajuanId, pengajuan.id))
        .where(where),
    ]);

    return { items, total: totalRows[0]?.value ?? 0 };
  }

  async findVerifikasiDetail(id: string): Promise<BarisVerifikasi | null> {
    const rows = await baseQuery()
      .where(and(eq(pengajuan.id, id), isNull(pengajuan.deletedAt)))
      .groupBy(...groupByPengajuan)
      .limit(1);
    return rows[0] ?? null;
  }

  async statistik(): Promise<StatistikPetugas> {
    const now = new Date();
    const awalHari = new Date(now);
    awalHari.setHours(0, 0, 0, 0);
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pending, diverifikasiHariIni, ditolak, bulanIni, sampelDurasi] = await Promise.all([
      db
        .select({ value: count() })
        .from(pengajuan)
        .where(and(eq(pengajuan.statusPengajuan, 'menunggu_verifikasi'), isNull(pengajuan.deletedAt))),
      db
        .select({ value: count() })
        .from(verifikasi)
        .where(and(eq(verifikasi.statusVerifikasi, 'valid'), gte(verifikasi.tanggalVerifikasi, awalHari))),
      db
        .select({ value: count() })
        .from(verifikasi)
        .where(eq(verifikasi.statusVerifikasi, 'tidak_valid')),
      db
        .select({ value: count() })
        .from(verifikasi)
        .where(gte(verifikasi.tanggalVerifikasi, awalBulan)),
      db
        .select({ selesai: verifikasi.tanggalVerifikasi, dibuat: pengajuan.tanggalPengajuan })
        .from(verifikasi)
        .innerJoin(pengajuan, eq(pengajuan.id, verifikasi.pengajuanId))
        .orderBy(desc(verifikasi.tanggalVerifikasi))
        .limit(500),
    ]);

    const durasiJam = sampelDurasi
      .map((row) => (row.selesai.getTime() - row.dibuat.getTime()) / 3_600_000)
      .filter((nilai) => nilai >= 0);

    return {
      totalPending: pending[0]?.value ?? 0,
      totalDiverifikasiHariIni: diverifikasiHariIni[0]?.value ?? 0,
      totalDitolak: ditolak[0]?.value ?? 0,
      totalBulanIni: bulanIni[0]?.value ?? 0,
      rataRataWaktuVerifikasiJam:
        durasiJam.length > 0
          ? Math.round((durasiJam.reduce((total, nilai) => total + nilai, 0) / durasiJam.length) * 10) / 10
          : null,
    };
  }

  async laporan(query: LaporanQuery): Promise<LaporanHarian> {
    const tanggal = query.tanggal ?? new Date().toISOString().slice(0, 10);
    const awal = new Date(`${tanggal}T00:00:00.000Z`);
    const akhir = new Date(`${tanggal}T23:59:59.999Z`);

    const rows = await db
      .select(selectRincian)
      .from(verifikasi)
      .innerJoin(pengajuan, eq(pengajuan.id, verifikasi.pengajuanId))
      .innerJoin(penduduk, eq(penduduk.id, pengajuan.pendudukId))
      .innerJoin(users, eq(users.id, verifikasi.petugasId))
      .where(and(gte(verifikasi.tanggalVerifikasi, awal), lte(verifikasi.tanggalVerifikasi, akhir)))
      .orderBy(desc(verifikasi.tanggalVerifikasi));

    return {
      tanggal,
      totalDiverifikasi: rows.length,
      totalValid: rows.filter((row) => row.statusVerifikasi === 'valid').length,
      totalTidakValid: rows.filter((row) => row.statusVerifikasi === 'tidak_valid').length,
      rincian: rows,
    };
  }

  async findDokumenById(id: string): Promise<DokumenVerifikasiRow | null> {
    const rows = await db.select().from(dokumenVerifikasi).where(eq(dokumenVerifikasi.id, id)).limit(1);
    return rows[0] ?? null;
  }

  /**
   * Petugas assesses data from uploaded documents, so the detail endpoint must return
   * the document list itself. Returning only a count would force officers to verify
   * blind.
   */
  async listDokumenByVerifikasiId(verifikasiId: string): Promise<DokumenVerifikasiRow[]> {
    return db
      .select()
      .from(dokumenVerifikasi)
      .where(eq(dokumenVerifikasi.verifikasiId, verifikasiId))
      .orderBy(asc(dokumenVerifikasi.createdAt));
  }

  /**
   * Satu pengajuan hanya punya satu baris verifikasi (dijamin unique constraint),
   * jadi bila sudah ada datanya berarti petugas merevisi keputusan sebelumnya.
   * Status pengajuan ikut dikunci supaya tidak bisa dihitung WASPAS sebelum diverifikasi.
   */
  async saveVerifikasi(input: InputVerifikasi): Promise<{ verifikasiId: string; changed: boolean }> {
    return db.transaction(async (trx) => {
      const pengajuanRows = await trx
        .select({ id: pengajuan.id, statusPengajuan: pengajuan.statusPengajuan })
        .from(pengajuan)
        .where(eq(pengajuan.id, input.pengajuanId))
        .limit(1);
      const target = pengajuanRows[0];
      if (!target) throw new NotFoundError('Pengajuan tidak ditemukan');

      const now = new Date();
      const tersimpan = await trx
        .insert(verifikasi)
        .values({
          pengajuanId: input.pengajuanId,
          petugasId: input.petugasId,
          statusVerifikasi: input.statusVerifikasi,
          catatanVerifikasi: input.catatanVerifikasi,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: verifikasi.pengajuanId,
          set: {
            petugasId: input.petugasId,
            statusVerifikasi: input.statusVerifikasi,
            catatanVerifikasi: input.catatanVerifikasi,
            tanggalVerifikasi: now,
            updatedAt: now,
          },
        })
        .returning({ id: verifikasi.id });

      await trx
        .update(pengajuan)
        .set({ statusPengajuan: input.statusPengajuan, updatedAt: now })
        .where(eq(pengajuan.id, input.pengajuanId));

      const barisVerifikasi = tersimpan[0];
      if (!barisVerifikasi) {
        throw new AppError('Verifikasi gagal disimpan karena database tidak mengembalikan baris data.', {
          statusCode: 500,
          code: 'VERIFY_WRITE_FAILED',
        });
      }

      return {
        verifikasiId: barisVerifikasi.id,
        changed: target.statusPengajuan !== input.statusPengajuan,
      };
    });
  }

  async insertDokumen(input: InputDokumen): Promise<DokumenVerifikasiRow> {
    const rows = await db
      .insert(dokumenVerifikasi)
      .values({
        verifikasiId: input.verifikasiId,
        jenis: input.jenis,
        namaFile: input.namaFile,
        pathRelatif: input.pathRelatif,
        mimeType: input.mimeType,
        ukuranBytes: input.ukuranBytes,
        uploadedBy: input.uploadedBy,
      })
      .returning();

    return rows[0] as DokumenVerifikasiRow;
  }

  async findVerifikasiIdByPengajuanId(pengajuanId: string): Promise<string | null> {
    const rows = await db
      .select({ id: verifikasi.id })
      .from(verifikasi)
      .where(eq(verifikasi.pengajuanId, pengajuanId))
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async findUserIdByPendudukId(pendudukId: string): Promise<string | null> {
    const rows = await db
      .select({ userId: penduduk.userId })
      .from(penduduk)
      .where(eq(penduduk.id, pendudukId))
      .limit(1);
    return rows[0]?.userId ?? null;
  }

  async findPendudukIdByPengajuanId(pengajuanId: string): Promise<string | null> {
    const rows = await db
      .select({ pendudukId: pengajuan.pendudukId })
      .from(pengajuan)
      .where(eq(pengajuan.id, pengajuanId))
      .limit(1);
    return rows[0]?.pendudukId ?? null;
  }
}
