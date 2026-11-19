import React, { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  Printer,
  FileDown,
  Wallet,
  QrCode,
  Clock,
  TrendingUp,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Bluetooth,
  X,
  Package,
  Calendar,
  Send,
  Image as ImageIcon,
  Share2,
  Copy,
  Users,
  ExternalLink,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  formatRp,
  type DigitalTransaction,
  type Expense,
  type Transaction,
} from '../utils/storeLogic';
import {
  buildCashierClosingRecap,
  buildClosingWhatsAppMessage,
  buildEmployeeRecapTable,
  buildWhatsAppUrl,
  formatWhatsAppPhone,
  getClosingPeriodRange,
  type CashierClosingRecord,
  type ClosingPeriodPreset,
} from '../utils/cashierClosing';
import {
  generateClosingRecapImage,
  type GeneratedClosingImage,
} from '../utils/closingImageGenerator';
import {
  createClosingConfirmNotification,
  type OwnerNotificationItem,
} from '../utils/ownerNotifications';
import {
  buildClosingEscPosPayload,
  sendEscPosToCharacteristic,
} from '../utils/escPosPrinter';
import { exportCashierClosingPDF } from '../utils/pdfExport';
import { generateUniqueRecordId } from '../utils/firestorePayload';

interface PrinterSessionState {
  device: any | null;
  characteristic: any | null;
  deviceName: string;
  statusInfo: string;
  isConnecting: boolean;
  onConnect: () => Promise<{ characteristic: any; name: string } | null>;
  onDisconnect: () => void;
}

interface CashierClosingViewProps {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
  expenses?: Expense[];
  closingRecords?: CashierClosingRecord[];
  profile: Record<string, any>;
  cashierName: string;
  printerSession: PrinterSessionState;
  playBeep: (type?: string) => void;
  onConfirmClosing?: (record: CashierClosingRecord) => void;
  onNotifyOwner?: (item: OwnerNotificationItem) => void;
  onOpenEmployeeRecap?: () => void;
}

