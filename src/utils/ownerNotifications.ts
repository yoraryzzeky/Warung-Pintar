import {
  formatRp,
  type DigitalTransaction,
  type ReturnExchangeRecord,
  type Transaction,
} from './storeLogic';
import type { AppMode } from './roleMode';

export type OwnerNotificationType =
  | 'TRANSACTION_NEW'
  | 'TRANSACTION_RETURN'
  | 'DIGITAL_NEW'
  | 'CLOSING_CONFIRM';

export interface OwnerNotificationItem {
  id: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  read: boolean;
  handledBy: string;
  txId?: string;
  detail?: string;
}

export interface ClosingNotificationSummary {
  id: string;
  confirmedAt: string;
  periodLabel: string;
  cashierName: string;
  totalSettledOmset: number;
  expectedDrawerCash: number;
  physicalCashCount: number | null;
  cashVariance: number | null;
}

function summarizeRetailItems(tx: Transaction): string {
  if (!Array.isArray(tx.items) || tx.items.length === 0) {
    return 'Transaksi Kasir';
  }
  const preview = tx.items
    .slice(0, 2)
    .map((it) => `${it.quantity}x ${it.name}`)
    .join(', ');
  const extra = tx.items.length > 2 ? ` (+${tx.items.length - 2} item)` : '';
  return `${preview}${extra}`;
}

export function createRetailTxNotification(
  tx: Transaction,
  cashierName: string,
  options: { isKasbonAddition?: boolean; addedAmount?: number } = {}
): OwnerNotificationItem {
  const actor = (cashierName || tx.handledBy || 'Karyawan Kasir').trim() || 'Karyawan Kasir';
  const suffix = options.isKasbonAddition ? `-ADD-${Date.now().toString().slice(-5)}` : '';
  const txAmount = options.isKasbonAddition
    ? Math.max(0, Number(options.addedAmount ?? tx.totalAmount) || 0)
    : Math.max(0, Number(tx.totalAmount) || 0);
  const methodLabel =
    tx.status === 'MENUNGGU' || tx.paymentMethod === 'KASBON'
      ? 'KASBON'
      : tx.paymentMethod || 'TUNAI';

  return {
    id: `NOTIF-TX-${tx.id}${suffix}`,
    type: 'TRANSACTION_NEW',
    title: options.isKasbonAddition
      ? `Kasir: Tambah Kasbon (${tx.buyer || 'Pelanggan'})`
      : `Kasir: Transaksi Baru (${methodLabel})`,
    message: `${summarizeRetailItems(tx)} • Pembeli: ${tx.buyer || 'Pelanggan Umum'}`,
    amount: txAmount,
    timestamp: tx.date || new Date().toISOString(),
    read: false,
    handledBy: actor,
    txId: tx.id,
    detail: `Struk ${tx.id} • ${tx.status === 'MENUNGGU' ? 'Belum Lunas' : 'Lunas'}`,
  };
}

export function createDigitalTxNotification(
  tx: DigitalTransaction,
  cashierName: string
): OwnerNotificationItem {
  const actor = (cashierName || tx.handledBy || 'Karyawan Kasir').trim() || 'Karyawan Kasir';
  return {
    id: `NOTIF-DIG-${tx.id}`,
    type: 'DIGITAL_NEW',
    title: `Kasir: PPOB ${tx.serviceType}`,
    message: `${tx.provider} (${tx.targetNumber}) • ${tx.customer || 'Pelanggan Umum'}`,
    amount: Math.max(0, Number(tx.sellAmount) || 0),
    timestamp: tx.date || new Date().toISOString(),
    read: false,
    handledBy: actor,
    txId: tx.id,
    detail: `Struk ${tx.id}`,
  };
}

export function createReturnExchangeNotification(
  tx: Transaction,
  record: ReturnExchangeRecord,
  cashierName: string
): OwnerNotificationItem {
  const actor = (record.processedBy || cashierName || 'Karyawan Kasir').trim() || 'Karyawan Kasir';
  const actionLabel =
    record.action === 'EXCHANGE'
      ? 'Tukar Barang'
      : record.action === 'CANCEL'
        ? 'Pembatalan Penuh'
        : 'Retur Sebagian';

  const returnedText = (record.returnedItems || [])
    .slice(0, 2)
    .map((it) => `${it.quantity}x ${it.name}`)
    .join(', ');

  let financeNote = `Refund ${formatRp(record.refundAmount || 0)}`;
  let notifAmount = Math.max(0, Number(record.refundAmount) || 0);
  if (record.action === 'EXCHANGE') {
    const diff = Number(record.priceDifference) || 0;
    financeNote =
      diff > 0
        ? `Tambah bayar ${formatRp(diff)}`
        : diff < 0
          ? `Kembalian ${formatRp(Math.abs(diff))}`
          : 'Tukar impas (Rp 0)';
    notifAmount = Math.abs(diff);
  }

  return {
    id: `NOTIF-RET-${record.id}`,
    type: 'TRANSACTION_RETURN',
    title: `Kasir: ${actionLabel} (${tx.id})`,
    message: `${returnedText || 'Item transaksi'} • Alasan: ${record.reason || '-'} (${financeNote})`,
    amount: notifAmount,
    timestamp: record.date || new Date().toISOString(),
    read: false,
    handledBy: actor,
    txId: tx.id,
    detail: `Struk ${tx.id} • ${record.condition === 'GOOD' ? 'Stok Kembali' : 'Barang Rusak'}`,
  };
}

