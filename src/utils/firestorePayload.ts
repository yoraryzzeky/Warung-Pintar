import type {
  Product,
  Transaction,
  DigitalTransaction,
  Expense,
  ExpensePaymentSource,
  CartItem,
  ReturnExchangeRecord,
  PaymentMethodType,
} from './storeLogic';
import type { RoleSettings } from './roleMode';
import type { ThemeId } from './themeSettings';
import type { OwnerNotificationItem, OwnerNotificationType } from './ownerNotifications';
import type { CashierClosingRecord, ClosingPeriodPreset } from './cashierClosing';

// Volumetric bounds strictly synchronized with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_LIMITS = {
  ID_MAX: 128,
  CONFIG_ID_MAX: 64,
  EMAIL_MAX: 254,
  DISPLAY_NAME_MAX: 120,
  PHOTO_URL_MAX: 500,
  OWNER_NAME_MAX: 120,
  PHONE_MAX: 32,
  ADDRESS_MAX: 300,
  FOOTER_NOTE_MAX: 240,
  IMAGE_DATA_MAX: 250000,
  THEME_ID_MAX: 32,
  MODE_MAX: 16,
  OWNER_PIN_MAX: 6,
  CASHIER_NAME_MAX: 80,
  BARCODE_MAX: 64,
  PRODUCT_NAME_MAX: 160,
  CATEGORY_MAX: 64,
  DATE_MAX: 64,
  STATUS_MAX: 32,
  BUYER_MAX: 120,
  TYPE_MAX: 32,
  PAYMENT_METHOD_MAX: 16,
  HANDLED_BY_MAX: 80,
  SERVICE_TYPE_MAX: 64,
  PROVIDER_MAX: 64,
  TARGET_NUMBER_MAX: 80,
  TX_ITEMS_MAX: 100,
  RETURN_RECORDS_MAX: 20,
} as const;

const VALID_THEMES: readonly ThemeId[] = ['ocean', 'warung', 'emerald', 'royal', 'crimson'];
const VALID_MODES: readonly RoleSettings['mode'][] = ['owner', 'cashier'];
const VALID_PAYMENT_METHODS: readonly PaymentMethodType[] = ['TUNAI', 'QRIS', 'KASBON'];
const VALID_TX_STATUSES = ['LUNAS', 'MENUNGGU'] as const;
const VALID_TX_TYPES = ['RETAIL', 'DIGITAL'] as const;

export function sanitizeFirestoreId(rawId: unknown, fallbackPrefix = 'DOC'): string {
  const raw = typeof rawId === 'string' ? rawId.trim() : '';
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_LIMITS.ID_MAX);
  if (cleaned.length >= 1) return cleaned;
  return `${fallbackPrefix}-${Date.now()}`.slice(0, BLUEPRINT_LIMITS.ID_MAX);
}

const utf8Encoder = new TextEncoder();

export function generateUniqueRecordId(prefix = 'DOC'): string {
  const cleanPrefix = sanitizeFirestoreId(prefix, 'DOC').slice(0, 16);
  const tsPart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `${cleanPrefix}-${tsPart}${randPart}`.slice(0, BLUEPRINT_LIMITS.ID_MAX);
}

export function clampString(value: unknown, maxLength: number, fallback = ''): string {
  const str = typeof value === 'string' ? value : value == null ? fallback : String(value);
  if (maxLength <= 0) return '';
  if (utf8Encoder.encode(str).length <= maxLength) return str;
  let result = '';
  let byteCount = 0;
  for (const ch of str) {
    const chBytes = utf8Encoder.encode(ch).length;
    if (byteCount + chBytes > maxLength) break;
    result += ch;
    byteCount += chBytes;
  }
  return result;
}

export function shouldUpdateExistingOwnerNotification(
  existingData: Record<string, any> | null | undefined,
  nextRead: boolean
): boolean {
  if (!existingData) return false;
  return Boolean(existingData.read) !== Boolean(nextRead);
}

