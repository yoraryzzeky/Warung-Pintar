/**
 * Store Logic Utility Functions for Warung Pintar Pro
 * Decoupled pure logic for financial calculations, inventory conversions, and aggregations.
 */

export interface CartItem {
  cartId: string;
  id: string;
  name: string;
  priceAtTime: number;
  costAtTime: number;
  quantity: number;
  category: string;
  isPcs?: boolean;
  pcsPerPack?: number;
  image?: string;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  isKeteng: boolean;
  ketengPrice: number;
  pcsPerPack: number;
  eceranStock: number;
  image?: string;
  minStock?: number;
}

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export interface LowStockRecommendation {
  product: Product;
  threshold: number;
  suggestedOrderQty: number;
  estimatedCost: number;
}

export interface DailyFinancialPoint {
  date: string;
  label: string;
  omset: number;
  laba: number;
  retail: number;
  digital: number;
  retailProfit: number;
  digitalProfit: number;
  marginPercent: number;
}

export type PaymentMethodType = 'TUNAI' | 'QRIS' | 'KASBON';

export type TransactionReturnAction = 'CANCEL' | 'PARTIAL_RETURN' | 'EXCHANGE';
export type ReturnStockCondition = 'GOOD' | 'DAMAGED';

export interface ReturnExchangeRecord {
  id: string;
  date: string;
  action: TransactionReturnAction;
  reason: string;
  condition: ReturnStockCondition;
  returnedItems: CartItem[];
  replacementItems?: CartItem[];
  refundAmount: number;
  replacementAmount: number;
  priceDifference: number;
  processedBy: string;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  totalProfit: number;
  status: 'LUNAS' | 'MENUNGGU';
  buyer: string;
  cashPaid: number;
  change: number;
  shortage?: number;
  type?: 'RETAIL' | 'DIGITAL';
  paymentMethod?: PaymentMethodType;
  handledBy?: string;
  isCancelled?: boolean;
  returnRecords?: ReturnExchangeRecord[];
}

export interface DigitalTransaction {
  id: string;
  date: string;
  serviceType: string;
  provider: string;
  targetNumber: string;
  baseAmount: number;
  fee: number;
  sellAmount: number;
  customer: string;
  status: string;
  type?: string;
  paymentMethod?: PaymentMethodType;
  handledBy?: string;
}

export const CATEGORIES = [
  'Sembako',
  'Makanan',
  'Minuman',
  'Rokok',
  'Elektronik',
  'Kesehatan',
  'ATK',
  'Lainnya',
] as const;

export const formatRp = (angka: number | string | undefined | null): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(angka) || 0);
};

export const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  } catch (e) {
    return String(dateString);
  }
};

export const calculateSubtotal = (cart: CartItem[]): number => {
  return cart.reduce((acc, item) => acc + (Number(item.priceAtTime) || 0) * (Number(item.quantity) || 0), 0);
};

export const calculateProfit = (cart: CartItem[]): number => {
  return cart.reduce(
    (acc, item) =>
      acc +
      ((Number(item.priceAtTime) || 0) - (Number(item.costAtTime) || 0)) * (Number(item.quantity) || 0),
    0
  );
};

export const calculateChange = (cashPaid: number, total: number): number => {
  const cash = Number(cashPaid) || 0;
  return cash >= total ? cash - total : 0;
};

/**
 * Deducts inventory including pack breakdown into eceran (pcs) units.
 */
export const deductInventory = (products: Product[], cart: CartItem[]): Product[] => {
  return products.map((p) => {
    const cartItemsForProduct = cart.filter((ci) => ci.id === p.id);
    if (cartItemsForProduct.length === 0) return p;

    let newStock = Number(p.stock) || 0;
    let newEceranStock = Number(p.eceranStock) || 0;
    const packUnits = Math.max(1, Number(p.pcsPerPack) || 1);

    cartItemsForProduct.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      if (item.isPcs) {
        let totalNeeded = qty;
        if (newEceranStock >= totalNeeded) {
          newEceranStock -= totalNeeded;
        } else {
          while (newEceranStock < totalNeeded) {
            if (newStock >= 1) {
              newStock -= 1;
              newEceranStock += packUnits;
            } else {
              break;
            }
          }
          newEceranStock = Math.max(0, newEceranStock - totalNeeded);
        }
      } else {
        newStock = Math.max(0, newStock - qty);
      }
    });

    return {
      ...p,
      stock: newStock,
      eceranStock: newEceranStock,
    };
  });
};

