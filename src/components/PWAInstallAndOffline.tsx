import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  WifiOff,
  Download,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Copy,
  Share,
  MoreVertical,
  PlusSquare,
  CheckCircle,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWA';
import { getInstallButtonAction } from '../utils/pwaInstallLogic';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 max-w-2xl">
        <WifiOff size={16} className="shrink-0 text-amber-100" />
        <p className="leading-tight">
          <span className="font-black uppercase tracking-wider bg-amber-600/60 px-1.5 py-0.5 rounded mr-1.5">
            Mode Offline
          </span>
          Tidak ada koneksi internet. Kasir, inventori stok, kasbon, dan riwayat tetap berfungsi normal (tersimpan di memori perangkat).
        </p>
      </div>
      <span className="hidden sm:inline-block text-[10px] bg-white/20 px-2 py-1 rounded-lg uppercase tracking-wider font-black">
        Mode Terpasang
      </span>
    </div>
  );
};

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab: 'android' | 'ios';
  isInstallable: boolean;
  isIOS: boolean;
  isIOSSafari: boolean;
  isInIframe: boolean;
  onNativeInstall: () => Promise<boolean>;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  defaultTab,
  isInstallable,
  isIOS,
  isIOSSafari,
  isInIframe,
  onNativeInstall,
}) => {
  const [activeOs, setActiveOs] = useState<'android' | 'ios'>(defaultTab);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveOs(defaultTab);
      setCopied(false);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen || typeof document === 'undefined') return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = async () => {
    if (!currentUrl || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan Pasang Aplikasi di Android dan iOS"
      data-testid="pwa-install-modal"
    >
      <div className="w-full max-w-md phone-landscape:max-w-xl rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-3 sm:space-y-4 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-start gap-2.5 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 leading-tight">
                Pasang Aplikasi ke HP
              </h3>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-0.5">
                Akses langsung dari layar utama &amp; tetap jalan saat offline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panduan pasang aplikasi"
            className="min-h-[36px] min-w-[36px] sm:min-h-[40px] sm:min-w-[40px] -mt-1 -mr-1 flex items-center justify-center hover:bg-slate-100 text-slate-500 rounded-xl transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Peringatan & shortcut apabila dibuka di dalam iframe / browser dalam aplikasi */}
        {isInIframe && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2.5">
            <p className="text-xs font-bold text-amber-900 leading-relaxed">
              Aplikasi sedang berjalan di dalam pratinjau/frame. Agar tombol pasang perangkat aktif, buka aplikasi langsung di tab browser utama (Chrome untuk Android, Safari untuk iPhone/iPad).
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
              >
                <ExternalLink size={14} />
                Buka di Tab Baru
              </a>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors whitespace-nowrap"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Link Disalin' : 'Salin Link'}
              </button>
            </div>
          </div>
        )}

        {/* Tab Pemilih Android vs iOS */}
        <div
          className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl"
          role="tablist"
          aria-label="Pilih Sistem Operasi Smartphone"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeOs === 'android'}
            onClick={() => setActiveOs('android')}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
              activeOs === 'android'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Android
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeOs === 'ios'}
            onClick={() => setActiveOs('ios')}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${
              activeOs === 'ios'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            iPhone / iPad (iOS)
          </button>
        </div>

        {activeOs === 'android' ? (
          <div className="space-y-3" data-testid="pwa-guide-android">
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await onNativeInstall();
                  if (ok) onClose();
                }}
                className="w-full min-h-[44px] py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap"
              >
                <Download size={16} />
                Pasang Langsung di Android
              </button>
            )}

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs text-slate-700">
              <p className="font-black text-slate-900 uppercase text-[11px]">
                Langkah Install di Android (Chrome / Edge):
              </p>
              <ol className="space-y-2 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">1.</span>
                  <span>
                    Buka halaman aplikasi ini langsung di browser <strong>Google Chrome</strong> (bukan browser di dalam chat/pratinjau).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">2.</span>
                  <span>
                    Ketuk ikon menu{' '}
                    <MoreVertical size={14} className="inline-block align-text-bottom text-slate-900" aria-hidden="true" />{' '}
                    <strong>(titik tiga)</strong> di pojok kanan atas browser.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">3.</span>
                  <span>
                    Pilih <strong>Tambahkan ke layar utama</strong> atau <strong>Install aplikasi</strong>, lalu ketuk <strong>Pasang / Install</strong>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3" data-testid="pwa-guide-ios">
            {isIOS && !isIOSSafari && (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-xs font-bold text-blue-900">
                Anda terdeteksi tidak membuka dari Safari. Salin link di bawah lalu tempel dan buka di aplikasi <strong>Safari</strong> agar fitur Tambah ke Layar Utama aktif.
              </div>
            )}

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs text-slate-700">
              <p className="font-black text-slate-900 uppercase text-[11px]">
                Langkah Install di iPhone / iPad (Safari):
              </p>
              <ol className="space-y-2 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">1.</span>
                  <span>
                    Pastikan link aplikasi ini dibuka menggunakan browser <strong>Safari</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">2.</span>
                  <span>
                    Ketuk tombol{' '}
                    <Share size={14} className="inline-block align-text-bottom text-blue-600" aria-hidden="true" />{' '}
                    <strong>Bagikan (Share)</strong> di bilah bawah/atas Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-black text-blue-600 shrink-0">3.</span>
                  <span>
                    Gulir ke bawah, ketuk{' '}
                    <PlusSquare size={14} className="inline-block align-text-bottom text-slate-900" aria-hidden="true" />{' '}
                    <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>, lalu ketuk <strong>Tambah</strong>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {!isInIframe && (
            <button
              type="button"
              onClick={handleCopyUrl}
              className="flex-1 min-h-[42px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Link Disalin!' : 'Salin Link HP'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[42px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-colors whitespace-nowrap"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isIOSSafari, platform, isInIframe, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const action = getInstallButtonAction({ isInstalled, isInstallable });
  if (action === 'hidden') return null;

  const defaultTab: 'android' | 'ios' = platform === 'ios' ? 'ios' : 'android';

  const handleClick = async () => {
    if (action === 'native-prompt') {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-testid="pwa-install-btn"
        aria-label="Pasang aplikasi ke perangkat Android dan iOS"
        title="Pasang aplikasi di layar utama HP Android, iPhone, atau Komputer agar siap dipakai offline"
        className="px-2 sm:px-3 py-1.5 sm:py-2 phone-landscape:py-1 phone-landscape:px-2 min-h-[30px] sm:min-h-[36px] phone-landscape:min-h-[26px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl text-[9.5px] sm:text-xs font-black uppercase flex items-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 transition-all whitespace-nowrap shrink-0"
      >
        {action === 'native-prompt' ? <Download size={13} /> : <Smartphone size={13} />}
        <span className="hidden sm:inline phone-landscape:hidden">
          {action === 'native-prompt' ? 'Pasang Aplikasi' : 'Pasang di HP'}
        </span>
        <span className="sm:hidden phone-landscape:inline">Install</span>
      </button>

      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        defaultTab={defaultTab}
        isInstallable={isInstallable}
        isIOS={isIOS}
        isIOSSafari={isIOSSafari}
        isInIframe={isInIframe}
        onNativeInstall={install}
      />
    </>
  );
};

export const PWAInstallProfileCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isIOSSafari, platform, isInIframe, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const defaultTab: 'android' | 'ios' = platform === 'ios' ? 'ios' : 'android';

  if (isInstalled) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl flex items-center gap-3 text-emerald-900">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <CheckCircle size={20} />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase">Aplikasi Terpasang di Perangkat</h4>
          <p className="text-[10px] font-bold text-emerald-700 mt-0.5">
            Warung Pintar Pro berjalan dalam mode aplikasi standalone dan siap digunakan offline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-50 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-800 uppercase">
              Install ke Smartphone (Android &amp; iOS)
            </h4>
            <p className="text-[10px] font-bold text-gray-500 mt-0.5">
              Pasang aplikasi ke layar utama HP agar lebih cepat dibuka dan tetap berfungsi tanpa internet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (isInstallable) {
              const ok = await install();
              if (!ok) setShowGuideModal(true);
            } else {
              setShowGuideModal(true);
            }
          }}
          className="px-4 py-2.5 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Download size={14} />
          <span>{isInstallable ? 'Pasang Sekarang' : 'Cara Pasang HP'}</span>
        </button>
      </div>

      <InstallGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        defaultTab={defaultTab}
        isInstallable={isInstallable}
        isIOS={isIOS}
        isIOSSafari={isIOSSafari}
        isInIframe={isInIframe}
        onNativeInstall={install}
      />
    </>
  );
};