export function clampNonNegativeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return num;
}

export function clampNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export interface SanitizedUserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export function sanitizeUserAccountPayload(input: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): SanitizedUserAccount {
  return {
    uid: sanitizeFirestoreId(input.uid, 'USER'),
    email: clampString(input.email, BLUEPRINT_LIMITS.EMAIL_MAX, ''),
    displayName: clampString(input.displayName, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX, 'Pengguna Warung Pintar'),
    photoURL: clampString(input.photoURL, BLUEPRINT_LIMITS.PHOTO_URL_MAX, ''),
  };
}

export interface SanitizedStoreProfile {
  ownerUid: string;
  id: string;
  ownerName: string;
  phone: string;
  address: string;
  email: string;
  footerNote: string;
  avatar: string;
  qrisImage: string;
}

export function sanitizeStoreProfilePayload(
  ownerUid: string,
  profile: Record<string, any> | null | undefined,
  profileId = 'main'
): SanitizedStoreProfile {
  const p = profile && typeof profile === 'object' ? profile : {};
  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(profileId, 'main').slice(0, BLUEPRINT_LIMITS.CONFIG_ID_MAX),
    ownerName: clampString(p.ownerName, BLUEPRINT_LIMITS.OWNER_NAME_MAX, 'Warung Pintar Mandiri'),
    phone: clampString(p.phone, BLUEPRINT_LIMITS.PHONE_MAX, ''),
    address: clampString(p.address, BLUEPRINT_LIMITS.ADDRESS_MAX, ''),
    email: clampString(p.email, BLUEPRINT_LIMITS.EMAIL_MAX, ''),
    footerNote: clampString(p.footerNote, BLUEPRINT_LIMITS.FOOTER_NOTE_MAX, 'Terima kasih atas kunjungan Anda!'),
    avatar: clampString(p.avatar, BLUEPRINT_LIMITS.IMAGE_DATA_MAX, ''),
    qrisImage: clampString(p.qrisImage, BLUEPRINT_LIMITS.IMAGE_DATA_MAX, ''),
  };
}

export interface SanitizedAppSettings {
  ownerUid: string;
  id: string;
  themeId: ThemeId;
  soundEnabled: boolean;
  mode: RoleSettings['mode'];
  ownerPin: string;
  cashierName: string;
}

export function sanitizeAppSettingsPayload(
  ownerUid: string,
  input: {
    themeId: ThemeId;
    soundEnabled: boolean;
    roleSettings: RoleSettings;
  },
  settingsId = 'main'
): SanitizedAppSettings {
  const themeId = VALID_THEMES.includes(input.themeId) ? input.themeId : 'ocean';
  const mode = VALID_MODES.includes(input.roleSettings?.mode) ? input.roleSettings.mode : 'owner';
  const rawPin = typeof input.roleSettings?.ownerPin === 'string' ? input.roleSettings.ownerPin.replace(/\D/g, '') : '';
  const ownerPin = /^[0-9]{4,6}$/.test(rawPin) ? rawPin : '1234';

  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(settingsId, 'main').slice(0, BLUEPRINT_LIMITS.CONFIG_ID_MAX),
    themeId,
    soundEnabled: typeof input.soundEnabled === 'boolean' ? input.soundEnabled : true,
    mode,
    ownerPin,
    cashierName: clampString(input.roleSettings?.cashierName || 'Karyawan Kasir', BLUEPRINT_LIMITS.CASHIER_NAME_MAX, 'Karyawan Kasir'),
  };
}

export interface SanitizedProduct extends Product {
  ownerUid: string;
  barcode: string;
  image: string;
  minStock: number;
}

