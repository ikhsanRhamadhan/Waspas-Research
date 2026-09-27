import {
  KUNCI_KRITERIA,
  KUNCI_KRITERIA_LABEL,
  TIPE_KRITERIA,
  TIPE_KRITERIA_LABEL,
  formatScore,
} from '@spk-bansos/shared';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui/StateBlocks';
import { deleteApi, getApi, postApi, putApi, type ApiError } from '../../lib/api';
import { useData } from '../../lib/useData';
import type { Kriteria, RingkasanBobot, Subkriteria } from '../../types';

interface DraftSubkriteria extends Subkriteria {
  id: string;
}

interface DraftKriteria {
  id: string | null;
  kunci: string;
  namaKriteria: string;
  deskripsi: string;
  bobot: string;
  tipeKriteria: string;
  prioritas: string;
  isActive: boolean;
  subkriteria: DraftSubkriteria[];
}

const idBaru = () => `baru-${Math.random().toString(36).slice(2, 10)}`;

const draftDari = (kriteria: Kriteria): DraftKriteria => ({
  id: kriteria.id,
  kunci: kriteria.kunci,
  namaKriteria: kriteria.namaKriteria,
  deskripsi: kriteria.deskripsi ?? '',
  bobot: String(kriteria.bobot),
  tipeKriteria: kriteria.tipeKriteria,
  prioritas: String(kriteria.prioritas),
  isActive: kriteria.isActive,
  subkriteria: kriteria.subkriteria.map((item) => ({ ...item })),
});

const draftKosong = (): DraftKriteria => ({
  id: null,
  kunci: 'penghasilan',
  namaKriteria: '',
  deskripsi: '',
  bobot: '0.3',
  tipeKriteria: 'cost',
  prioritas: '1',
  isActive: true,
  subkriteria: [
    { id: idBaru(), kodeNilai: null, label: null, nilaiMin: null, nilaiMax: null, score: 1 },
  ],
});

const kePayload = (draft: DraftKriteria) => ({
  kunci: draft.kunci,
  namaKriteria: draft.namaKriteria.trim(),
  deskripsi: draft.deskripsi.trim() === '' ? null : draft.deskripsi.trim(),
  bobot: Number(draft.bobot),
  tipeKriteria: draft.tipeKriteria,
  prioritas: Number(draft.prioritas),
  isActive: draft.isActive,
  subkriteria: draft.subkriteria.map((item) => ({
    kodeNilai: item.kodeNilai?.trim() || null,
    label: item.label?.trim() || null,
    nilaiMin: item.nilaiMin,
    nilaiMax: item.nilaiMax,
    score: item.score,
  })),
});

