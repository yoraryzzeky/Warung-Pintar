import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CheckCircle, Keyboard, ScanBarcode, Upload, X, AlertTriangle, VideoOff } from 'lucide-react';

interface BarcodeScannerModalProps {
  title?: string;
  subtitle?: string;
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  title = 'Pemindai Barcode Produk',
  subtitle = 'Aktifkan kamera HP untuk scan barcode kemasan, unggah foto barcode, atau scan langsung dengan alat USB/Bluetooth.',
  onDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  const [manualCode, setManualCode] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  }, []);

  const handleSuccessCode = useCallback(
    (rawCode: string) => {
      const clean = rawCode.trim();
      if (!clean) return;
      setLastScanned(clean);
      stopScanner();
      onDetected(clean);
    },
    [onDetected, stopScanner]
  );

  const startCameraScan = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setCameraError('Browser atau perangkat ini tidak mendukung akses kamera langsung. Gunakan Scanner USB/Bluetooth atau ketik kode di bawah.');
      return;
    }

    setCameraStatus('starting');
    setCameraError(null);

    try {
      if (typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await Promise.race([
          navigator.mediaDevices.enumerateDevices(),
          new Promise<MediaDeviceInfo[]>((res) => setTimeout(() => res([]), 2000)),
        ]);
        const hasVideo = devices.some((d) => d.kind === 'videoinput');
        if (devices.length > 0 && !hasVideo) {
          if (!mountedRef.current) return;
          setCameraStatus('error');
          setCameraError('Tidak ada kamera terdeteksi di perangkat ini. Gunakan Scanner USB/Bluetooth, unggah foto barcode, atau ketik kode di bawah.');
          return;
        }
      }

      const hasNativeBarcodeDetector = typeof (window as any).BarcodeDetector === 'function';

      const stream = await Promise.race<MediaStream>([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        }),
        new Promise<MediaStream>((_, reject) =>
          setTimeout(() => reject(new Error('CAMERA_TIMEOUT')), 5000)
        ),
      ]);

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (hasNativeBarcodeDetector) {
        const videoEl = videoRef.current;
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
        setCameraStatus('active');

        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });

        let active = true;
        let rafId = 0;
        const scanLoop = async () => {
          if (!active || !mountedRef.current || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                active = false;
                handleSuccessCode(barcodes[0].rawValue);
                return;
              }
            }
          } catch {
            // Ignore single-frame detection errors
          }
          rafId = requestAnimationFrame(scanLoop);
        };
        rafId = requestAnimationFrame(scanLoop);
        controlsRef.current = {
          stop: () => {
            active = false;
            cancelAnimationFrame(rafId);
            stream.getTracks().forEach((t) => t.stop());
          },
        };
        return;
      }

      // Stop temporary probe stream and hand over to ZXing video decoder
      stream.getTracks().forEach((t) => t.stop());
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!mountedRef.current) return;
          if (result) {
            handleSuccessCode(result.getText());
          }
        }
      );

      if (!mountedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setCameraStatus('active');
    } catch (err: any) {
      if (!mountedRef.current) return;
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const isTimeout = err?.message === 'CAMERA_TIMEOUT';
      setCameraStatus('error');
      setCameraError(
        isDenied
          ? 'Izin kamera ditolak. Anda tetap bisa scan dengan Scanner USB/Bluetooth atau input kode manual di bawah.'
          : isTimeout
          ? 'Kamera tidak merespons. Gunakan unggah foto barcode, Scanner USB/Bluetooth, atau ketik manual.'
          : 'Kamera tidak tersedia saat ini. Gunakan unggah foto barcode, Scanner USB/Bluetooth, atau ketik manual.'
      );
    }
  }, [handleSuccessCode]);

  useEffect(() => {
    mountedRef.current = true;

    // Auto-start camera only if permission was already granted by the user
    const checkAndAutoStart = async () => {
      try {
        if (navigator?.permissions?.query) {
          const perm = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (mountedRef.current && perm.state === 'granted') {
            startCameraScan();
          }
        }
      } catch {
        // Ignore browsers without camera permission query support; user can tap "Aktifkan Kamera HP"
      }
    };
    checkAndAutoStart();

    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, [startCameraScan, stopScanner]);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    const objectUrl = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(objectUrl);
      if (result) {
        handleSuccessCode(result.getText());
      } else {
        setCameraError('Barcode tidak terbaca pada foto tersebut. Pastikan gambar jelas & tidak buram.');
      }
    } catch {
      setCameraError('Tidak ditemukan barcode pada gambar tersebut. Coba gambar lain atau ketik manual.');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleSuccessCode(manualCode);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[130] flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-2xl sm:rounded-[2rem] w-full max-w-md phone-landscape:max-w-xl p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-2xl border border-slate-100 max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <ScanBarcode size={18} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase">{title}</h3>
              <p className="text-[9.5px] sm:text-[10px] font-bold text-slate-500 mt-0.5 line-clamp-2">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Tutup pemindai barcode"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Viewfinder / Activation Area */}
        <div className="relative bg-slate-950 rounded-xl sm:rounded-2xl overflow-hidden aspect-video max-h-[190px] sm:max-h-[240px] phone-landscape:max-h-[135px] w-full flex items-center justify-center border border-slate-800">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
          />

          {cameraStatus === 'active' && (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-1/2 border-2 border-emerald-400/90 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                  <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500/90" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  setCameraStatus('idle');
                }}
                className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 hover:bg-black text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
              >
                <VideoOff size={12} /> Matikan Kamera
              </button>
            </>
          )}

          {cameraStatus === 'idle' && (
            <div className="p-3 sm:p-5 text-center space-y-2 sm:space-y-3">
              <Camera size={24} className="text-blue-400 mx-auto" />
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-300 leading-snug">
                Siap memindai via scanner USB/Bluetooth, atau aktifkan kamera HP untuk scan barcode kemasan.
              </p>
              <button
                type="button"
                onClick={startCameraScan}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10.5px] sm:text-[11px] font-black uppercase inline-flex items-center gap-1.5 shadow-md transition-all"
              >
                <Camera size={14} /> Aktifkan Kamera HP
              </button>
            </div>
          )}

          {cameraStatus === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 text-xs font-bold gap-2 bg-slate-900/90">
              <Camera size={24} className="text-blue-400" />
              <span>Menyiapkan kamera...</span>
            </div>
          )}

          {cameraStatus === 'error' && (
            <div className="p-5 text-center space-y-2.5">
              <AlertTriangle size={26} className="text-amber-400 mx-auto" />
              <p className="text-[11px] font-bold text-slate-200 leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startCameraScan}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-1.5"
              >
                <Camera size={13} /> Coba Kamera Lagi
              </button>
            </div>
          )}
        </div>

        {cameraError && cameraStatus !== 'error' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <span>{cameraError}</span>
          </div>
        )}

        {lastScanned && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl text-xs font-black flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>Terbaca: {lastScanned}</span>
          </div>
        )}

        {/* Upload Foto Barcode */}
        <label className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer transition-all">
          <Upload size={15} />
          <span>Scan dari Foto / Galeri Barcode</span>
          <input type="file" accept="image/*" onChange={handleImageFileScan} className="hidden" />
        </label>

        {/* Manual / USB / Bluetooth HID Scanner Input */}
        <form onSubmit={handleManualSubmit} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <label htmlFor="manual-barcode-input" className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5">
            <Keyboard size={13} className="text-blue-600" />
            <span>Scanner USB / Bluetooth atau Ketik Kode</span>
          </label>
          <div className="flex gap-2">
            <input
              id="manual-barcode-input"
              ref={manualInputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Cth: 8992696401013"
              autoFocus
              className="flex-1 px-3 py-2.5 bg-white border border-slate-300 focus:border-blue-500 rounded-xl outline-none font-mono font-bold text-xs text-slate-900"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase whitespace-nowrap transition-all"
            >
              Gunakan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