export function sanitizeProductPayload(ownerUid: string, product: Product): SanitizedProduct {
  const name = clampString(product.name, BLUEPRINT_LIMITS.PRODUCT_NAME_MAX, 'Produk').trim() || 'Produk';
  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(product.id, 'P'),
    barcode: clampString(product.barcode, BLUEPRINT_LIMITS.BARCODE_MAX, ''),
    name: clampString(name, BLUEPRINT_LIMITS.PRODUCT_NAME_MAX, 'Produk'),
    category: clampString(product.category || 'Lainnya', BLUEPRINT_LIMITS.CATEGORY_MAX, 'Lainnya'),
    costPrice: clampNonNegativeNumber(product.costPrice, 0),
    sellingPrice: clampNonNegativeNumber(product.sellingPrice, 0),
    stock: clampNonNegativeNumber(product.stock, 0),
    isKeteng: Boolean(product.isKeteng),
    ketengPrice: clampNonNegativeNumber(product.ketengPrice, 0),
    pcsPerPack: Math.max(1, clampNonNegativeNumber(product.pcsPerPack, 1)),
    eceranStock: clampNonNegativeNumber(product.eceranStock, 0),
    image: clampString(product.image, BLUEPRINT_LIMITS.IMAGE_DATA_MAX, ''),
    minStock: clampNonNegativeNumber(product.minStock, 5),
  };
}

function sanitizeCartItem(item: CartItem): CartItem {
  return {
    cartId: clampString(item.cartId, 128, 'item'),
    id: sanitizeFirestoreId(item.id, 'P'),
    name: clampString(item.name || 'Produk', BLUEPRINT_LIMITS.PRODUCT_NAME_MAX, 'Produk'),
    priceAtTime: clampNonNegativeNumber(item.priceAtTime, 0),
    costAtTime: clampNonNegativeNumber(item.costAtTime, 0),
    quantity: Math.max(1, clampNonNegativeNumber(item.quantity, 1)),
    category: clampString(item.category || 'Lainnya', BLUEPRINT_LIMITS.CATEGORY_MAX, 'Lainnya'),
    isPcs: Boolean(item.isPcs),
    pcsPerPack: Math.max(1, clampNonNegativeNumber(item.pcsPerPack, 1)),
    image: clampString(item.image, 1024, ''),
  };
}