const EditorSubkriteria = ({
  draft,
  onUbah,
}: {
  draft: DraftKriteria;
  onUbah: (subkriteria: DraftSubkriteria[]) => void;
}) => {
  const ubah = (id: string, perubahan: Partial<DraftSubkriteria>) => {
    onUbah(draft.subkriteria.map((item) => (item.id === id ? { ...item, ...perubahan } : item)));
  };

  return (
    <div className="space-y-3">
      <p className="label-section">Subkriteria dan skor</p>
      {draft.subkriteria.map((item, index) => {
        const pakaiKode = Boolean(item.kodeNilai);
        return (
          <div key={item.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Cara penilaian"
                required
                opsi={[
                  { value: 'rentang', label: 'Rentang angka' },
                  { value: 'kode', label: 'Kode dari data pemohon' },
                ]}
                value={pakaiKode ? 'kode' : 'rentang'}
                onChange={(event) => {
                  const keKode = event.target.value === 'kode';
                  ubah(item.id, keKode ? { kodeNilai: '', nilaiMin: null, nilaiMax: null } : { kodeNilai: null });
                }}
              />
              {pakaiKode ? (
                <Input
                  label="Kode nilai"
                  required
                  placeholder="contoh: layak"
                  value={item.kodeNilai ?? ''}
                  onChange={(event) => ubah(item.id, { kodeNilai: event.target.value })}
                />
              ) : (
                <>
                  <Input
                    label="Nilai minimum"
                    type="number"
                    required
                    value={item.nilaiMin ?? ''}
                    onChange={(event) => ubah(item.id, { nilaiMin: event.target.value === '' ? null : Number(event.target.value) })}
                  />
                  <Input
                    label="Nilai maksimum"
                    type="number"
                    required
                    value={item.nilaiMax ?? ''}
                    onChange={(event) => ubah(item.id, { nilaiMax: event.target.value === '' ? null : Number(event.target.value) })}
                  />
                </>
              )}
              <Input
                label="Skor (0 sampai 1)"
                type="number"
                min={0}
                max={1}
                step={0.01}
                required
                value={item.score}
                onChange={(event) => ubah(item.id, { score: Number(event.target.value) })}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Input
                label="Label"
                className="w-full sm:max-w-xs"
                placeholder="contoh: penghasilan di bawah 1 juta"
                value={item.label ?? ''}
                onChange={(event) => ubah(item.id, { label: event.target.value })}
              />
              <Button
                varian="bahaya"
                ukuran="kecil"
                disabled={draft.subkriteria.length === 1}
                onClick={() => onUbah(draft.subkriteria.filter((baris) => baris.id !== item.id))}
              >
                Hapus subkriteria {index + 1}
              </Button>
            </div>
          </div>
        );
      })}
      <Button
        onClick={() =>
          onUbah([
            ...draft.subkriteria,
            { id: idBaru(), kodeNilai: null, label: null, nilaiMin: null, nilaiMax: null, score: 1 },
          ])
        }
      >
        Tambah subkriteria
      </Button>
    </div>
  );
};

const EditorKriteria = ({
  draft,
  onUbah,
  onSimpan,
  onBatal,
  memuat,
  error,
}: {
  draft: DraftKriteria;
  onUbah: (draft: DraftKriteria) => void;
  onSimpan: () => void;
  onBatal: () => void;
  memuat: boolean;
  error: ApiError | null;
}) => (
  <form
    onSubmit={(event) => {
      event.preventDefault();
      onSimpan();
    }}
    noValidate
    className="space-y-4"
  >
    {error ? <ErrorState pesan={error.message} detail={error.errors} /> : null}

    <div className="grid gap-4 sm:grid-cols-2">
      <Select
        label="Kunci kriteria"
        required
        disabled={draft.id !== null}
        hint={draft.id !== null ? 'Kunci tidak dapat diubah setelah kriteria dibuat' : undefined}
        opsi={KUNCI_KRITERIA.map((item) => ({ value: item, label: KUNCI_KRITERIA_LABEL[item] }))}
        value={draft.kunci}
        onChange={(event) => onUbah({ ...draft, kunci: event.target.value })}
      />
      <Input
        label="Nama kriteria"
        required
        value={draft.namaKriteria}
        onChange={(event) => onUbah({ ...draft, namaKriteria: event.target.value })}
      />
    </div>

    <Input
      label="Deskripsi"
      value={draft.deskripsi}
      onChange={(event) => onUbah({ ...draft, deskripsi: event.target.value })}
    />

    <div className="grid gap-4 sm:grid-cols-3">
      <Input
        label="Bobot"
        type="number"
        min={0.0001}
        max={1}
        step={0.01}
        required
        value={draft.bobot}
        onChange={(event) => onUbah({ ...draft, bobot: event.target.value })}
      />
      <Select
        label="Tipe kriteria"
        required
        opsi={TIPE_KRITERIA.map((item) => ({ value: item, label: TIPE_KRITERIA_LABEL[item] }))}
        value={draft.tipeKriteria}
        onChange={(event) => onUbah({ ...draft, tipeKriteria: event.target.value })}
      />
      <Input
        label="Prioritas"
        type="number"
        min={1}
        required
        value={draft.prioritas}
        onChange={(event) => onUbah({ ...draft, prioritas: event.target.value })}
      />
    </div>

    <p className="text-xs text-slate-500 dark:text-slate-400">
      Kriteria benefit: nilai besar mendapat skor tinggi. Kriteria cost: nilai besar mendapat skor rendah.
    </p>

    <EditorSubkriteria draft={draft} onUbah={(subkriteria) => onUbah({ ...draft, subkriteria })} />

    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={draft.isActive}
        onChange={(event) => onUbah({ ...draft, isActive: event.target.checked })}
      />
      Kriteria aktif dan dipakai perhitungan WASPAS
    </label>

    <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
      <Button onClick={onBatal}>Batal</Button>
      <Button type="submit" varian="utama" memuat={memuat}>
        Simpan kriteria
      </Button>
    </div>
  </form>
);

export const KriteriaPage = () => {
  const daftar = useData(() => getApi<Kriteria[]>('/kriteria'));
  const ringkasan = useData(() => getApi<RingkasanBobot>('/kriteria/ringkasan-bobot'));
  const [editorTerbuka, setEditorTerbuka] = useState(false);
  const [draft, setDraft] = useState<DraftKriteria | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [memuat, setMemuat] = useState(false);

  const tutupEditor = () => {
    setEditorTerbuka(false);
    setDraft(null);
    setError(null);
  };

  const simpan = async () => {
    if (!draft) return;
    setError(null);
    setMemuat(true);
    try {
      if (draft.id) {
        await putApi(`/kriteria/${draft.id}`, kePayload(draft));
        toast.success('Kriteria diperbarui');
      } else {
        await postApi('/kriteria', kePayload(draft));
        toast.success('Kriteria ditambahkan');
      }
      tutupEditor();
      daftar.reload();
      ringkasan.reload();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setMemuat(false);
    }
  };

  const hapus = async (kriteria: Kriteria) => {
    setError(null);
    try {
      await deleteApi(`/kriteria/${kriteria.id}`);
      toast.success('Kriteria dihapus');
      daftar.reload();
      ringkasan.reload();
    } catch (kesalahan) {
      const apiError = kesalahan as ApiError;
      setError(apiError);
      toast.error(apiError.message);
    }
  };

  const bukaEdit = (kriteria: Kriteria) => {
    setDraft(draftDari(kriteria));
    setEditorTerbuka(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        judul="Kriteria WASPAS"
        keterangan="Total bobot seluruh kriteria aktif harus sama dengan 1 agar skor dapat dibandingkan."
        aksi={
          <Button
            varian="utama"
            onClick={() => {
              setDraft(draftKosong());
              setEditorTerbuka(true);
            }}
          >
            Tambah kriteria
          </Button>
        }
      />

      {ringkasan.data ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-section">Total bobot</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {ringkasan.data.total.toFixed(4)}
                </p>
              </div>
              <Badge nada={ringkasan.data.valid ? 'sukses' : 'bahaya'}>
                {ringkasan.data.valid
                  ? 'Siap dihitung'
                  : `Belum valid, ${ringkasan.data.jumlahKriteria} kriteria aktif`}
              </Badge>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {error && !editorTerbuka ? <ErrorState pesan={error.message} detail={error.errors} /> : null}

      <Card>
        <CardHeader judul="Daftar kriteria" />
        {daftar.sedangMemuat ? (
          <LoadingState />
        ) : daftar.error ? (
          <ErrorState pesan={daftar.error.message} onUlangi={daftar.reload} />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {(daftar.data ?? []).map((item) => (
              <li key={item.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-50">{item.namaKriteria}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {KUNCI_KRITERIA_LABEL[item.kunci]} · {TIPE_KRITERIA_LABEL[item.tipeKriteria]} · prioritas{' '}
                      {item.prioritas} · bobot {formatScore(item.bobot)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge nada={item.isActive ? 'sukses' : 'netral'}>
                      {item.isActive ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button ukuran="kecil" onClick={() => bukaEdit(item)}>
                      Ubah
                    </Button>
                    <Button
                      varian="bahaya"
                      ukuran="kecil"
                      onClick={() => void hapus(item)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
                {item.deskripsi ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.deskripsi}</p>
                ) : null}
                <ul className="flex flex-wrap gap-2">
                  {item.subkriteria.map((sub) => (
                    <li
                      key={sub.id}
                      className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {sub.kodeNilai ?? `${sub.nilaiMin ?? '-'} s.d. ${sub.nilaiMax ?? '-'}`} · skor{' '}
                      {formatScore(sub.score)}
                      {sub.label ? ` · ${sub.label}` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        terbuka={editorTerbuka}
        lebar="lebar"
        judul={draft?.id ? 'Ubah kriteria' : 'Tambah kriteria'}
        keterangan="Subkriteria menentukan skor akhir. Kode nilai cocok untuk data seperti kondisi rumah."
        onTutup={tutupEditor}
      >
        {draft ? (
          <EditorKriteria
            draft={draft}
            onUbah={setDraft}
            onSimpan={() => void simpan()}
            onBatal={tutupEditor}
            memuat={memuat}
            error={error}
          />
        ) : null}
      </Modal>
    </div>
  );
};
