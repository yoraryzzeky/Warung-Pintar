import { formatRp, type DigitalTransaction } from './storeLogic';

export const PPOB_TOAST_DURATION_MS = 5500;

export interface PpobToastSummary {
  id: string;
  title: string;
  serviceLine: string;
  targetNumber: string;
  totalFormatted: string;
  adminFeeFormatted: string;
  customerNote: string | null;
}

export const buildPpobToastSummary = (tx: DigitalTransaction): PpobToastSummary => {
  const serviceType = tx.serviceType.trim() || 'PPOB';
  const provider = tx.provider.trim();
  const serviceLine = provider ? `${serviceType} · ${provider}` : serviceType;
  const trimmedCustomer = tx.customer?.trim() || '';
  const customerNote =
    trimmedCustomer && trimmedCustomer.toLowerCase() !== 'pelanggan umum'
      ? trimmedCustomer
      : null;

  return {
    id: tx.id,
    title: 'Transaksi PPOB Berhasil',
    serviceLine,
    targetNumber: tx.targetNumber.trim() || '-',
    totalFormatted: formatRp(tx.sellAmount),
    adminFeeFormatted: formatRp(tx.fee),
    customerNote,
  };
};