export const CashierClosingView: React.FC<CashierClosingViewProps> = ({
  transactions,
  digitalTransactions,
  expenses = [],
  closingRecords = [],
  profile,
  cashierName,
  printerSession,
  playBeep,
  onConfirmClosing,
  onNotifyOwner,
  onOpenEmployeeRecap,
}) => {
  const initialDaily = useMemo(() => getClosingPeriodRange('harian'), []);
  const [periodPreset, setPeriodPreset] = useState<ClosingPeriodPreset>('harian');
  const [startDate, setStartDate] = useState(initialDaily.startDate);
  const [endDate, setEndDate] = useState(initialDaily.endDate);
  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [closingNote, setClosingNote] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Konfirmasi Closing & WhatsApp + Gambar State
  const [showConfirmClosingModal, setShowConfirmClosingModal] = useState(false);
  const [ownerWaInput, setOwnerWaInput] = useState(() => String(profile?.phone || ''));
  const [closingImage, setClosingImage] = useState<GeneratedClosingImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<CashierClosingRecord | null>(null);
  const [closingActionFeedback, setClosingActionFeedback] = useState<string | null>(null);

  const handleSelectPreset = (preset: Exclude<ClosingPeriodPreset, 'custom'>) => {
    playBeep('click');
    const range = getClosingPeriodRange(preset);
    setPeriodPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const periodLabel = useMemo(() => {
    if (periodPreset === 'harian') return 'Harian (Hari Ini)';
    if (periodPreset === 'mingguan') return 'Mingguan (Minggu Ini)';
    if (periodPreset === 'bulanan') return 'Bulanan (Bulan Ini)';
    return 'Periode Kustom';
  }, [periodPreset]);

  const parsedPhysicalCash = useMemo(() => {
    const trimmed = physicalCashInput.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }, [physicalCashInput]);

  const recap = useMemo(() => {
    return buildCashierClosingRecap(
      transactions,
      digitalTransactions,
      startDate,
      endDate,
      parsedPhysicalCash,
      expenses
    );
  }, [transactions, digitalTransactions, startDate, endDate, parsedPhysicalCash, expenses]);

  const handleExportPDF = () => {
    playBeep('click');
    exportCashierClosingPDF({
      profile,
      recap,
      periodLabel,
      cashierName,
      note: closingNote,
    });
  };

  const handlePrintBluetooth = async () => {
    setIsPrinting(true);
    try {
      let char = printerSession.characteristic;
      let activeName = printerSession.deviceName || 'Printer Thermal';

      if (!char || !printerSession.device?.gatt?.connected) {
        setPrinterStatus('Menghubungkan ke printer thermal Bluetooth...');
        const connected = await printerSession.onConnect();
        if (!connected) {
          setPrinterStatus('Printer Bluetooth belum terhubung. Gunakan Chrome/Edge atau pilih Cetak Browser.');
          return;
        }
        char = connected.characteristic;
        activeName = connected.name;
      }

      setPrinterStatus(`Mengirim struk closing ke ${activeName}...`);
      const payload = buildClosingEscPosPayload(recap, profile, {
        periodLabel,
        cashierName,
        note: closingNote,
      });
      await sendEscPosToCharacteristic(char, payload);
      playBeep('success');
      setPrinterStatus(`Struk Closing berhasil dicetak via ${activeName}!`);
      setTimeout(() => setPrinterStatus(''), 3500);
    } catch (err: any) {
      setPrinterStatus(err?.message || 'Gagal mencetak via Bluetooth. Gunakan Cetak Browser.');
    } finally {
      setIsPrinting(false);
    }
  };

  const employeeRows = useMemo(
    () =>
      buildEmployeeRecapTable(
        transactions,
        digitalTransactions,
        closingRecords,
        startDate,
        endDate
      ),
    [transactions, digitalTransactions, closingRecords, startDate, endDate]
  );

  const triggerDownloadImage = (img: GeneratedClosingImage) => {
    if (!img.dataUrl) return;
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = img.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenConfirmClosingModal = async () => {
    playBeep('click');
    setOwnerWaInput(String(profile?.phone || ''));
    setConfirmedRecord(null);
    setClosingActionFeedback(null);
    setClosingImage(null);
    setShowConfirmClosingModal(true);
    setIsGeneratingImage(true);
    try {
      const img = await generateClosingRecapImage({
        profile,
        recap,
        periodLabel,
        cashierName: cashierName || 'Karyawan Kasir',
        note: closingNote,
        confirmedAt: new Date().toISOString(),
      });
      setClosingImage(img);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const whatsappMessage = useMemo(
    () =>
      buildClosingWhatsAppMessage({
        storeName: profile?.ownerName || 'Warung Pintar Mandiri',
        cashierName: cashierName || 'Karyawan Kasir',
        periodLabel,
        recap,
        note: closingNote,
        confirmedAt: confirmedRecord?.confirmedAt,
      }),
    [profile?.ownerName, cashierName, periodLabel, recap, closingNote, confirmedRecord?.confirmedAt]
  );

  const whatsappUrl = useMemo(
    () => buildWhatsAppUrl(ownerWaInput || profile?.phone, whatsappMessage),
    [ownerWaInput, profile?.phone, whatsappMessage]
  );

  const handleConfirmAndPrepareWhatsApp = async () => {
    const nowIso = new Date().toISOString();
    const formattedPhone = formatWhatsAppPhone(ownerWaInput || profile?.phone);
    const record: CashierClosingRecord = {
      id: generateUniqueRecordId('CLOSE'),
      confirmedAt: nowIso,
      periodPreset,
      periodLabel,
      startDate: recap.startDate,
      endDate: recap.endDate,
      cashierName: cashierName || 'Karyawan Kasir',
      totalSettledOmset: recap.totalSettledOmset,
      retailSettledOmset: recap.retailSettledOmset,
      digitalOmset: recap.digitalOmset,
      totalExpenses: recap.totalExpenses,
      expectedDrawerCash: recap.expectedDrawerCash,
      physicalCashCount: recap.physicalCashCount,
      cashVariance: recap.cashVariance,
      qrisTotal: recap.qrisTotal,
      kasbonTotal: recap.kasbonTotal,
      totalSettledCount: recap.totalSettledCount,
      note: closingNote.trim(),
      sentToWhatsApp: Boolean(formattedPhone),
      ownerPhone: formattedPhone || String(profile?.phone || ''),
    };

    onConfirmClosing?.(record);
    onNotifyOwner?.(
      createClosingConfirmNotification({
        id: record.id,
        confirmedAt: record.confirmedAt,
        periodLabel: record.periodLabel,
        cashierName: record.cashierName,
        totalSettledOmset: record.totalSettledOmset,
        expectedDrawerCash: record.expectedDrawerCash,
        physicalCashCount: record.physicalCashCount,
        cashVariance: record.cashVariance,
      })
    );

    let img = closingImage;
    if (!img || !img.dataUrl) {
      setIsGeneratingImage(true);
      try {
        img = await generateClosingRecapImage({
          profile,
          recap,
          periodLabel,
          cashierName: cashierName || 'Karyawan Kasir',
          note: closingNote,
          confirmedAt: nowIso,
        });
        setClosingImage(img);
      } finally {
        setIsGeneratingImage(false);
      }
    }

    if (img?.dataUrl) {
      triggerDownloadImage(img);
    }

    setConfirmedRecord(record);
    playBeep('success');
    setClosingActionFeedback(
      'Closing dikonfirmasi! File gambar Rekap Closing (.PNG) telah diunduh otomatis. Klik "Buka WhatsApp Owner" atau "Bagikan Foto + Teks" untuk mengirim ke WhatsApp Owner.'
    );
  };

  const handleNativeShareWithImage = async () => {
    if (!closingImage) return;
    try {
      const pngFile = new File([closingImage.blob], closingImage.filename, {
        type: 'image/png',
      });
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files: [pngFile] }))
      ) {
        await navigator.share({
          title: `Rekap Closing ${profile?.ownerName || 'Toko'}`,
          text: whatsappMessage,
          files: [pngFile],
        });
        setClosingActionFeedback('Rekap Closing beserta file gambar berhasil dibagikan!');
      } else {
        setClosingActionFeedback(
          'Perangkat/browser ini belum mendukung Share File langsung. Gunakan "Salin Foto ke Clipboard" lalu tempel (Ctrl+V) di WhatsApp Web, atau lampirkan file .PNG yang sudah terunduh.'
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setClosingActionFeedback(
          'Gagal membuka menu Bagikan. Silakan lampirkan file .PNG yang telah diunduh ke WhatsApp Owner.'
        );
      }
    }
  };

  const handleCopyImageToClipboard = async () => {
    if (!closingImage) return;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof (window as any).ClipboardItem === 'function'
      ) {
        const ClipboardItemCtor = (window as any).ClipboardItem;
        await navigator.clipboard.write([
          new ClipboardItemCtor({ 'image/png': closingImage.blob }),
        ]);
        playBeep('success');
        setClosingActionFeedback(
          'Foto Rekap Closing berhasil disalin! Sekarang klik "Buka WhatsApp Owner" lalu Paste (Ctrl+V) di chat WhatsApp.'
        );
      } else {
        setClosingActionFeedback(
          'Clipboard gambar tidak didukung browser ini. Gunakan file .PNG yang sudah diunduh untuk dilampirkan di WhatsApp.'
        );
      }
    } catch {
      setClosingActionFeedback(
        'Gagal menyalin gambar ke clipboard. Gunakan file .PNG yang sudah otomatis terunduh untuk dilampirkan ke WhatsApp.'
      );
    }
  };

  return (
    <div className="p-2.5 sm:p-4 md:p-8 phone-landscape:p-2.5 space-y-3 sm:space-y-5 animate-in fade-in duration-300">
      {/* Header Closing & Recap */}
      <div className="bg-white p-3.5 sm:p-6 phone-landscape:p-3.5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row phone-landscape:flex-row justify-between items-start lg:items-center phone-landscape:items-center gap-2.5 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
                Closingan &amp; Recap Kasir
              </h2>
              <p className="text-[9.5px] sm:text-[10px] font-bold text-gray-400 uppercase mt-1">
                Kasir: <span className="text-emerald-700">{cashierName || 'Karyawan Kasir'}</span> • Rekap operasional harian, mingguan &amp; bulanan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleOpenConfirmClosingModal}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all whitespace-nowrap"
            >
              <Send size={14} />
              <span>Konfirmasi Closing</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playBeep('click');
                setShowReceiptModal(true);
              }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <Printer size={14} />
              <span>Struk Closing 58mm</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap"
            >
              <FileDown size={14} />
              <span>Ekspor PDF</span>
            </button>
          </div>
        </div>

        {/* Switcher Harian / Mingguan / Bulanan + Rentang Tanggal */}
        <div className="flex flex-col md:flex-row phone-landscape:flex-row md:items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div
            className="flex flex-wrap bg-slate-100 p-1 rounded-xl sm:rounded-2xl text-[9.5px] sm:text-[10px] font-black uppercase gap-1"
            role="tablist"
            aria-label="Periode Closing Kasir"
          >
            <button
              type="button"
              role="tab"
              aria-selected={periodPreset === 'harian'}
              onClick={() => handleSelectPreset('harian')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all ${
                periodPreset === 'harian'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodPreset === 'mingguan'}
              onClick={() => handleSelectPreset('mingguan')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all ${
                periodPreset === 'mingguan'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={periodPreset === 'bulanan'}
              onClick={() => handleSelectPreset('bulanan')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all ${
                periodPreset === 'bulanan'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Bulanan
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-gray-50 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-gray-200 self-start md:self-auto">
            <Calendar size={13} className="text-gray-400 shrink-0" />
            <input
              type="date"
              aria-label="Tanggal mulai closing"
              value={startDate}
              onChange={(e) => {
                setPeriodPreset('custom');
                setStartDate(e.target.value);
              }}
              className="bg-transparent text-[9.5px] sm:text-[10px] font-black outline-none uppercase"
            />
            <span className="text-gray-300">-</span>
            <input
              type="date"
              aria-label="Tanggal selesai closing"
              value={endDate}
              onChange={(e) => {
                setPeriodPreset('custom');
                setEndDate(e.target.value);
              }}
              className="bg-transparent text-[9.5px] sm:text-[10px] font-black outline-none uppercase"
            />
          </div>
        </div>
      </div>

      {/* 4 Kartu Ringkasan Operasional (Tanpa Laba / Modal Owner) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 phone-landscape:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-blue-600 text-white p-3.5 sm:p-5 phone-landscape:p-2.5 rounded-2xl sm:rounded-3xl shadow-md shadow-blue-500/20 flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white/20 flex items-center justify-center mb-2">
              <TrendingUp size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-100">
              Total Omset ({periodPreset === 'custom' ? 'Periode' : periodPreset})
            </p>
            <h3 className="text-sm sm:text-xl phone-landscape:text-xs font-black mt-0.5 tabular-nums truncate">
              {formatRp(recap.totalSettledOmset)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-blue-100 uppercase mt-1.5 tabular-nums">
            {recap.totalSettledCount} Tx Lunas • Rtl {recap.retailSettledCount} / PPOB {recap.digitalCount}
            {recap.totalExpenses > 0 ? ` • Biaya -${formatRp(recap.totalExpenses)}` : ''}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 phone-landscape:p-2.5 rounded-2xl sm:rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <Wallet size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Uang Tunai
            </p>
            <h3 className="text-sm sm:text-xl phone-landscape:text-xs font-black text-emerald-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.cashTotal)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5">
            Wajib Setor Tunai
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 phone-landscape:p-2.5 rounded-2xl sm:rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <QrCode size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Non-Tunai QRIS
            </p>
            <h3 className="text-sm sm:text-xl phone-landscape:text-xs font-black text-indigo-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.qrisTotal)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5">
            Masuk Rekening Toko
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-5 phone-landscape:p-2.5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Clock size={16} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
              Piutang Kasbon
            </p>
            <h3 className="text-sm sm:text-xl phone-landscape:text-xs font-black text-amber-700 mt-0.5 tabular-nums truncate">
              {formatRp(recap.kasbonTotal)}
            </h3>
          </div>
          <p className="text-[8.5px] sm:text-[9px] font-bold text-gray-400 uppercase mt-1.5 tabular-nums">
            {recap.kasbonCount} Tx Belum Lunas{recap.cancelledCount > 0 ? ` • ${recap.cancelledCount} Batal` : ''}
          </p>
        </div>
      </div>

      {/* Rekonsiliasi / Hitung Kas Tunai Closing */}
      <div className="bg-white p-3.5 sm:p-6 phone-landscape:p-3.5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Calculator size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">
                Hitung Kas &amp; Closing Tunai
              </h3>
              <p className="text-[9.5px] sm:text-[10px] font-bold text-gray-400 uppercase">
                Cocokkan uang tunai fisik kasir dengan catatan sistem
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setPhysicalCashInput(String(recap.expectedDrawerCash));
            }}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[9.5px] sm:text-[10px] font-black uppercase whitespace-nowrap self-start sm:self-auto"
          >
            Sesuai Sistem ({formatRp(recap.expectedDrawerCash)})
          </button>
        </div>

        {(recap.tarikTunaiDrawerCash > 0 || recap.expenseDrawerCash > 0) && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl sm:rounded-2xl space-y-1.5">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wide block">
              Rincian Arus Kas Fisik Tunai:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] sm:text-xs">
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                <span className="text-gray-400 block text-[9px] font-bold uppercase">Tunai Masuk</span>
                <span className="font-black text-emerald-700">+{formatRp(recap.cashTotal)}</span>
              </div>
              {recap.tarikTunaiDrawerCash > 0 && (
                <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Tarik Tunai</span>
                  <span className="font-black text-rose-600">-{formatRp(recap.tarikTunaiDrawerCash)}</span>
                </div>
              )}
              {recap.expenseDrawerCash > 0 && (
                <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Pengeluaran Tunai</span>
                  <span className="font-black text-rose-600">-{formatRp(recap.expenseDrawerCash)}</span>
                </div>
              )}
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-gray-600 block text-[9px] font-black uppercase">Uang Tunai Bersih</span>
                <span className="font-black text-gray-900">{formatRp(recap.expectedDrawerCash)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4 items-end">
          <div className="space-y-1">
            <label
              htmlFor="closing-physical-cash"
              className="text-[9.5px] sm:text-[10px] font-black text-gray-500 uppercase ml-1"
            >
              Uang Tunai Fisik (Rp)
            </label>
            <input
              id="closing-physical-cash"
              type="number"
              min="0"
              value={physicalCashInput}
              onChange={(e) => setPhysicalCashInput(e.target.value)}
              placeholder={`Sistem: ${recap.expectedDrawerCash}`}
              className="w-full p-2.5 sm:p-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none font-black text-xs sm:text-sm text-gray-900 tabular-nums"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="closing-note-input"
              className="text-[9.5px] sm:text-[10px] font-black text-gray-500 uppercase ml-1"
            >
              Catatan Serah Terima / Closing (Opsional)
            </label>
            <input
              id="closing-note-input"
              type="text"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder="Cth: Shift pagi setor ke brankas..."
              className="w-full p-2.5 sm:p-3 bg-gray-50 border border-gray-200 focus:border-emerald-500 rounded-xl outline-none font-bold text-xs"
            />
          </div>

          <div
            data-testid="closing-variance-box"
            className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 ${
              recap.cashVariance === null
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : recap.cashVariance === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : recap.cashVariance > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {recap.cashVariance === 0 ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              ) : recap.cashVariance !== null ? (
                <AlertTriangle size={16} className="shrink-0" />
              ) : (
                <Calculator size={16} className="shrink-0 text-slate-400" />
              )}
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase opacity-75">Status Selisih Kas</p>
                <p className="text-xs sm:text-sm font-black tabular-nums truncate">
                  {recap.cashVariance === null
                    ? 'Isi kas fisik tunai'
                    : recap.cashVariance === 0
                      ? 'KLOP / PAS (Rp 0)'
                      : recap.cashVariance > 0
                        ? `LEBIH (+${formatRp(recap.cashVariance)})`
                        : `KURANG (${formatRp(recap.cashVariance)})`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-[10px] font-bold text-gray-500">
            Setelah menghitung kas fisik tunai, klik <span className="text-teal-700 font-black">Konfirmasi Closing</span> untuk menyimpan rekap &amp; mengirim laporan WhatsApp + Foto ke Owner.
          </p>
          <button
            type="button"
            onClick={handleOpenConfirmClosingModal}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/20 shrink-0 transition-all"
          >
            <Send size={14} />
            <span>Konfirmasi Closing &amp; Kirim WA Owner</span>
          </button>
        </div>
      </div>

      {/* Tabel Rincian Harian + Produk Terjual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">
                Rincian Omset Per Tanggal
              </h3>
              <p className="text-[9.5px] font-bold text-gray-400 uppercase mt-0.5">
                {periodLabel} • {recap.startDate || '-'} s/d {recap.endDate || '-'}
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[9.5px] font-black uppercase tabular-nums">
              {recap.dailyBreakdown.length} Hari
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 text-[9.5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-3 sm:px-5 py-3">Tanggal</th>
                  <th className="px-3 py-3 text-center">Tx</th>
                  <th className="px-3 py-3 text-right">Retail</th>
                  <th className="px-3 py-3 text-right">PPOB</th>
                  <th className="px-3 py-3 text-right">Biaya</th>
                  <th className="px-3 py-3 text-right">Tunai</th>
                  <th className="px-3 py-3 text-right">QRIS</th>
                  <th className="px-3 sm:px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recap.dailyBreakdown.map((day) => {
                  const formattedDay = new Date(`${day.date}T00:00:00`).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                  <tr key={day.date} className="text-[11px] sm:text-xs hover:bg-gray-50/50">
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5 font-black text-gray-800 uppercase whitespace-nowrap">
                      {formattedDay}
                    </td>
                    <td className="px-3 py-2.5 sm:py-3.5 text-center font-black text-blue-600 tabular-nums">
                      {day.count}
                    </td>
                    <td className="px-3 py-2.5 sm:py-3.5 text-right font-bold text-gray-700 tabular-nums">
                      {formatRp(day.retailOmset)}
                    </td>
                    <td className="px-3 py-2.5 sm:py-3.5 text-right font-bold text-indigo-600 tabular-nums">
                      {formatRp(day.digitalOmset)}
                    </td>
                    <td className={`px-3 py-2.5 sm:py-3.5 text-right font-bold tabular-nums ${day.expensesAmount > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                      {day.expensesAmount > 0 ? `-${formatRp(day.expensesAmount)}` : formatRp(0)}
                    </td>
                    <td className="px-3 py-2.5 sm:py-3.5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatRp(day.cashOmset)}
                    </td>
                    <td className="px-3 py-2.5 sm:py-3.5 text-right font-bold text-indigo-700 tabular-nums">
                      {formatRp(day.qrisOmset)}
                    </td>
                    <td className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-right font-black text-gray-900 tabular-nums">
                      {formatRp(day.totalOmset)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {recap.dailyBreakdown.length === 0 && (
            <div className="text-center py-8 px-4 text-gray-400 font-bold uppercase text-[10px]">
              Belum ada transaksi pada periode {periodLabel.toLowerCase()} ini.
            </div>
          )}
        </div>

        {/* Ringkasan Produk Terjual */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-3.5 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">Barang Terjual</h3>
              <p className="text-[9.5px] font-bold text-gray-400 uppercase">Item terlaris periode ini</p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
            {recap.topSoldItems.length > 0 ? (
              recap.topSoldItems.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-black text-gray-800 uppercase truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-black text-blue-600 tabular-nums">{item.quantity}x</span>
                    <span className="block text-[9px] font-bold text-gray-400 tabular-nums">
                      {formatRp(item.revenue)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 font-bold uppercase text-[10px]">
                Belum ada barang retail terjual
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ringkasan Tabel Rekap Karyawan & Riwayat Closing */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase">
                Tabel Rekap Karyawan ({periodLabel})
              </h3>
              <p className="text-[9.5px] font-bold text-gray-400 uppercase mt-0.5">
                Performa penjualan &amp; status closing per kasir bertugas
              </p>
            </div>
          </div>
          {onOpenEmployeeRecap && (
            <button
              type="button"
              onClick={() => {
                playBeep('click');
                onOpenEmployeeRecap();
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[9.5px] sm:text-[10px] font-black uppercase whitespace-nowrap"
            >
              Lihat Tabel Lengkap
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[620px]">
            <thead>
              <tr className="bg-slate-50 text-[9.5px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-3.5 sm:px-5 py-3">Karyawan</th>
                <th className="px-3 py-3 text-center">Tx</th>
                <th className="px-3 py-3 text-right">Retail</th>
                <th className="px-3 py-3 text-right">PPOB</th>
                <th className="px-3 py-3 text-right">Tunai</th>
                <th className="px-3 py-3 text-right">QRIS</th>
                <th className="px-3 py-3 text-right">Total Omset</th>
                <th className="px-3.5 sm:px-5 py-3 text-center">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employeeRows.map((row) => (
                <tr key={row.employeeName} className="text-[11px] sm:text-xs hover:bg-gray-50/50">
                  <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 font-black text-gray-900 uppercase">
                    {row.employeeName}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-center font-black text-blue-600 tabular-nums">
                    {row.txCount}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-right font-bold text-gray-700 tabular-nums">
                    {formatRp(row.retailOmset)}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-right font-bold text-indigo-600 tabular-nums">
                    {formatRp(row.digitalOmset)}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-right font-bold text-emerald-700 tabular-nums">
                    {formatRp(row.cashTotal)}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-right font-bold text-blue-700 tabular-nums">
                    {formatRp(row.qrisTotal)}
                  </td>
                  <td className="px-3 py-2.5 sm:py-3 text-right font-black text-gray-900 tabular-nums">
                    {formatRp(row.totalOmset)}
                  </td>
                  <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-center whitespace-nowrap">
                    {row.closingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9.5px] font-black uppercase">
                        <CheckCircle2 size={11} />
                        {row.closingCount}x Terkonfirmasi
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9.5px] font-bold uppercase">
                        Belum
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employeeRows.length === 0 && (
          <div className="text-center py-6 px-4 text-gray-400 font-bold uppercase text-[10px]">
            Belum ada transaksi karyawan pada periode ini.
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Closing & Kirim WhatsApp Owner + File Gambar Rekap */}
      {showConfirmClosingModal && (
        <div
          className="fixed inset-0 bg-black/70 z-[125] flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Closing dan Kirim WhatsApp Owner"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-xl p-4 sm:p-6 shadow-2xl space-y-3.5 sm:space-y-4 max-h-[92dvh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h3 className="font-black text-xs sm:text-sm uppercase text-gray-900">
                    Konfirmasi Closing &amp; Kirim WA Owner
                  </h3>
                  <p className="text-[10px] font-bold text-gray-500">
                    Rincian Closing + File Gambar Rekap (.PNG) siap dikirim ke WhatsApp Owner
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmClosingModal(false)}
                aria-label="Tutup modal konfirmasi closing"
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview File Gambar Rekap Closing */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-slate-600">
                <span className="shrink-0">Preview Foto Rekap Closing</span>
                {closingImage && (
                  <span className="text-teal-700 truncate max-w-[55%] text-right" title={closingImage.filename}>
                    {closingImage.filename}
                  </span>
                )}
              </div>
              {isGeneratingImage ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin text-teal-600" />
                  <span className="text-xs font-bold">Menyiapkan gambar Rekap Closing...</span>
                </div>
              ) : closingImage?.dataUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={closingImage.dataUrl}
                    alt="Preview File Gambar Rekap Closing Kasir"
                    className="w-full h-auto max-h-[300px] object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-bold text-slate-400">
                  Preview gambar siap saat dikonfirmasi.
                </div>
              )}
            </div>

            {/* Nomor WhatsApp Owner */}
            <div className="space-y-1">
              <label
                htmlFor="closing-owner-wa-phone"
                className="block text-[10px] font-black uppercase text-gray-500 ml-1"
              >
                Nomor WhatsApp Owner Tujuan
              </label>
              <input
                id="closing-owner-wa-phone"
                type="tel"
                value={ownerWaInput}
                onChange={(e) => setOwnerWaInput(e.target.value)}
                placeholder="Cth: 08123456789"
                className="w-full p-2.5 sm:p-3 bg-gray-50 border border-gray-200 focus:border-teal-500 rounded-xl outline-none font-bold text-xs text-gray-900"
              />
            </div>

            {closingActionFeedback && (
              <div
                role="status"
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-bold flex items-start gap-2"
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                <span>{closingActionFeedback}</span>
              </div>
            )}

            {!confirmedRecord ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmClosingModal(false)}
                  className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isGeneratingImage}
                  onClick={handleConfirmAndPrepareWhatsApp}
                  className="py-2.5 sm:py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-teal-500/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 size={15} />
                  <span>Konfirmasi &amp; Unduh Foto</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 sm:py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink size={14} />
                    <span>Buka WhatsApp Owner</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleNativeShareWithImage}
                    className="py-2.5 sm:py-3 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Share2 size={14} />
                    <span>Bagikan Foto + Teks (HP)</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyImageToClipboard}
                    className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Salin Foto (Ctrl+V WA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => closingImage && triggerDownloadImage(closingImage)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center justify-center gap-1.5"
                  >
                    <FileDown size={13} />
                    <span>Unduh Ulang Gambar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Preview Struk Closing Thermal 58mm */}
      {showReceiptModal && (
        <div
          className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Preview Struk Closing Kasir"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 max-h-[90dvh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b pb-2.5">
              <div>
                <h3 className="font-black text-xs uppercase text-gray-800">Struk Closing Kasir (58mm)</h3>
                <p className="text-[10px] font-bold text-slate-400">
                  Printer BT:{' '}
                  <span className={printerSession.device ? 'text-emerald-600' : 'text-amber-600'}>
                    {printerSession.statusInfo}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                aria-label="Tutup struk closing"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-gray-300 font-mono text-[10.5px] text-gray-700 space-y-1">
              <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                <p className="font-black text-xs uppercase">{profile.ownerName || 'WARUNG PINTAR'}</p>
                {profile.address && <p className="text-[9px] text-gray-500">{profile.address}</p>}
                <p className="font-black text-[10px] mt-1">REKAP &amp; CLOSING KASIR</p>
              </div>
              <div className="flex justify-between"><span>Periode:</span><span className="font-bold">{periodLabel}</span></div>
              <div className="flex justify-between"><span>Tanggal:</span><span>{recap.startDate} s/d {recap.endDate}</span></div>
              <div className="flex justify-between"><span>Kasir:</span><span className="font-bold">{cashierName || 'Karyawan Kasir'}</span></div>
              <div className="border-t border-dashed border-gray-300 my-1.5" />
              <div className="flex justify-between"><span>Omset Retail ({recap.retailSettledCount})</span><span>{formatRp(recap.retailSettledOmset)}</span></div>
              <div className="flex justify-between"><span>Omset PPOB ({recap.digitalCount})</span><span>{formatRp(recap.digitalOmset)}</span></div>
              {recap.totalExpenses > 0 && (
                <div className="flex justify-between text-rose-600"><span>Biaya Toko</span><span>-{formatRp(recap.totalExpenses)}</span></div>
              )}
              <div className="flex justify-between font-black text-xs"><span>TOTAL OMSET</span><span>{formatRp(recap.totalSettledOmset)}</span></div>
              <div className="border-t border-dashed border-gray-300 my-1.5" />
              <div className="flex justify-between"><span>Tunai Masuk</span><span className="font-bold">{formatRp(recap.cashTotal)}</span></div>
              {recap.tarikTunaiDrawerCash > 0 && (
                <div className="flex justify-between text-rose-600"><span>Tarik Tunai</span><span>-{formatRp(recap.tarikTunaiDrawerCash)}</span></div>
              )}
              {recap.expenseDrawerCash > 0 && (
                <div className="flex justify-between text-rose-600"><span>Pengeluaran Tunai</span><span>-{formatRp(recap.expenseDrawerCash)}</span></div>
              )}
              <div className="flex justify-between font-bold"><span>Uang Kas Tunai</span><span>{formatRp(recap.expectedDrawerCash)}</span></div>
              <div className="flex justify-between"><span>Non-Tunai QRIS</span><span className="font-bold">{formatRp(recap.qrisTotal)}</span></div>
              <div className="flex justify-between"><span>Kasbon ({recap.kasbonCount} Tx)</span><span>{formatRp(recap.kasbonTotal)}</span></div>
              {recap.physicalCashCount !== null && (
                <>
                  <div className="border-t border-dashed border-gray-300 my-1.5" />
                  <div className="flex justify-between"><span>Kas Sistem</span><span>{formatRp(recap.expectedDrawerCash)}</span></div>
                  <div className="flex justify-between"><span>Kas Fisik</span><span>{formatRp(recap.physicalCashCount)}</span></div>
                  <div className="flex justify-between font-black">
                    <span>Selisih Kas</span>
                    <span>
                      {(recap.cashVariance || 0) > 0 ? '+' : ''}
                      {formatRp(recap.cashVariance || 0)}
                    </span>
                  </div>
                </>
              )}
              {closingNote.trim() && (
                <div className="border-t border-dashed border-gray-300 pt-1.5 mt-1.5 text-[9.5px]">
                  Catatan: {closingNote.trim()}
                </div>
              )}
            </div>

            {printerStatus && (
              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl text-[10px] font-bold text-center border border-blue-100">
                {printerStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPrinting}
                onClick={handlePrintBluetooth}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Bluetooth size={14} />
                <span>{isPrinting ? 'Mencetak...' : 'Cetak Bluetooth'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Cetak Browser</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
