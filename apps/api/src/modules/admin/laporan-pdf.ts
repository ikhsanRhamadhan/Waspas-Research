import {
  KONDISI_RUMAH_LABEL,
  STATUS_KEPUTUSAN_LABEL,
  formatRupiah,
  formatScore,
  type StatusKeputusan,
} from '@spk-bansos/shared';
import PDFDocument from 'pdfkit';

import type { BarisPenerima } from './admin.repository.impl';

const MARGIN = 45;
const LEBAR_KONTEN = 595 - MARGIN * 2;
const WARNA_TEKS = '#0f172a';
const WARNA_SUBTITEL = '#475569';
const WARNA_GARIS = '#cbd5e1';

// Total kolom wajib sama dengan LEBAR_KONTEN; kalau tidak, tabel meluber keluar margin.
const LEBAR_KOLOM = [32, 132, 178, 50, 56, 57] as const;
const TOTAL_LEBAR_KOLOM = LEBAR_KOLOM.reduce((total, lebar) => total + lebar, 0);
if (TOTAL_LEBAR_KOLOM !== LEBAR_KONTEN) {
  throw new Error(`Lebar kolom PDF (${TOTAL_LEBAR_KOLOM}pt) harus sama dengan area konten (${LEBAR_KONTEN}pt).`);
}

const X_KOLOM: number[] = (() => {
  let kumulatif = MARGIN;
  return LEBAR_KOLOM.map((lebar) => {
    const x = kumulatif;
    kumulatif += lebar;
    return x;
  });
})();

const formatTanggalPanjang = (tanggal: Date): string =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(tanggal);

const bawahHalaman = (doc: PDFKit.PDFDocument): number => doc.page.height - 55;

const tulisHeaderTabel = (doc: PDFKit.PDFDocument, y: number): number => {
  const judul = ['Peringkat', 'Nama pemohon dan ringkasan', 'Keterangan', 'Tanggungan', 'WS', 'WP'];
  const align: ('left' | 'right')[] = ['right', 'left', 'left', 'right', 'right', 'right'];

  judul.forEach((teks, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(WARNA_TEKS)
      .text(teks, X_KOLOM[index]!, y, { width: LEBAR_KOLOM[index]!, align: align[index], lineBreak: false });
  });

  const garis = y + 12;
  doc.moveTo(MARGIN, garis).lineTo(MARGIN + LEBAR_KONTEN, garis).lineWidth(0.6).strokeColor(WARNA_GARIS).stroke();
  return garis + 6;
};

const tulisFooter = (doc: PDFKit.PDFDocument, namaDesa: string): void => {
  const rentang = doc.bufferedPageRange();
  for (let index = 0; index < rentang.count; index += 1) {
    doc.switchToPage(rentang.start + index);
    // Footer digambar pada y yang lebih rendah dari margin bawah. Tanpa dinolkan,
    // PDFKit menganggapnya luar area cetak dan menambah halaman kosong.
    const marginBawaan = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 40;
    doc.moveTo(MARGIN, y - 8).lineTo(MARGIN + LEBAR_KONTEN, y - 8).lineWidth(0.6).strokeColor(WARNA_GARIS).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(WARNA_SUBTITEL);
    doc.text(`${namaDesa} · Sistem Pendukung Keputusan Bantuan Sosial`, MARGIN, y, {
      width: LEBAR_KONTEN - 70,
      lineBreak: false,
    });
    doc.text(`Halaman ${index + 1} dari ${rentang.count}`, MARGIN + LEBAR_KONTEN - 70, y, {
      width: 70,
      align: 'right',
      lineBreak: false,
    });
    doc.page.margins.bottom = marginBawaan;
  }
};

export interface OpsiPdfKeputusan {
  namaDesa: string;
  namaAdmin: string;
  statusFilter: StatusKeputusan | null;
  penerima: BarisPenerima[];
  dibuatPada: Date;
}

