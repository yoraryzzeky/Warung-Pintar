/**
 * ESC/POS Thermal Receipt Formatter & Web Bluetooth BLE Printer Service
 * Supports 58mm (32-column) thermal printers for both Retail and PPOB Digital receipts.
 */

import {
  formatDate,
  formatRp,
  getReceiptPaymentMethodLabel,
  isKasbonTransaction,
  type DigitalTransaction,
  type Transaction,
} from './storeLogic';

export const THERMAL_LINE_WIDTH = 32;
export const BLE_DEFAULT_CHUNK_SIZE = 100;

export const PRINTER_BLE_OPTIONAL_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

export interface StorePrintProfile {
  ownerName?: string;
  address?: string;
  phone?: string;
  footerNote?: string;
}

/**
 * Strips non-ASCII characters that garble 58mm ESC/POS printers (e.g. non-breaking spaces from Intl).
 */
export function sanitizeAsciiText(text: string): string {
  return String(text || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}

/**
 * Formats a left-aligned label and right-aligned value onto a 32-column thermal line.
 */
export function formatTwoColumnLine(
  left: string,
  right: string,
  width: number = THERMAL_LINE_WIDTH
): string {
  const cleanLeft = sanitizeAsciiText(left);
  const cleanRight = sanitizeAsciiText(right);
  const availableLeft = Math.max(4, width - cleanRight.length - 1);
  const truncatedLeft =
    cleanLeft.length > availableLeft ? cleanLeft.slice(0, availableLeft) : cleanLeft;
  const spaces = Math.max(1, width - truncatedLeft.length - cleanRight.length);
  return `${truncatedLeft}${' '.repeat(spaces)}${cleanRight}`;
}

export function formatRetailEscPosLines(
  tx: Transaction,
  profile: StorePrintProfile = {}
): string[] {
  const separator = '-'.repeat(THERMAL_LINE_WIDTH);
  const lines: string[] = [];

  lines.push(sanitizeAsciiText((profile.ownerName || 'WARUNG PINTAR').toUpperCase()));
  if (profile.address) lines.push(sanitizeAsciiText(profile.address));
  if (profile.phone) lines.push(`Telp: ${sanitizeAsciiText(profile.phone)}`);
  lines.push(separator);
  lines.push(formatTwoColumnLine('No:', tx.id));
  lines.push(formatTwoColumnLine('Tgl:', formatDate(tx.date)));
  lines.push(formatTwoColumnLine('Metode Pembayaran:', getReceiptPaymentMethodLabel(tx)));
  if (isKasbonTransaction(tx)) {
    lines.push(formatTwoColumnLine('Nama Pelanggan:', tx.buyer || 'Pelanggan Umum'));
  }
  lines.push(separator);

  (tx.items || []).forEach((item) => {
    lines.push(sanitizeAsciiText(item.name));
    const unitQty = `${item.quantity} x ${formatRp(item.priceAtTime)}`;
    const lineTotal = formatRp((Number(item.priceAtTime) || 0) * (Number(item.quantity) || 0));
    lines.push(formatTwoColumnLine(`  ${unitQty}`, lineTotal));
  });

  lines.push(separator);
  lines.push(formatTwoColumnLine('TOTAL', formatRp(tx.totalAmount)));
  if (tx.status === 'LUNAS') {
    lines.push(formatTwoColumnLine('Bayar', formatRp(tx.cashPaid || tx.totalAmount)));
    lines.push(formatTwoColumnLine('Kembali', formatRp(tx.change || 0)));
  } else {
    const shortage = tx.shortage !== undefined ? tx.shortage : tx.totalAmount;
    lines.push(formatTwoColumnLine('Kurang (Kasbon)', formatRp(shortage)));
  }
  lines.push(separator);
  lines.push(sanitizeAsciiText(profile.footerNote || 'Terima kasih telah berbelanja!'));

  return lines;
}

export function formatDigitalEscPosLines(
  tx: DigitalTransaction,
  profile: StorePrintProfile = {}
): string[] {
  const separator = '-'.repeat(THERMAL_LINE_WIDTH);
  const lines: string[] = [];

  lines.push(sanitizeAsciiText((profile.ownerName || 'WARUNG PINTAR').toUpperCase()));
  if (profile.address) lines.push(sanitizeAsciiText(profile.address));
  if (profile.phone) lines.push(`Telp: ${sanitizeAsciiText(profile.phone)}`);
  lines.push('STRUK TRANSAKSI DIGITAL');
  lines.push(separator);
  lines.push(formatTwoColumnLine('No Ref:', tx.id));
  lines.push(formatTwoColumnLine('Tgl:', formatDate(tx.date)));
  lines.push(formatTwoColumnLine('Layanan:', tx.serviceType));
  lines.push(formatTwoColumnLine('Provider:', tx.provider));
  lines.push(formatTwoColumnLine('Tujuan:', tx.targetNumber));
  lines.push(formatTwoColumnLine('Pelanggan:', tx.customer || 'Pelanggan Umum'));
  lines.push(separator);
  lines.push(formatTwoColumnLine('Nominal', formatRp(tx.baseAmount)));
  lines.push(formatTwoColumnLine('Biaya Admin', formatRp(tx.fee)));
  lines.push(separator);
  lines.push(formatTwoColumnLine('TOTAL BAYAR', formatRp(tx.sellAmount)));
  lines.push(formatTwoColumnLine('Metode Pembayaran:', getReceiptPaymentMethodLabel(tx)));
  if (isKasbonTransaction(tx)) {
    lines.push(formatTwoColumnLine('Nama Pelanggan:', tx.customer || 'Pelanggan Umum'));
  }
  lines.push(separator);
  lines.push(sanitizeAsciiText(profile.footerNote || 'Terima kasih atas kunjungan Anda!'));

  return lines;
}

/**
 * Builds native ESC/POS Code 128 (Format B) thermal barcode byte sequence (GS k 73).
 */
export function buildEscPosCode128Command(value: string): string {
  const clean = sanitizeAsciiText(value).slice(0, 48) || 'WARUNG';
  const payload = `{B${clean}`;
  const lengthByte = String.fromCharCode(payload.length);
  return (
    '\x1D\x48\x02' + // HRI below barcode
    '\x1D\x68\x32' + // Barcode height = 50 dots
    '\x1D\x77\x02' + // Module width = 2
    '\x1D\x6B\x49' + // GS k 73 (Code 128)
    lengthByte +
    payload +
    '\n'
  );
}

function encodeEscPosDocument(
  headerLines: string[],
  bodyLines: string[],
  footerLines: string[],
  barcodeValue?: string
): Uint8Array {
  const ESC_INIT = '\x1B\x40';
  const ALIGN_CENTER = '\x1B\x61\x01';
  const ALIGN_LEFT = '\x1B\x61\x00';
  const FEED_CUT = '\n\n\x1B\x64\x03';
  const barcodeSection = barcodeValue ? buildEscPosCode128Command(barcodeValue) : '';

  const raw = [
    ESC_INIT,
    ALIGN_CENTER,
    headerLines.join('\n') + '\n',
    ALIGN_LEFT,
    bodyLines.join('\n') + '\n',
    ALIGN_CENTER,
    barcodeSection,
    footerLines.join('\n'),
    FEED_CUT,
  ].join('');

  return new TextEncoder().encode(raw);
}

export function buildRetailEscPosPayload(
  tx: Transaction,
  profile: StorePrintProfile = {}
): Uint8Array {
  const lines = formatRetailEscPosLines(tx, profile);
  const firstSep = lines.findIndex((l) => l.startsWith('---'));
  const headerLines = firstSep > 0 ? lines.slice(0, firstSep) : lines.slice(0, 1);
  const footerLines = lines.slice(-1);
  const bodyLines = lines.slice(headerLines.length, -1);
  return encodeEscPosDocument(headerLines, bodyLines, footerLines, tx.id);
}

export function buildDigitalEscPosPayload(
  tx: DigitalTransaction,
  profile: StorePrintProfile = {}
): Uint8Array {
  const lines = formatDigitalEscPosLines(tx, profile);
  const firstSep = lines.findIndex((l) => l.startsWith('---'));
  const headerLines = firstSep > 0 ? lines.slice(0, firstSep) : lines.slice(0, 1);
  const footerLines = lines.slice(-1);
  const bodyLines = lines.slice(headerLines.length, -1);
  return encodeEscPosDocument(headerLines, bodyLines, footerLines, tx.id);
}

/**
 * Splits encoded ESC/POS bytes into BLE-safe MTU chunks.
 */
export function chunkBytesForBle(
  data: Uint8Array,
  chunkSize: number = BLE_DEFAULT_CHUNK_SIZE
): Uint8Array[] {
  const safeSize = Math.max(20, Math.floor(chunkSize));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += safeSize) {
    chunks.push(data.slice(i, i + safeSize));
  }
  return chunks;
}

