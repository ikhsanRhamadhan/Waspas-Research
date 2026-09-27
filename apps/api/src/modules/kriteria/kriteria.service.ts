import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import { db } from '../../db/client';
import { perhitunganWaspasDetail } from '../../db/schema';
import { BusinessRuleError, NotFoundError } from '../../shared/errors/AppError';
import { AUDIT_ACTION, recordAuditFromRequest } from '../../shared/utils/audit';
import { DrizzleKriteriaRepository } from './kriteria.repository.impl';
import type {
  KriteriaDenganSubkriteria,
  KriteriaRepository,
} from './kriteria.repository.impl';
import type {
  KriteriaInput,
  SimpanKriteriaInput,
  UpdateKriteriaInput,
} from './kriteria.validation';

const repository: KriteriaRepository = new DrizzleKriteriaRepository();

export const list = (): Promise<KriteriaDenganSubkriteria[]> => repository.list();

export const detail = async (id: string): Promise<KriteriaDenganSubkriteria> => {
  const row = await repository.findById(id);
  if (!row) throw new NotFoundError('Kriteria tidak ditemukan');
  return row;
};

/**
 * Kriteria yang sudah pernah dipakai calculating tidak boleh dihapus, karena
 * `perhitungan_waspas_detail` menyimpan salinan nama/bobot untuk histori. Kalau sudah
 * dipakai, admin menonaktifkan (isActive=false) agar bobot aktif tidak berubah tanpa
 * jejak, sementara hasil lama tetap bisa ditelusuri.
 */
const pastikanBelumDipakai = async (id: string): Promise<void> => {
  const rows = await db
    .select({ id: perhitunganWaspasDetail.id })
    .from(perhitunganWaspasDetail)
    .where(eq(perhitunganWaspasDetail.kriteriaId, id))
    .limit(1);

  if (rows.length > 0) {
    throw new BusinessRuleError(
      'Kriteria sudah dipakai dalam perhitungan WASPAS sehingga tidak dapat dihapus. ' +
        'Nonaktifkan saja agar tidak lagi dipakai perhitungan berikutnya.',
      'KRITERIA_TERPAKAI',
    );
  }
};

export const create = async (
  req: Request,
  input: KriteriaInput,
): Promise<KriteriaDenganSubkriteria> => {
  const created = await repository.create(input);

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.KRITERIA_SAVED,
    entityType: 'kriteria',
    entityId: created.id,
    newValues: {
      kunci: created.kunci,
      bobot: created.bobot,
      jumlah_subkriteria: created.subkriteria.length,
    },
  });

  return created;
};

export const update = async (
  req: Request,
  id: string,
  input: UpdateKriteriaInput,
): Promise<KriteriaDenganSubkriteria> => {
  const before = await detail(id);
  const updated = await repository.update(id, input);

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.KRITERIA_SAVED,
    entityType: 'kriteria',
    entityId: id,
    oldValues: { nama: before.namaKriteria, bobot: before.bobot, is_active: before.isActive },
    newValues: { nama: updated.namaKriteria, bobot: updated.bobot, is_active: updated.isActive },
  });

  return updated;
};

export const remove = async (req: Request, id: string): Promise<{ id: string }> => {
  const before = await detail(id);
  await pastikanBelumDipakai(id);

  const deleted = await repository.remove(id);
  if (!deleted) throw new NotFoundError('Kriteria tidak ditemukan');

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.KRITERIA_DELETED,
    entityType: 'kriteria',
    entityId: id,
    oldValues: { kunci: before.kunci, nama: before.namaKriteria },
  });

  return { id };
};

/**
 * Menyimpan seluruh paket kriteria sekaligus dalam satu transaksi. Total bobot dan
 * duplikasi kunci sudah dicegah di level validasi, jadi di sini cukup meneruskan.
 */
export const simpanSemua = async (
  req: Request,
  input: SimpanKriteriaInput,
): Promise<KriteriaDenganSubkriteria[]> => {
  const before = await repository.list();
  const after = await repository.replaceAll(input.kriteria);

  recordAuditFromRequest(req, {
    action: AUDIT_ACTION.KRITERIA_SAVED,
    entityType: 'kriteria',
    entityId: null,
    oldValues: { bobot: before.map((item) => [item.kunci, item.bobot]) },
    newValues: {
      bobot: after.map((item) => [item.kunci, item.bobot]),
      lambda: input.lambda,
    },
  });

  return after;
};

export const bobotAktif = async (): Promise<{ total: number; jumlahKriteria: number; valid: boolean }> => {
  const semua = await repository.list();
  const aktif = semua.filter((item) => item.isActive);
  const total = aktif.reduce((jumlah, item) => jumlah + item.bobot, 0);

  return {
    total: Math.round(total * 10_000) / 10_000,
    jumlahKriteria: aktif.length,
    valid: Math.abs(total - 1) < 0.0001,
  };
};