function sanitizeReturnRecord(record: ReturnExchangeRecord): ReturnExchangeRecord {
  return {
    id: sanitizeFirestoreId(record.id, 'RET'),
    date: clampString(record.date, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    action: record.action,
    reason: clampString(record.reason, 240, ''),
    condition: record.condition === 'DAMAGED' ? 'DAMAGED' : 'GOOD',
    returnedItems: Array.isArray(record.returnedItems)
      ? record.returnedItems.slice(0, BLUEPRINT_LIMITS.TX_ITEMS_MAX).map(sanitizeCartItem)
      : [],
    replacementItems: Array.isArray(record.replacementItems)
      ? record.replacementItems.slice(0, BLUEPRINT_LIMITS.TX_ITEMS_MAX).map(sanitizeCartItem)
      : [],
    refundAmount: clampNonNegativeNumber(record.refundAmount, 0),
    replacementAmount: clampNonNegativeNumber(record.replacementAmount, 0),
    priceDifference: clampNumber(record.priceDifference, 0),
    processedBy: clampString(record.processedBy, BLUEPRINT_LIMITS.HANDLED_BY_MAX, 'Owner'),
  };
}

export interface SanitizedTransaction extends Transaction {
  ownerUid: string;
  shortage: number;
  type: 'RETAIL' | 'DIGITAL';
  paymentMethod: PaymentMethodType;
  handledBy: string;
  isCancelled: boolean;
  returnRecords: ReturnExchangeRecord[];
}

export function sanitizeTransactionPayload(ownerUid: string, tx: Transaction): SanitizedTransaction {
  const rawItems = Array.isArray(tx.items) && tx.items.length > 0
    ? tx.items.slice(0, BLUEPRINT_LIMITS.TX_ITEMS_MAX).map(sanitizeCartItem)
    : [{
        cartId: 'fallback-item',
        id: 'P-FALLBACK',
        name: 'Item Transaksi',
        priceAtTime: clampNonNegativeNumber(tx.totalAmount, 0),
        costAtTime: 0,
        quantity: 1,
        category: 'Lainnya',
        isPcs: false,
        pcsPerPack: 1,
        image: '',
      }];

  const status = VALID_TX_STATUSES.includes(tx.status) ? tx.status : 'LUNAS';
  const type = tx.type && VALID_TX_TYPES.includes(tx.type) ? tx.type : 'RETAIL';
  const paymentMethod = tx.paymentMethod && VALID_PAYMENT_METHODS.includes(tx.paymentMethod)
    ? tx.paymentMethod
    : 'TUNAI';

  const rawReturns = Array.isArray(tx.returnRecords)
    ? tx.returnRecords.slice(0, BLUEPRINT_LIMITS.RETURN_RECORDS_MAX).map(sanitizeReturnRecord)
    : [];

  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(tx.id, 'TX'),
    date: clampString(tx.date, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    items: rawItems,
    totalAmount: clampNonNegativeNumber(tx.totalAmount, 0),
    totalProfit: clampNumber(tx.totalProfit, 0),
    status,
    buyer: clampString(tx.buyer || 'Pelanggan Umum', BLUEPRINT_LIMITS.BUYER_MAX, 'Pelanggan Umum'),
    cashPaid: clampNonNegativeNumber(tx.cashPaid, 0),
    change: clampNonNegativeNumber(tx.change, 0),
    shortage: clampNonNegativeNumber(tx.shortage, 0),
    type,
    paymentMethod,
    handledBy: clampString(tx.handledBy || 'Owner', BLUEPRINT_LIMITS.HANDLED_BY_MAX, 'Owner'),
    isCancelled: Boolean(tx.isCancelled),
    returnRecords: rawReturns,
  };
}

export interface SanitizedDigitalTransaction extends DigitalTransaction {
  ownerUid: string;
  type: string;
  paymentMethod: PaymentMethodType;
  handledBy: string;
}

export function sanitizeDigitalTransactionPayload(
  ownerUid: string,
  tx: DigitalTransaction
): SanitizedDigitalTransaction {
  const paymentMethod = tx.paymentMethod && VALID_PAYMENT_METHODS.includes(tx.paymentMethod)
    ? tx.paymentMethod
    : 'TUNAI';

  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(tx.id, 'DIG'),
    date: clampString(tx.date, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    serviceType: clampString(tx.serviceType || 'Pulsa', BLUEPRINT_LIMITS.SERVICE_TYPE_MAX, 'Pulsa'),
    provider: clampString(tx.provider || '-', BLUEPRINT_LIMITS.PROVIDER_MAX, '-'),
    targetNumber: clampString(tx.targetNumber || '-', BLUEPRINT_LIMITS.TARGET_NUMBER_MAX, '-'),
    baseAmount: clampNonNegativeNumber(tx.baseAmount, 0),
    fee: clampNonNegativeNumber(tx.fee, 0),
    sellAmount: clampNonNegativeNumber(tx.sellAmount, 0),
    customer: clampString(tx.customer || 'Pelanggan Umum', BLUEPRINT_LIMITS.BUYER_MAX, 'Pelanggan Umum'),
    status: clampString(tx.status || 'BERHASIL', BLUEPRINT_LIMITS.STATUS_MAX, 'BERHASIL'),
    type: clampString(tx.type || 'DIGITAL', BLUEPRINT_LIMITS.TYPE_MAX, 'DIGITAL'),
    paymentMethod,
    handledBy: clampString(tx.handledBy || 'Owner', BLUEPRINT_LIMITS.HANDLED_BY_MAX, 'Owner'),
  };
}

export interface SanitizedExpense extends Expense {
  ownerUid: string;
}

export function sanitizeExpensePayload(
  ownerUid: string,
  exp: Expense
): SanitizedExpense {
  const source: ExpensePaymentSource = exp.source === 'NON_TUNAI' ? 'NON_TUNAI' : 'LACI_KAS';
  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(exp.id, 'EXP'),
    date: clampString(exp.date, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    category: clampString(exp.category || 'Lain-lain', 80, 'Lain-lain'),
    description: clampString(exp.description || '', 240, ''),
    amount: clampNonNegativeNumber(exp.amount, 0),
    source,
    handledBy: clampString(exp.handledBy || 'Owner', BLUEPRINT_LIMITS.HANDLED_BY_MAX, 'Owner'),
  };
}

const VALID_NOTIF_TYPES: readonly OwnerNotificationType[] = [
  'TRANSACTION_NEW',
  'TRANSACTION_RETURN',
  'DIGITAL_NEW',
  'CLOSING_CONFIRM',
];

export interface SanitizedOwnerNotification {
  ownerUid: string;
  id: string;
  type: OwnerNotificationType;
  title: string;
  message: string;
  amount: number;
  timestamp: string;
  read: boolean;
  handledBy: string;
  txId: string;
  detail: string;
}

export function sanitizeOwnerNotificationPayload(
  ownerUid: string,
  item: OwnerNotificationItem
): SanitizedOwnerNotification {
  const type = VALID_NOTIF_TYPES.includes(item.type) ? item.type : 'TRANSACTION_NEW';
  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(item.id, 'NOTIF'),
    type,
    title: clampString(item.title || 'Aktivitas Kasir', BLUEPRINT_LIMITS.PRODUCT_NAME_MAX, 'Aktivitas Kasir'),
    message: clampString(item.message || '', 400, ''),
    amount: clampNonNegativeNumber(item.amount, 0),
    timestamp: clampString(item.timestamp, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    read: Boolean(item.read),
    handledBy: clampString(item.handledBy || 'Karyawan Kasir', BLUEPRINT_LIMITS.HANDLED_BY_MAX, 'Karyawan Kasir'),
    txId: clampString(item.txId || '', BLUEPRINT_LIMITS.ID_MAX, ''),
    detail: clampString(item.detail || '', 240, ''),
  };
}

const VALID_CLOSING_PRESETS: readonly ClosingPeriodPreset[] = ['harian', 'mingguan', 'bulanan', 'custom'];

export interface SanitizedClosingRecord {
  ownerUid: string;
  id: string;
  confirmedAt: string;
  periodPreset: ClosingPeriodPreset;
  periodLabel: string;
  startDate: string;
  endDate: string;
  cashierName: string;
  totalSettledOmset: number;
  retailSettledOmset: number;
  digitalOmset: number;
  totalExpenses: number;
  expectedDrawerCash: number;
  physicalCashCount: number;
  cashVariance: number;
  qrisTotal: number;
  kasbonTotal: number;
  totalSettledCount: number;
  note: string;
  sentToWhatsApp: boolean;
  ownerPhone: string;
}

export function sanitizeClosingRecordPayload(
  ownerUid: string,
  rec: CashierClosingRecord
): SanitizedClosingRecord {
  const periodPreset = VALID_CLOSING_PRESETS.includes(rec.periodPreset) ? rec.periodPreset : 'harian';
  const hasPhysical =
    typeof rec.physicalCashCount === 'number' &&
    Number.isFinite(rec.physicalCashCount) &&
    rec.physicalCashCount >= 0;

  return {
    ownerUid: sanitizeFirestoreId(ownerUid, 'USER'),
    id: sanitizeFirestoreId(rec.id, 'CLOSE'),
    confirmedAt: clampString(rec.confirmedAt, BLUEPRINT_LIMITS.DATE_MAX, new Date().toISOString()),
    periodPreset,
    periodLabel: clampString(rec.periodLabel || 'Harian', 64, 'Harian'),
    startDate: clampString(rec.startDate || '', 32, ''),
    endDate: clampString(rec.endDate || '', 32, ''),
    cashierName: clampString(rec.cashierName || 'Karyawan Kasir', BLUEPRINT_LIMITS.CASHIER_NAME_MAX, 'Karyawan Kasir'),
    totalSettledOmset: clampNumber(rec.totalSettledOmset, 0),
    retailSettledOmset: clampNonNegativeNumber(rec.retailSettledOmset, 0),
    digitalOmset: clampNonNegativeNumber(rec.digitalOmset, 0),
    totalExpenses: clampNonNegativeNumber(rec.totalExpenses, 0),
    expectedDrawerCash: clampNumber(rec.expectedDrawerCash, 0),
    physicalCashCount: hasPhysical ? Number(rec.physicalCashCount) : -1,
    cashVariance: hasPhysical ? clampNumber(rec.cashVariance, 0) : 0,
    qrisTotal: clampNonNegativeNumber(rec.qrisTotal, 0),
    kasbonTotal: clampNonNegativeNumber(rec.kasbonTotal, 0),
    totalSettledCount: clampNonNegativeNumber(rec.totalSettledCount, 0),
    note: clampString(rec.note || '', 300, ''),
    sentToWhatsApp: Boolean(rec.sentToWhatsApp),
    ownerPhone: clampString(rec.ownerPhone || '', BLUEPRINT_LIMITS.PHONE_MAX, ''),
  };
}

export function hydrateClosingRecordFromCloud(data: Record<string, any>): CashierClosingRecord {
  const rawPhysical = Number(data.physicalCashCount);
  const hasPhysical = Number.isFinite(rawPhysical) && rawPhysical >= 0;
  return {
    id: String(data.id || ''),
    confirmedAt: String(data.confirmedAt || ''),
    periodPreset: (VALID_CLOSING_PRESETS.includes(data.periodPreset) ? data.periodPreset : 'harian'),
    periodLabel: String(data.periodLabel || 'Harian'),
    startDate: String(data.startDate || ''),
    endDate: String(data.endDate || ''),
    cashierName: String(data.cashierName || 'Karyawan Kasir'),
    totalSettledOmset: Number(data.totalSettledOmset) || 0,
    retailSettledOmset: Number(data.retailSettledOmset) || 0,
    digitalOmset: Number(data.digitalOmset) || 0,
    totalExpenses: Number(data.totalExpenses) || 0,
    expectedDrawerCash: Number(data.expectedDrawerCash) || 0,
    physicalCashCount: hasPhysical ? rawPhysical : null,
    cashVariance: hasPhysical ? Number(data.cashVariance) || 0 : null,
    qrisTotal: Number(data.qrisTotal) || 0,
    kasbonTotal: Number(data.kasbonTotal) || 0,
    totalSettledCount: Number(data.totalSettledCount) || 0,
    note: String(data.note || ''),
    sentToWhatsApp: Boolean(data.sentToWhatsApp),
    ownerPhone: String(data.ownerPhone || ''),
  };
}

export interface CollectionDiffResult<T extends { id: string }> {
  created: T[];
  updated: T[];
  deletedIds: string[];
}

export function computeCollectionDiff<T extends { id: string }>(
  prevItems: readonly T[],
  nextItems: readonly T[]
): CollectionDiffResult<T> {
  const prevMap = new Map<string, string>();
  for (const item of prevItems) {
    prevMap.set(item.id, JSON.stringify(item));
  }

  const nextMap = new Map<string, T>();
  const created: T[] = [];
  const updated: T[] = [];

  for (const item of nextItems) {
    nextMap.set(item.id, item);
    const prevSerialized = prevMap.get(item.id);
    if (prevSerialized === undefined) {
      created.push(item);
    } else if (prevSerialized !== JSON.stringify(item)) {
      updated.push(item);
    }
  }

  const deletedIds: string[] = [];
  for (const item of prevItems) {
    if (!nextMap.has(item.id)) {
      deletedIds.push(item.id);
    }
  }

  return { created, updated, deletedIds };
}