export async function findWritableCharacteristic(gattServer: any): Promise<any | null> {
  if (!gattServer) return null;
  const services = await gattServer.getPrimaryServices();
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties?.writeWithoutResponse || c.properties?.write) {
          return c;
        }
      }
    } catch {
      // Skip unreadable service
    }
  }
  return null;
}

export interface ConnectedBluetoothPrinter {
  device: any;
  characteristic: any;
  name: string;
}

export async function connectThermalPrinter(
  onDisconnect?: () => void
): Promise<ConnectedBluetoothPrinter> {
  const nav = navigator as any;
  if (!nav?.bluetooth?.requestDevice) {
    throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome/Edge.');
  }

  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_BLE_OPTIONAL_SERVICES,
  });

  if (onDisconnect && typeof device.addEventListener === 'function') {
    device.addEventListener('gattserverdisconnected', onDisconnect, { once: true });
  }

  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);
  if (!characteristic) {
    throw new Error('Karakteristik tulis ESC/POS tidak ditemukan pada printer ini.');
  }

  return {
    device,
    characteristic,
    name: device.name || 'Printer Thermal',
  };
}

export async function sendEscPosToCharacteristic(
  characteristic: any,
  payload: Uint8Array,
  chunkSize: number = BLE_DEFAULT_CHUNK_SIZE
): Promise<void> {
  const chunks = chunkBytesForBle(payload, chunkSize);
  for (const chunk of chunks) {
    if (characteristic.properties?.writeWithoutResponse && typeof characteristic.writeValueWithoutResponse === 'function') {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await new Promise((r) => setTimeout(r, 20));
  }
}
