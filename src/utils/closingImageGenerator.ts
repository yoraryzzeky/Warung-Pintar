import { formatRp } from './storeLogic';
import type { CashierClosingRecap } from './cashierClosing';

export interface ClosingImageOptions {
  profile: {
    ownerName?: string;
    phone?: string;
    address?: string;
  };
  recap: CashierClosingRecap;
  periodLabel: string;
  cashierName: string;
  note?: string;
  confirmedAt?: string;
}

export interface GeneratedClosingImage {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}...`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

export async function generateClosingRecapImage({
  profile,
  recap,
  periodLabel,
  cashierName,
  note,
  confirmedAt,
}: ClosingImageOptions): Promise<GeneratedClosingImage> {
  const storeName = (profile?.ownerName || 'WARUNG PINTAR MANDIRI').toUpperCase();
  const safeStoreSlug = storeName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'TOKO';
  const fileDate = (confirmedAt || new Date().toISOString()).split('T')[0];
  const filename = `Rekap_Closing_${safeStoreSlug}_${fileDate}.png`;

  if (typeof document === 'undefined') {
    const emptyBlob = new Blob([], { type: 'image/png' });
    return { blob: emptyBlob, dataUrl: '', filename };
  }

  const dailyRows = recap.dailyBreakdown.slice(0, 8);
  const topItems = recap.topSoldItems.slice(0, 6);
  const hasDrawerBreakdown = recap.tarikTunaiDrawerCash > 0 || recap.expenseDrawerCash > 0;
  const hasNote = Boolean(note && note.trim());

  const width = 1080;
  let height = 760;
  if (hasDrawerBreakdown) height += 110;
  if (dailyRows.length > 0) height += 110 + dailyRows.length * 46;
  if (topItems.length > 0) height += 90 + Math.ceil(topItems.length / 2) * 56;
  if (hasNote) height += 95;
  height += 90;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const emptyBlob = new Blob([], { type: 'image/png' });
    return { blob: emptyBlob, dataUrl: '', filename };
  }

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Header Banner
  const headerGrad = ctx.createLinearGradient(0, 0, width, 190);
  headerGrad.addColorStop(0, '#047857');
  headerGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, 196);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  drawRoundedRect(ctx, 48, 34, 290, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#ecfdf5';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('KONFIRMASI CLOSING KASIR', 68, 57);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, storeName, 640), 48, 112);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  const subInfo = [profile?.address, profile?.phone ? `WA: ${profile.phone}` : ''].filter(Boolean).join(' • ') || 'Laporan Closing Shift & Rekonsiliasi Kas';
  ctx.fillText(truncateText(ctx, subInfo, 660), 48, 146);

  // Meta Box on Right of Header
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  drawRoundedRect(ctx, 725, 32, 307, 134, 20);
  ctx.fill();
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText('KASIR BERTUGAS', 748, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, cashierName || 'Karyawan Kasir', 260), 748, 92);
  ctx.fillStyle = '#d1fae5';
  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${periodLabel}`, 748, 122);
  ctx.fillText(`${recap.startDate || '-'} s/d ${recap.endDate || '-'}`, 748, 146);

  // 4 Summary Cards
  const cards = [
    {
      label: 'TOTAL OMSET BERSIH',
      value: formatRp(recap.totalSettledOmset),
      sub: `${recap.totalSettledCount} Tx (Rtl ${recap.retailSettledCount} / PPOB ${recap.digitalCount})`,
      bg: '#2563eb',
      labelColor: '#dbeafe',
      valueColor: '#ffffff',
      subColor: '#bfdbfe',
      border: '#1d4ed8',
    },
    {
      label: 'UANG TUNAI SISTEM',
      value: formatRp(recap.expectedDrawerCash),
      sub: 'Wajib Setor Tunai',
      bg: '#ffffff',
      labelColor: '#64748b',
      valueColor: '#047857',
      subColor: '#64748b',
      border: '#d1fae5',
    },
    {
      label: 'NON-TUNAI QRIS',
      value: formatRp(recap.qrisTotal),
      sub: 'Masuk Rekening Toko',
      bg: '#ffffff',
      labelColor: '#64748b',
      valueColor: '#4338ca',
      subColor: '#64748b',
      border: '#e0e7ff',
    },
    {
      label: 'PIUTANG KASBON',
      value: formatRp(recap.kasbonTotal),
      sub: `${recap.kasbonCount} Tx Belum Lunas`,
      bg: '#ffffff',
      labelColor: '#64748b',
      valueColor: '#b45309',
      subColor: '#64748b',
      border: '#fef3c7',
    },
  ];

  let y = 224;
  const cardW = 232;
  const cardGap = 18;
  cards.forEach((c, idx) => {
    const cx = 48 + idx * (cardW + cardGap);
    ctx.fillStyle = c.bg;
    drawRoundedRect(ctx, cx, y, cardW, 134, 20);
    ctx.fill();
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = c.labelColor;
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(c.label, cx + 18, y + 34);

    ctx.fillStyle = c.valueColor;
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, c.value, cardW - 32), cx + 18, y + 76);

    ctx.fillStyle = c.subColor;
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, c.sub, cardW - 32), cx + 18, y + 108);
  });

  y += 158;

  // Reconciliation & Financial Breakdown Card
  const reconHeight = hasDrawerBreakdown ? 278 : 176;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 48, y, width - 96, reconHeight, 22);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('REKONSILIASI KAS TUNAI & RINCIAN CLOSING', 72, y + 38);

  const statRowY = y + 66;
  const boxW = (width - 144 - 32) / 3;

  // Box 1: Kas Sistem
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 72, statRowY, boxW, 84, 14);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('KAS TUNAI SISTEM', 88, statRowY + 28);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(formatRp(recap.expectedDrawerCash), 88, statRowY + 62);

  // Box 2: Kas Fisik
  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 72 + boxW + 16, statRowY, boxW, 84, 14);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('UANG TUNAI FISIK', 88 + boxW + 16, statRowY + 28);
  ctx.fillStyle = '#047857';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    recap.physicalCashCount !== null ? formatRp(recap.physicalCashCount) : 'Belum Diisi',
    88 + boxW + 16,
    statRowY + 62
  );

  // Box 3: Selisih Kas
  const varianceBg =
    recap.cashVariance === null
      ? '#f1f5f9'
      : recap.cashVariance === 0
        ? '#ecfdf5'
        : recap.cashVariance > 0
          ? '#eff6ff'
          : '#fff1f2';
  const varianceColor =
    recap.cashVariance === null
      ? '#475569'
      : recap.cashVariance === 0
        ? '#047857'
        : recap.cashVariance > 0
          ? '#1d4ed8'
          : '#be123c';
  const varianceText =
    recap.cashVariance === null
      ? 'Menunggu Hitung Fisik'
      : recap.cashVariance === 0
        ? 'KLOP / PAS (Rp 0)'
        : recap.cashVariance > 0
          ? `LEBIH (+${formatRp(recap.cashVariance)})`
          : `KURANG (${formatRp(recap.cashVariance)})`;

  ctx.fillStyle = varianceBg;
  drawRoundedRect(ctx, 72 + (boxW + 16) * 2, statRowY, boxW, 84, 14);
  ctx.fill();
  ctx.fillStyle = varianceColor;
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('STATUS SELISIH KAS', 88 + (boxW + 16) * 2, statRowY + 28);
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(truncateText(ctx, varianceText, boxW - 32), 88 + (boxW + 16) * 2, statRowY + 62);

  if (hasDrawerBreakdown) {
    const flowY = statRowY + 102;
    ctx.fillStyle = '#fffbeb';
    drawRoundedRect(ctx, 72, flowY, width - 144, 86, 14);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('ARUS KAS TUNAI:', 88, flowY + 28);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    const flowParts = [
      `Tunai Masuk +${formatRp(recap.cashTotal)}`,
      recap.tarikTunaiDrawerCash > 0 ? `Tarik Tunai -${formatRp(recap.tarikTunaiDrawerCash)}` : null,
      recap.expenseDrawerCash > 0 ? `Biaya Tunai -${formatRp(recap.expenseDrawerCash)}` : null,
      `Sisa Bersih ${formatRp(recap.expectedDrawerCash)}`,
    ].filter(Boolean);
    ctx.fillText(truncateText(ctx, flowParts.join('  |  '), width - 180), 88, flowY + 60);
  }

  y += reconHeight + 24;

  // Daily Breakdown Table
  if (dailyRows.length > 0) {
    const tblH = 92 + dailyRows.length * 46;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 48, y, width - 96, tblH, 22);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('RINCIAN OMSET PER TANGGAL', 72, y + 36);

    const headY = y + 50;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(72, headY, width - 144, 34);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('TANGGAL', 86, headY + 22);
    ctx.fillText('TX', 250, headY + 22);
    ctx.fillText('RETAIL', 330, headY + 22);
    ctx.fillText('PPOB', 475, headY + 22);
    ctx.fillText('BIAYA', 610, headY + 22);
    ctx.fillText('TUNAI', 745, headY + 22);
    ctx.fillText('TOTAL', 895, headY + 22);

    dailyRows.forEach((day, idx) => {
      const rowY = headY + 34 + idx * 46;
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(72, rowY, width - 144, 46);
      }
      const formattedDay = new Date(`${day.date}T00:00:00`).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(formattedDay, 86, rowY + 29);

      ctx.fillStyle = '#2563eb';
      ctx.fillText(`${day.count}`, 250, rowY + 29);

      ctx.fillStyle = '#334155';
      ctx.font = '600 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatRp(day.retailOmset), 330, rowY + 29);
      ctx.fillText(formatRp(day.digitalOmset), 475, rowY + 29);

      ctx.fillStyle = day.expensesAmount > 0 ? '#e11d48' : '#94a3b8';
      ctx.fillText(
        day.expensesAmount > 0 ? `-${formatRp(day.expensesAmount)}` : formatRp(0),
        610,
        rowY + 29
      );

      ctx.fillStyle = '#047857';
      ctx.fillText(formatRp(day.cashOmset), 745, rowY + 29);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(formatRp(day.totalOmset), 895, rowY + 29);
    });

    y += tblH + 24;
  }

  // Top Products Sold
  if (topItems.length > 0) {
    const rowsNeeded = Math.ceil(topItems.length / 2);
    const itemsBoxH = 74 + rowsNeeded * 56;
    ctx.fillStyle = '#ffffff';
    drawRoundedRect(ctx, 48, y, width - 96, itemsBoxH, 22);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
    ctx.fillText('BARANG TERLARIS TERJUAL', 72, y + 36);

    const itemColW = (width - 144 - 16) / 2;
    topItems.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const ix = 72 + col * (itemColW + 16);
      const iy = y + 54 + row * 56;

      ctx.fillStyle = '#f8fafc';
      drawRoundedRect(ctx, ix, iy, itemColW, 44, 12);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncateText(ctx, `${idx + 1}. ${item.name}`, itemColW - 160), ix + 14, iy + 27);

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      const rightLabel = `${item.quantity}x (${formatRp(item.revenue)})`;
      const rightW = ctx.measureText(rightLabel).width;
      ctx.fillText(rightLabel, ix + itemColW - rightW - 14, iy + 27);
    });

    y += itemsBoxH + 24;
  }

  // Closing Note
  if (hasNote) {
    ctx.fillStyle = '#eff6ff';
    drawRoundedRect(ctx, 48, y, width - 96, 76, 18);
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('CATATAN SERAH TERIMA / CLOSING:', 72, y + 28);

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(truncateText(ctx, note!.trim(), width - 144), 72, y + 56);
    y += 96;
  }

  // Footer
  const stampText = new Date(confirmedAt || new Date().toISOString()).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Dikonfirmasi pada: ${stampText}`, 48, height - 32);

  const brandText = 'Warung Pintar Pro • Bukti Rekap Closing';
  const brandW = ctx.measureText(brandText).width;
  ctx.fillText(brandText, width - 48 - brandW, height - 32);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => {
      resolve(b || new Blob([], { type: 'image/png' }));
    }, 'image/png');
  });

  return { blob, dataUrl, filename };
}
