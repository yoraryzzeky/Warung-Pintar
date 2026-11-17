/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, ShoppingCart, Package, History, BarChart2, Plus, Search, 
  Trash2, CheckCircle, TrendingUp, Award, User, Store, 
  Phone, Save, Clock, Wallet, X, Edit3, Trophy, Zap, Scissors,
  Filter, Printer, Download, Upload, Check, Sparkles, AlertTriangle,
  HardDrive, FileText, RefreshCw, Smartphone, CreditCard, DollarSign, 
  Camera, Scan, ScanBarcode, QrCode, WifiOff, Truck, Bell, FileDown, ShieldAlert, Bluetooth,
  ShieldCheck, UserCheck, Lock, KeyRound, RotateCcw, ArrowLeftRight, Palette, Play, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import {
  formatRp,
  formatDate,
  calculateSubtotal,
  calculateProfit,
  calculateChange,
  deductInventory,
  aggregateDailyRecap,
  getLowStockRecommendations,
  findProductByBarcode,
  getReceiptPaymentMethodLabel,
  isKasbonTransaction,
  filterAndSortKasirProducts,
  findTransactionByReceiptQuery,
  DEFAULT_LOW_STOCK_THRESHOLD,
  CATEGORIES,
  type Product,
  type CartItem,
  type Transaction,
  type DigitalTransaction,
  type PaymentMethodType,
  type ReturnExchangeRecord,
} from './utils/storeLogic';
import { exportRecapReportPDF } from './utils/pdfExport';
import {
  STORAGE_KEYS,
  DEFAULT_KASIR_DRAFT,
  loadFromStorage,
  saveToStorage,
  clearAllStoreStorage,
  isArrayValue,
  isPlainObject,
  isValidKasirDraft,
} from './utils/storagePersistence';
import { idbGet, idbSet, idbClearAll } from './utils/indexedDbStorage';
import { compressDataUrl, compressImageFile } from './utils/imageCompression';
import {
  buildRetailEscPosPayload,
  buildDigitalEscPosPayload,
  connectThermalPrinter,
  sendEscPosToCharacteristic,
} from './utils/escPosPrinter';

import {
  DEFAULT_ROLE_SETTINGS,
  isValidPin,
  isValidRoleSettings,
  resolveNextTabAfterModeSwitch,
  isTabAllowedForMode,
  getDefaultTabForMode,
  canViewFinancialProfit,
  canManageInventoryAndSettings,
  type AppMode,
  type RoleSettings,
} from './utils/roleMode';

import { AiImageAnalysisView } from './components/AiImageAnalysisView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import {
  OfflineBanner,
  PWAInstallButton,
  PWAInstallProfileCard,
} from './components/PWAInstallAndOffline';
import { SalesTrendChart } from './components/SalesTrendChart';
import { OmsetProfitLineChart } from './components/OmsetProfitLineChart';
import { QRISModal } from './components/QRISModal';
import { RoleModeModal } from './components/RoleModeModal';
import { ReceiptBarcode } from './components/ReceiptBarcode';
import { ReturnExchangeModal } from './components/ReturnExchangeModal';
import { OpeningAnimation } from './components/OpeningAnimation';
import { ThemePickerModal } from './components/ThemePickerModal';
import {
  DEFAULT_THEME_ID,
  THEME_PRESETS,
  getThemePreset,
  applyThemeToDocument,
  isValidThemeId,
  type ThemeId,
} from './utils/themeSettings';
import {
  playSoundEffect,
  getCheckoutSoundKind,
  getCheckoutSoundLabel,
  type SoundKind,
  type CheckoutSoundKind,
} from './utils/soundEffects';
import { PpobSuccessToast } from './components/PpobSuccessToast';
import { PPOB_TOAST_DURATION_MS } from './utils/ppobToast';

interface PrinterSessionState {
  device: any | null;
  characteristic: any | null;
  deviceName: string;
  statusInfo: string;
  isConnecting: boolean;
  onConnect: () => Promise<{ characteristic: any; name: string } | null>;
  onDisconnect: () => void;
}

// --- Sound Effects Utility ---
let isAppSoundEnabled = true;

const playBeep = (type: string = 'click') => {
  const validKinds: readonly SoundKind[] = ['click', 'success', 'tunai', 'qris', 'kasbon'];
  const kind: SoundKind = validKinds.includes(type as SoundKind) ? (type as SoundKind) : 'click';
  playSoundEffect(kind, isAppSoundEnabled);
};

const initialProducts: Product[] = [
  { id: 'P-001', barcode: '8999909000015', name: 'Dji Sam Soe 12', category: 'Rokok', costPrice: 19000, sellingPrice: 22000, stock: 10, isKeteng: true, ketengPrice: 2000, pcsPerPack: 12, eceranStock: 12, image: '', minStock: 5 },
  { id: 'P-002', barcode: '8992696401013', name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 15000, sellingPrice: 18000, stock: 4, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0, image: '', minStock: 5 },
  { id: 'P-003', barcode: '8998866200325', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 40, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0, image: '', minStock: 10 }
];

const DEFAULT_PROFILE = {
  ownerName: 'Warung Pintar Mandiri',
  phone: '08123456789',
  address: 'Jl. Utama Toko No. 1',
  email: '',
  footerNote: 'Terima kasih atas kunjungan Anda!',
  avatar: '',
  qrisImage: ''
};

