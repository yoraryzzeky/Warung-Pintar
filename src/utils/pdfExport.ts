import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRp, formatDate } from './storeLogic';
import type { CashierClosingRecap } from './cashierClosing';

export interface DailyRecapRow {
  date: string;
  retailOmset: number;
  retailProfit: number;
  digitalOmset: number;
  digitalProfit: number;
  expensesAmount?: number;
  totalOmset?: number;
  totalProfit?: number;
  count: number;
}

export interface RecapPdfOptions {
  profile: {
    ownerName?: string;
    phone?: string;
    address?: string;
  };
  dailyRecap: DailyRecapRow[];
  totalRekap: {
    omset: number;
    profit: number;
    expenses?: number;
    count: number;
  };
  startDate?: string;
  endDate?: string;
}

export const exportRecapReportPDF = ({
  profile,
  dailyRecap,
  totalRekap,
  startDate,
  endDate,
}: RecapPdfOptions): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const storeName = (profile?.ownerName || 'Warung Pintar Mandiri').toUpperCase();
  const storeAddress = profile?.address || 'Alamat Toko Belum Diatur';
  const storePhone = profile?.phone ? `Telp/WA: ${profile.phone}` : '';

  // Formal Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeName, 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${storeAddress}${storePhone ? ' • ' + storePhone : ''}`, 14, 21);
  doc.text('LAPORAN REKAPITULASI KEUANGAN TOKO (HARIAN / BULANAN)', 14, 27);

  // Period and metadata
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  const periodLabel =
    startDate || endDate
      ? `Periode: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}`
      : 'Periode: Semua Tanggal Tercatat';
  const printedAt = `Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  doc.setFont('helvetica', 'bold');
  doc.text(periodLabel, 14, 41);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(printedAt, 196, 41, { align: 'right' });

  // Financial Summary Cards
  const totalExpenses =
    totalRekap.expenses !== undefined
      ? totalRekap.expenses
      : dailyRecap.reduce((s, d) => s + (d.expensesAmount || 0), 0);
  const marginPct = totalRekap.omset > 0 ? ((totalRekap.profit / totalRekap.omset) * 100).toFixed(1) : '0.0';

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(61, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(108, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(155, 46, 41, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('OMSET BERSIH', 17, 52);
  doc.text('BIAYA PENGELUARAN', 64, 52);
  doc.text('LABA BERSIH', 111, 52);
  doc.text('TX & MARGIN', 158, 52);

  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text(formatRp(totalRekap.omset), 17, 61);

  doc.setTextColor(225, 29, 72);
  doc.text(totalExpenses > 0 ? `-${formatRp(totalExpenses)}` : formatRp(0), 64, 61);

  doc.setTextColor(5, 150, 105);
  doc.text(formatRp(totalRekap.profit), 111, 61);

  doc.setTextColor(15, 23, 42);
  doc.text(`${totalRekap.count} Tx (${marginPct}%)`, 158, 61);

  // Table Rows
  const tableBody =
    dailyRecap.length > 0
      ? dailyRecap.map((day) => {
          const dayExpenses = day.expensesAmount || 0;
          const totalDayOmset =
            day.totalOmset !== undefined ? day.totalOmset : day.retailOmset + day.digitalOmset - dayExpenses;
          const totalDayProfit =
            day.totalProfit !== undefined ? day.totalProfit : day.retailProfit + day.digitalProfit - dayExpenses;
          const cleanDate = formatDate(day.date).split('pukul')[0].trim();
          return [
            cleanDate,
            `${day.count} Tx`,
            formatRp(day.retailOmset),
            formatRp(day.digitalOmset),
            dayExpenses > 0 ? `-${formatRp(dayExpenses)}` : formatRp(0),
            formatRp(totalDayOmset),
            formatRp(totalDayProfit),
          ];
        })
      : [['Belum ada transaksi pada periode ini', '-', '-', '-', '-', '-', '-']];

  const totalRetail = dailyRecap.reduce((s, d) => s + d.retailOmset, 0);
  const totalDigital = dailyRecap.reduce((s, d) => s + d.digitalOmset, 0);

  autoTable(doc, {
    startY: 75,
    head: [['Tanggal', 'Tx', 'Retail', 'PPOB', 'Biaya Toko', 'Total Omset', 'Laba Bersih']],
    body: tableBody,
    foot:
      dailyRecap.length > 0
        ? [
            [
              'TOTAL',
              `${totalRekap.count} Tx`,
              formatRp(totalRetail),
              formatRp(totalDigital),
              totalExpenses > 0 ? `-${formatRp(totalExpenses)}` : formatRp(0),
              formatRp(totalRekap.omset),
              formatRp(totalRekap.profit),
            ],
          ]
        : undefined,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: [225, 29, 72] },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Dokumen ini dibuat secara otomatis oleh sistem kasir Warung Pintar Pro.', 14, finalY + 12);
  doc.text(`Penanggung Jawab: ${storeName}`, 196, finalY + 12, { align: 'right' });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`Laporan_Keuangan_${storeName.replace(/\s+/g, '_')}_${fileDate}.pdf`);
};

export interface CashierClosingPdfOptions {
  profile: {
    ownerName?: string;
    phone?: string;
    address?: string;
  };
  recap: CashierClosingRecap;
  periodLabel: string;
  cashierName: string;
  note?: string;
}

export const exportCashierClosingPDF = ({
  profile,
  recap,
  periodLabel,
  cashierName,
  note,
}: CashierClosingPdfOptions): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const storeName = (profile?.ownerName || 'Warung Pintar Mandiri').toUpperCase();
  const storeAddress = profile?.address || 'Alamat Toko Belum Diatur';
  const storePhone = profile?.phone ? `Telp/WA: ${profile.phone}` : '';

  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(storeName, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${storeAddress}${storePhone ? ' • ' + storePhone : ''}`, 14, 20);
  doc.text(`LAPORAN CLOSING & REKAP KASIR (${periodLabel.toUpperCase()})`, 14, 26);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Periode: ${recap.startDate || '-'} s/d ${recap.endDate || '-'} • Kasir: ${cashierName || 'Karyawan Kasir'}`,
    14,
    41
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    196,
    41,
    { align: 'right' }
  );

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(61, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(108, 46, 44, 22, 3, 3, 'FD');
  doc.roundedRect(155, 46, 41, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OMSET', 17, 52);
  doc.text('UANG TUNAI', 64, 52);
  doc.text('NON-TUNAI QRIS', 111, 52);
  doc.text('KASBON BARU', 158, 52);

  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text(formatRp(recap.totalSettledOmset), 17, 61);
  doc.setTextColor(5, 150, 105);
  doc.text(formatRp(recap.expectedDrawerCash), 64, 61);
  doc.setTextColor(79, 70, 229);
  doc.text(formatRp(recap.qrisTotal), 111, 61);
  doc.setTextColor(217, 119, 6);
  doc.text(formatRp(recap.kasbonTotal), 158, 61);

  let nextStartY = 75;
  if (recap.physicalCashCount !== null) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(14, 72, 182, 14, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const variance = recap.cashVariance || 0;
    const varianceLabel =
      variance === 0
        ? 'KLOP / PAS (Rp 0)'
        : variance > 0
          ? `LEBIH (+${formatRp(variance)})`
          : `KURANG (${formatRp(variance)})`;
    doc.text(
      `Rekonsiliasi Kas Tunai: Seharusnya ${formatRp(recap.expectedDrawerCash)} | Fisik Tunai ${formatRp(recap.physicalCashCount)} | Selisih: ${varianceLabel}`,
      18,
      80.5
    );
    nextStartY = 92;
  }

  const tableBody =
    recap.dailyBreakdown.length > 0
      ? recap.dailyBreakdown.map((day) => {
          const cleanDate = new Date(`${day.date}T00:00:00`).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          return [
            cleanDate,
            `${day.count} Tx`,
            formatRp(day.retailOmset),
            formatRp(day.digitalOmset),
            day.expensesAmount > 0 ? `-${formatRp(day.expensesAmount)}` : formatRp(0),
            formatRp(day.cashOmset),
            formatRp(day.qrisOmset),
            formatRp(day.totalOmset),
          ];
        })
      : [['Belum ada transaksi pada periode ini', '-', '-', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: nextStartY,
    head: [['Tanggal', 'Tx', 'Retail', 'PPOB', 'Biaya', 'Tunai', 'QRIS', 'Total']],
    body: tableBody,
    foot:
      recap.dailyBreakdown.length > 0
        ? [
            [
              'TOTAL',
              `${recap.totalSettledCount} Tx`,
              formatRp(recap.retailSettledOmset),
              formatRp(recap.digitalOmset),
              recap.totalExpenses > 0 ? `-${formatRp(recap.totalExpenses)}` : formatRp(0),
              formatRp(recap.cashTotal),
              formatRp(recap.qrisTotal),
              formatRp(recap.totalSettledOmset),
            ],
          ]
        : undefined,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: [225, 29, 72] },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  if (note && note.trim()) {
    doc.text(`Catatan Kasir: ${note.trim()}`, 14, finalY + 9);
  }
  doc.text('Dokumen Closing Kasir - Warung Pintar Pro', 14, finalY + 15);
  doc.text(`Kasir: ${cashierName || 'Karyawan Kasir'}`, 196, finalY + 15, { align: 'right' });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`Closing_Kasir_${storeName.replace(/\s+/g, '_')}_${fileDate}.pdf`);
};


