import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRp, formatDate } from './storeLogic';

export interface DailyRecapRow {
  date: string;
  retailOmset: number;
  retailProfit: number;
  digitalOmset: number;
  digitalProfit: number;
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
  const marginPct = totalRekap.omset > 0 ? ((totalRekap.profit / totalRekap.omset) * 100).toFixed(1) : '0.0';

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 46, 58, 22, 3, 3, 'FD');
  doc.roundedRect(76, 46, 58, 22, 3, 3, 'FD');
  doc.roundedRect(138, 46, 58, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL OMSET GABUNGAN', 18, 52);
  doc.text('TOTAL LABA BERSIH', 80, 52);
  doc.text('TRANSAKSI & MARGIN', 142, 52);

  doc.setFontSize(11);
  doc.setTextColor(37, 99, 235);
  doc.text(formatRp(totalRekap.omset), 18, 61);

  doc.setTextColor(5, 150, 105);
  doc.text(formatRp(totalRekap.profit), 80, 61);

  doc.setTextColor(15, 23, 42);
  doc.text(`${totalRekap.count} Tx (${marginPct}%)`, 142, 61);

  // Table Rows
  const tableBody =
    dailyRecap.length > 0
      ? dailyRecap.map((day) => {
          const totalDayOmset = day.retailOmset + day.digitalOmset;
          const totalDayProfit = day.retailProfit + day.digitalProfit;
          const cleanDate = formatDate(day.date).split('pukul')[0].trim();
          return [
            cleanDate,
            `${day.count} Tx`,
            formatRp(day.retailOmset),
            formatRp(day.digitalOmset),
            formatRp(totalDayOmset),
            formatRp(totalDayProfit),
          ];
        })
      : [['Belum ada transaksi pada periode ini', '-', '-', '-', '-', '-']];

  const totalRetail = dailyRecap.reduce((s, d) => s + d.retailOmset, 0);
  const totalDigital = dailyRecap.reduce((s, d) => s + d.digitalOmset, 0);

  autoTable(doc, {
    startY: 75,
    head: [['Tanggal', 'Jml Tx', 'Omset Retail', 'Omset Digital', 'Total Omset', 'Laba Bersih']],
    body: tableBody,
    foot:
      dailyRecap.length > 0
        ? [
            [
              'TOTAL',
              `${totalRekap.count} Tx`,
              formatRp(totalRetail),
              formatRp(totalDigital),
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
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' },
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