export default function App() {
  const [roleSettings, setRoleSettings] = useState<RoleSettings>(() =>
    loadFromStorage<RoleSettings>(STORAGE_KEYS.ROLE_SETTINGS, DEFAULT_ROLE_SETTINGS, isValidRoleSettings)
  );
  const [showRoleModal, setShowRoleModal] = useState(false);

  const [themeId, setThemeId] = useState<ThemeId>(() =>
    loadFromStorage<ThemeId>(STORAGE_KEYS.THEME, DEFAULT_THEME_ID, isValidThemeId)
  );
  const [showOpening, setShowOpening] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const stored = loadFromStorage<boolean>(
      STORAGE_KEYS.SOUND_ENABLED,
      true,
      (v): v is boolean => typeof v === 'boolean'
    );
    isAppSoundEnabled = stored;
    return stored;
  });

  useEffect(() => {
    isAppSoundEnabled = soundEnabled;
    saveToStorage(STORAGE_KEYS.SOUND_ENABLED, soundEnabled);
  }, [soundEnabled]);

  const handleToggleSound = React.useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      isAppSoundEnabled = next;
      if (next) {
        playSoundEffect('click', true);
      }
      return next;
    });
  }, []);

  const [cartShakeKey, setCartShakeKey] = useState(0);
  const [cartTotalQty, setCartTotalQty] = useState<number>(() => {
    const draft = loadFromStorage(STORAGE_KEYS.KASIR_DRAFT, DEFAULT_KASIR_DRAFT, isValidKasirDraft);
    return Array.isArray(draft.cart)
      ? draft.cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
      : 0;
  });
  const handleCartItemAdded = React.useCallback(() => {
    setCartShakeKey((prev) => prev + 1);
  }, []);

  const [activeTab, setActiveTab] = useState<string>(() =>
    getDefaultTabForMode(
      loadFromStorage<RoleSettings>(STORAGE_KEYS.ROLE_SETTINGS, DEFAULT_ROLE_SETTINGS, isValidRoleSettings).mode
    )
  );
  
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts, isArrayValue)
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, [], isArrayValue)
  );

  const [digitalTransactions, setDigitalTransactions] = useState<DigitalTransaction[]>(() =>
    loadFromStorage<DigitalTransaction[]>(STORAGE_KEYS.DIGITAL_TRANSACTIONS, [], isArrayValue)
  );

  const [profile, setProfile] = useState(() =>
    loadFromStorage<Record<string, any>>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE, isPlainObject)
  );

  const [isIdbReady, setIsIdbReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  // Shared Bluetooth Printer Thermal State (used by Profile, Kasir, Digital, & History receipts)
  const [printerDevice, setPrinterDevice] = useState<any | null>(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState<any | null>(null);
  const [printerName, setPrinterName] = useState<string>('');
  const [printerStatusInfo, setPrinterStatusInfo] = useState<string>('Belum Terhubung');
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);

  const handleDisconnectPrinter = () => {
    try {
      if (printerDevice?.gatt?.connected) {
        printerDevice.gatt.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    }
    setPrinterDevice(null);
    setPrinterCharacteristic(null);
    setPrinterName('');
    setPrinterStatusInfo('Belum Terhubung');
  };

  const handleConnectPrinter = async (): Promise<{ characteristic: any; name: string } | null> => {
    setIsConnectingPrinter(true);
    setPrinterStatusInfo('Mencari perangkat printer...');
    try {
      const connected = await connectThermalPrinter(() => {
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
        setPrinterName('');
        setPrinterStatusInfo('Terputus (Disconnected)');
      });
      setPrinterDevice(connected.device);
      setPrinterCharacteristic(connected.characteristic);
      setPrinterName(connected.name);
      setPrinterStatusInfo(`Terkoneksi: ${connected.name}`);
      return { characteristic: connected.characteristic, name: connected.name };
    } catch (err: any) {
      setPrinterStatusInfo(err?.message ? `Gagal: ${err.message}` : 'Gagal / Batal Terhubung');
      return null;
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const printerSession: PrinterSessionState = {
    device: printerDevice,
    characteristic: printerCharacteristic,
    deviceName: printerName,
    statusInfo: printerStatusInfo,
    isConnecting: isConnectingPrinter,
    onConnect: handleConnectPrinter,
    onDisconnect: handleDisconnectPrinter,
  };

  // External cart item triggered by AI analysis
  const [pendingCartItem, setPendingCartItem] = useState<{ name: string; price: number; category: string } | null>(null);

  // Ref snapshot untuk flush sinkron saat tab ditutup / refresh mendadak
  const latestStoreRef = useRef({ products, transactions, digitalTransactions, profile, roleSettings, themeId });
  latestStoreRef.current = { products, transactions, digitalTransactions, profile, roleSettings, themeId };

  useEffect(() => {
    applyThemeToDocument(themeId);
  }, [themeId]);

  // Hydrate from IndexedDB on startup & migrate existing LocalStorage data seamlessly
  useEffect(() => {
    let active = true;
    const hydrateFromIdb = async () => {
      try {
        const [idbProducts, idbTxs, idbDigital, idbProfile, idbRoleSettings, idbThemeId] = await Promise.all([
          idbGet<Product[]>(STORAGE_KEYS.PRODUCTS),
          idbGet<Transaction[]>(STORAGE_KEYS.TRANSACTIONS),
          idbGet<DigitalTransaction[]>(STORAGE_KEYS.DIGITAL_TRANSACTIONS),
          idbGet<Record<string, any>>(STORAGE_KEYS.PROFILE),
          idbGet<RoleSettings>(STORAGE_KEYS.ROLE_SETTINGS),
          idbGet<ThemeId>(STORAGE_KEYS.THEME),
        ]);

        if (!active) return;

        if (Array.isArray(idbProducts)) {
          setProducts(idbProducts);
        } else {
          await idbSet(STORAGE_KEYS.PRODUCTS, latestStoreRef.current.products);
        }

        if (Array.isArray(idbTxs)) {
          setTransactions(idbTxs);
        } else if (latestStoreRef.current.transactions.length > 0) {
          await idbSet(STORAGE_KEYS.TRANSACTIONS, latestStoreRef.current.transactions);
        }

        if (Array.isArray(idbDigital)) {
          setDigitalTransactions(idbDigital);
        } else if (latestStoreRef.current.digitalTransactions.length > 0) {
          await idbSet(STORAGE_KEYS.DIGITAL_TRANSACTIONS, latestStoreRef.current.digitalTransactions);
        }

        if (isPlainObject(idbProfile)) {
          setProfile(idbProfile);
        } else {
          await idbSet(STORAGE_KEYS.PROFILE, latestStoreRef.current.profile);
        }

        if (isValidRoleSettings(idbRoleSettings)) {
          setRoleSettings(idbRoleSettings);
          setActiveTab((prev) => resolveNextTabAfterModeSwitch(prev, idbRoleSettings.mode));
        } else {
          await idbSet(STORAGE_KEYS.ROLE_SETTINGS, latestStoreRef.current.roleSettings);
        }

        if (isValidThemeId(idbThemeId)) {
          setThemeId(idbThemeId);
        } else {
          await idbSet(STORAGE_KEYS.THEME, latestStoreRef.current.themeId);
        }
      } catch {
        // Fallback silently to LocalStorage initial state
      } finally {
        if (active) setIsIdbReady(true);
      }
    };
    hydrateFromIdb();
    return () => {
      active = false;
    };
  }, []);

  const persistDataset = async <T,>(key: string, value: T) => {
    const idbOk = await idbSet(key, value);
    const lsRes = saveToStorage(key, value);
    if (!idbOk && !lsRes.ok && lsRes.error) {
      setStorageWarning(lsRes.error);
    } else {
      setStorageWarning(null);
    }
  };

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.PRODUCTS, products);
  }, [products, isIdbReady]);

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions, isIdbReady]);

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.DIGITAL_TRANSACTIONS, digitalTransactions);
  }, [digitalTransactions, isIdbReady]);

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.PROFILE, profile);
  }, [profile, isIdbReady]);

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.ROLE_SETTINGS, roleSettings);
  }, [roleSettings, isIdbReady]);

  useEffect(() => {
    if (!isIdbReady) return;
    persistDataset(STORAGE_KEYS.THEME, themeId);
  }, [themeId, isIdbReady]);

  // Flush seluruh data ke LocalStorage & IndexedDB saat pagehide/beforeunload/visibilitychange & sinkronisasi antar-tab
  useEffect(() => {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        navigator.storage.persist().catch(() => {});
      }
    } catch {
      // Abaikan jika browser membatasi API StorageManager
    }

    const flushAllToStorage = () => {
      const snap = latestStoreRef.current;
      saveToStorage(STORAGE_KEYS.PRODUCTS, snap.products);
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, snap.transactions);
      saveToStorage(STORAGE_KEYS.DIGITAL_TRANSACTIONS, snap.digitalTransactions);
      saveToStorage(STORAGE_KEYS.PROFILE, snap.profile);
      saveToStorage(STORAGE_KEYS.ROLE_SETTINGS, snap.roleSettings);
      saveToStorage(STORAGE_KEYS.THEME, snap.themeId);
      idbSet(STORAGE_KEYS.PRODUCTS, snap.products);
      idbSet(STORAGE_KEYS.TRANSACTIONS, snap.transactions);
      idbSet(STORAGE_KEYS.DIGITAL_TRANSACTIONS, snap.digitalTransactions);
      idbSet(STORAGE_KEYS.PROFILE, snap.profile);
      idbSet(STORAGE_KEYS.ROLE_SETTINGS, snap.roleSettings);
      idbSet(STORAGE_KEYS.THEME, snap.themeId);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAllToStorage();
      }
    };

    const handleCrossTabStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (e.key === STORAGE_KEYS.PRODUCTS && Array.isArray(parsed)) {
          setProducts(parsed);
        } else if (e.key === STORAGE_KEYS.TRANSACTIONS && Array.isArray(parsed)) {
          setTransactions(parsed);
        } else if (e.key === STORAGE_KEYS.DIGITAL_TRANSACTIONS && Array.isArray(parsed)) {
          setDigitalTransactions(parsed);
        } else if (e.key === STORAGE_KEYS.PROFILE && isPlainObject(parsed)) {
          setProfile(parsed);
        } else if (e.key === STORAGE_KEYS.ROLE_SETTINGS && isValidRoleSettings(parsed)) {
          setRoleSettings(parsed);
          setActiveTab((prev) => resolveNextTabAfterModeSwitch(prev, parsed.mode));
        } else if (e.key === STORAGE_KEYS.THEME && isValidThemeId(parsed)) {
          setThemeId(parsed);
        }
      } catch {
        // Abaikan payload tidak valid
      }
    };

    window.addEventListener('pagehide', flushAllToStorage);
    window.addEventListener('beforeunload', flushAllToStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleCrossTabStorage);

    return () => {
      window.removeEventListener('pagehide', flushAllToStorage);
      window.removeEventListener('beforeunload', flushAllToStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleCrossTabStorage);
    };
  }, []);

  const handleAddProductFromAI = (newProduct: Product) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const handleNavigate = (tab: string) => {
    if (!isTabAllowedForMode(tab, roleSettings.mode)) {
      setShowRoleModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleSwitchToCashier = (cashierName: string) => {
    const nextSettings: RoleSettings = {
      ...roleSettings,
      mode: 'cashier',
      cashierName,
    };
    setRoleSettings(nextSettings);
    saveToStorage(STORAGE_KEYS.ROLE_SETTINGS, nextSettings);
    idbSet(STORAGE_KEYS.ROLE_SETTINGS, nextSettings);
    setActiveTab((prev) => resolveNextTabAfterModeSwitch(prev, 'cashier'));
    setShowRoleModal(false);
    playBeep('success');
  };

  const handleUnlockOwner = () => {
    const nextSettings: RoleSettings = {
      ...roleSettings,
      mode: 'owner',
    };
    setRoleSettings(nextSettings);
    saveToStorage(STORAGE_KEYS.ROLE_SETTINGS, nextSettings);
    idbSet(STORAGE_KEYS.ROLE_SETTINGS, nextSettings);
    setShowRoleModal(false);
    playBeep('success');
  };

  const isOwnerMode = roleSettings.mode === 'owner';
  const activeThemePreset = getThemePreset(themeId);

  const handleSelectTheme = (nextThemeId: ThemeId) => {
    playBeep('click');
    setThemeId(nextThemeId);
    saveToStorage(STORAGE_KEYS.THEME, nextThemeId);
    idbSet(STORAGE_KEYS.THEME, nextThemeId);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--wp-bg,#f8fafc)] transition-colors duration-300 flex flex-col font-sans text-gray-800 overflow-x-hidden selection:bg-blue-500 selection:text-white text-xs sm:text-sm md:text-base">
      <OpeningAnimation
        isVisible={showOpening}
        storeName={profile.ownerName}
        onComplete={() => setShowOpening(false)}
      />

      {/* Offline Status Warning Banner */}
      <OfflineBanner />

      {storageWarning && (
        <div
          role="alert"
          className="bg-rose-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 z-50"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{storageWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setStorageWarning(null)}
            className="p-1 hover:bg-white/20 rounded-lg"
            aria-label="Tutup peringatan penyimpanan"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Utama Responsif */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex justify-between items-center sticky top-0 z-40 shadow-sm/50 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Logo Toko" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover border border-blue-100 shadow-md shadow-blue-200 shrink-0" />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-md shadow-blue-200 text-xs sm:text-sm shrink-0">
              WP
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-black text-gray-800 leading-none uppercase tracking-tight truncate">
              {profile.ownerName || 'Warung Pintar Pro'}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse shrink-0 ${isOwnerMode ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider truncate ${isOwnerMode ? 'text-indigo-600' : 'text-emerald-600'}`}>
                {isOwnerMode ? 'Mode Owner • Akses Penuh' : `Mode Kasir • ${roleSettings.cashierName || 'Karyawan'}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowThemeModal(true);
            }}
            aria-label="Pilih warna tema"
            title={`Tema: ${activeThemePreset.name}`}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-all shadow-sm flex items-center gap-1.5"
          >
            <Palette size={15} />
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
              style={{ backgroundColor: activeThemePreset.primaryHex }}
            />
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowRoleModal(true);
            }}
            aria-label={isOwnerMode ? 'Ganti ke Mode Karyawan Kasir' : 'Buka Mode Owner'}
            className={`px-2.5 sm:px-3 py-2 min-h-[36px] rounded-xl font-black text-[10px] sm:text-xs uppercase flex items-center gap-1.5 border transition-all shadow-sm whitespace-nowrap ${
              isOwnerMode
                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            {isOwnerMode ? <ShieldCheck size={14} /> : <Lock size={14} />}
            <span>
              <span className="hidden sm:inline">Mode </span>
              {isOwnerMode ? 'Owner' : 'Kasir'}
            </span>
            <span className="hidden md:inline text-[9px] opacity-75 font-bold">
              {isOwnerMode ? '• Kunci Kasir' : '• Buka Owner'}
            </span>
          </button>

          {/* Tombol Install PWA Langsung dari UI */}
          <PWAInstallButton />
        </div>
      </header>

      {/* Konten Utama Responsif dengan Padding Teradaptasi */}
      <main className="flex-1 pb-24 sm:pb-28">
        <div className="max-w-[1600px] mx-auto w-full px-2 sm:px-4 md:px-6">
          {activeTab === 'dashboard' && isOwnerMode && (
            <DashboardView 
              products={products} 
              transactions={transactions} 
              digitalTransactions={digitalTransactions} 
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'kasir' && (
            <KasirView 
              products={products} 
              setProducts={setProducts} 
              transactions={transactions} 
              setTransactions={setTransactions} 
              profile={profile}
              setProfile={setProfile}
              printerSession={printerSession}
              appMode={roleSettings.mode}
              cashierName={roleSettings.cashierName}
              pendingItem={pendingCartItem}
              onClearPendingItem={() => setPendingCartItem(null)}
              onNavigateToAiScan={isOwnerMode ? () => handleNavigate('ai_scan') : undefined}
              onCartItemAdded={handleCartItemAdded}
              onCartQtyChange={setCartTotalQty}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          )}

          {activeTab === 'ai_scan' && isOwnerMode && (
            <AiImageAnalysisView
              products={products}
              onAddProductToStock={handleAddProductFromAI}
              onAddToCartDirect={(item) => {
                setPendingCartItem(item);
                handleNavigate('kasir');
              }}
              onNavigateToTab={handleNavigate}
              playBeep={playBeep}
            />
          )}

          {activeTab === 'digital' && (
            <DigitalView 
              digitalTransactions={digitalTransactions} 
              setDigitalTransactions={setDigitalTransactions} 
              profile={profile}
              printerSession={printerSession}
              appMode={roleSettings.mode}
              cashierName={roleSettings.cashierName}
            />
          )}

          {activeTab === 'stok' && (
            <StokView 
              products={products} 
              setProducts={setProducts}
              profile={profile}
              appMode={roleSettings.mode}
              onNavigateToAiScan={isOwnerMode ? () => handleNavigate('ai_scan') : undefined}
            />
          )}

          {activeTab === 'riwayat' && (
            <HistoryView 
              transactions={transactions} 
              setTransactions={setTransactions} 
              digitalTransactions={digitalTransactions} 
              setDigitalTransactions={setDigitalTransactions} 
              profile={profile} 
              printerSession={printerSession}
              appMode={roleSettings.mode}
              ownerPin={roleSettings.ownerPin}
              cashierName={roleSettings.cashierName}
              products={products}
              setProducts={setProducts}
            />
          )}

          {activeTab === 'rekap' && isOwnerMode && (
            <RekapView 
              transactions={transactions} 
              digitalTransactions={digitalTransactions} 
              products={products}
              profile={profile}
            />
          )}

          {activeTab === 'profil' && (
            <ProfileView 
              profile={profile} 
              setProfile={setProfile} 
              products={products} 
              setProducts={setProducts} 
              transactions={transactions} 
              setTransactions={setTransactions} 
              digitalTransactions={digitalTransactions} 
              setDigitalTransactions={setDigitalTransactions}
              printerSession={printerSession}
              roleSettings={roleSettings}
              onUpdateRoleSettings={setRoleSettings}
              onOpenRoleModal={() => setShowRoleModal(true)}
              themeId={themeId}
              onSelectTheme={handleSelectTheme}
              onReplayOpening={() => setShowOpening(true)}
            />
          )}
        </div>
      </main>

      {showRoleModal && (
        <RoleModeModal
          roleSettings={roleSettings}
          onSwitchToCashier={handleSwitchToCashier}
          onUnlockOwner={handleUnlockOwner}
          onClose={() => setShowRoleModal(false)}
        />
      )}

      {showThemeModal && (
        <ThemePickerModal
          activeTheme={themeId}
          onSelectTheme={handleSelectTheme}
          onReplayOpening={() => setShowOpening(true)}
          onClose={() => setShowThemeModal(false)}
        />
      )}

      {/* Navigasi Bawah Fleksibel sesuai Mode Akses */}
      <nav aria-label="Menu Utama" className="bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-16 sm:h-20 shadow-[0_-4px_25px_rgba(0,0,0,0.04)] w-full fixed bottom-0 z-50 px-1 sm:px-6">
        {isOwnerMode && (
          <NavItem icon={<Home className="w-4 h-4 sm:w-5 sm:h-5" />} label="Beranda" isActive={activeTab === 'dashboard'} onClick={() => handleNavigate('dashboard')} />
        )}
        <NavItem
          icon={<AnimatedCartNavIcon shakeKey={cartShakeKey} itemCount={cartTotalQty} />}
          label="Kasir"
          isActive={activeTab === 'kasir'}
          onClick={() => handleNavigate('kasir')}
        />
        <NavItem icon={<Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />} label="Digital" isActive={activeTab === 'digital'} onClick={() => handleNavigate('digital')} />
        <NavItem icon={<Package className="w-4 h-4 sm:w-5 sm:h-5" />} label="Stok" isActive={activeTab === 'stok'} onClick={() => handleNavigate('stok')} />
        <NavItem icon={<History className="w-4 h-4 sm:w-5 sm:h-5" />} label="Riwayat" isActive={activeTab === 'riwayat'} onClick={() => handleNavigate('riwayat')} />
        {isOwnerMode && (
          <NavItem icon={<BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />} label="Rekap" isActive={activeTab === 'rekap'} onClick={() => handleNavigate('rekap')} />
        )}
        <NavItem icon={<User className="w-4 h-4 sm:w-5 sm:h-5" />} label="Profil" isActive={activeTab === 'profil'} onClick={() => handleNavigate('profil')} />
      </nav>
    </div>
  );
}

const AnimatedCartNavIcon = ({ shakeKey, itemCount }: { shakeKey: number; itemCount: number }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.div
        key={shakeKey}
        data-testid="nav-cart-icon"
        data-shake-count={shakeKey}
        initial={shakeKey > 0 ? { rotate: 0, x: 0, scale: 1 } : false}
        animate={
          shakeKey > 0
            ? prefersReducedMotion
              ? { scale: [1, 1.1, 1] }
              : {
                  rotate: [0, -18, 18, -14, 14, -8, 8, 0],
                  x: [0, -3, 3, -2, 2, -1, 1, 0],
                  scale: [1, 1.24, 1.18, 1.14, 1],
                }
            : { rotate: 0, x: 0, scale: 1 }
        }
        transition={{ duration: 0.52, ease: 'easeInOut' }}
        className="inline-flex items-center justify-center"
      >
        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
      </motion.div>
      {itemCount > 0 && (
        <motion.span
          key={`badge-${itemCount}`}
          data-testid="nav-cart-badge"
          initial={{ scale: 0.75 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          className="absolute -top-2 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-black leading-none flex items-center justify-center shadow-sm border border-white tabular-nums"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </motion.span>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) => (
  <button 
    onClick={() => { playBeep('click'); onClick(); }} 
    className={`flex flex-col items-center justify-center flex-1 transition-all relative py-0.5 sm:py-1 ${isActive ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
    aria-label={label}
  >
    <div className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl transition-all ${isActive ? 'bg-blue-50 text-blue-600 shadow-sm' : 'bg-transparent'}`}>
      {icon}
    </div>
    <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-tight mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
      {label}
    </span>
  </button>
);

// --- 1. DASHBOARD VIEW ---
interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
  onNavigate: (tab: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ products, transactions, digitalTransactions, onNavigate }) => {
  const [filterPreset, setFilterPreset] = useState<'hari_ini' | 'minggu_ini' | 'bulan_ini' | 'custom'>('bulan_ini');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notifPermission, setNotifPermission] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const hasAutoNotifiedRef = useRef(false);

  useEffect(() => {
    const now = new Date();
    if (filterPreset === 'hari_ini') {
      const today = now.toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    } else if (filterPreset === 'minggu_ini') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(today);
    } else if (filterPreset === 'bulan_ini') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(today);
    }
  }, [filterPreset]);

  const filteredData = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  }, [transactions, startDate, endDate]);

  const filteredDigital = useMemo(() => {
    return digitalTransactions.filter(tx => {
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  }, [digitalTransactions, startDate, endDate]);

  const stats = useMemo(() => {
    const activeData = filteredData.filter(tx => !tx.isCancelled);
    const settled = activeData.filter(tx => tx.status === 'LUNAS');
    const retailOmset = settled.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const retailLaba = settled.reduce((a, b) => a + (b.totalProfit || 0), 0);
    
    const digitalOmset = filteredDigital.reduce((a, b) => a + (b.sellAmount || 0), 0);
    const digitalLaba = filteredDigital.reduce((a, b) => a + (b.fee || 0), 0);

    const omset = retailOmset + digitalOmset;
    const laba = retailLaba + digitalLaba;
    const kasbon = activeData.filter(tx => tx.status === 'MENUNGGU' || (tx.shortage && tx.shortage > 0)).reduce((a, b) => a + (b.shortage || b.totalAmount || 0), 0);
    const modalAset = products.reduce((a, b) => a + ((b.costPrice || 0) * (b.stock || 0)), 0);

    return { omset, laba, modalAset, kasbon, settledCount: settled.length + filteredDigital.length };
  }, [filteredData, filteredDigital, products]);

  const lowStockRecs = useMemo(() => {
    return getLowStockRecommendations(products);
  }, [products]);

  useEffect(() => {
    if (
      !hasAutoNotifiedRef.current &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      lowStockRecs.length > 0
    ) {
      hasAutoNotifiedRef.current = true;
      try {
        const preview = lowStockRecs
          .slice(0, 3)
          .map((r) => `${r.product.name} (${r.product.stock} bks)`)
          .join(', ');
        new Notification('Peringatan Stok Menipis - Warung Pintar Pro', {
          body: `${lowStockRecs.length} produk stok menipis: ${preview}`,
          icon: '/pwa-192x192.png',
        });
      } catch {
        // Ignore if browser restricts constructor notifications
      }
    }
  }, [lowStockRecs]);

  const handleBrowserStockNotification = async () => {
    playBeep('click');
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported');
      setNotifFeedback('Browser ini tidak mendukung Notifikasi Desktop.');
      return;
    }

    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      setNotifPermission(permission);

      if (permission === 'granted') {
        if (lowStockRecs.length === 0) {
          new Notification('Stok Aman - Warung Pintar Pro', {
            body: 'Seluruh produk di gudang saat ini memiliki stok aman di atas batas minimum.',
            icon: '/pwa-192x192.png',
          });
          setNotifFeedback('Notifikasi aktif: Semua stok barang saat ini masih aman.');
        } else {
          const bodyList = lowStockRecs
            .slice(0, 3)
            .map((r) => `${r.product.name} (sisa ${r.product.stock})`)
            .join('\n');
          new Notification(`Perhatian: ${lowStockRecs.length} Produk Stok Menipis`, {
            body: bodyList,
            icon: '/pwa-192x192.png',
          });
          setNotifFeedback(`Notifikasi browser terkirim untuk ${lowStockRecs.length} produk stok menipis.`);
        }
      } else {
        setNotifFeedback('Izin notifikasi browser ditolak/diblokir.');
      }
    } catch {
      setNotifFeedback('Gagal memicu notifikasi browser pada perangkat ini.');
    }
  };

  const topProducts = useMemo(() => {
    const productMap: Record<string, { id: string; name: string; sold: number; revenue: number }> = {};
    filteredData.filter(tx => tx.status === 'LUNAS' && !tx.isCancelled).forEach(tx => {
      if (Array.isArray(tx.items)) {
        tx.items.forEach(item => {
          const id = item.id || item.name;
          if (!productMap[id]) {
            productMap[id] = { id, name: item.name, sold: 0, revenue: 0 };
          }
          productMap[id].sold += Number(item.quantity || 0);
          productMap[id].revenue += Number((item.priceAtTime || 0) * (item.quantity || 0));
        });
      }
    });
    return Object.values(productMap).sort((a, b) => b.sold - a.sold).slice(0, 5);
  }, [filteredData]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider flex items-center gap-2">
            <Filter size={14} className="text-blue-600"/> Rentang Analisis Penjualan
           </h3>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Pantau kinerja keuangan toko Anda</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl text-[10px] font-black uppercase">
            <button onClick={() => setFilterPreset('hari_ini')} className={`px-3 py-1.5 rounded-xl transition-all ${filterPreset === 'hari_ini' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Hari Ini</button>
            <button onClick={() => setFilterPreset('minggu_ini')} className={`px-3 py-1.5 rounded-xl transition-all ${filterPreset === 'minggu_ini' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Minggu Ini</button>
            <button onClick={() => setFilterPreset('bulan_ini')} className={`px-3 py-1.5 rounded-xl transition-all ${filterPreset === 'bulan_ini' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Bulan Ini</button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <input type="date" value={startDate} onChange={e => { setFilterPreset('custom'); setStartDate(e.target.value); }} className="bg-transparent text-[10px] font-black outline-none uppercase" />
            <span className="text-gray-300">-</span>
            <input type="date" value={endDate} onChange={e => { setFilterPreset('custom'); setEndDate(e.target.value); }} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Omset Gabungan" value={formatRp(stats.omset)} subText={`${stats.settledCount} Transaksi Selesai`} icon={<TrendingUp size={22}/>} color="blue" />
        <StatCard label="Piutang Kasbon" value={formatRp(stats.kasbon)} subText="Perlu Ditagih" icon={<Clock size={22}/>} color="orange" />
        <StatCard label="Total Laba Bersih" value={formatRp(stats.laba)} subText="Retail + Fee PPOB" icon={<Award size={22}/>} color="green" />
        <StatCard label="Modal Stok Barang" value={formatRp(stats.modalAset)} subText={`${products.length} Jenis Produk`} icon={<Package size={22}/>} color="purple" />
      </div>

      {lowStockRecs.length > 0 && (
        <div
          data-testid="low-stock-supplier-banner"
          className="bg-amber-50 border border-amber-200 p-5 md:p-6 rounded-3xl space-y-4 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-950 uppercase tracking-wide">
                  Peringatan Stok Menipis ({lowStockRecs.length} Produk)
                </h4>
                <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                  Beberapa produk di gudang telah mencapai batas minimum atau habis. Segera lakukan penambahan stok.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleBrowserStockNotification}
                className="px-4 py-2.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <Bell size={14} className="text-amber-600" />
                {notifPermission === 'granted' ? 'Kirim Notifikasi Browser' : 'Aktifkan Notifikasi Browser'}
              </button>
              <button
                type="button"
                onClick={() => {
                  playBeep('click');
                  onNavigate('stok');
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                <Package size={14} />
                Kelola Stok Gudang
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {lowStockRecs.slice(0, 6).map((rec) => (
              <div
                key={rec.product.id}
                className="bg-white/90 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 uppercase truncate">{rec.product.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase">
                    Kategori: {rec.product.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2 py-0.5 rounded-lg bg-red-50 text-red-600 font-black text-[10px] tabular-nums">
                    Sisa {rec.product.stock} Bks
                  </span>
                  <span className="block text-[9px] font-bold text-emerald-700 mt-0.5 tabular-nums">
                    Saran Beli: +{rec.suggestedOrderQty} Bks
                  </span>
                </div>
              </div>
            ))}
          </div>

          {notifFeedback && (
            <div className="bg-white/80 border border-amber-200 text-amber-900 px-3.5 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between gap-2">
              <span>{notifFeedback}</span>
              <button
                type="button"
                onClick={() => setNotifFeedback(null)}
                className="text-amber-700 hover:text-amber-950 p-0.5"
                aria-label="Tutup info notifikasi"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grafik Garis Recharts: Perbandingan Total Omset vs Total Laba Bersih 30 Hari Terakhir */}
      <OmsetProfitLineChart transactions={transactions} digitalTransactions={digitalTransactions} />

      {/* Komponen Grafik Batang Recharts: Tren Omset Penjualan Harian 30 Hari Terakhir */}
      <SalesTrendChart transactions={transactions} digitalTransactions={digitalTransactions} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center font-black">
                <Trophy size={20}/>
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Produk Paling Laris</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Peringkat berdasarkan unit terjual</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-4 p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black ${
                  idx === 0 ? 'bg-yellow-400 text-yellow-950' : 
                  idx === 1 ? 'bg-slate-300 text-slate-800' : 
                  idx === 2 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1.5">
                    <p className="text-xs font-black text-gray-800 uppercase">{p.name}</p>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-blue-600 uppercase">{p.sold} Terjual</span>
                      <span className="text-[9px] font-bold text-gray-400 block">{formatRp(p.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (p.sold / (topProducts[0]?.sold || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-400 font-bold uppercase text-[10px] tracking-widest bg-gray-50/50 rounded-2xl">
                Belum ada data penjualan pada periode ini
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subText, icon, color }: { label: string; value: string; subText?: string; icon: React.ReactNode; color: 'blue' | 'orange' | 'green' | 'purple' }) => {
  const styles = {
    blue: 'bg-blue-600 text-white shadow-blue-500/20',
    orange: 'bg-white text-amber-600 border-amber-100',
    green: 'bg-white text-emerald-600 border-emerald-100',
    purple: 'bg-white text-purple-600 border-purple-100'
  };
  return (
    <div className={`${styles[color]} p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] cursor-default flex flex-col justify-between`}>
      <div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color === 'blue' ? 'bg-white/20' : 'bg-gray-50'}`}>
          {icon}
        </div>
        <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${color === 'blue' ? 'opacity-80' : 'text-gray-400'}`}>{label}</p>
        <h2 className="text-xl md:text-2xl font-black truncate">{value}</h2>
      </div>
      {subText && (
        <p className={`text-[9px] font-bold uppercase mt-3 ${color === 'blue' ? 'text-blue-100' : 'text-gray-400'}`}>
          {subText}
        </p>
      )}
    </div>
  );
};

// --- 2. KASIR VIEW ---
interface KasirViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  profile: any;
  setProfile?: React.Dispatch<React.SetStateAction<any>>;
  printerSession: PrinterSessionState;
  appMode?: AppMode;
  cashierName?: string;
  pendingItem?: { name: string; price: number; category: string } | null;
  onClearPendingItem?: () => void;
  onNavigateToAiScan?: () => void;
  onCartItemAdded?: () => void;
  onCartQtyChange?: (totalQty: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const KasirView: React.FC<KasirViewProps> = ({ 
  products, setProducts, transactions, setTransactions, profile, setProfile, printerSession,
  appMode = 'owner', cashierName = 'Karyawan Kasir',
  pendingItem, onClearPendingItem, onNavigateToAiScan, onCartItemAdded, onCartQtyChange,
  soundEnabled = true, onToggleSound
}) => {
  const initialDraft = useMemo(
    () => loadFromStorage(STORAGE_KEYS.KASIR_DRAFT, DEFAULT_KASIR_DRAFT, isValidKasirDraft),
    []
  );
  const [cart, setCart] = useState<CartItem[]>(initialDraft.cart);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('Semua');
  const [paymentType, setPaymentType] = useState<'LUNAS' | 'MENUNGGU'>(initialDraft.paymentType || 'LUNAS');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS' | 'KASBON'>(initialDraft.paymentMethod || 'TUNAI');
  const [showQRISModal, setShowQRISModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState(initialDraft.buyerName || '');
  const [cashAmount, setCashAmount] = useState('');
  const [kasirWarning, setKasirWarning] = useState<string | null>(null);
  const [lastTxReceipt, setLastTxReceipt] = useState<Transaction | null>(null);
  const [lastTxSound, setLastTxSound] = useState<CheckoutSoundKind | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  // Hydrate Kasir draft from IndexedDB on mount
  useEffect(() => {
    let active = true;
    idbGet<typeof DEFAULT_KASIR_DRAFT>(STORAGE_KEYS.KASIR_DRAFT)
      .then((draft) => {
        if (!active || !draft || !isValidKasirDraft(draft)) return;
        setCart(draft.cart);
        setPaymentType(draft.paymentType || 'LUNAS');
        setPaymentMethod(draft.paymentMethod || 'TUNAI');
        setBuyerName(draft.buyerName || '');
      })
      .finally(() => {
        if (active) setIsDraftHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Autosave keranjang belanja & draft transaksi kasir ke LocalStorage + IndexedDB setiap ada perubahan
  useEffect(() => {
    if (!isDraftHydrated) return;
    const payload = {
      cart,
      paymentType,
      paymentMethod,
      buyerName,
    };
    saveToStorage(STORAGE_KEYS.KASIR_DRAFT, payload);
    idbSet(STORAGE_KEYS.KASIR_DRAFT, payload);
  }, [cart, paymentType, paymentMethod, buyerName, isDraftHydrated]);

  // Sinkronkan jumlah item keranjang ke ikon navigasi
  useEffect(() => {
    if (onCartQtyChange) {
      const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      onCartQtyChange(total);
    }
  }, [cart, onCartQtyChange]);

  // If item comes from AI scanner
  useEffect(() => {
    if (pendingItem) {
      const cartId = `AI-${Date.now()}`;
      setCart(prev => [
        ...prev,
        {
          cartId,
          id: cartId,
          name: pendingItem.name,
          priceAtTime: pendingItem.price,
          costAtTime: Math.round(pendingItem.price * 0.8),
          quantity: 1,
          category: pendingItem.category,
        }
      ]);
      onCartItemAdded?.();
      if (onClearPendingItem) onClearPendingItem();
    }
  }, [pendingItem, onClearPendingItem, onCartItemAdded]);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const changeAmount = useMemo(() => {
    return calculateChange(Number(cashAmount) || 0, subtotal);
  }, [cashAmount, subtotal]);

  const addToCart = (p: Product, mode: 'Bungkus' | 'Pcs' = 'Bungkus') => {
    playBeep('click');
    setKasirWarning(null);
    const isPcs = mode === 'Pcs';
    const price = isPcs ? p.ketengPrice : p.sellingPrice;
    const cartId = `${p.id}-${mode}`;
    const existing = cart.find(i => i.cartId === cartId);
    
    if (existing) {
      setCart(cart.map(i => i.cartId === cartId ? {...i, quantity: i.quantity + 1} : i));
    } else {
      setCart([...cart, {
        cartId, id: p.id, name: isPcs ? `${p.name} (Ecer)` : p.name,
        priceAtTime: price,
        costAtTime: isPcs ? (p.costPrice / (p.pcsPerPack || 1)) : p.costPrice,
        quantity: 1, category: p.category, isPcs, pcsPerPack: p.pcsPerPack || 1,
        image: p.image
      }]);
    }
    onCartItemAdded?.();
  };

  const updateCartQty = (cartId: string, delta: number) => {
    playBeep('click');
    setKasirWarning(null);
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
    if (delta > 0) {
      onCartItemAdded?.();
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const isQris = paymentMethod === 'QRIS';
    const cash = isQris ? subtotal : (Number(cashAmount) || 0);
    const isUnderpaid = !isQris && paymentType === 'LUNAS' && cash < subtotal;
    const effectivePaymentType = isUnderpaid ? 'MENUNGGU' : paymentType;
    const isKasbonPayment = effectivePaymentType === 'MENUNGGU' || isUnderpaid || paymentMethod === 'KASBON';
    const resolvedPaymentMethod: PaymentMethodType = isKasbonPayment ? 'KASBON' : (isQris ? 'QRIS' : 'TUNAI');

    if ((effectivePaymentType === 'MENUNGGU' || isUnderpaid) && !buyerName.trim()) {
      setKasirWarning("Harap masukkan nama pembeli untuk transaksi Kasbon / Kekurangan pembayaran!");
      return;
    }
    setKasirWarning(null);

    const checkoutSoundKind = getCheckoutSoundKind(resolvedPaymentMethod, effectivePaymentType);
    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const profit = calculateProfit(cart);
    
    const shortageAmount = isUnderpaid ? (subtotal - cash) : (effectivePaymentType === 'MENUNGGU' ? subtotal : 0);
    const formattedBuyerName = buyerName.trim().toUpperCase();

    // Check if customer already has active kasbon
    if ((effectivePaymentType === 'MENUNGGU' || shortageAmount > 0) && formattedBuyerName) {
      const existingKasbonTx = transactions.find(t => 
        (t.status === 'MENUNGGU' || (t.shortage && t.shortage > 0)) && 
        t.buyer && 
        t.buyer.toUpperCase() === formattedBuyerName
      );

      if (existingKasbonTx) {
        const updatedTransactions = transactions.map(t => {
          if (t.id === existingKasbonTx.id) {
            const currentShortage = t.shortage !== undefined ? t.shortage : t.totalAmount;
            return {
              ...t,
              totalAmount: (Number(t.totalAmount) || 0) + subtotal,
              shortage: (Number(currentShortage) || 0) + shortageAmount,
              items: [...(t.items || []), ...cart],
              paymentMethod: 'KASBON' as PaymentMethodType,
            };
          }
          return t;
        });

        setTransactions(updatedTransactions);
        setProducts(deductInventory(products, cart));

        const updatedReceipt: Transaction = {
          id: existingKasbonTx.id,
          date: new Date().toISOString(),
          items: [...(existingKasbonTx.items || []), ...cart],
          totalAmount: (Number(existingKasbonTx.totalAmount) || 0) + subtotal,
          totalProfit: (Number(existingKasbonTx.totalProfit) || 0) + profit,
          status: 'MENUNGGU',
          buyer: formattedBuyerName,
          cashPaid: 0,
          change: 0,
          shortage: ((Number(existingKasbonTx.shortage) !== undefined ? Number(existingKasbonTx.shortage) : Number(existingKasbonTx.totalAmount)) || 0) + shortageAmount,
          type: 'RETAIL',
          paymentMethod: 'KASBON',
          handledBy: existingKasbonTx.handledBy || (appMode === 'owner' ? 'Owner' : cashierName),
        };

        playSoundEffect(checkoutSoundKind, soundEnabled);
        setLastTxSound(checkoutSoundKind);
        setLastTxReceipt(updatedReceipt);
        setCart([]);
        setBuyerName('');
        setCashAmount('');
        return;
      }
    }

    const newTx: Transaction = {
      id: txId, 
      date: new Date().toISOString(), 
      items: cart,
      totalAmount: subtotal, 
      totalProfit: profit, 
      status: effectivePaymentType,
      buyer: isKasbonPayment ? formattedBuyerName : 'Pelanggan Umum',
      cashPaid: effectivePaymentType === 'LUNAS' ? cash : (cash > 0 ? cash : 0),
      change: effectivePaymentType === 'LUNAS' && cash >= subtotal ? changeAmount : 0,
      shortage: shortageAmount,
      type: 'RETAIL',
      paymentMethod: resolvedPaymentMethod,
      handledBy: appMode === 'owner' ? 'Owner' : cashierName,
    };

    setProducts(deductInventory(products, cart));
    setTransactions([newTx, ...transactions]);

    playSoundEffect(checkoutSoundKind, soundEnabled);
    setLastTxSound(checkoutSoundKind);
    setLastTxReceipt(newTx);
    setCart([]); 
    setBuyerName(''); 
    setCashAmount('');
  };

  const handleBarcodeLookup = (rawCode: string, closeModalAfter: boolean = false) => {
    const clean = rawCode.trim();
    if (!clean) return;
    const matched = findProductByBarcode(products, clean);
    if (matched) {
      const isOutOfStock = matched.stock <= 0 && (matched.eceranStock || 0) <= 0;
      if (isOutOfStock) {
        setKasirWarning(`Produk "${matched.name}" (Barcode: ${clean}) sedang habis stoknya!`);
        setBarcodeFeedback(null);
      } else {
        addToCart(matched, 'Bungkus');
        setSearch('');
        setBarcodeFeedback(`Scan berhasil: ${matched.name} (+1 Bungkus)`);
        setTimeout(() => setBarcodeFeedback(null), 2800);
      }
    } else {
      setSearch(clean);
      setBarcodeFeedback(null);
      setKasirWarning(`Barcode "${clean}" belum terdaftar di menu Stok.`);
    }
    if (closeModalAfter) {
      setShowBarcodeScanner(false);
    }
  };

  const sortedProducts = useMemo(
    () => filterAndSortKasirProducts(products, search, activeCat),
    [products, search, activeCat]
  );

  const categoryMatchCounts = useMemo(() => {
    const allMatched = filterAndSortKasirProducts(products, search, 'Semua');
    const counts: Record<string, number> = { Semua: allMatched.length };
    allMatched.forEach((p) => {
      const cat = (p.category || 'Lainnya').trim() || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products, search]);

  const availableCategories = useMemo(() => {
    const known = new Set<string>(['Semua', ...CATEGORIES]);
    products.forEach((p) => {
      if (p.category) known.add(p.category);
    });
    return Array.from(known);
  }, [products]);

  return (
    <div className="p-4 md:p-8 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      <div className="flex-1 space-y-5">
        <div className="flex flex-col sm:flex-row gap-2">

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  const matched = findProductByBarcode(products, search);
                  if (matched) {
                    e.preventDefault();
                    handleBarcodeLookup(search, false);
                  }
                }
              }}
              placeholder="Cari nama produk, kategori, atau scan barcode..." 
              className="w-full pl-11 pr-10 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs md:text-sm" 
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Bersihkan pencarian" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={16}/>
              </button>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                playBeep('click');
                setShowBarcodeScanner(true);
              }}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-1.5 shrink-0 transition-all shadow-sm whitespace-nowrap"
              aria-label="Scan Barcode"
            >
              <ScanBarcode size={16} />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            {onNavigateToAiScan && (
              <button
                type="button"
                onClick={onNavigateToAiScan}
                className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl font-black text-xs uppercase flex items-center gap-1.5 shrink-0 transition-all shadow-sm whitespace-nowrap"
              >
                <Sparkles size={16} className="text-indigo-600 animate-pulse" />
                <span className="hidden sm:inline">Scan Foto AI</span>
              </button>
            )}
          </div>
        </div>

        {barcodeFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{barcodeFeedback}</span>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {availableCategories.map(c => {
            const count = categoryMatchCounts[c] || 0;
            return (
              <button key={c} type="button" onClick={() => { playBeep('click'); setActiveCat(c); }} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 ${activeCat === c ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>
                <span>{c}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeCat === c ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4" data-testid="kasir-product-grid">
            {sortedProducts.map(p => {
              const isOutOfStock = p.stock <= 0 && (p.eceranStock || 0) <= 0;
              return (
                <div key={p.id} className={`bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:shadow-md relative ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}>
                  <div>
                    <div className="w-full aspect-square bg-slate-100 relative overflow-hidden">
                      <img 
                        src={p.image || `https://placehold.co/300x300/e2e8f0/1e293b?text=${encodeURIComponent(p.name)}`} 
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e: any) => { e.target.src = `https://placehold.co/300x300/e2e8f0/1e293b?text=Produk`; }}
                      />
                      <span className="absolute top-2 left-2 text-[8px] font-black text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md uppercase">
                        {p.category}
                      </span>
                      {p.stock <= 2 && !isOutOfStock && (
                        <span className="absolute top-2 right-2 text-[8px] font-black text-amber-900 bg-amber-400 px-1.5 py-0.5 rounded-md uppercase shadow">Stok Tipis</span>
                      )}
                    </div>

                    <div className="p-4 pb-2">
                      <h4 className="font-black text-xs md:text-sm text-gray-800 leading-tight mb-2 line-clamp-2">{p.name}</h4>
                      <div className="text-[10px] font-bold text-gray-400 mb-3 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Stok Bungkus:</span>
                          <span className="font-black text-gray-700">{p.stock} Bks</span>
                        </div>
                        {p.isKeteng && (
                          <div className="flex justify-between text-orange-600">
                            <span>Sisa Keteng:</span>
                            <span className="font-black">{p.eceranStock || 0} Pcs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-1.5">
                    <button disabled={isOutOfStock} onClick={() => addToCart(p, 'Bungkus')} className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-40 flex items-center justify-between px-3">
                      <span>/ Bungkus</span>
                      <span>{formatRp(p.sellingPrice)}</span>
                    </button>

                    {p.isKeteng && (
                      <button disabled={isOutOfStock} onClick={() => addToCart(p, 'Pcs')} className="w-full bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-40 flex items-center justify-between px-3">
                        <span className="flex items-center gap-1"><Scissors size={10}/> / Pcs</span>
                        <span>{formatRp(p.ketengPrice)}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center space-y-3">
            <Search size={32} className="mx-auto text-gray-300" />
            <p className="text-xs font-black uppercase text-gray-500">
              Produk tidak ditemukan untuk kategori "{activeCat}"{search ? ` dan kata kunci "${search}"` : ''}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setActiveCat('Semua');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase"
            >
              Tampilkan Semua Produk
            </button>
          </div>
        )}
      </div>

      <div className="lg:w-[380px] bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl h-fit sticky top-20 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
           <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600"/>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">Keranjang Transaksi</h3>
           </div>
           <div className="flex items-center gap-1.5">
             {onToggleSound && (
               <button
                 type="button"
                 onClick={onToggleSound}
                 data-testid="kasir-sound-toggle"
                 aria-label={soundEnabled ? 'Nonaktifkan suara notifikasi' : 'Aktifkan suara notifikasi'}
                 title={soundEnabled ? 'Suara Notifikasi Aktif (Klik untuk senyapkan)' : 'Suara Notifikasi Nonaktif (Klik untuk aktifkan)'}
                 className={`p-1.5 rounded-xl border transition-all ${
                   soundEnabled
                     ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                     : 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-600'
                 }`}
               >
                 {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
               </button>
             )}
             <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-black">
              {cart.reduce((a, b) => a + b.quantity, 0)} Item
             </span>
           </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {cart.length > 0 ? cart.map(i => (
              <motion.div 
                key={i.cartId} 
                layout
                initial={{ opacity: 0, scale: 0.88, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="flex justify-between items-center text-xs bg-gray-50/50 p-3 rounded-2xl border border-gray-50 hover:border-blue-100 transition-colors"
              >
                <div className="flex-1 pr-2">
                  <p className="font-black text-gray-800 uppercase text-[11px] line-clamp-1">{i.name}</p>
                  <p className="text-[10px] font-bold text-gray-400">{formatRp(i.priceAtTime)} x {i.quantity}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <button onClick={() => updateCartQty(i.cartId, -1)} className="px-2 py-1 font-black text-gray-500 hover:bg-gray-100 active:scale-95 transition">-</button>
                    <span className="px-2 text-[10px] font-black">{i.quantity}</span>
                    <button onClick={() => updateCartQty(i.cartId, 1)} className="px-2 py-1 font-black text-gray-500 hover:bg-gray-100 active:scale-95 transition">+</button>
                  </div>
                  <span className="font-black text-blue-600 text-xs w-16 text-right">{formatRp(i.priceAtTime * i.quantity)}</span>
                </div>
              </motion.div>
            )) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-wider"
              >
                Keranjang masih kosong
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {cart.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            {/* Opsi Metode Pembayaran: Tunai, QRIS, Kasbon */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  type="button" 
                  onClick={() => { setPaymentMethod('TUNAI'); setPaymentType('LUNAS'); }} 
                  className={`py-2.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-1 ${paymentMethod === 'TUNAI' && paymentType === 'LUNAS' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'}`}
                >
                  <span>Tunai</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => { 
                    setPaymentMethod('QRIS'); 
                    setPaymentType('LUNAS'); 
                    setShowQRISModal(true); 
                  }} 
                  className={`py-2.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-1 ${paymentMethod === 'QRIS' ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'}`}
                >
                  <QrCode size={12} />
                  <span>QRIS</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => { setPaymentMethod('KASBON'); setPaymentType('MENUNGGU'); }} 
                  className={`py-2.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-1 ${paymentType === 'MENUNGGU' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-100 hover:bg-gray-100'}`}
                >
                  <span>Kasbon</span>
                </button>
              </div>
              {soundEnabled && (
                <div className="flex items-center justify-between gap-1.5 pt-1 text-[9px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <Volume2 size={11} className="text-blue-500" /> Tes Nada:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="test-sound-tunai"
                      onClick={() => playSoundEffect('tunai', true)}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-black uppercase transition-colors"
                    >
                      Tunai
                    </button>
                    <button
                      type="button"
                      data-testid="test-sound-qris"
                      onClick={() => playSoundEffect('qris', true)}
                      className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 font-black uppercase transition-colors"
                    >
                      QRIS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* QRIS Active Banner & Modal Trigger */}
            {paymentMethod === 'QRIS' && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-rose-700 flex items-center gap-1.5">
                    <QrCode size={14} className="text-rose-600" /> QRIS Non-Tunai Dipilih
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQRISModal(true)}
                    className="text-[9px] font-black text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-rose-200 uppercase shadow-2xs hover:bg-rose-50 transition active:scale-95"
                  >
                    Buka QR Code
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
                  Pelanggan scan barcode QRIS di layar. Pembayaran non-tunai langsung lunas sesuai total transaksi ({formatRp(subtotal)}).
                </p>
              </div>
            )}

            {(paymentType === 'MENUNGGU' || (paymentType === 'LUNAS' && paymentMethod === 'TUNAI' && cashAmount !== '' && Number(cashAmount) < subtotal)) && (
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nama Pembeli (Wajib untuk Kasbon/Kekurangan)..." className="w-full p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500" />
            )}

            {paymentType === 'LUNAS' && paymentMethod === 'TUNAI' && (
              <div className="space-y-2">
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder={`Nominal Diterima (Min ${formatRp(subtotal)})`} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setCashAmount(String(subtotal))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold uppercase">Uang Pas</button>
                  <button onClick={() => setCashAmount('10000')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">10rb</button>
                  <button onClick={() => setCashAmount('20000')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">20rb</button>
                  <button onClick={() => setCashAmount('50000')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">50rb</button>
                  <button onClick={() => setCashAmount('100000')} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">100rb</button>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal</span>
                <span className="text-xl font-black text-blue-600">{formatRp(subtotal)}</span>
              </div>
              {paymentType === 'LUNAS' && paymentMethod === 'TUNAI' && cashAmount !== '' && Number(cashAmount) < subtotal && (
                <div className="flex justify-between items-center text-xs font-black border-t border-amber-200 pt-2 text-amber-700">
                  <span>Kurang (Masuk Kasbon)</span>
                  <span>{formatRp(subtotal - Number(cashAmount))}</span>
                </div>
              )}
              {paymentType === 'LUNAS' && paymentMethod === 'TUNAI' && (cashAmount === '' || Number(cashAmount) >= subtotal) && (
                <div className="flex justify-between items-center text-xs font-black border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Kembalian</span>
                  <span className="text-emerald-600">{formatRp(changeAmount)}</span>
                </div>
              )}
              {paymentMethod === 'QRIS' && (
                <div className="flex justify-between items-center text-xs font-black border-t border-gray-200 pt-2 text-rose-600">
                  <span>Metode</span>
                  <span>QRIS Non-Tunai Pas</span>
                </div>
              )}
            </div>

            {kasirWarning && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{kasirWarning}</span>
              </div>
            )}

            <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <CheckCircle size={18}/> {paymentMethod === 'QRIS' ? 'Selesaikan Transaksi QRIS' : 'Bayar Transaksi'}
            </button>
          </div>
        )}
      </div>

      {showQRISModal && (
        <QRISModal
          amount={subtotal}
          profile={profile}
          onClose={() => setShowQRISModal(false)}
          onConfirmPaid={() => {
            setCashAmount(String(subtotal));
            setPaymentType('LUNAS');
            setPaymentMethod('QRIS');
            setShowQRISModal(false);
            playBeep('click');
          }}
        />
      )}

      {showBarcodeScanner && (
        <BarcodeScannerModal
          title="Scan Barcode Kasir"
          subtitle="Arahkan kamera ke barcode kemasan untuk langsung menambahkan produk ke keranjang kasir."
          onDetected={(code) => handleBarcodeLookup(code, true)}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {lastTxReceipt && (
        <ReceiptModal
          tx={lastTxReceipt}
          profile={profile}
          printerSession={printerSession}
          checkoutSoundKind={lastTxSound}
          soundEnabled={soundEnabled}
          onClose={() => {
            setLastTxReceipt(null);
            setLastTxSound(null);
          }}
        />
      )}
    </div>
  );
};

// --- MODAL STRUK ---
const ReceiptModal = ({
  tx,
  profile,
  printerSession,
  checkoutSoundKind,
  soundEnabled = true,
  onClose,
}: {
  tx: Transaction;
  profile: any;
  printerSession: PrinterSessionState;
  checkoutSoundKind?: CheckoutSoundKind | null;
  soundEnabled?: boolean;
  onClose: () => void;
}) => {
  const [printerStatus, setPrinterStatus] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showWifiForm, setShowWifiForm] = useState(false);
  const [wifiIp, setWifiIp] = useState('192.168.1.100:9100');

  const printViaBluetooth = async () => {
    setIsPrinting(true);
    try {
      let char = printerSession.characteristic;
      let activeName = printerSession.deviceName || 'Printer Thermal';

      if (!char || !printerSession.device?.gatt?.connected) {
        setPrinterStatus('Menghubungkan ke printer thermal Bluetooth...');
        const connected = await printerSession.onConnect();
        if (!connected) {
          setPrinterStatus('Printer Bluetooth belum terhubung. Gunakan Chrome/Edge Android/Desktop atau pilih Cetak Browser.');
          return;
        }
        char = connected.characteristic;
        activeName = connected.name;
      }

      setPrinterStatus(`Mengirim ESC/POS ke ${activeName}...`);
      const payload = buildRetailEscPosPayload(tx, profile);
      await sendEscPosToCharacteristic(char, payload);
      playBeep('success');
      setPrinterStatus(`Berhasil dicetak via ${activeName}!`);
      setTimeout(() => setPrinterStatus(''), 3500);
    } catch (err: any) {
      setPrinterStatus(err?.message || 'Gagal mengirim ke printer Bluetooth. Silakan cek koneksi atau gunakan Cetak Browser.');
    } finally {
      setIsPrinting(false);
    }
  };

  const printViaWiFi = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIp = wifiIp.trim();
    if (!cleanIp) return;

    setIsPrinting(true);
    setPrinterStatus(`Menghubungkan ke printer Wi-Fi ${cleanIp}...`);

    try {
      const response = await fetch(`http://${cleanIp}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx, profile })
      });
      if (!response.ok) throw new Error('Gagal terhubung ke printer Wi-Fi.');
      setPrinterStatus('Berhasil mencetak via Wi-Fi!');
      setShowWifiForm(false);
      setTimeout(() => setPrinterStatus(''), 3000);
    } catch {
      setPrinterStatus('Printer Wi-Fi tidak merespons di alamat tersebut. Gunakan Bluetooth atau Cetak Browser.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-black text-xs uppercase text-gray-700">Struk Transaksi Retail</h3>
            <p className="text-[10px] font-bold text-slate-400">
              Printer BT: <span className={printerSession.device ? 'text-emerald-600' : 'text-amber-600'}>{printerSession.statusInfo}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup struk" className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl font-mono text-[11px] text-gray-800 space-y-3 border border-slate-200">
          <div className="text-center space-y-1">
            <p className="font-black text-sm uppercase">{profile.ownerName || 'WARUNG PINTAR'}</p>
            {profile.address && <p className="text-[9px] text-gray-500">{profile.address}</p>}
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 text-[9px] space-y-0.5">
            <div className="flex justify-between"><span>No:</span><span>{tx.id}</span></div>
            <div className="flex justify-between"><span>Tgl:</span><span>{formatDate(tx.date)}</span></div>
            <div className="flex justify-between font-bold">
              <span>Metode Pembayaran:</span>
              <span>{getReceiptPaymentMethodLabel(tx)}</span>
            </div>
            {isKasbonTransaction(tx) && (
              <div className="flex justify-between font-bold text-amber-700">
                <span>Nama Pelanggan:</span>
                <span className="uppercase">{tx.buyer || 'Pelanggan Umum'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 py-1">
            {tx.items?.map((it, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold uppercase text-[10px]">{it.name}</div>
                <div className="flex justify-between text-gray-600">
                  <span>{it.quantity} x {formatRp(it.priceAtTime)}</span>
                  <span>{formatRp(it.priceAtTime * it.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[10px]">
            <div className="flex justify-between font-bold text-xs">
              <span>TOTAL</span>
              <span className="tabular-nums">{formatRp(tx.totalAmount)}</span>
            </div>
            {tx.status === 'LUNAS' && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>Bayar</span>
                  <span className="tabular-nums">{formatRp(tx.cashPaid || tx.totalAmount)}</span>
                </div>
                {Boolean(tx.change && tx.change > 0) && (
                  <div className="flex justify-between text-gray-500">
                    <span>Kembali</span>
                    <span className="tabular-nums">{formatRp(tx.change)}</span>
                  </div>
                )}
              </>
            )}
            {(tx.status === 'MENUNGGU' || Boolean(tx.shortage && tx.shortage > 0)) && (
              <div className="flex justify-between text-amber-600 font-bold">
                <span>Kurang (Kasbon)</span>
                <span className="tabular-nums">{formatRp(tx.shortage || tx.totalAmount)}</span>
              </div>
            )}
          </div>

          {tx.isCancelled && (
            <div className="bg-rose-100 border border-rose-300 text-rose-800 text-center py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider">
              TRANSAKSI DIBATALKAN (RETUR)
            </div>
          )}

          {Array.isArray(tx.returnRecords) && tx.returnRecords.length > 0 && (
            <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[9px] text-rose-700">
              <p className="font-black uppercase">Riwayat Retur / Tukar:</p>
              {tx.returnRecords.map((rec) => (
                <div key={rec.id} className="bg-rose-50/70 p-2 rounded-lg space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{rec.action === 'EXCHANGE' ? 'Tukar Barang' : rec.action === 'CANCEL' ? 'Batal Penuh' : 'Retur Sebagian'}</span>
                    <span>
                      {rec.action === 'EXCHANGE'
                        ? rec.priceDifference > 0
                          ? `Tambah ${formatRp(rec.priceDifference)}`
                          : rec.priceDifference < 0
                          ? `Kembali ${formatRp(Math.abs(rec.priceDifference))}`
                          : 'Impas'
                        : `Refund ${formatRp(rec.refundAmount)}`}
                    </span>
                  </div>
                  <p className="text-[8px] text-gray-600">Alasan: {rec.reason} • Oleh: {rec.processedBy}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-dashed border-gray-300 space-y-2.5">
            <ReceiptBarcode value={tx.id} />
            <div className="text-center text-[9px] text-gray-400">
              {profile.footerNote || 'Terima kasih atas kunjungan Anda!'}
            </div>
          </div>
        </div>

        {checkoutSoundKind && (
          <div
            data-testid="receipt-sound-indicator"
            data-sound-kind={checkoutSoundKind}
            className={`px-3 py-2 rounded-xl border text-[10px] font-black flex items-center justify-between gap-2 ${
              checkoutSoundKind === 'qris'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : checkoutSoundKind === 'kasbon'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {soundEnabled
                ? `Diputar: ${getCheckoutSoundLabel(checkoutSoundKind)}`
                : `Suara Nonaktif (${getCheckoutSoundLabel(checkoutSoundKind)})`}
            </span>
            <button
              type="button"
              onClick={() => playSoundEffect(checkoutSoundKind, true)}
              className="px-2 py-0.5 rounded-lg bg-white border border-current/20 text-[9px] uppercase hover:opacity-80 transition-opacity"
            >
              Putar Ulang
            </button>
          </div>
        )}

        {printerStatus && (
          <div className="p-3 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-xl text-center">
            {printerStatus}
          </div>
        )}

        {showWifiForm && (
          <form onSubmit={printViaWiFi} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label htmlFor="wifi-printer-ip" className="block text-[10px] font-black uppercase text-slate-600">
              Alamat IP Printer Thermal Wi-Fi
            </label>
            <div className="flex gap-2">
              <input
                id="wifi-printer-ip"
                type="text"
                value={wifiIp}
                onChange={(e) => setWifiIp(e.target.value)}
                placeholder="192.168.1.100:9100"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isPrinting}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase whitespace-nowrap"
              >
                Kirim
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPrinting || printerSession.isConnecting}
              onClick={printViaBluetooth} 
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <Bluetooth size={14}/> Bluetooth (ESC/POS)
            </button>
            <button
              type="button"
              disabled={isPrinting}
              onClick={() => setShowWifiForm((v) => !v)} 
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
            >
              <Zap size={14}/> Wi-Fi
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase whitespace-nowrap">
              Cetak Browser
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-black text-[10px] uppercase whitespace-nowrap">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3. DIGITAL VIEW (PPOB & DIGITAL) ---
const DigitalView = ({
  digitalTransactions,
  setDigitalTransactions,
  profile,
  printerSession,
  appMode = 'owner',
  cashierName = 'Karyawan Kasir',
}: {
  digitalTransactions: DigitalTransaction[];
  setDigitalTransactions: React.Dispatch<React.SetStateAction<DigitalTransaction[]>>;
  profile: any;
  printerSession: PrinterSessionState;
  appMode?: AppMode;
  cashierName?: string;
}) => {
  const [serviceType, setServiceType] = useState('Pulsa');
  const [provider, setProvider] = useState('Telkomsel');
  const [targetNumber, setTargetNumber] = useState('');
  const [nominal, setNominal] = useState(20000);
  const [adminFee, setAdminFee] = useState(2500);
  const [customerName, setCustomerName] = useState('');
  const [digitalError, setDigitalError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<DigitalTransaction | null>(null);
  const [ppobToastTx, setPpobToastTx] = useState<DigitalTransaction | null>(null);

  useEffect(() => {
    if (!ppobToastTx) return;
    const timer = window.setTimeout(() => {
      setPpobToastTx(null);
    }, PPOB_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [ppobToastTx]);

  const handleServiceChange = (type: string) => {
    playBeep('click');
    setDigitalError(null);
    setServiceType(type);
    if (type === 'Pulsa' || type === 'Kuota') {
      setProvider('Telkomsel');
    } else if (type === 'E-Wallet') {
      setProvider('DANA');
    } else if (type === 'Token PLN') {
      setProvider('Token PLN Prabayar');
    } else if (type === 'Tarik Tunai') {
      setProvider('BCA / Mandiri / BRI');
    } else {
      setProvider('Lainnya');
    }
  };

  const totalBayar = Number(nominal) + Number(adminFee);

  const handleDigitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNumber.trim()) {
      setDigitalError("Masukkan nomor HP, ID Pelanggan, atau Nama Pelanggan!");
      return;
    }
    setDigitalError(null);

    playBeep('success');
    const txId = `DIG-${Date.now().toString().slice(-6)}`;
    
    const newDigitalTx: DigitalTransaction = {
      id: txId,
      date: new Date().toISOString(),
      serviceType,
      provider,
      targetNumber: targetNumber.trim(),
      baseAmount: Number(nominal),
      fee: Number(adminFee),
      sellAmount: totalBayar,
      customer: customerName.trim() || 'Pelanggan Umum',
      status: 'LUNAS',
      type: 'DIGITAL',
      paymentMethod: 'TUNAI',
      handledBy: appMode === 'owner' ? 'Owner' : cashierName,
    };

    setDigitalTransactions([newDigitalTx, ...digitalTransactions]);
    setLastReceipt(newDigitalTx);
    setPpobToastTx(newDigitalTx);
    setTargetNumber('');
    setCustomerName('');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Layanan PPOB & Digital</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Top-up pulsa, kuota internet, token listrik, e-wallet, dan tarik tunai</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'Pulsa', label: 'Pulsa', icon: <Phone size={16}/> },
              { id: 'Kuota', label: 'Kuota', icon: <Smartphone size={16}/> },
              { id: 'Token PLN', label: 'PLN', icon: <Zap size={16}/> },
              { id: 'E-Wallet', label: 'E-Wallet', icon: <Wallet size={16}/> },
              { id: 'Tarik Tunai', label: 'Tarik Tunai', icon: <CreditCard size={16}/> },
              { id: 'Lainnya', label: 'Lainnya', icon: <Sparkles size={16}/> }
            ].map(cat => (
              <button 
                key={cat.id} 
                type="button"
                onClick={() => handleServiceChange(cat.id)}
                className={`py-3 px-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[10px] font-black uppercase transition-all ${serviceType === cat.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-gray-500 border border-gray-100 hover:bg-slate-100'}`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleDigitalSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Provider / Operator / Jenis</label>
                {(serviceType === 'Pulsa' || serviceType === 'Kuota') ? (
                  <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs">
                    <option value="Telkomsel">Telkomsel</option>
                    <option value="XL">XL</option>
                    <option value="Three 3">Three (3)</option>
                    <option value="Indosat">Indosat Ooredoo</option>
                    <option value="Axis">Axis</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                ) : serviceType === 'E-Wallet' ? (
                  <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs">
                    <option value="DANA">DANA</option>
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="ShopeePay">ShopeePay</option>
                    <option value="Seabank">Seabank</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                ) : (
                  <input type="text" value={provider} onChange={e => setProvider(e.target.value)} placeholder="Cth: Token PLN / Tarik Tunai BCA" className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" required />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">No. HP / ID Pelanggan / Nama Pelanggan</label>
                <input type="text" value={targetNumber} onChange={e => setTargetNumber(e.target.value)} placeholder="No. HP / Rekening atau Nama Pelanggan..." className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nominal Transaksi (Rp)</label>
                <input type="number" value={nominal} onChange={e => setNominal(Number(e.target.value) || 0)} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Biaya Admin / Laba (Rp)</label>
                <input type="number" value={adminFee} onChange={e => setAdminFee(Number(e.target.value) || 0)} className="w-full p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-bold text-xs text-emerald-700" required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Catatan Tambahan</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Catatan / Keterangan..." className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              {[10000, 20000, 50000, 100000, 200000, 500000].map(val => (
                <button key={val} type="button" onClick={() => setNominal(val)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-black uppercase text-gray-600">
                  {formatRp(val)}
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Nominal Layanan:</span>
                <span>{formatRp(nominal)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600">
                <span>Keuntungan Admin (Laba):</span>
                <span>+ {formatRp(adminFee)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-xs font-black uppercase text-gray-800">Total Tagihan Pelanggan:</span>
                <span className="text-2xl font-black text-blue-600">{formatRp(totalBayar)}</span>
              </div>
            </div>

            {digitalError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{digitalError}</span>
              </div>
            )}

            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <CheckCircle size={18}/> Proses Transaksi Digital
            </button>
          </form>
      </div>

      <PpobSuccessToast
        tx={ppobToastTx}
        onClose={() => setPpobToastTx(null)}
        onOpenReceipt={
          ppobToastTx && !lastReceipt
            ? () => setLastReceipt(ppobToastTx)
            : undefined
        }
      />

      {lastReceipt && (
        <DigitalReceiptModal
          tx={lastReceipt}
          profile={profile}
          printerSession={printerSession}
          onClose={() => setLastReceipt(null)}
        />
      )}
    </div>
  );
};

const DigitalReceiptModal = ({
  tx,
  profile,
  printerSession,
  onClose,
}: {
  tx: DigitalTransaction;
  profile: any;
  printerSession: PrinterSessionState;
  onClose: () => void;
}) => {
  const [printerStatus, setPrinterStatus] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const printViaBluetooth = async () => {
    setIsPrinting(true);
    try {
      let char = printerSession.characteristic;
      let activeName = printerSession.deviceName || 'Printer Thermal';

      if (!char || !printerSession.device?.gatt?.connected) {
        setPrinterStatus('Menghubungkan ke printer thermal Bluetooth...');
        const connected = await printerSession.onConnect();
        if (!connected) {
          setPrinterStatus('Printer Bluetooth belum terhubung. Gunakan Chrome/Edge Android/Desktop atau pilih Cetak Browser.');
          return;
        }
        char = connected.characteristic;
        activeName = connected.name;
      }

      setPrinterStatus(`Mengirim ESC/POS ke ${activeName}...`);
      const payload = buildDigitalEscPosPayload(tx, profile);
      await sendEscPosToCharacteristic(char, payload);
      playBeep('success');
      setPrinterStatus(`Struk Digital berhasil dicetak via ${activeName}!`);
      setTimeout(() => setPrinterStatus(''), 3500);
    } catch (err: any) {
      setPrinterStatus(err?.message || 'Gagal mencetak via Bluetooth. Gunakan Cetak Browser.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-black text-xs uppercase text-gray-700">Struk Transaksi Digital</h3>
            <p className="text-[10px] font-bold text-slate-400">
              Printer BT: <span className={printerSession.device ? 'text-emerald-600' : 'text-amber-600'}>{printerSession.statusInfo}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup struk digital" className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl font-mono text-[11px] text-gray-800 space-y-3 border border-slate-200">
          <div className="text-center space-y-1">
            <p className="font-black text-sm uppercase">{profile.ownerName || 'WARUNG PINTAR'}</p>
            {profile.address && <p className="text-[9px] text-gray-500">{profile.address}</p>}
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 text-[9px] space-y-1">
            <div className="flex justify-between"><span>No Ref:</span><span>{tx.id}</span></div>
            <div className="flex justify-between"><span>Tgl:</span><span>{formatDate(tx.date)}</span></div>
            <div className="flex justify-between font-bold"><span>Layanan:</span><span>{tx.serviceType} ({tx.provider})</span></div>
            <div className="flex justify-between"><span>Tujuan:</span><span className="font-bold">{tx.targetNumber}</span></div>
            <div className="flex justify-between font-bold">
              <span>Metode Pembayaran:</span>
              <span>{getReceiptPaymentMethodLabel(tx)}</span>
            </div>
            {isKasbonTransaction(tx) && (
              <div className="flex justify-between font-bold text-amber-700">
                <span>Nama Pelanggan:</span>
                <span className="uppercase">{tx.customer || 'Pelanggan Umum'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 py-1 text-[10px]">
            <div className="flex justify-between text-gray-600">
              <span>Nominal Layanan</span>
              <span className="tabular-nums">{formatRp(tx.baseAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Biaya Admin / Jasa</span>
              <span className="tabular-nums">{formatRp(tx.fee)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[10px]">
            <div className="flex justify-between font-bold text-xs">
              <span>TOTAL BAYAR</span>
              <span className="text-blue-600 tabular-nums">{formatRp(tx.sellAmount)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-gray-300 space-y-2.5">
            <ReceiptBarcode value={tx.id} />
            <div className="text-center text-[9px] text-gray-400">
              {profile.footerNote || 'Terima kasih atas kunjungan Anda!'}
            </div>
          </div>
        </div>

        {printerStatus && (
          <div className="p-3 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-xl text-center">
            {printerStatus}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            disabled={isPrinting || printerSession.isConnecting}
            onClick={printViaBluetooth}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
          >
            <Bluetooth size={14}/> Cetak Bluetooth (ESC/POS)
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 whitespace-nowrap">
              <Printer size={14}/> Cetak Browser
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase whitespace-nowrap">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. STOK VIEW ---
interface StokViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  profile?: any;
  appMode?: AppMode;
  onNavigateToAiScan?: () => void;
}

const StokView: React.FC<StokViewProps> = ({
  products,
  setProducts,
  profile,
  appMode = 'owner',
}) => {
  const canEditStock = canManageInventoryAndSettings(appMode);
  const canSeeCost = canViewFinancialProfit(appMode);
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null); 
  
  const [formData, setFormData] = useState({
    barcode: '', name: '', cat: 'Sembako', cost: '', sell: '', stock: '',
    minStock: String(DEFAULT_LOW_STOCK_THRESHOLD),
    isKeteng: false, ketengPrice: '', pcsPerPack: '12', eceranStock: '0', image: ''
  });

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (showAiScanner) {
    return (
      <AiImageAnalysisView
        products={products}
        defaultMode="product_detection"
        title="Scan & Deteksi Produk AI (Menu Stok)"
        subtitle="Ambil foto atau unggah gambar kemasan produk. Gemini AI akan menganalisis nama, kategori, estimasi harga modal & jual, dan menyimpannya langsung ke gudang stok."
        onClose={() => setShowAiScanner(false)}
        onAddProductToStock={(newProd) => {
          setProducts((prev) => [newProd, ...prev]);
          setShowAiScanner(false);
        }}
        playBeep={playBeep}
      />
    );
  }

  const openForm = (p: Product | null = null) => {
    setCameraError(null);
    if (p) {
      setEditingId(p.id);
      setFormData({ 
        barcode: p.barcode || '',
        name: p.name, cat: p.category, cost: String(p.costPrice), sell: String(p.sellingPrice), stock: String(p.stock),
        minStock: String(p.minStock ?? DEFAULT_LOW_STOCK_THRESHOLD),
        isKeteng: p.isKeteng || false, ketengPrice: String(p.ketengPrice || ''), 
        pcsPerPack: String(p.pcsPerPack || '12'), eceranStock: String(p.eceranStock || '0'),
        image: p.image || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        barcode: '', name: '', cat: 'Sembako', cost: '', sell: '', stock: '',
        minStock: String(DEFAULT_LOW_STOCK_THRESHOLD),
        isKeteng: false, ketengPrice: '', pcsPerPack: '12', eceranStock: '0', image: ''
      });
    }
    setShowForm(true);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Perangkat atau browser tidak mendukung akses kamera langsung. Silakan gunakan tombol Galeri.');
      setIsCameraActive(false);
      return;
    }

    setIsCameraActive(true);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setCameraError(
        isDenied
          ? 'Izin kamera ditolak. Silakan berikan izin di pengaturan browser atau gunakan tombol Galeri.'
          : 'Kamera tidak dapat diakses saat ini. Silakan gunakan tombol Galeri.'
      );
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const compressed = await compressDataUrl(rawDataUrl, 'product');
        setFormData((prev) => ({ ...prev, image: compressed }));
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 'product');
      setFormData((prev) => ({ ...prev, image: compressed }));
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({ ...prev, image: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Product = {
      id: editingId || `P-${Date.now().toString().slice(-4)}`,
      barcode: formData.barcode.trim(),
      name: formData.name.trim(), 
      category: formData.cat, 
      costPrice: Number(formData.cost) || 0,
      sellingPrice: Number(formData.sell) || 0, 
      stock: Math.max(0, Math.floor(Number(formData.stock) || 0)),
      minStock: Math.max(0, Math.floor(Number(formData.minStock) || DEFAULT_LOW_STOCK_THRESHOLD)),
      isKeteng: formData.isKeteng, 
      ketengPrice: formData.isKeteng ? Number(formData.ketengPrice) || 0 : 0,
      pcsPerPack: formData.isKeteng ? Math.max(1, Number(formData.pcsPerPack) || 1) : 1,
      eceranStock: formData.isKeteng ? Math.max(0, Number(formData.eceranStock) || 0) : 0,
      image: formData.image || ''
    };

    if (editingId) {
      setProducts(products.map(p => p.id === editingId ? payload : p));
    } else {
      setProducts([payload, ...products]);
    }
    stopCamera();
    setShowForm(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    setProducts(products.filter(p => p.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = catFilter === 'Semua' || p.category === catFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
             {canEditStock ? 'Gudang & Inventori Toko' : 'Cek Ketersediaan Stok Barang'}
           </h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">
             {canEditStock
               ? 'Kelola stok produk, kode barcode, supplier barang, dan daftar belanja'
               : 'Mode Karyawan Kasir: Lihat stok tersedia, kode barcode & harga jual produk (Harga modal & edit dikunci Owner)'}
           </p>
        </div>
        {canEditStock ? (
          <div className="flex flex-wrap items-center gap-2">
            <button 
              type="button"
              onClick={() => setShowAiScanner(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <Sparkles size={16} className="text-yellow-300 animate-pulse" />
              Scan Produk AI
            </button>
            <button type="button" onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all whitespace-nowrap">
              <Plus size={16}/> Tambah Produk
            </button>
          </div>
        ) : (
          <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-[10px] font-black uppercase flex items-center gap-1.5 whitespace-nowrap">
            <Lock size={13} />
            <span>Hanya Baca (Mode Kasir)</span>
          </div>
        )}
      </div>

      <div className="flex flex-col 2xl:flex-row gap-3 justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama barang atau barcode..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none text-xs font-bold" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['Semua', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${catFilter === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Stok Bungkus</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Sisa Keteng</th>
                <th className="px-6 py-4">{canSeeCost ? 'Harga Modal / Jual' : 'Harga Jual'}</th>
                {canEditStock && <th className="px-6 py-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length > 0 ? filteredProducts.map(p => (
                <tr key={p.id} className="text-xs hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <img 
                      src={p.image || `https://placehold.co/100x100/e2e8f0/1e293b?text=Produk`} 
                      alt={p.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0" 
                      onError={(e: any) => { e.target.src = `https://placehold.co/100x100/e2e8f0/1e293b?text=Produk`; }}
                    />
                    <div>
                      <p className="font-black text-gray-800 uppercase mb-0.5">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{p.category}</span>
                        {p.barcode && (
                          <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                            <ScanBarcode size={10} />
                            {p.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className={`px-3 py-1 rounded-xl text-[10px] font-black whitespace-nowrap tabular-nums ${p.stock <= (p.minStock ?? DEFAULT_LOW_STOCK_THRESHOLD) ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {p.stock} Bks
                     </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black">
                     {p.isKeteng ? (
                       <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-xl text-[10px] inline-block whitespace-nowrap">
                        {p.eceranStock || 0} Pcs
                       </span>
                     ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col font-black">
                        <span className="text-gray-800">{formatRp(p.sellingPrice)} <span className="text-[9px] font-normal text-gray-400">/Bks</span></span>
                        {canSeeCost && (
                          <span className="text-[9px] text-gray-400 font-normal">Modal: {formatRp(p.costPrice)}</span>
                        )}
                        {p.isKeteng && <span className="text-[9px] text-orange-600 uppercase">Ecer: {formatRp(p.ketengPrice)}/Pcs</span>}
                     </div>
                  </td>
                  {canEditStock && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openForm(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" aria-label={`Edit ${p.name}`}><Edit3 size={16}/></button>
                        <button onClick={() => setDeleteConfirm(p)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" aria-label={`Hapus ${p.name}`}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={canEditStock ? 5 : 4} className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">
                    Belum ada produk yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-[2.5rem] w-full max-w-lg space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-lg text-gray-800 uppercase">{editingId ? 'Edit Data Produk' : 'Tambah Produk Baru'}</h3>
              <button type="button" onClick={() => { stopCamera(); setShowForm(false); }} className="text-gray-400 hover:text-red-500 p-1"><X size={20}/></button>
            </div>
            
            {!editingId && (
              <button 
                type="button" 
                onClick={() => { stopCamera(); setShowForm(false); setShowAiScanner(true); }}
                className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Sparkles size={15} className="text-indigo-600 animate-pulse" />
                <span>Foto Kemasan Produk & Isi Otomatis dengan AI</span>
              </button>
            )}
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Foto / Gambar Produk</label>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-200">
                  <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden shrink-0 border border-gray-300">
                    <img 
                      src={formData.image || `https://placehold.co/150x150/e2e8f0/1e293b?text=Preview`} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e: any) => { e.target.src = `https://placehold.co/150x150/e2e8f0/1e293b?text=Preview`; }}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={startCamera} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1">
                        Kamera
                      </button>
                      <label className="px-3 py-2 bg-slate-200 text-gray-700 hover:bg-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer">
                        Galeri
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </div>
                    {formData.image && (
                      <button type="button" onClick={() => setFormData({ ...formData, image: '' })} className="text-[9px] text-red-500 font-bold uppercase block">
                        Hapus Foto
                      </button>
                    )}
                    {cameraError && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold leading-relaxed">
                        {cameraError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Atau Masukkan URL / Link Web Gambar</label>
                  <input 
                    type="url" 
                    value={formData.image} 
                    onChange={e => setFormData({ ...formData, image: e.target.value })} 
                    placeholder="https://example.com/gambar-produk.jpg" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" 
                  />
                </div>

                {isCameraActive && (
                  <div className="space-y-2 bg-black p-3 rounded-2xl relative">
                    <video ref={videoRef} playsInline autoPlay className="w-full h-48 object-cover rounded-xl bg-black"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="flex gap-2">
                      <button type="button" onClick={capturePhoto} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase">
                        Ambil Foto
                      </button>
                      <button type="button" onClick={stopCamera} className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase">
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Barang / Produk</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" required placeholder="Cth: Dji Sam Soe 12" />
              </div>

              <div className="space-y-1">
                <label htmlFor="stok-barcode-input" className="text-[10px] font-black text-gray-400 uppercase ml-1">
                  Kode Barcode Produk (Opsional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="stok-barcode-input"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-mono font-bold text-xs"
                    placeholder="Scan atau ketik kode barcode..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      setShowBarcodeModal(true);
                    }}
                    className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <ScanBarcode size={14} />
                    Scan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Harga Modal /Bks</label>
                  <input type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" required placeholder="15000" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Harga Jual /Bks</label>
                  <input type="number" value={formData.sell} onChange={e => setFormData({...formData, sell: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" required placeholder="20000" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stok (Bungkus)</label>
                   <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" required placeholder="10" />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Batas Stok Min.</label>
                   <input
                     type="number"
                     min={0}
                     value={formData.minStock}
                     onChange={e => setFormData({ ...formData, minStock: e.target.value })}
                     className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs"
                     placeholder="5"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Kategori</label>
                   <select value={formData.cat} onChange={e => setFormData({...formData, cat: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs">
                     {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border transition-all ${formData.isKeteng ? 'bg-orange-50/50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Scissors size={18} className={formData.isKeteng ? 'text-orange-600' : 'text-gray-400'}/>
                       <div>
                          <span className="text-xs font-black uppercase text-gray-800">Mode Keteng / Batangan</span>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Diperbolehkan ecer per unit/batang</p>
                       </div>
                    </div>
                    <input type="checkbox" checked={formData.isKeteng} onChange={e => setFormData({...formData, isKeteng: e.target.checked})} className="w-5 h-5 accent-orange-600 rounded cursor-pointer" />
                 </div>
                 
                 {formData.isKeteng && (
                   <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-orange-200/50">
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-orange-700 uppercase">Isi /Bks</label>
                         <input type="number" value={formData.pcsPerPack} onChange={e => setFormData({...formData, pcsPerPack: e.target.value})} className="w-full p-2 bg-white rounded-xl text-xs font-bold border border-orange-200" placeholder="12" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-orange-700 uppercase">Harga /Pcs</label>
                         <input type="number" value={formData.ketengPrice} onChange={e => setFormData({...formData, ketengPrice: e.target.value})} className="w-full p-2 bg-white rounded-xl text-xs font-bold border border-orange-200" placeholder="2000" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black text-orange-700 uppercase">Sisa Ecer</label>
                         <input type="number" value={formData.eceranStock} onChange={e => setFormData({...formData, eceranStock: e.target.value})} className="w-full p-2 bg-white rounded-xl text-xs font-bold border border-orange-200" placeholder="0" />
                      </div>
                   </div>
                 )}
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 transition-all">
              Simpan Produk
            </button>
          </form>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto"><Trash2 size={32} /></div>
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase">Hapus Produk Ini?</h3>
                <p className="text-xs text-gray-500 uppercase mt-1">Produk <span className="font-black text-gray-800">{deleteConfirm.name}</span> akan dihapus dari inventori lokal.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteConfirm(null)} className="py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs">Batal</button>
                 <button onClick={handleDelete} className="py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs shadow-md">Hapus</button>
              </div>
           </div>
        </div>
      )}



      {showBarcodeModal && (
        <BarcodeScannerModal
          title="Scan Barcode Produk Baru"
          subtitle="Arahkan kamera ke barcode kemasan atau masukkan kode dari alat scanner USB/Bluetooth."
          onDetected={(code) => {
            playBeep('success');
            setFormData((prev) => ({ ...prev, barcode: code }));
            setShowBarcodeModal(false);
          }}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
    </div>
  );
};

// --- 5. HISTORY VIEW ---
const HistoryView = ({ transactions, setTransactions, digitalTransactions, setDigitalTransactions, profile, printerSession, appMode = 'owner', ownerPin = '1234', cashierName = 'Karyawan Kasir', products = [], setProducts }: {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  digitalTransactions: DigitalTransaction[];
  setDigitalTransactions: React.Dispatch<React.SetStateAction<DigitalTransaction[]>>;
  profile: any;
  printerSession: PrinterSessionState;
  appMode?: AppMode;
  ownerPin?: string;
  cashierName?: string;
  products?: Product[];
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>;
}) => {
  const canSeeProfit = canViewFinancialProfit(appMode);
  const [showAiReceiptScanner, setShowAiReceiptScanner] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [receiptQuery, setReceiptQuery] = useState('');
  const [activeTabHist, setActiveTabHist] = useState<'retail' | 'digital'>('retail');
  const [confirmModal, setConfirmModal] = useState<string | null>(null); 
  const [cicilanModal, setCicilanModal] = useState<Transaction | null>(null);
  const [cicilanAmount, setCicilanAmount] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedDigitalTx, setSelectedDigitalTx] = useState<DigitalTransaction | null>(null);
  const [returnExchangeTx, setReturnExchangeTx] = useState<Transaction | null>(null);
  const [returnNotice, setReturnNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'LUNAS' | 'KASBON' | 'RETUR'>('Semua');
  const [recentlySettledId, setRecentlySettledId] = useState<string | null>(null);

  const handleReceiptBarcodeLookup = (rawCode: string, closeScannerAfter: boolean = false) => {
    const clean = rawCode.trim();
    if (closeScannerAfter) setShowReceiptScanner(false);
    if (!clean) return;
    setReceiptQuery(clean);
    const matched = findTransactionByReceiptQuery(transactions, clean);
    if (!matched) {
      setReturnNotice({ type: 'err', text: `Struk dengan kode "${clean}" tidak ditemukan pada riwayat.` });
      return;
    }
    if (matched.isCancelled) {
      setReturnNotice({ type: 'err', text: `Struk ${matched.id} sudah dibatalkan sebelumnya.` });
      setSelectedTx(matched);
      return;
    }
    setReturnNotice(null);
    setReturnExchangeTx(matched);
  };

  const filteredTrans = useMemo(() => {
    const q = receiptQuery.trim().toLowerCase();
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const isKasbon = !tx.isCancelled && (tx.status === 'MENUNGGU' || (tx.shortage && tx.shortage > 0));
      const hasReturn = Boolean(tx.isCancelled) || Boolean(tx.returnRecords && tx.returnRecords.length > 0);
      const matchStatus = statusFilter === 'Semua' || 
        (statusFilter === 'LUNAS' && !isKasbon && !tx.isCancelled) || 
        (statusFilter === 'KASBON' && isKasbon) ||
        (statusFilter === 'RETUR' && hasReturn);

      const matchQuery =
        !q ||
        (tx.id || '').toLowerCase().includes(q) ||
        (tx.buyer || '').toLowerCase().includes(q);

      return d >= start && d <= end && matchStatus && matchQuery;
    });
  }, [transactions, startDate, endDate, statusFilter, receiptQuery]);

  const filteredDigital = useMemo(() => {
    return digitalTransactions.filter(tx => {
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    });
  }, [digitalTransactions, startDate, endDate]);

  const confirmPayment = () => {
     if (!confirmModal) return;
     const settledId = confirmModal;
     setTransactions(transactions.map(tx => tx.id === settledId ? { ...tx, status: 'LUNAS', shortage: 0 } : tx));
     setConfirmModal(null);
     setRecentlySettledId(settledId);
     playBeep('success');
     setTimeout(() => {
       setRecentlySettledId((curr) => (curr === settledId ? null : curr));
     }, 3500);
  };

  const handleCicilanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cicilanModal) return;
    const payNum = Number(cicilanAmount) || 0;
    if (payNum <= 0) return;

    const txId = cicilanModal.id;
    let didSettle = false;

    setTransactions(transactions.map(tx => {
      if (tx.id === txId) {
        const currentShortage = tx.shortage !== undefined ? Number(tx.shortage) : Number(tx.totalAmount);
        const newShortage = Math.max(0, currentShortage - payNum);
        const newStatus = newShortage === 0 ? 'LUNAS' : tx.status;
        if (newShortage === 0) {
          didSettle = true;
        }
        return {
          ...tx,
          shortage: newShortage,
          status: newStatus
        };
      }
      return tx;
    }));

    if (didSettle) {
      setRecentlySettledId(txId);
      playBeep('success');
      setTimeout(() => {
        setRecentlySettledId((curr) => (curr === txId ? null : curr));
      }, 3500);
    }

    setCicilanModal(null);
    setCicilanAmount('');
  };

  if (showAiReceiptScanner) {
    return (
      <AiImageAnalysisView
        products={products}
        defaultMode="receipt_scan"
        title="Scan Struk / Nota Kulakan Supplier (Riwayat)"
        subtitle="Foto atau unggah nota faktur belanja kulakan agen/grosir. Gemini AI akan membaca daftar barang dan total nota untuk dicatat ke riwayat pembukuan."
        onClose={() => setShowAiReceiptScanner(false)}
        onAddProductToStock={(newProd) => {
          if (setProducts) {
            setProducts((prev) => [newProd, ...prev]);
          }
          setShowAiReceiptScanner(false);
        }}
        playBeep={playBeep}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Log Riwayat Transaksi</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Riwayat penjualan barang fisik, status lunas, dan cicilan kasbon pembeli</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSeeProfit && (
            <button 
              type="button"
              onClick={() => setShowAiReceiptScanner(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
              title="Scan Foto Nota Kulakan & Faktur Pembelian Grosir dengan AI"
            >
              <Sparkles size={14} className="text-yellow-300 animate-pulse" />
              <span>Scan Nota Kulakan AI</span>
            </button>
          )}

          <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => setActiveTabHist('retail')} className={`px-4 py-2 rounded-lg transition-all ${activeTabHist === 'retail' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Retail Fisik</button>
            <button onClick={() => setActiveTabHist('digital')} className={`px-4 py-2 rounded-lg transition-all ${activeTabHist === 'digital' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Layanan Digital</button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => setStatusFilter('Semua')} className={`px-3 py-2 rounded-lg ${statusFilter === 'Semua' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Semua</button>
            <button onClick={() => setStatusFilter('LUNAS')} className={`px-3 py-2 rounded-lg ${statusFilter === 'LUNAS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Kolom Lunas</button>
            <button onClick={() => setStatusFilter('KASBON')} className={`px-3 py-2 rounded-lg ${statusFilter === 'KASBON' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}>Pembeli Kasbon</button>
            <button onClick={() => setStatusFilter('RETUR')} className={`px-3 py-2 rounded-lg ${statusFilter === 'RETUR' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500'}`}>Retur / Batal</button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
            <span className="text-gray-300">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          </div>
        </div>
      </div>

      {activeTabHist === 'retail' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={receiptQuery}
              onChange={(e) => setReceiptQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && receiptQuery.trim()) {
                  const matched = findTransactionByReceiptQuery(transactions, receiptQuery);
                  if (matched) {
                    e.preventDefault();
                    handleReceiptBarcodeLookup(receiptQuery, false);
                  }
                }
              }}
              placeholder="Cari No. Struk (TX-...), nama pembeli, atau scan barcode struk untuk retur..."
              className="w-full pl-10 pr-9 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs"
            />
            {receiptQuery && (
              <button
                type="button"
                onClick={() => {
                  setReceiptQuery('');
                  setReturnNotice(null);
                }}
                aria-label="Bersihkan pencarian struk"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowReceiptScanner(true);
            }}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <ScanBarcode size={16} />
            <span>Scan Barcode Struk</span>
          </button>
        </div>
      )}

      {returnNotice && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            returnNotice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {returnNotice.type === 'ok' ? (
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{returnNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setReturnNotice(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
            aria-label="Tutup notifikasi retur"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {activeTabHist === 'retail' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrans.length > 0 ? filteredTrans.map(tx => {
            const isCancelled = Boolean(tx.isCancelled);
            const hasReturns = Boolean(tx.returnRecords && tx.returnRecords.length > 0);
            const isKasbon = !isCancelled && (tx.status === 'MENUNGGU' || (tx.shortage !== undefined && tx.shortage > 0));
            const remainingKasbon = tx.shortage !== undefined ? tx.shortage : (isKasbon ? tx.totalAmount : 0);
            const isJustSettled = recentlySettledId === tx.id;
            return (
              <motion.div 
                key={tx.id} 
                layout
                animate={isJustSettled ? { 
                  scale: [1, 1.03, 1],
                  borderColor: ['#10b981', '#34d399', '#10b981'],
                  boxShadow: [
                    '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    '0 10px 25px -5px rgba(16, 185, 129, 0.25)',
                    '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  ]
                } : {}}
                transition={{ duration: 0.6 }}
                className={`bg-white p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md ${isCancelled ? 'border-rose-200 bg-rose-50/20 opacity-85' : isKasbon ? 'border-amber-200 ring-2 ring-amber-50' : 'border-emerald-100'}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isCancelled ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-rose-600 text-white shadow-sm">
                          Dibatalkan (Retur)
                        </span>
                      ) : isKasbon ? (
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white shadow-sm">
                          Kasbon / Belum Lunas
                        </span>
                      ) : (
                        <motion.span 
                          initial={isJustSettled ? { scale: 0.7, opacity: 0 } : false}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 shadow-sm ${isJustSettled ? 'bg-emerald-500 text-white ring-4 ring-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}
                        >
                          <Check size={12}/> {isJustSettled ? 'Baru Saja Lunas! ✨' : 'Lunas'}
                        </motion.span>
                      )}
                      {!isCancelled && hasReturns && (
                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700">
                          Ada Retur / Tukar
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 shrink-0">{formatDate(tx.date)}</span>
                  </div>

                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className={`font-black text-lg ${isCancelled ? 'line-through text-rose-500' : 'text-gray-800'}`}>
                      {formatRp(tx.totalAmount)}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      {tx.handledBy && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                          {tx.handledBy}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-gray-400">{tx.id}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl space-y-2 text-xs">
                     <div className="flex items-center justify-between text-gray-700 font-black border-b border-gray-200/50 pb-2">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400"/>
                          <span className="uppercase text-[11px]">{tx.buyer || 'Pelanggan Umum'}</span>
                        </div>
                        {isCancelled ? (
                          <span className="text-[10px] text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded">
                            Dibatalkan
                          </span>
                        ) : isKasbon ? (
                          <span className="text-[10px] text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded">
                            Sisa: {formatRp(remainingKasbon)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded">
                            Lunas Penuh
                          </span>
                        )}
                     </div>
                     <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                        {Array.isArray(tx.items) && tx.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] text-gray-500">
                            <span className="truncate pr-2">{it.name} x{it.quantity}</span>
                            <span className="font-bold shrink-0">{formatRp((it.priceAtTime || 0) * (it.quantity || 0))}</span>
                          </div>
                        ))}
                     </div>
                     {hasReturns && (
                       <div className="pt-2 border-t border-gray-200 space-y-1">
                         {tx.returnRecords!.map((rec) => (
                           <p key={rec.id} className="text-[9px] font-bold text-rose-700">
                             {rec.action === 'EXCHANGE' ? 'Tukar Barang' : rec.action === 'CANCEL' ? 'Batal Penuh' : 'Retur Sebagian'}:{' '}
                             {rec.reason} ({rec.condition === 'GOOD' ? 'Stok Kembali' : 'Barang Rusak'})
                           </p>
                         ))}
                       </div>
                     )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button onClick={() => setSelectedTx(tx)} className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all whitespace-nowrap">
                    <Printer size={14}/> Struk
                  </button>
                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        setReturnExchangeTx(tx);
                      }}
                      className="flex-1 py-2.5 px-3 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
                    >
                      <RotateCcw size={13} /> Retur / Tukar
                    </button>
                  )}
                  {isKasbon && (
                    <>
                      <button onClick={() => setCicilanModal(tx)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-xl text-[9px] font-black uppercase shadow-sm transition-all">
                        Cicil
                      </button>
                      <button onClick={() => setConfirmModal(tx.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-[9px] font-black uppercase shadow-sm transition-all">
                        Lunas
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-gray-100">
               <Clock size={36} className="mx-auto text-gray-300 mb-2"/>
               <p className="text-gray-400 font-black uppercase text-[10px]">Tidak ada transaksi retail untuk filter ini.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDigital.length > 0 ? filteredDigital.map(tx => (
            <div key={tx.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-blue-100 text-blue-700">
                    {tx.serviceType}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">{formatDate(tx.date)}</span>
                </div>

                <div className="flex justify-between items-baseline mb-3">
                  <h4 className="font-black text-blue-600 text-lg">{formatRp(tx.sellAmount)}</h4>
                  <span className="text-[10px] font-black text-gray-400">{tx.id}</span>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl space-y-1 text-xs">
                   <div className="flex justify-between text-gray-700 font-bold">
                      <span>Provider:</span>
                      <span>{tx.provider}</span>
                   </div>
                   <div className="flex justify-between text-gray-600 font-mono">
                      <span>Tujuan:</span>
                      <span>{tx.targetNumber}</span>
                   </div>
                   {tx.handledBy && (
                     <div className="flex justify-between text-slate-600 font-bold">
                       <span>Petugas:</span>
                       <span>{tx.handledBy}</span>
                     </div>
                   )}
                   {canSeeProfit && (
                     <div className="flex justify-between text-emerald-600 font-bold pt-1 border-t border-gray-200">
                        <span>Admin/Fee:</span>
                        <span>+ {formatRp(tx.fee)}</span>
                     </div>
                   )}
                </div>
              </div>

              <button onClick={() => setSelectedDigitalTx(tx)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all">
                <Printer size={14}/> Cetak Struk Digital
              </button>
            </div>
          )) : (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-gray-100">
               <Smartphone size={36} className="mx-auto text-gray-300 mb-2"/>
               <p className="text-gray-400 font-black uppercase text-[10px]">Tidak ada transaksi digital untuk filter ini.</p>
            </div>
          )}
        </div>
      )}

      {selectedTx && (
        <ReceiptModal
          tx={selectedTx}
          profile={profile}
          printerSession={printerSession}
          onClose={() => setSelectedTx(null)}
        />
      )}
      {selectedDigitalTx && (
        <DigitalReceiptModal
          tx={selectedDigitalTx}
          profile={profile}
          printerSession={printerSession}
          onClose={() => setSelectedDigitalTx(null)}
        />
      )}

      {/* Modal Pelunasan Penuh */}
      {confirmModal && (
         <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle size={36} /></div>
               <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase">Lunasi Kasbon Ini?</h3>
                  <p className="text-xs text-gray-500 uppercase mt-1">Ubah status transaksi ini menjadi LUNAS Penuh.</p>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirmModal(null)} className="py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs">Batal</button>
                  <button onClick={confirmPayment} className="py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-md">Ya, Lunas</button>
               </div>
            </div>
         </div>
      )}

      {/* Modal Pembayaran Cicilan Kasbon */}
      {cicilanModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleCicilanSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-xs uppercase text-gray-800">Bayar Cicilan Kasbon</h3>
              <button type="button" onClick={() => setCicilanModal(null)} className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-amber-900 uppercase">Pembeli: {cicilanModal.buyer}</p>
              <p className="font-black text-amber-700">Sisa Kasbon: {formatRp(cicilanModal.shortage !== undefined ? cicilanModal.shortage : cicilanModal.totalAmount)}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Jumlah Pembayaran Cicilan (Rp)</label>
              <input 
                type="number" 
                value={cicilanAmount} 
                onChange={e => setCicilanAmount(e.target.value)} 
                placeholder="Masukkan nominal bayar..." 
                className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" 
                required 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="button" onClick={() => setCicilanModal(null)} className="py-3 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-xs">Batal</button>
              <button type="submit" className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs shadow-md">Simpan Cicilan</button>
            </div>
          </form>
        </div>
      )}

      {showReceiptScanner && (
        <BarcodeScannerModal
          title="Scan Barcode Struk Pembelian"
          subtitle="Arahkan kamera ke barcode Code-128 (TX-...) di bagian bawah struk untuk membuka transaksi retur atau tukar barang."
          onDetected={(code) => handleReceiptBarcodeLookup(code, true)}
          onClose={() => setShowReceiptScanner(false)}
        />
      )}

      {returnExchangeTx && (
        <ReturnExchangeModal
          transaction={returnExchangeTx}
          products={products}
          appMode={appMode}
          ownerPin={ownerPin}
          cashierName={cashierName}
          onClose={() => setReturnExchangeTx(null)}
          onApply={(result) => {
            if (setProducts) {
              setProducts(result.updatedProducts);
            }
            setTransactions((prev) =>
              prev.map((t) =>
                t.id === result.updatedTransaction.id ? result.updatedTransaction : t
              )
            );
            setReturnExchangeTx(null);
            playBeep('success');
            const summaryText =
              result.record.action === 'EXCHANGE'
                ? `Tukar barang pada struk ${result.updatedTransaction.id} berhasil diproses (${
                    result.record.priceDifference > 0
                      ? `Tambah bayar ${formatRp(result.record.priceDifference)}`
                      : result.record.priceDifference < 0
                      ? `Kembalian ${formatRp(Math.abs(result.record.priceDifference))}`
                      : 'Selisih Impas'
                  }).`
                : `Retur pada struk ${result.updatedTransaction.id} berhasil disimpan (Refund ${formatRp(
                    result.record.refundAmount
                  )}).`;
            setReturnNotice({ type: 'ok', text: summaryText });
          }}
        />
      )}
    </div>
  );
};

// --- 6. REKAP VIEW ---
const RekapView = ({
  transactions,
  digitalTransactions,
  profile,
}: {
  transactions: Transaction[];
  digitalTransactions: DigitalTransaction[];
  products: Product[];
  profile?: any;
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dailyRecap = useMemo(() => {
    return aggregateDailyRecap(transactions, digitalTransactions, startDate, endDate);
  }, [transactions, digitalTransactions, startDate, endDate]);

  const totalRekap = useMemo(() => {
    return dailyRecap.reduce((acc, curr) => ({
      omset: acc.omset + curr.retailOmset + curr.digitalOmset,
      profit: acc.profit + curr.retailProfit + curr.digitalProfit,
      count: acc.count + curr.count
    }), { omset: 0, profit: 0, count: 0 });
  }, [dailyRecap]);

  const handleExportPDF = () => {
    playBeep('click');
    exportRecapReportPDF({
      profile,
      dailyRecap,
      totalRekap,
      startDate,
      endDate,
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Rekapitulasi Keuangan Toko</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Laporan gabungan omset fisik dan keuntungan PPOB digital</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase">Periode:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
            <span className="text-gray-300">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <FileDown size={16} />
            Ekspor Laporan PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-100">Total Omset Gabungan</p>
          <h3 className="text-2xl font-black mt-1 tabular-nums">{formatRp(totalRekap.omset)}</h3>
          <p className="text-[9px] text-blue-200 mt-2">{totalRekap.count} Total Transaksi</p>
        </div>

        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-500/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Total Laba Bersih</p>
          <h3 className="text-2xl font-black mt-1 tabular-nums">{formatRp(totalRekap.profit)}</h3>
          <p className="text-[9px] text-emerald-200 mt-2">Retail + Fee PPOB Digital</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Rata-Rata Profit Margin</p>
          <h3 className="text-2xl font-black text-gray-800 tabular-nums">
            {totalRekap.omset > 0 ? ((totalRekap.profit / totalRekap.omset) * 100).toFixed(1) : 0}%
          </h3>
          <p className="text-[9px] text-gray-400 mt-2">Persentase Keuntungan</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-center">Jml Tx</th>
                <th className="px-6 py-4">Omset Retail Fisik</th>
                <th className="px-6 py-4">Omset Digital PPOB</th>
                <th className="px-6 py-4">Total Laba Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyRecap.length > 0 ? dailyRecap.map(day => (
                <tr key={day.date} className="text-xs hover:bg-gray-50/50 transition-all">
                  <td className="px-6 py-4 font-black text-gray-800 uppercase">{formatDate(day.date).split('pukul')[0]}</td>
                  <td className="px-6 py-4 text-center font-black text-blue-600 tabular-nums">{day.count} Tx</td>
                  <td className="px-6 py-4 font-bold text-gray-800 tabular-nums">{formatRp(day.retailOmset)}</td>
                  <td className="px-6 py-4 font-bold text-indigo-600 tabular-nums">{formatRp(day.digitalOmset)}</td>
                  <td className="px-6 py-4 font-black text-emerald-600 tabular-nums">{formatRp(day.retailProfit + day.digitalProfit)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">
                    Belum ada data rekapitulasi untuk tanggal ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- 7. PROFILE & BACKUP VIEW ---
const ProfileView = ({
  profile,
  setProfile,
  products,
  setProducts,
  transactions,
  setTransactions,
  digitalTransactions,
  setDigitalTransactions,
  printerSession,
  roleSettings,
  onUpdateRoleSettings,
  onOpenRoleModal,
  themeId,
  onSelectTheme,
  onReplayOpening,
}: {
  profile: any;
  setProfile: (p: any) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  digitalTransactions: DigitalTransaction[];
  setDigitalTransactions: React.Dispatch<React.SetStateAction<DigitalTransaction[]>>;
  printerSession: PrinterSessionState;
  roleSettings: RoleSettings;
  onUpdateRoleSettings: React.Dispatch<React.SetStateAction<RoleSettings>>;
  onOpenRoleModal: () => void;
  themeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onReplayOpening: () => void;
}) => {
  const isOwnerMode = roleSettings.mode === 'owner';
  const [data, setData] = useState(profile);
  const [msg, setMsg] = useState('');
  const [pinForm, setPinForm] = useState({
    ownerPin: roleSettings.ownerPin,
    cashierName: roleSettings.cashierName,
  });
  const [roleNotice, setRoleNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [bulkConfirmAction, setBulkConfirmAction] = useState<'SAVE_ALL' | 'DELETE_ALL' | null>(null);
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);
  
  // State Kamera & Foto Profil Toko
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setData(profile), [profile]);
  useEffect(() => {
    setPinForm({
      ownerPin: roleSettings.ownerPin,
      cashierName: roleSettings.cashierName,
    });
  }, [roleSettings.ownerPin, roleSettings.cashierName]);

  const handleSaveRoleConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPin = pinForm.ownerPin.trim();
    if (!isValidPin(cleanedPin)) {
      setRoleNotice({ type: 'err', text: 'PIN Owner harus berupa 4 sampai 6 digit angka.' });
      return;
    }
    const cleanedCashier = pinForm.cashierName.trim() || 'Karyawan Kasir';
    onUpdateRoleSettings((prev) => ({
      ...prev,
      ownerPin: cleanedPin,
      cashierName: cleanedCashier,
    }));
    playBeep('success');
    setRoleNotice({ type: 'ok', text: 'PIN Owner & nama kasir default berhasil disimpan!' });
    setTimeout(() => setRoleNotice(null), 3500);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(data);
    stopCamera();
    setMsg('Profil toko & foto berhasil disimpan!');
    setTimeout(() => setMsg(''), 3000);
  };

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Perangkat atau browser tidak mendukung akses kamera langsung. Silakan gunakan tombol Galeri atau masukkan link gambar.');
      setIsCameraActive(false);
      return;
    }

    setIsCameraActive(true);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'user' } } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setCameraError(
        isDenied
          ? 'Izin kamera ditolak. Silakan berikan izin di pengaturan browser atau gunakan tombol Galeri.'
          : 'Kamera tidak dapat diakses saat ini. Silakan gunakan tombol Galeri.'
      );
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const compressed = await compressDataUrl(rawDataUrl, 'avatar');
        setData((prev: any) => ({ ...prev, avatar: compressed }));
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 'avatar');
      setData((prev: any) => ({ ...prev, avatar: compressed }));
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setData((prev: any) => ({ ...prev, avatar: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 'qris');
      setData((prev: any) => ({ ...prev, qrisImage: compressed }));
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        setData((prev: any) => ({ ...prev, qrisImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const exportBackupFile = () => {
    const backupData = {
      profile,
      products,
      transactions,
      digitalTransactions,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_warung_pintar_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.profile) setProfile(importedData.profile);
        if (importedData.products) setProducts(importedData.products);
        if (importedData.transactions) setTransactions(importedData.transactions);
        if (importedData.digitalTransactions) setDigitalTransactions(importedData.digitalTransactions);
        setBackupNotice('Data berhasil dipulihkan dari file backup lokal!');
        setBackupError(null);
        setTimeout(() => setBackupNotice(null), 4000);
      } catch (err) {
        setBackupError('Format file JSON backup tidak valid!');
        setBackupNotice(null);
        setTimeout(() => setBackupError(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-xl space-y-6">
        <div className="text-center pb-4 border-b border-gray-100 flex flex-col items-center">
          {/* Avatar / Foto Profil */}
          <div className="relative group mb-3">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-lg shadow-blue-500/20 overflow-hidden border-2 border-white">
              {data.avatar ? (
                <img src={data.avatar} alt="Foto Profil Toko" className="w-full h-full object-cover" />
              ) : (
                <Store size={40}/>
              )}
            </div>
          </div>

          <h3 className="text-xl font-black text-gray-800 uppercase">{data.ownerName || 'Toko Saya'}</h3>
          <p className="text-[10px] font-black text-emerald-600 uppercase mt-0.5 tracking-wider">Penyimpanan Offline IndexedDB & Lokal Aktif</p>
        </div>

        {/* Kartu Kontrol Mode Owner & Karyawan Kasir */}
        <div className={`p-5 rounded-3xl border space-y-4 ${isOwnerMode ? 'bg-indigo-50/70 border-indigo-200' : 'bg-amber-50/80 border-amber-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isOwnerMode ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                {isOwnerMode ? <ShieldCheck size={22} /> : <UserCheck size={22} />}
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase">
                  {isOwnerMode ? 'Mode Aktif: Owner (Akses Penuh)' : `Mode Aktif: Karyawan Kasir (${roleSettings.cashierName})`}
                </h4>
                <p className="text-[10px] font-bold text-gray-600 mt-0.5">
                  {isOwnerMode
                    ? 'Beralih ke Mode Karyawan Kasir untuk mengunci laporan laba, harga modal, & pengaturan.'
                    : 'Akses terbatas untuk transaksi kasir, cek stok & cetak struk. Masukkan PIN untuk kembali ke Mode Owner.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenRoleModal}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap transition-all ${
                isOwnerMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isOwnerMode ? <UserCheck size={14} /> : <KeyRound size={14} />}
              <span>{isOwnerMode ? 'Masuk Mode Kasir' : 'Buka Mode Owner (PIN)'}</span>
            </button>
          </div>

          {isOwnerMode && (
            <form onSubmit={handleSaveRoleConfig} className="pt-3 border-t border-indigo-200/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="settings-owner-pin" className="text-[10px] font-black text-indigo-900 uppercase ml-1">
                    PIN Keamanan Owner (4-6 Digit)
                  </label>
                  <input
                    id="settings-owner-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinForm.ownerPin}
                    onChange={(e) => setPinForm({ ...pinForm, ownerPin: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234"
                    className="w-full p-3 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl outline-none font-mono font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="settings-cashier-name" className="text-[10px] font-black text-indigo-900 uppercase ml-1">
                    Nama Default Karyawan Kasir
                  </label>
                  <input
                    id="settings-cashier-name"
                    type="text"
                    value={pinForm.cashierName}
                    onChange={(e) => setPinForm({ ...pinForm, cashierName: e.target.value })}
                    placeholder="Karyawan Kasir"
                    className="w-full p-3 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl outline-none font-bold text-xs"
                  />
                </div>
              </div>

              {roleNotice && (
                <div className={`p-2.5 rounded-xl text-[11px] font-bold border ${roleNotice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {roleNotice.text}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1.5 shadow-sm transition-all"
              >
                <KeyRound size={13} />
                Simpan PIN & Pengaturan Kasir
              </button>
            </form>
          )}
        </div>

        {/* Kartu Tema Warna & Animasi Pembuka */}
        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <Palette size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase">Tema Warna &amp; Animasi Pembuka</h4>
                <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                  Pilih tema warna aplikasi &amp; putar ulang animasi pembuka Warung Pintar
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onReplayOpening}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap transition-all"
            >
              <Play size={13} />
              <span>Putar Opening Animation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Pilihan warna tema di profil">
            {THEME_PRESETS.map((preset) => {
              const isSelected = themeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectTheme(preset.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'bg-white/70 border-slate-200 hover:bg-white'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-xl shrink-0 border border-black/10 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${preset.primaryHex} 0%, ${preset.secondaryHex} 100%)`,
                    }}
                  >
                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate">{preset.name}</p>
                    <p className="text-[9px] font-bold text-slate-500 truncate">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <PWAInstallProfileCard />

        {!printerSession.device && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase">Printer Bluetooth Belum Terhubung</h4>
              <p className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Hubungkan sekali di sini agar langsung siap mencetak struk Retail & PPOB Digital via ESC/POS.</p>
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${printerSession.device ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <Bluetooth size={20}/>
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase">Pencetak Struk Thermal Bluetooth (ESC/POS)</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Status: <span className={printerSession.device ? 'text-emerald-600 font-black' : 'text-amber-600'}>{printerSession.statusInfo}</span></p>
              </div>
            </div>

            {printerSession.device ? (
              <button type="button" onClick={printerSession.onDisconnect} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap">
                Putuskan
              </button>
            ) : (
              <button type="button" disabled={printerSession.isConnecting} onClick={() => printerSession.onConnect()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-sm whitespace-nowrap">
                {printerSession.isConnecting ? 'Menghubungkan...' : 'Hubungkan'}
              </button>
            )}
          </div>
          <p className="text-[9px] text-gray-400 font-medium">Mendukung printer thermal 58mm ESC/POS via Web Bluetooth (Chrome/Edge). Gambar profil, produk & QRIS juga otomatis dikompresi saat diunggah.</p>
        </div>

        {isOwnerMode ? (
        <form onSubmit={saveProfile} className="space-y-4">
          {/* Section Pengeditan Foto Profil */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-200">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600"/> Edit Foto Profil / Logo Toko
            </label>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl overflow-hidden shrink-0 border border-gray-300">
                {data.avatar ? (
                  <img src={data.avatar} alt="Foto Profil Toko" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Store size={24}/>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={startCamera} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                    Kamera
                  </button>
                  <label className="px-3 py-2 bg-slate-200 text-gray-700 hover:bg-slate-300 rounded-xl text-[10px] font-black uppercase cursor-pointer">
                    Galeri
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                  {data.avatar && (
                    <button type="button" onClick={() => setData({ ...data, avatar: '' })} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black uppercase">
                      Hapus
                    </button>
                  )}
                  {cameraError && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold leading-relaxed">
                      {cameraError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Atau Masukkan Link / URL Web Foto Profil</label>
              <input 
                type="url" 
                value={data.avatar || ''} 
                onChange={e => setData({ ...data, avatar: e.target.value })} 
                placeholder="https://example.com/logo-toko.jpg" 
                className="w-full p-3 bg-white border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" 
              />
            </div>

            {isCameraActive && (
              <div className="space-y-2 bg-black p-3 rounded-2xl relative mt-2">
                <video ref={videoRef} playsInline autoPlay className="w-full h-48 object-cover rounded-xl bg-black"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                <div className="flex gap-2">
                  <button type="button" onClick={capturePhoto} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase">
                    Ambil Foto Profil
                  </button>
                  <button type="button" onClick={stopCamera} className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase">
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Toko / Pemilik</label>
               <input value={data.ownerName || ''} onChange={e => setData({...data, ownerName: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" placeholder="Cth: Toko Berkah Pak Budi" />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-gray-400 uppercase ml-1">No. WhatsApp / HP</label>
               <input value={data.phone || ''} onChange={e => setData({...data, phone: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" placeholder="08123456789" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Alamat Lengkap Toko</label>
            <textarea value={data.address || ''} onChange={e => setData({...data, address: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs min-h-[80px]" placeholder="Jl. Raya Utama No. 123..." />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Pesan Catatan Kaki Struk</label>
            <input value={data.footerNote || ''} onChange={e => setData({...data, footerNote: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" placeholder="Terima kasih telah berbelanja!" />
          </div>

          {/* Section Pengaturan Kode QRIS Toko */}
          <div className="space-y-3 bg-rose-50/50 p-4 rounded-3xl border border-rose-100">
            <label className="text-[10px] font-black text-rose-700 uppercase ml-1 flex items-center gap-1.5">
              <QrCode size={14} className="text-rose-600"/> Pengaturan Kode QRIS Toko (Pembayaran Non-Tunai)
            </label>
            <p className="text-[9px] text-gray-500 font-medium ml-1">
              Unggah foto kode QRIS toko dari galeri Anda. QRIS ini akan otomatis tampil pada modal kasir sehingga pembeli bisa langsung memindai dari layar HP kasir.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shrink-0 border-2 border-dashed border-rose-200 flex items-center justify-center p-1 shadow-sm">
                {data.qrisImage ? (
                  <img src={data.qrisImage} alt="Kode QRIS Toko" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <QrCode size={36} className="text-rose-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <label className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-95">
                    <Upload size={13} />
                    <span>{data.qrisImage ? 'Ganti dari Galeri' : 'Unggah QRIS dari Galeri'}</span>
                    <input type="file" accept="image/*" onChange={handleQrisUpload} className="hidden" />
                  </label>
                  {data.qrisImage && (
                    <button 
                      type="button" 
                      onClick={() => setData({ ...data, qrisImage: '' })} 
                      className="px-3 py-2 bg-white text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-xl text-[10px] font-black uppercase transition-all"
                    >
                      Hapus QRIS
                    </button>
                  )}
                </div>
                <p className="text-[8px] text-gray-400 font-medium">Mendukung format gambar JPEG, PNG, atau WebP</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Atau Masukkan Link / URL Web Gambar QRIS</label>
              <input 
                type="url" 
                value={data.qrisImage || ''} 
                onChange={e => setData({ ...data, qrisImage: e.target.value })} 
                placeholder="https://example.com/qris-toko.png" 
                className="w-full p-3 bg-white border border-gray-200 focus:border-rose-500 rounded-xl outline-none font-bold text-xs" 
              />
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
            <Save size={16}/> Simpan Informasi & Foto Toko
          </button>
        </form>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center space-y-1">
            <p className="text-xs font-black text-slate-700 uppercase">Pengaturan Toko, QRIS, Backup & Hapus Data Dikunci</p>
            <p className="text-[10px] font-bold text-slate-500">Hanya Owner yang dapat mengubah profil toko atau mengelola cadangan/penghapusan data.</p>
          </div>
        )}

        {msg && <div className="text-[10px] font-black text-emerald-600 text-center uppercase bg-emerald-50 py-3 rounded-xl border border-emerald-200">{msg}</div>}
      </div>

      {isOwnerMode && (
      <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <HardDrive size={24} />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-tight">Cadangkan & Pulihkan File Lokal</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Ekspor data toko ke file JSON HP/PC Anda tanpa internet</p>
          </div>
        </div>

        {backupNotice && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check size={16} />
            <span>{backupNotice}</span>
          </div>
        )}

        {backupError && (
          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{backupError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button onClick={exportBackupFile} className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all">
            <Download size={18}/> Download Backup JSON
          </button>

          <input type="file" ref={fileInputRef} onChange={importBackupFile} accept=".json" className="hidden" />

          <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 border border-white/20 transition-all">
            <Upload size={18}/> Restore File JSON
          </button>
        </div>
      </div>
      )}

      {/* Manajemen Seluruh Data (Simpan / Hapus Semua Data dengan Ketik "Konfirmasi") */}
      {isOwnerMode && (
      <>
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-rose-100 shadow-lg space-y-5">
        <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-800 uppercase tracking-tight">Kelola Seluruh Data Aplikasi</h3>
            <p className="text-[11px] font-bold text-gray-500 mt-1">
              Mencakup Profil Toko, Stok Barang, Riwayat Transaksi, Transaksi Digital PPOB, dan Data Rekap Keuangan. Tindakan memerlukan pengetikan kata <span className="text-slate-900 font-black">"Konfirmasi"</span>.
            </p>
          </div>
        </div>

        {bulkNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{bulkNotice}</span>
            </div>
            <button type="button" onClick={() => setBulkNotice(null)} className="text-emerald-700 hover:text-emerald-950" aria-label="Tutup pemberitahuan">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setBulkConfirmText('');
              setBulkConfirmAction('SAVE_ALL');
            }}
            className="py-4 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Save size={18} />
            Simpan Semua Data
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setBulkConfirmText('');
              setBulkConfirmAction('DELETE_ALL');
            }}
            className="py-4 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all"
          >
            <Trash2 size={18} />
            Hapus Semua Data
          </button>
        </div>
      </div>

      {bulkConfirmAction && (
        <div
          className="fixed inset-0 bg-black/65 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi Eksekusi Data"
        >
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 md:p-7 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bulkConfirmAction === 'DELETE_ALL' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {bulkConfirmAction === 'DELETE_ALL' ? <Trash2 size={24} /> : <Save size={24} />}
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 uppercase">
                    {bulkConfirmAction === 'SAVE_ALL' ? 'Konfirmasi Simpan Semua Data' : 'Konfirmasi Hapus Semua Data'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    {bulkConfirmAction === 'SAVE_ALL'
                      ? 'Seluruh data Profil, Stok, Riwayat, Rekap & Layanan Digital akan disimpan permanen ke perangkat dan diekspor.'
                      : 'PERINGATAN: Seluruh data Profil, Stok, Riwayat, Rekap & Layanan Digital akan dihapus permanen!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBulkConfirmAction(null);
                  setBulkConfirmText('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
                aria-label="Tutup modal konfirmasi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label htmlFor="bulk-confirm-input" className="block text-[11px] font-black text-slate-700 uppercase">
                Ketik kata <span className={bulkConfirmAction === 'DELETE_ALL' ? 'text-rose-600' : 'text-emerald-600'}>Konfirmasi</span> untuk melanjutkan:
              </label>
              <input
                id="bulk-confirm-input"
                type="text"
                value={bulkConfirmText}
                onChange={(e) => setBulkConfirmText(e.target.value)}
                placeholder="Ketik Konfirmasi..."
                autoFocus
                className="w-full p-3 bg-white border border-slate-300 focus:border-blue-500 rounded-xl outline-none font-bold text-sm text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setBulkConfirmAction(null);
                  setBulkConfirmText('');
                }}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={bulkConfirmText.trim() !== 'Konfirmasi'}
                onClick={async () => {
                  if (bulkConfirmText.trim() !== 'Konfirmasi') return;
                  if (bulkConfirmAction === 'SAVE_ALL') {
                    setProfile(data);
                    saveToStorage(STORAGE_KEYS.PROFILE, data);
                    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
                    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
                    saveToStorage(STORAGE_KEYS.DIGITAL_TRANSACTIONS, digitalTransactions);
                    await Promise.all([
                      idbSet(STORAGE_KEYS.PROFILE, data),
                      idbSet(STORAGE_KEYS.PRODUCTS, products),
                      idbSet(STORAGE_KEYS.TRANSACTIONS, transactions),
                      idbSet(STORAGE_KEYS.DIGITAL_TRANSACTIONS, digitalTransactions),
                    ]);
                    exportBackupFile();
                    playBeep('success');
                    setBulkNotice('Seluruh data (Profil, Stok, Riwayat, Rekap & PPOB) berhasil disimpan dan dicadangkan!');
                  } else {
                    clearAllStoreStorage();
                    await idbClearAll();
                    setProducts([]);
                    setTransactions([]);
                    setDigitalTransactions([]);
                    setProfile(DEFAULT_PROFILE);
                    setData(DEFAULT_PROFILE);
                    onUpdateRoleSettings(DEFAULT_ROLE_SETTINGS);
                    onSelectTheme(DEFAULT_THEME_ID);
                    playBeep('success');
                    setBulkNotice('Seluruh data Profil, Stok, Riwayat, Rekap & Layanan Digital telah dihapus bersih.');
                  }
                  setBulkConfirmAction(null);
                  setBulkConfirmText('');
                  setTimeout(() => setBulkNotice(null), 5000);
                }}
                className={`py-3 rounded-xl font-black text-xs uppercase text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  bulkConfirmAction === 'DELETE_ALL'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {bulkConfirmAction === 'SAVE_ALL' ? 'Eksekusi Simpan' : 'Eksekusi Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