export function createClosingConfirmNotification(
  closing: ClosingNotificationSummary
): OwnerNotificationItem {
  const varianceText =
    closing.cashVariance === null
      ? 'Kas fisik belum diisi'
      : closing.cashVariance === 0
        ? 'Kas Klop (Rp 0)'
        : closing.cashVariance > 0
          ? `Kas Lebih +${formatRp(closing.cashVariance)}`
          : `Kas Kurang ${formatRp(closing.cashVariance)}`;

  return {
    id: `NOTIF-CLOSE-${closing.id}`,
    type: 'CLOSING_CONFIRM',
    title: `Closing Kasir (${closing.periodLabel})`,
    message: `${closing.cashierName} mengirim rekap closing • Kas Tunai ${formatRp(closing.expectedDrawerCash)}`,
    amount: Math.max(0, Number(closing.totalSettledOmset) || 0),
    timestamp: closing.confirmedAt || new Date().toISOString(),
    read: false,
    handledBy: closing.cashierName || 'Karyawan Kasir',
    txId: closing.id,
    detail: varianceText,
  };
}

export function mergeOwnerNotifications(
  existing: readonly OwnerNotificationItem[],
  incoming: readonly OwnerNotificationItem[],
  maxItems = 100
): OwnerNotificationItem[] {
  const map = new Map<string, OwnerNotificationItem>();
  for (const item of existing) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  for (const item of incoming) {
    if (!item || !item.id) continue;
    const prev = map.get(item.id);
    if (prev) {
      map.set(item.id, {
        ...item,
        read: prev.read || item.read,
      });
    } else {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems);
}

/**
 * Synthesizes any missing OwnerNotificationItems when transactions or returnRecords arrive
 * from remote devices (e.g., Mode Kasir on Device 2 syncing to Mode Owner on Device 1).
 */
export function synthesizeMissingCashierNotifications(params: {
  prevTransactions: readonly Transaction[];
  nextTransactions: readonly Transaction[];
  prevDigitalTransactions: readonly DigitalTransaction[];
  nextDigitalTransactions: readonly DigitalTransaction[];
  existingNotifications: readonly OwnerNotificationItem[];
  currentDeviceMode: AppMode;
}): OwnerNotificationItem[] {
  const {
    prevTransactions,
    nextTransactions,
    prevDigitalTransactions,
    nextDigitalTransactions,
    existingNotifications,
    currentDeviceMode,
  } = params;

  const existingIds = new Set(existingNotifications.map((n) => n.id));
  const prevTxMap = new Map(prevTransactions.map((t) => [t.id, t]));
  const prevDigIds = new Set(prevDigitalTransactions.map((d) => d.id));
  const synthesized: OwnerNotificationItem[] = [];

  for (const tx of nextTransactions) {
    const prevTx = prevTxMap.get(tx.id);
    const isCashierActor = Boolean(tx.handledBy && tx.handledBy !== 'Owner');

    // New retail transaction made by cashier
    if (!prevTx && isCashierActor && currentDeviceMode === 'owner') {
      const notifId = `NOTIF-TX-${tx.id}`;
      if (!existingIds.has(notifId)) {
        synthesized.push(createRetailTxNotification(tx, tx.handledBy || 'Karyawan Kasir'));
        existingIds.add(notifId);
      }
    }

    // Newly added return / exchange records on an existing or updated transaction
    const prevRecIds = new Set((prevTx?.returnRecords || []).map((r) => r.id));
    for (const rec of tx.returnRecords || []) {
      if (!prevRecIds.has(rec.id)) {
        const isCashierReturn = Boolean(rec.processedBy && rec.processedBy !== 'Owner');
        if (isCashierReturn && currentDeviceMode === 'owner') {
          const notifId = `NOTIF-RET-${rec.id}`;
          if (!existingIds.has(notifId)) {
            synthesized.push(
              createReturnExchangeNotification(tx, rec, rec.processedBy || 'Karyawan Kasir')
            );
            existingIds.add(notifId);
          }
        }
      }
    }
  }

  for (const dig of nextDigitalTransactions) {
    const isCashierActor = Boolean(dig.handledBy && dig.handledBy !== 'Owner');
    if (!prevDigIds.has(dig.id) && isCashierActor && currentDeviceMode === 'owner') {
      const notifId = `NOTIF-DIG-${dig.id}`;
      if (!existingIds.has(notifId)) {
        synthesized.push(createDigitalTxNotification(dig, dig.handledBy || 'Karyawan Kasir'));
        existingIds.add(notifId);
      }
    }
  }

  return synthesized;
}
