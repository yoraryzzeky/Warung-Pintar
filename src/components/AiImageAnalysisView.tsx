import React, { useState, useRef } from 'react';
import { 
  Sparkles, Camera, Upload, CheckCircle, RefreshCw, 
  ArrowRight, Tag, DollarSign, Package, AlertCircle, 
  FileText, LayoutGrid, Copy, Check, ShoppingCart, Plus, HelpCircle
} from 'lucide-react';
import { formatRp, CATEGORIES, type Product } from '../utils/storeLogic';

interface AiImageAnalysisViewProps {
  products: Product[];
  onAddProductToStock: (product: Product) => void;
  onAddToCartDirect?: (item: { name: string; price: number; category: string }) => void;
  onNavigateToTab?: (tab: string) => void;
  playBeep: (type?: string) => void;
  defaultMode?: 'product_detection' | 'receipt_scan' | 'shelf_audit';
  onClose?: () => void;
  onSaveReceiptAsExpense?: (receiptData: any) => void;
  title?: string;
  subtitle?: string;
}

export const AiImageAnalysisView: React.FC<AiImageAnalysisViewProps> = ({
  products,
  onAddProductToStock,
  onAddToCartDirect,
  onNavigateToTab,
  playBeep,
  defaultMode = 'product_detection',
  onClose,
  onSaveReceiptAsExpense,
  title,
  subtitle,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'product_detection' | 'receipt_scan' | 'shelf_audit'>(defaultMode);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sample quick test images (data URIs / placeholders)
  const sampleImages = [
    {
      title: 'Mie Instan',
      category: 'Makanan',
      url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80',
    },
    {
      title: 'Minuman Kopi Kaleng',
      category: 'Minuman',
      url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
    },
    {
      title: 'Rak Makanan Ringan',
      category: 'Audit Rak',
      url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80',
    },
  ];

  const startCamera = async () => {
    playBeep('click');
    setErrorMsg(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMsg('Perangkat atau peramban ini tidak mendukung akses kamera langsung. Silakan gunakan tombol "Pilih Galeri" untuk mengunggah foto.');
      setIsCameraActive(false);
      return;
    }

    setIsCameraActive(true);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch {
        // Fallback to any generic video camera if environment camera is unavailable
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      // Gracefully handle permission denied or camera access issues without uncaught console errors
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setErrorMsg(
        isDenied
          ? 'Izin kamera ditolak oleh browser/perangkat. Silakan izinkan akses kamera, atau gunakan tombol "Pilih Galeri" untuk memilih foto.'
          : 'Kamera tidak dapat diakses saat ini. Anda dapat mengunggah foto secara langsung melalui tombol "Pilih Galeri".'
      );
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      playBeep('click');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedImage(dataUrl);
        setResultText(null);
        setStructuredData(null);
        setAddedSuccess(false);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playBeep('click');
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setResultText(null);
      setStructuredData(null);
      setAddedSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWithGemini = async () => {
    if (!selectedImage) {
      setErrorMsg('Harap pilih atau ambil foto terlebih dahulu!');
      return;
    }

    playBeep('click');
    setIsLoading(true);
    setErrorMsg(null);
    setResultText(null);
    setStructuredData(null);
    setAddedSuccess(false);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErrorMsg('Perangkat sedang offline (tidak terkoneksi internet). Fitur analisis AI memerlukan koneksi internet. Anda tetap dapat mencatat produk secara manual di menu Stok.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          mode: analysisMode,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gagal menganalisis gambar');
      }

      playBeep('success');
      setResultText(data.text);
      setStructuredData(data.structuredData);
      setModelUsed(data.modelUsed || 'gemini-3.8-flash');
    } catch (err: any) {
      const isNetworkError =
        err?.name === 'TypeError' ||
        (err?.message && (err.message.includes('fetch') || err.message.includes('Network') || err.message.includes('Failed')));
      setErrorMsg(
        isNetworkError
          ? 'Koneksi internet terputus atau server tidak dapat dijangkau. Fitur scan AI memerlukan koneksi internet, namun fitur Kasir & Stok tetap bisa digunakan normal secara offline.'
          : (err?.message || 'Terjadi kesalahan saat memproses gambar dengan Gemini AI.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyResult = () => {
    if (resultText) {
      navigator.clipboard.writeText(resultText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const addParsedProductToInventory = () => {
    if (!structuredData && !resultText) return;
    playBeep('success');

    const newProd: Product = {
      id: `P-AI-${Date.now().toString().slice(-4)}`,
      name: structuredData?.productName || 'Produk Baru (Hasil Scan AI)',
      category: structuredData?.category && CATEGORIES.includes(structuredData.category as any)
        ? structuredData.category
        : 'Makanan',
      costPrice: Number(structuredData?.estimatedCostPrice) || 5000,
      sellingPrice: Number(structuredData?.estimatedSellingPrice) || 6500,
      stock: 12,
      isKeteng: Boolean(structuredData?.isKeteng),
      ketengPrice: Number(structuredData?.ketengPrice) || 0,
      pcsPerPack: Number(structuredData?.pcsPerPack) || 1,
      eceranStock: 0,
      image: selectedImage || '',
    };

    onAddProductToStock(newProd);
    setAddedSuccess(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
              <Sparkles size={12} className="text-yellow-300 animate-pulse" />
              Powered by Gemini Vision (gemini-3.8-flash)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight">
            {title || 'Analisis Gambar & Scan Produk AI'}
          </h2>
          <p className="text-blue-100 text-xs md:text-sm font-medium mt-1 max-w-2xl">
            {subtitle || 'Unggah atau foto barang belanjaan, struk kulakan agen, atau etalase warung Anda. Gemini AI akan mengenali produk, merekomendasikan harga, dan memasukkannya ke sistem inventori secara otomatis.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
            >
              ← Kembali ke Menu
            </button>
          )}
          {onNavigateToTab && !onClose && (
            <button
              onClick={() => onNavigateToTab('stok')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-md border border-white/20 transition-all"
            >
              Lihat Stok Gudang
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Upload & Kamera (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-blue-600" /> 1. Unggah / Foto Produk
            </h3>

            {/* Preview Box */}
            <div className="w-full h-56 sm:h-64 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 overflow-hidden relative flex flex-col items-center justify-center p-3 group">
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Preview Unggahan"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl shadow"
                    >
                      Hapus Foto
                    </button>
                  </div>
                </>
              ) : isCameraActive ? (
                <div className="w-full h-full relative bg-black rounded-2xl overflow-hidden flex flex-col">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase shadow-lg"
                    >
                      📸 Ambil Foto
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-lg"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-700 uppercase">Belum Ada Gambar</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                      Ambil foto dengan kamera atau unggah file gambar
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Camera size={16} /> Buka Kamera
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Upload size={16} /> Pilih Galeri
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400">Atau Coba Contoh Foto Cepat:</p>
              <div className="grid grid-cols-3 gap-2">
                {sampleImages.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      setSelectedImage(s.url);
                      setResultText(null);
                      setStructuredData(null);
                      setAddedSuccess(false);
                    }}
                    className="p-2 bg-slate-50 hover:bg-blue-50 rounded-xl text-left border border-slate-200 hover:border-blue-300 transition-all"
                  >
                    <p className="text-[10px] font-black text-gray-800 truncate">{s.title}</p>
                    <span className="text-[8px] font-bold text-blue-600 uppercase block">{s.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Mode Analisis, Konfigurasi & Hasil (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-600" /> 2. Pilih Mode Analisis & Proses
            </h3>

            {/* Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'product_detection' as const,
                  title: 'Scan Produk',
                  desc: 'Kenali nama, kategori & harga',
                  icon: <Package size={16} />,
                },
                {
                  id: 'receipt_scan' as const,
                  title: 'Scan Struk / Nota',
                  desc: 'Baca rincian nota supplier',
                  icon: <FileText size={16} />,
                },
                {
                  id: 'shelf_audit' as const,
                  title: 'Audit Rak Toko',
                  desc: 'Cek stok kosong & display',
                  icon: <LayoutGrid size={16} />,
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setAnalysisMode(m.id);
                  }}
                  className={`p-3.5 rounded-2xl text-left transition-all border ${
                    analysisMode === m.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-gray-700 border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {m.icon}
                    <span className="text-xs font-black uppercase">{m.title}</span>
                  </div>
                  <p className={`text-[9px] font-bold ${analysisMode === m.id ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom Prompt (Optional) */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                Pertanyaan Tambahan / Instruksi Khusus (Opsional)
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Cth: Berapa estimasi harga kulakan di daerah Jabodetabek? Apakah ada expired date?"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold focus:border-blue-500"
              />
            </div>

            {/* Submit Analyze Button */}
            <button
              disabled={isLoading || !selectedImage}
              onClick={analyzeWithGemini}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Menganalisis Gambar dengan Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Mulai Analisis Foto dengan Gemini
                </>
              )}
            </button>

            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                <AlertCircle size={18} className="shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Results Area */}
          {resultText && (
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-gray-800">Hasil Analisis Gemini</h4>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">
                      Model: {modelUsed || 'gemini-3.8-flash'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyResult}
                    className="p-2 text-gray-400 hover:text-gray-700 rounded-xl bg-gray-50 border border-gray-100 transition-all flex items-center gap-1 text-[10px] font-black uppercase"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {isCopied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Structured Card Action if Product Identified */}
              {structuredData && structuredData.productName && (
                <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-3xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase">
                        {structuredData.category || 'Makanan'}
                      </span>
                      <h4 className="text-base font-black text-gray-900 uppercase mt-1">
                        {structuredData.productName}
                      </h4>
                      {structuredData.description && (
                        <p className="text-[11px] text-gray-600 mt-1">{structuredData.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-2xl border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Estimasi Modal</span>
                      <span className="font-black text-gray-800">{formatRp(structuredData.estimatedCostPrice || 0)}</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Rekomendasi Jual</span>
                      <span className="font-black text-emerald-600">{formatRp(structuredData.estimatedSellingPrice || 0)}</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Potensi Margin</span>
                      <span className="font-black text-blue-600">
                        {formatRp((Number(structuredData.estimatedSellingPrice) || 0) - (Number(structuredData.estimatedCostPrice) || 0))}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-blue-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Mode Keteng/Ecer</span>
                      <span className="font-black text-orange-600 uppercase">
                        {structuredData.isKeteng ? `Ya (${formatRp(structuredData.ketengPrice || 0)})` : 'Tidak'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for this product */}
                  <div className="flex gap-2 flex-wrap pt-1">
                    <button
                      disabled={addedSuccess}
                      onClick={addParsedProductToInventory}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      {addedSuccess ? (
                        <>
                          <CheckCircle size={16} /> Berhasil Masuk ke Stok!
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> Tambah Langsung ke Stok Toko
                        </>
                      )}
                    </button>

                    {onAddToCartDirect && onNavigateToTab && (
                      <button
                        onClick={() => {
                          playBeep('success');
                          onAddToCartDirect({
                            name: structuredData.productName,
                            price: Number(structuredData.estimatedSellingPrice) || 5000,
                            category: structuredData.category || 'Makanan',
                          });
                          onNavigateToTab('kasir');
                        }}
                        className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <ShoppingCart size={16} /> Beli di Kasir
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Narrative Text */}
              <div className="bg-slate-50 p-5 rounded-2xl text-xs text-gray-800 leading-relaxed font-sans whitespace-pre-line border border-slate-200">
                {resultText.replace(/```json[\s\S]*?```/, '').trim()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