/**
 * Aggregates daily recap combining Retail and Digital transactions.
 */
export const aggregateDailyRecap = (
  transactions: Transaction[],
  digitalTransactions: DigitalTransaction[],
  startDate?: string,
  endDate?: string
) => {
  const map: Record<
    string,
    {
      date: string;
      retailOmset: number;
      retailProfit: number;
      digitalOmset: number;
      digitalProfit: number;
      count: number;
    }
  > = {};

  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  transactions
    .filter((t) => t.status === 'LUNAS' && !t.isCancelled)
    .forEach((tx) => {
      const d = new Date(tx.date);
      if (d >= start && d <= end) {
        const dateKey = tx.date.split('T')[0];
        if (!map[dateKey]) {
          map[dateKey] = {
            date: dateKey,
            retailOmset: 0,
            retailProfit: 0,
            digitalOmset: 0,
            digitalProfit: 0,
            count: 0,
          };
        }
        map[dateKey].retailOmset += Number(tx.totalAmount) || 0;
        map[dateKey].retailProfit += Number(tx.totalProfit) || 0;
        map[dateKey].count += 1;
      }
    });

  digitalTransactions.forEach((tx) => {
    const d = new Date(tx.date);
    if (d >= start && d <= end) {
      const dateKey = tx.date.split('T')[0];
      if (!map[dateKey]) {
        map[dateKey] = {
          date: dateKey,
          retailOmset: 0,
          retailProfit: 0,
          digitalOmset: 0,
          digitalProfit: 0,
          count: 0,
        };
      }
      map[dateKey].digitalOmset += Number(tx.sellAmount) || 0;
      map[dateKey].digitalProfit += Number(tx.fee) || 0;
      map[dateKey].count += 1;
    }
  });

  return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Returns products whose stock is at or below threshold, annotated with supplier & suggested reorder qty.
 */
export const getLowStockRecommendations = (
  products: Product[],
  defaultThreshold: number = DEFAULT_LOW_STOCK_THRESHOLD
): LowStockRecommendation[] => {
  return products
    .filter((p) => {
      const threshold = p.minStock !== undefined && p.minStock >= 0 ? Number(p.minStock) : defaultThreshold;
      return Number(p.stock) <= threshold;
    })
    .map((p) => {
      const threshold = p.minStock !== undefined && p.minStock >= 0 ? Number(p.minStock) : defaultThreshold;
      const targetStock = Math.max(threshold * 2, 10);
      const suggestedOrderQty = Math.max(1, targetStock - Number(p.stock));
      return {
        product: p,
        threshold,
        suggestedOrderQty,
        estimatedCost: suggestedOrderQty * (Number(p.costPrice) || 0),
      };
    })
    .sort((a, b) => Number(a.product.stock) - Number(b.product.stock));
};

/**
 * Builds a 30-day chronological series comparing Total Omset vs Total Laba Bersih.
 */
export const buildLast30DaysFinancialSeries = (
  transactions: Transaction[],
  digitalTransactions: DigitalTransaction[],
  referenceDate: Date = new Date()
): DailyFinancialPoint[] => {
  const series: DailyFinancialPoint[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(referenceDate.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const label = `${d.getDate()} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;

    const retailTxs = transactions.filter((t) => t.status === 'LUNAS' && !t.isCancelled && t.date && t.date.startsWith(dateStr));
    const retailOmset = retailTxs.reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);
    const retailProfit = retailTxs.reduce((sum, t) => sum + (Number(t.totalProfit) || 0), 0);

    const digTxs = digitalTransactions.filter((t) => t.date && t.date.startsWith(dateStr));
    const digitalOmset = digTxs.reduce((sum, t) => sum + (Number(t.sellAmount) || 0), 0);
    const digitalProfit = digTxs.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

    const omset = retailOmset + digitalOmset;
    const laba = retailProfit + digitalProfit;
    const marginPercent = omset > 0 ? Number(((laba / omset) * 100).toFixed(1)) : 0;

    series.push({
      date: dateStr,
      label,
      omset,
      laba,
      retail: retailOmset,
      digital: digitalOmset,
      retailProfit,
      digitalProfit,
      marginPercent,
    });
  }

  return series;
};

/**
 * Matches a scanned or typed barcode against products (case-insensitive, trimmed).
 */
export const findProductByBarcode = (
  products: Product[],
  barcode: string
): Product | undefined => {
  const normalized = String(barcode || '').trim().toLowerCase();
  if (!normalized) return undefined;
  return products.find((p) => (p.barcode || '').trim().toLowerCase() === normalized);
};

/**
 * Determines whether a transaction should be treated as Kasbon on receipts.
 */
export const isKasbonTransaction = (
  tx: Pick<Transaction, 'status' | 'shortage' | 'paymentMethod'> | Pick<DigitalTransaction, 'status' | 'paymentMethod'>
): boolean => {
  const shortage = 'shortage' in tx ? Number(tx.shortage) || 0 : 0;
  return tx.paymentMethod === 'KASBON' || tx.status === 'MENUNGGU' || shortage > 0;
};

/**
 * Resolves the human-readable Indonesian payment method label for receipts.
 */
export const getReceiptPaymentMethodLabel = (
  tx: Pick<Transaction, 'status' | 'shortage' | 'paymentMethod'> | Pick<DigitalTransaction, 'status' | 'paymentMethod'>
): 'Tunai' | 'Non Tunai' | 'Kasbon' => {
  if (isKasbonTransaction(tx)) {
    return 'Kasbon';
  }
  if (tx.paymentMethod === 'QRIS') {
    return 'Non Tunai';
  }
  return 'Tunai';
};

/**
 * Filters products by search query (matches name, category, or barcode) and optional category,
 * then returns a single flat array sorted alphabetically A-Z by product name.
 */
export const filterAndSortKasirProducts = (
  products: Product[],
  query: string,
  activeCategory: string = 'Semua'
): Product[] => {
  const q = String(query || '').trim().toLowerCase();
  const catFilter = String(activeCategory || 'Semua').trim();

  return products
    .filter((p) => {
      const productCat = (p.category || 'Lainnya').trim() || 'Lainnya';
      const matchesCat = catFilter === 'Semua' || productCat === catFilter;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        productCat.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    })
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
      if (byName !== 0) return byName;
      return a.name.localeCompare(b.name, 'id');
    });
};

/**
 * Restores returned items back to sellable inventory if condition is GOOD.
 * Damaged/expired items do not re-enter sellable stock.
 */
export const restoreInventory = (
  products: Product[],
  returnedItems: CartItem[],
  condition: ReturnStockCondition = 'GOOD'
): Product[] => {
  if (condition === 'DAMAGED' || returnedItems.length === 0) {
    return products;
  }

  return products.map((p) => {
    const itemsForProduct = returnedItems.filter((ri) => ri.id === p.id);
    if (itemsForProduct.length === 0) return p;

    let newStock = Number(p.stock) || 0;
    let newEceranStock = Number(p.eceranStock) || 0;

    itemsForProduct.forEach((item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      if (item.isPcs) {
        newEceranStock += qty;
      } else {
        newStock += qty;
      }
    });

    return {
      ...p,
      stock: newStock,
      eceranStock: newEceranStock,
    };
  });
};

/**
 * Matches a receipt barcode or transaction ID query against stored transactions.
 */
export const findTransactionByReceiptQuery = (
  transactions: Transaction[],
  query: string
): Transaction | undefined => {
  const clean = String(query || '').trim().toLowerCase();
  if (!clean) return undefined;
  return transactions.find((t) => (t.id || '').trim().toLowerCase() === clean);
};

/**
 * Applies full cancellation, partial return, or item exchange to a transaction and inventory.
 */
export const applyReturnOrExchange = ({
  products,
  transaction,
  action,
  returnedItems,
  replacementItems = [],
  condition,
  reason,
  processedBy,
}: {
  products: Product[];
  transaction: Transaction;
  action: TransactionReturnAction;
  returnedItems: CartItem[];
  replacementItems?: CartItem[];
  condition: ReturnStockCondition;
  reason: string;
  processedBy: string;
}): {
  updatedProducts: Product[];
  updatedTransaction: Transaction;
  record: ReturnExchangeRecord;
} => {
  const normalizedReturned = returnedItems.filter((item) => Number(item.quantity) > 0);
  const normalizedReplacements =
    action === 'EXCHANGE'
      ? replacementItems.filter((item) => Number(item.quantity) > 0)
      : [];

  // 1. Update stock: restore returned items if GOOD, deduct replacement items if EXCHANGE
  let updatedProducts = restoreInventory(products, normalizedReturned, condition);
  if (action === 'EXCHANGE' && normalizedReplacements.length > 0) {
    updatedProducts = deductInventory(updatedProducts, normalizedReplacements);
  }

  // 2. Compute financial impact
  const refundAmount = calculateSubtotal(normalizedReturned);
  const replacementAmount = calculateSubtotal(normalizedReplacements);
  const priceDifference = replacementAmount - refundAmount;

  // 3. Reconcile remaining items on receipt
  const returnQtyByCartId = new Map<string, number>();
  normalizedReturned.forEach((item) => {
    returnQtyByCartId.set(
      item.cartId,
      (returnQtyByCartId.get(item.cartId) || 0) + Number(item.quantity)
    );
  });

  const remainingOldItems: CartItem[] = [];
  (transaction.items || []).forEach((item) => {
    const returnedQty = returnQtyByCartId.get(item.cartId) || 0;
    const consumeQty = Math.min(Number(item.quantity) || 0, returnedQty);
    if (returnedQty > 0) {
      returnQtyByCartId.set(item.cartId, Math.max(0, returnedQty - consumeQty));
    }
    const leftQty = (Number(item.quantity) || 0) - consumeQty;
    if (leftQty > 0) {
      remainingOldItems.push({ ...item, quantity: leftQty });
    }
  });

  const mergedItems: CartItem[] = [...remainingOldItems];
  normalizedReplacements.forEach((rep) => {
    const existing = mergedItems.find((m) => m.cartId === rep.cartId);
    if (existing) {
      existing.quantity += Number(rep.quantity) || 0;
    } else {
      mergedItems.push({ ...rep });
    }
  });

  const isFullyCancelled =
    action === 'CANCEL' || (mergedItems.length === 0 && normalizedReplacements.length === 0);

  const nextTotalAmount = isFullyCancelled ? 0 : calculateSubtotal(mergedItems);
  const nextTotalProfit = isFullyCancelled ? 0 : calculateProfit(mergedItems);

  const prevShortage =
    transaction.shortage !== undefined
      ? Number(transaction.shortage) || 0
      : transaction.status === 'MENUNGGU'
      ? Number(transaction.totalAmount) || 0
      : 0;

  let nextShortage = prevShortage;
  let nextStatus = transaction.status;

  if (isFullyCancelled) {
    nextShortage = 0;
    nextStatus = 'LUNAS';
  } else if (prevShortage > 0 || transaction.status === 'MENUNGGU') {
    nextShortage = Math.max(0, Math.min(nextTotalAmount, prevShortage + priceDifference));
    nextStatus = nextShortage > 0 ? 'MENUNGGU' : 'LUNAS';
  }

  const record: ReturnExchangeRecord = {
    id: `RET-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    action: isFullyCancelled && action !== 'EXCHANGE' ? 'CANCEL' : action,
    reason: reason.trim() || (action === 'EXCHANGE' ? 'Tukar Barang' : 'Pembatalan / Retur'),
    condition,
    returnedItems: normalizedReturned,
    replacementItems: normalizedReplacements.length > 0 ? normalizedReplacements : undefined,
    refundAmount,
    replacementAmount,
    priceDifference,
    processedBy: processedBy || 'Owner',
  };

  const updatedTransaction: Transaction = {
    ...transaction,
    items: isFullyCancelled ? transaction.items : mergedItems,
    totalAmount: nextTotalAmount,
    totalProfit: nextTotalProfit,
    status: nextStatus,
    shortage: nextShortage,
    cashPaid: isFullyCancelled
      ? 0
      : nextStatus === 'LUNAS'
      ? nextTotalAmount
      : Math.max(0, nextTotalAmount - nextShortage),
    change: isFullyCancelled ? 0 : Math.max(0, (Number(transaction.cashPaid) || 0) - nextTotalAmount),
    isCancelled: isFullyCancelled,
    returnRecords: [...(transaction.returnRecords || []), record],
  };

  return {
    updatedProducts,
    updatedTransaction,
    record,
  };
};