export const buatPdfKeputusan = (opsi: OpsiPdfKeputusan): PDFKit.PDFDocument => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: 55, left: MARGIN, right: MARGIN },
    info: {
      Title: 'Laporan Keputusan Penerima Bantuan Sosial',
      Author: opsi.namaDesa,
      Subject: 'Keputusan penerima bantuan sosial berbasis metode WASPAS',
      CreationDate: opsi.dibuatPada,
    },
  });

  const totalDiterima = opsi.penerima.filter((row) => row.statusKeputusan === 'diterima').length;
  const totalCadangan = opsi.penerima.filter((row) => row.statusKeputusan === 'cadangan').length;

  doc.font('Helvetica-Bold').fontSize(15).fillColor(WARNA_TEKS).text('Laporan Keputusan Penerima Bantuan Sosial', MARGIN, MARGIN, {
    width: LEBAR_KONTEN,
  });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(WARNA_SUBTITEL)
    .text(`${opsi.namaDesa} · disusun ${formatTanggalPanjang(opsi.dibuatPada)}`, MARGIN, doc.y + 2, {
      width: LEBAR_KONTEN,
    })
    .text(
      opsi.statusFilter
        ? `Hanya memuat keputusan berstatus ${STATUS_KEPUTUSAN_LABEL[opsi.statusFilter]}.`
        : 'Memuat seluruh keputusan penerima yang sudah ditetapkan.',
      MARGIN,
      doc.y + 1,
      { width: LEBAR_KONTEN },
    );

  doc.font('Helvetica-Bold').fontSize(9).fillColor(WARNA_TEKS).text(
    `Total ${opsi.penerima.length} keputusan · ${totalDiterima} diterima · ${totalCadangan} cadangan`,
    MARGIN,
    doc.y + 6,
    { width: LEBAR_KONTEN },
  );

  let y = doc.y + 10;

  if (opsi.penerima.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(WARNA_SUBTITEL)
      .text(
        'Belum ada keputusan yang ditetapkan. Jalankan perhitungan WASPAS dan tetapkan penerima terlebih dahulu.',
        MARGIN,
        y,
        { width: LEBAR_KONTEN },
      );
  } else {
    y = tulisHeaderTabel(doc, y);

    for (const row of opsi.penerima) {
      const tinggiBaris = row.catatanAdmin ? 30 : 20;
      if (y + tinggiBaris > bawahHalaman(doc)) {
        doc.addPage();
        y = tulisHeaderTabel(doc, MARGIN);
      }

      doc.font('Helvetica').fontSize(9).fillColor(WARNA_TEKS);
      doc.text(String(row.ranking), X_KOLOM[0]!, y, { width: LEBAR_KOLOM[0]!, align: 'right', lineBreak: false });

      doc.font('Helvetica-Bold').text(row.namaLengkap, X_KOLOM[1]!, y, {
        width: LEBAR_KOLOM[1]!,
        lineBreak: false,
        ellipsis: true,
      });
      doc.font('Helvetica').fontSize(8).fillColor(WARNA_SUBTITEL).text(
        `${KONDISI_RUMAH_LABEL[row.kondisiRumah] ?? row.kondisiRumah} · ${formatRupiah(row.penghasilanBulanan)}`,
        X_KOLOM[1]!,
        y + 11,
        { width: LEBAR_KOLOM[1]!, lineBreak: false, ellipsis: true },
      );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(WARNA_SUBTITEL)
        .text(row.alamat, X_KOLOM[2]!, y, {
          width: LEBAR_KOLOM[2]!,
          lineBreak: true,
          height: 20,
          ellipsis: true,
        })
        .text(row.namaAdmin ? `Ditetapkan oleh ${row.namaAdmin}` : 'Belum ditetapkan', X_KOLOM[2]!, y + 11, {
          width: LEBAR_KOLOM[2]!,
          lineBreak: false,
          ellipsis: true,
        });

      const angka = [String(row.jumlahTanggungan), formatScore(row.skorWs), formatScore(row.skorWp)];
      angka.forEach((teks, index) => {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(WARNA_SUBTITEL)
          .text(teks, X_KOLOM[index + 3]!, y, { width: LEBAR_KOLOM[index + 3]!, align: 'right', lineBreak: false });
      });

      if (row.catatanAdmin) {
        doc.font('Helvetica-Oblique').fontSize(7).fillColor(WARNA_SUBTITEL).text(
          `Catatan: ${row.catatanAdmin}`,
          X_KOLOM[1]!,
          y + 23,
          { width: LEBAR_KONTEN - LEBAR_KOLOM[0]!, lineBreak: false, ellipsis: true },
        );
      }

      const garis = y + tinggiBaris - 4;
      doc.moveTo(MARGIN, garis).lineTo(MARGIN + LEBAR_KONTEN, garis).lineWidth(0.4).strokeColor('#e2e8f0').stroke();
      y = garis + 5;
    }

    if (y + 30 > bawahHalaman(doc)) doc.addPage();
    doc.font('Helvetica').fontSize(8).fillColor(WARNA_SUBTITEL).text(
      `Dokumen ini dihasilkan otomatis oleh Sistem Pendukung Keputusan Penerimaan Bantuan Sosial ${opsi.namaDesa} pada ${formatTanggalPanjang(opsi.dibuatPada)} oleh ${opsi.namaAdmin}.`,
      MARGIN,
      y + 6,
      { width: LEBAR_KONTEN },
    );
  }

  tulisFooter(doc, opsi.namaDesa);
  doc.end();

  return doc;
};

export const namaBerkasKeputusan = (dibuatPada: Date): string =>
  `laporan-keputusan-${dibuatPada.toISOString().slice(0, 10)}.pdf`;
