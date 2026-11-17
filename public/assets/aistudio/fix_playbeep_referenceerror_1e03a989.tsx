import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, ShoppingCart, Package, History, BarChart2, Plus, Search, 
  Trash2, CheckCircle, TrendingUp, Award, User, Store, 
  Phone, Save, Clock, Wallet, X, Edit3, Trophy, Zap, Scissors,
  Filter, Printer, Download, Upload, Check, Sparkles, AlertTriangle,
  HardDrive, FileText, RefreshCw, Smartphone, CreditCard, DollarSign, ArrowRightLeft, ShieldCheck
} from 'lucide-react';

// --- Utility Functions ---
const formatRp = (angka) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(Number(angka) || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  } catch (e) {
    return dateString;
  }
};

const CATEGORIES = ['Sembako', 'Makanan', 'Minuman', 'Rokok', 'Elektronik', 'Kesehatan', 'ATK', 'Lainnya'];

// --- Sound Effects Utility ---
const playBeep = (type = 'click') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.error("Audio error:", e);
  }
};

const initialProducts = [
  { id: 'P-001', name: 'Dji Sam Soe 12', category: 'Rokok', costPrice: 19000, sellingPrice: 22000, stock: 10, isKeteng: true, ketengPrice: 2000, pcsPerPack: 12, eceranStock: 12, image: '' },
  { id: 'P-002', name: 'Minyak Goreng 1L', category: 'Sembako', costPrice: 15000, sellingPrice: 18000, stock: 15, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0, image: '' },
  { id: 'P-003', name: 'Indomie Goreng', category: 'Makanan', costPrice: 2800, sellingPrice: 3500, stock: 40, isKeteng: false, ketengPrice: 0, pcsPerPack: 1, eceranStock: 0, image: '' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_offline_products');
      return saved ? JSON.parse(saved) : initialProducts;
    } catch (e) {
      return initialProducts;
    }
  });

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_offline_transactions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [digitalTransactions, setDigitalTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_offline_digital');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('wp_offline_profile');
      return saved ? JSON.parse(saved) : {
        ownerName: 'Warung Pintar Mandiri', phone: '08123456789', address: 'Jl. Utama Toko No. 1', email: '', footerNote: 'Terima kasih atas kunjungan Anda!', avatar: ''
      };
    } catch (e) {
      return { ownerName: 'Warung Pintar Mandiri', phone: '08123456789', address: 'Jl. Utama Toko No. 1', email: '', footerNote: 'Terima kasih atas kunjungan Anda!', avatar: '' };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wp_offline_products', JSON.stringify(products));
    } catch (e) { console.error(e); }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('wp_offline_transactions', JSON.stringify(transactions));
    } catch (e) { console.error(e); }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('wp_offline_digital', JSON.stringify(digitalTransactions));
    } catch (e) { console.error(e); }
  }, [digitalTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem('wp_offline_profile', JSON.stringify(profile));
    } catch (e) { console.error(e); }
  }, [profile]);

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col font-sans text-gray-800 overflow-x-hidden selection:bg-blue-500 selection:text-white text-xs sm:text-sm md:text-base">
      {/* Header Utama Responsif */}
      <div className="bg-white border-b border-gray-100 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 flex justify-between items-center sticky top-0 z-40 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-2.5 sm:gap-3">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Logo Toko" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover border border-blue-100 shadow-md shadow-blue-200 shrink-0" />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl sm:rounded-2xl flex items-center justify-center font-black shadow-md shadow-blue-200 text-xs sm:text-sm shrink-0">
              WP
            </div>
          )}
          <div>
            <h2 className="text-xs sm:text-sm md:text-base font-black text-gray-800 leading-none uppercase tracking-tight">
              {profile.ownerName || 'Warung Pintar Pro'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-wider">Mode Perangkat Lintas Layar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Konten Utama Responsif dengan Padding Teradaptasi */}
      <div className="flex-1 pb-24 sm:pb-28">
        <div className="max-w-[1600px] mx-auto w-full px-2 sm:px-4 md:px-6">
          {activeTab === 'dashboard' && <DashboardView products={products} transactions={transactions} digitalTransactions={digitalTransactions} onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'kasir' && <KasirView products={products} setProducts={setProducts} transactions={transactions} setTransactions={setTransactions} profile={profile} />}
          {activeTab === 'digital' && <DigitalView digitalTransactions={digitalTransactions} setDigitalTransactions={setDigitalTransactions} profile={profile} />}
          {activeTab === 'stok' && <StokView products={products} setProducts={setProducts} />}
          {activeTab === 'riwayat' && <HistoryView transactions={transactions} setTransactions={setTransactions} digitalTransactions={digitalTransactions} setDigitalTransactions={setDigitalTransactions} profile={profile} />}
          {activeTab === 'rekap' && <RekapView transactions={transactions} digitalTransactions={digitalTransactions} products={products} />}
          {activeTab === 'profil' && <ProfileView profile={profile} setProfile={setProfile} products={products} setProducts={setProducts} transactions={transactions} setTransactions={setTransactions} digitalTransactions={digitalTransactions} setDigitalTransactions={setDigitalTransactions} />}
        </div>
      </div>

      {/* Navigasi Bawah Fleksibel (Portrait Smartphone & Landscape/Windows View) */}
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-16 sm:h-20 shadow-[0_-4px_25px_rgba(0,0,0,0.04)] w-full fixed bottom-0 z-50 px-1 sm:px-6">
        <NavItem icon={<Home className="w-4 h-4 sm:w-5 sm:h-5" />} label="Beranda" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <NavItem icon={<ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />} label="Kasir" isActive={activeTab === 'kasir'} onClick={() => setActiveTab('kasir')} />
        <NavItem icon={<Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />} label="Digital" isActive={activeTab === 'digital'} onClick={() => setActiveTab('digital')} />
        <NavItem icon={<Package className="w-4 h-4 sm:w-5 sm:h-5" />} label="Stok" isActive={activeTab === 'stok'} onClick={() => setActiveTab('stok')} />
        <NavItem icon={<History className="w-4 h-4 sm:w-5 sm:h-5" />} label="Riwayat" isActive={activeTab === 'riwayat'} onClick={() => setActiveTab('riwayat')} />
        <NavItem icon={<BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />} label="Rekap" isActive={activeTab === 'rekap'} onClick={() => setActiveTab('rekap')} />
        <NavItem icon={<User className="w-4 h-4 sm:w-5 sm:h-5" />} label="Profil" isActive={activeTab === 'profil'} onClick={() => setActiveTab('profil')} />
      </div>
    </div>
  );
}

const NavItem = ({ icon, label, isActive, onClick }) => (
  <button 
    onClick={() => { playBeep('click'); onClick(); }} 
    className={`flex flex-col items-center justify-center flex-1 transition-all relative py-0.5 sm:py-1 ${isActive ? 'text-blue-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}
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
const DashboardView = ({ products, transactions, digitalTransactions, onNavigate }) => {
  const [filterPreset, setFilterPreset] = useState('bulan_ini');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
    const settled = filteredData.filter(tx => tx.status === 'LUNAS');
    const retailOmset = settled.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const retailLaba = settled.reduce((a, b) => a + (b.totalProfit || 0), 0);
    
    const digitalOmset = filteredDigital.reduce((a, b) => a + (b.sellAmount || 0), 0);
    const digitalLaba = filteredDigital.reduce((a, b) => a + (b.fee || 0), 0);

    const omset = retailOmset + digitalOmset;
    const laba = retailLaba + digitalLaba;
    const kasbon = filteredData.filter(tx => tx.status === 'MENUNGGU' || (tx.shortage && tx.shortage > 0)).reduce((a, b) => a + (b.shortage || b.totalAmount || 0), 0);
    const modalAset = products.reduce((a, b) => a + ((b.costPrice || 0) * (b.stock || 0)), 0);

    return { omset, laba, modalAset, kasbon, settledCount: settled.length + filteredDigital.length };
  }, [filteredData, filteredDigital, products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => Number(p.stock) <= 3);
  }, [products]);

  const topProducts = useMemo(() => {
    const productMap = {};
    filteredData.filter(tx => tx.status === 'LUNAS').forEach(tx => {
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

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 uppercase">Perhatian: {lowStockProducts.length} Produk Hampir Habis!</h4>
              <p className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">
                {lowStockProducts.slice(0, 3).map(p => p.name).join(', ')} {lowStockProducts.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate('stok')} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm">
            Cek Stok Gudang
          </button>
        </div>
      )}

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

const StatCard = ({ label, value, subText, icon, color }) => {
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
const KasirView = ({ products, setProducts, transactions, setTransactions, profile }) => {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('Semua');
  const [paymentType, setPaymentType] = useState('LUNAS');
  const [buyerName, setBuyerName] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [lastTxReceipt, setLastTxReceipt] = useState(null);

  const subtotal = cart.reduce((a, b) => a + (b.priceAtTime * b.quantity), 0);
  const changeAmount = useMemo(() => {
    const cash = Number(cashAmount) || 0;
    return cash >= subtotal ? cash - subtotal : 0;
  }, [cashAmount, subtotal]);

  const addToCart = (p, mode = 'Bungkus') => {
    playBeep('click');
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
  };

  const updateCartQty = (cartId, delta) => {
    playBeep('click');
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const cash = Number(cashAmount) || 0;
    const isUnderpaid = paymentType === 'LUNAS' && cash < subtotal;
    const effectivePaymentType = isUnderpaid ? 'MENUNGGU' : paymentType;

    if ((effectivePaymentType === 'MENUNGGU' || isUnderpaid) && !buyerName.trim()) {
      alert("Harap masukkan nama pembeli untuk transaksi Kasbon / Kekurangan pembayaran!");
      return;
    }

    playBeep('success');
    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const profit = cart.reduce((a, b) => a + (((Number(b.priceAtTime) || 0) - (Number(b.costAtTime) || 0)) * (Number(b.quantity) || 0)), 0);
    
    const shortageAmount = isUnderpaid ? (subtotal - cash) : (effectivePaymentType === 'MENUNGGU' ? subtotal : 0);
    const formattedBuyerName = buyerName.trim().toUpperCase();

    // Jika kasbon / kurang bayar, cek apakah nama pembeli yang sama sudah punya kasbon aktif sebelumnya
    if ((effectivePaymentType === 'MENUNGGU' || shortageAmount > 0) && formattedBuyerName) {
      const existingKasbonTx = transactions.find(t => 
        (t.status === 'MENUNGGU' || (t.shortage && t.shortage > 0)) && 
        t.buyer && 
        t.buyer.toUpperCase() === formattedBuyerName
      );

      if (existingKasbonTx) {
        // Akumulasikan shortage ke transaksi kasbon yang sudah ada
        const updatedTransactions = transactions.map(t => {
          if (t.id === existingKasbonTx.id) {
            const currentShortage = t.shortage !== undefined ? t.shortage : t.totalAmount;
            return {
              ...t,
              totalAmount: (Number(t.totalAmount) || 0) + subtotal,
              shortage: (Number(currentShortage) || 0) + shortageAmount,
              items: [...(t.items || []), ...cart]
            };
          }
          return t;
        });

        setTransactions(updatedTransactions);

        // Kurangi stok produk
        const updatedProducts = products.map(p => {
          const cartItemsForProduct = cart.filter(ci => ci.id === p.id);
          if (cartItemsForProduct.length === 0) return p;

          let newStock = Number(p.stock || 0);
          let newEceranStock = Number(p.eceranStock || 0);

          cartItemsForProduct.forEach(item => {
            if (item.isPcs) {
              let totalNeeded = Number(item.quantity) || 0;
              if (newEceranStock >= totalNeeded) {
                newEceranStock -= totalNeeded;
              } else {
                while (newEceranStock < totalNeeded) {
                   if (newStock >= 1) {
                      newStock -= 1;
                      newEceranStock += (Number(p.pcsPerPack) || 1);
                   } else break;
                }
                newEceranStock = Math.max(0, newEceranStock - totalNeeded);
              }
            } else {
              newStock = Math.max(0, newStock - (Number(item.quantity) || 0));
            }
          });

          return { ...p, stock: newStock, eceranStock: newEceranStock };
        });

        setProducts(updatedProducts);
        setLastTxReceipt({
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
          type: 'RETAIL'
        });
        setCart([]);
        setBuyerName('');
        setCashAmount('');
        return;
      }
    }

    const newTx = {
      id: txId, 
      date: new Date().toISOString(), 
      items: cart,
      totalAmount: subtotal, 
      totalProfit: profit, 
      status: effectivePaymentType,
      buyer: effectivePaymentType === 'MENUNGGU' || isUnderpaid ? formattedBuyerName : 'Pelanggan Umum',
      cashPaid: effectivePaymentType === 'LUNAS' ? cash : (cash > 0 ? cash : 0),
      change: effectivePaymentType === 'LUNAS' && cash >= subtotal ? changeAmount : 0,
      shortage: shortageAmount,
      type: 'RETAIL'
    };

    const updatedProducts = products.map(p => {
      const cartItemsForProduct = cart.filter(ci => ci.id === p.id);
      if (cartItemsForProduct.length === 0) return p;

      let newStock = Number(p.stock || 0);
      let newEceranStock = Number(p.eceranStock || 0);

      cartItemsForProduct.forEach(item => {
        if (item.isPcs) {
          let totalNeeded = Number(item.quantity) || 0;
          if (newEceranStock >= totalNeeded) {
            newEceranStock -= totalNeeded;
          } else {
            while (newEceranStock < totalNeeded) {
               if (newStock >= 1) {
                  newStock -= 1;
                  newEceranStock += (Number(p.pcsPerPack) || 1);
               } else break;
            }
            newEceranStock = Math.max(0, newEceranStock - totalNeeded);
          }
        } else {
          newStock = Math.max(0, newStock - (Number(item.quantity) || 0));
        }
      });

      return { ...p, stock: newStock, eceranStock: newEceranStock };
    });

    setProducts(updatedProducts);
    setTransactions([newTx, ...transactions]);

    setLastTxReceipt(newTx);
    setCart([]); 
    setBuyerName(''); 
    setCashAmount('');
  };

  const filtered = products.filter(p => 
    (activeCat === 'Semua' || p.category === activeCat) && 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      <div className="flex-1 space-y-5">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Cari barang atau ketik nama produk..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs md:text-sm" 
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16}/>
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {['Semua', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => { playBeep('click'); setActiveCat(c); }} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeCat === c ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {filtered.map(p => {
            const isOutOfStock = p.stock <= 0 && (p.eceranStock || 0) <= 0;
            return (
              <div key={p.id} className={`bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden transition-all hover:shadow-md relative ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}>
                <div>
                  <div className="w-full aspect-square bg-slate-100 relative overflow-hidden">
                    <img 
                      src={p.image || `https://placehold.co/300x300/e2e8f0/1e293b?text=${encodeURIComponent(p.name)}`} 
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = `https://placehold.co/300x300/e2e8f0/1e293b?text=Produk`; }}
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
      </div>

      <div className="lg:w-[380px] bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl h-fit sticky top-20 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
           <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-600"/>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">Keranjang Transaksi</h3>
           </div>
           <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-black">
            {cart.reduce((a, b) => a + b.quantity, 0)} Item
           </span>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {cart.length > 0 ? cart.map(i => (
            <div key={i.cartId} className="flex justify-between items-center text-xs bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
              <div className="flex-1 pr-2">
                <p className="font-black text-gray-800 uppercase text-[11px] line-clamp-1">{i.name}</p>
                <p className="text-[10px] font-bold text-gray-400">{formatRp(i.priceAtTime)} x {i.quantity}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button onClick={() => updateCartQty(i.cartId, -1)} className="px-2 py-1 font-black text-gray-500 hover:bg-gray-100">-</button>
                  <span className="px-2 text-[10px] font-black">{i.quantity}</span>
                  <button onClick={() => updateCartQty(i.cartId, 1)} className="px-2 py-1 font-black text-gray-500 hover:bg-gray-100">+</button>
                </div>
                <span className="font-black text-blue-600 text-xs w-16 text-right">{formatRp(i.priceAtTime * i.quantity)}</span>
              </div>
            </div>
          )) : (
            <div className="text-center py-10 text-gray-300 font-bold uppercase text-[10px] tracking-wider">
              Keranjang masih kosong
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPaymentType('LUNAS')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${paymentType === 'LUNAS' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>Tunai (Lunas)</button>
              <button onClick={() => setPaymentType('MENUNGGU')} className={`py-3 rounded-xl font-black text-[10px] uppercase transition-all ${paymentType === 'MENUNGGU' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>Kasbon (Hutang)</button>
            </div>

            {(paymentType === 'MENUNGGU' || (paymentType === 'LUNAS' && cashAmount !== '' && Number(cashAmount) < subtotal)) && (
              <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Nama Pembeli (Wajib untuk Kasbon/Kekurangan)..." className="w-full p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-amber-500" />
            )}

            {paymentType === 'LUNAS' && (
              <div className="space-y-2">
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder={`Nominal Diterima (Min ${formatRp(subtotal)})`} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setCashAmount(subtotal)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold uppercase">Uang Pas</button>
                  <button onClick={() => setCashAmount(10000)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">10rb</button>
                  <button onClick={() => setCashAmount(20000)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">20rb</button>
                  <button onClick={() => setCashAmount(50000)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">50rb</button>
                  <button onClick={() => setCashAmount(100000)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-bold">100rb</button>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase">Subtotal</span>
                <span className="text-xl font-black text-blue-600">{formatRp(subtotal)}</span>
              </div>
              {paymentType === 'LUNAS' && cashAmount !== '' && Number(cashAmount) < subtotal && (
                <div className="flex justify-between items-center text-xs font-black border-t border-amber-200 pt-2 text-amber-700">
                  <span>Kurang (Masuk Kasbon)</span>
                  <span>{formatRp(subtotal - Number(cashAmount))}</span>
                </div>
              )}
              {paymentType === 'LUNAS' && (cashAmount === '' || Number(cashAmount) >= subtotal) && (
                <div className="flex justify-between items-center text-xs font-black border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Kembalian</span>
                  <span className="text-emerald-600">{formatRp(changeAmount)}</span>
                </div>
              )}
            </div>

            <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <CheckCircle size={18}/> Bayar Transaksi
            </button>
          </div>
        )}
      </div>

      {lastTxReceipt && (
        <ReceiptModal tx={lastTxReceipt} profile={profile} onClose={() => setLastTxReceipt(null)} />
      )}
    </div>
  );
};

// --- MODAL STRUK ---
const ReceiptModal = ({ tx, profile, onClose }) => {
  const [printerStatus, setPrinterStatus] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  const printViaBluetooth = async () => {
    setIsPrinting(true);
    setPrinterStatus('Mencari perangkat Bluetooth terdekat...');
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome/Edge.");
      }

      setPrinterStatus('Pilih printer thermal Bluetooth Anda...');
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
      });

      setPrinterStatus(`Menghubungkan ke ${device.name || 'Printer'}...`);
      const server = await device.gatt.connect();
      
      let service;
      let characteristic;
      const services = await server.getPrimaryServices();
      for (const s of services) {
        try {
          const chars = await s.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              service = s;
              characteristic = c;
              break;
            }
          }
          if (characteristic) break;
        } catch (e) {}
      }

      if (!characteristic) {
        throw new Error("Tidak ditemukan karakteristik write pada printer.");
      }

      setPrinterStatus('Mengirim data cetak...');
      
      const encoder = new TextEncoder();
      const line = "\n--------------------------------\n";
      let receiptText = "";
      receiptText += "\x1B\x40"; 
      receiptText += "\x1B\x61\x01"; 
      receiptText += `${profile.ownerName || 'WARUNG PINTAR'}\n`;
      if (profile.address) receiptText += `${profile.address}\n`;
      receiptText += line;
      receiptText += `No: ${tx.id}\nTgl: ${formatDate(tx.date)}\nPelanggan: ${tx.buyer || 'Umum'}\n`;
      receiptText += line;
      receiptText += "\x1B\x61\x00"; 
      
      tx.items?.forEach(it => {
        receiptText += `${it.name}\n  ${it.quantity} x ${formatRp(it.priceAtTime)} = ${formatRp(it.priceAtTime * it.quantity)}\n`;
      });

      receiptText += line;
      receiptText += `TOTAL: ${formatRp(tx.totalAmount)}\n`;
      if (tx.status === 'LUNAS') {
        receiptText += `Bayar: ${formatRp(tx.cashPaid || tx.totalAmount)}\n`;
        receiptText += `Kembali: ${formatRp(tx.change || 0)}\n`;
      }
      receiptText += line;
      receiptText += "\x1B\x61\x01"; 
      receiptText += `${profile.footerNote || 'Terima kasih!'}\n\n\n\x1B\x64\x03`;

      const data = encoder.encode(receiptText);
      const chunkSize = 512;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
      }

      setPrinterStatus('Berhasil dicetak via Bluetooth!');
      setTimeout(() => setPrinterStatus(''), 3000);
    } catch (err) {
      console.warn("Bluetooth error:", err);
      setPrinterStatus('Bluetooth dibatasi sandboxed. Membuka Cetak Browser...');
      setTimeout(() => {
        setPrinterStatus('');
        window.print();
      }, 1000);
    } finally {
      setIsPrinting(false);
    }
  };

  const printViaWiFi = async () => {
    const ip = prompt("Masukkan Alamat IP Printer Thermal Wi-Fi (Cth: 192.168.1.100 atau port 9100):");
    if (!ip) return;

    setIsPrinting(true);
    setPrinterStatus(`Menghubungkan ke ${ip}...`);

    try {
      const response = await fetch(`http://${ip}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tx, profile })
      });
      if (!response.ok) throw new Error("Gagal terhubung ke printer Wi-Fi.");
      setPrinterStatus('Berhasil mencetak via Wi-Fi!');
      setTimeout(() => setPrinterStatus(''), 3000);
    } catch (err) {
      alert(`Koneksi langsung ke IP ${ip} memerlukan proxy lokal. Membuka dialog cetak browser.`);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-black text-xs uppercase text-gray-500">Struk Transaksi Retail</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl font-mono text-[11px] text-gray-800 space-y-3 border border-slate-200">
          <div className="text-center space-y-1">
            <p className="font-black text-sm uppercase">{profile.ownerName || 'WARUNG PINTAR'}</p>
            {profile.address && <p className="text-[9px] text-gray-500">{profile.address}</p>}
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-2 text-[9px] space-y-0.5">
            <div className="flex justify-between"><span>No:</span><span>{tx.id}</span></div>
            <div className="flex justify-between"><span>Tgl:</span><span>{formatDate(tx.date)}</span></div>
            <div className="flex justify-between"><span>Pelanggan:</span><span>{tx.buyer}</span></div>
            <div className="flex justify-between font-bold"><span>Status:</span><span className="uppercase">{tx.status}</span></div>
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
              <span>{formatRp(tx.totalAmount)}</span>
            </div>
            {tx.status === 'LUNAS' && (
              <>
                <div className="flex justify-between text-gray-500">
                  <span>Bayar</span>
                  <span>{formatRp(tx.cashPaid || tx.totalAmount)}</span>
                </div>
                {tx.change > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Kembali</span>
                    <span>{formatRp(tx.change)}</span>
                  </div>
                )}
              </>
            )}
            {(tx.status === 'MENUNGGU' || (tx.shortage && tx.shortage > 0)) && (
              <div className="flex justify-between text-amber-600 font-bold">
                <span>Kurang (Kasbon)</span>
                <span>{formatRp(tx.shortage || tx.totalAmount)}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[9px] text-gray-400 pt-3 border-t border-dashed border-gray-300">
            {profile.footerNote || 'Terima kasih atas kunjungan Anda!'}
          </div>
        </div>

        {printerStatus && (
          <div className="p-3 bg-blue-50 text-blue-700 text-[10px] font-black uppercase rounded-xl text-center">
            {printerStatus}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <button 
              disabled={isPrinting}
              onClick={printViaBluetooth} 
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md"
            >
              <Printer size={14}/> Bluetooth
            </button>
            <button 
              disabled={isPrinting}
              onClick={printViaWiFi} 
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap size={14}/> Wi-Fi
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase">
              Cetak Browser
            </button>
            <button onClick={onClose} className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-black text-[10px] uppercase">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 3. DIGITAL VIEW (PPOB & DIGITAL) ---
const DigitalView = ({ digitalTransactions, setDigitalTransactions, profile }) => {
  const [serviceType, setServiceType] = useState('Pulsa');
  const [provider, setProvider] = useState('Telkomsel');
  const [targetNumber, setTargetNumber] = useState('');
  const [nominal, setNominal] = useState(20000);
  const [adminFee, setAdminFee] = useState(2500);
  const [customerName, setCustomerName] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);

  const handleServiceChange = (type) => {
    playBeep('click');
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

  const handleDigitalSubmit = (e) => {
    e.preventDefault();
    if (!targetNumber.trim()) {
      alert("Masukkan nomor HP, ID Pelanggan, atau Nama Pelanggan!");
      return;
    }

    playBeep('success');
    const txId = `DIG-${Date.now().toString().slice(-6)}`;
    
    const newDigitalTx = {
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
      type: 'DIGITAL'
    };

    setDigitalTransactions([newDigitalTx, ...digitalTransactions]);
    setLastReceipt(newDigitalTx);
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
                <input type="number" value={nominal} onChange={e => setNominal(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-xs" required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Biaya Admin / Laba (Rp)</label>
                <input type="number" value={adminFee} onChange={e => setAdminFee(e.target.value)} className="w-full p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl outline-none font-bold text-xs text-emerald-700" required />
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

            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
              <CheckCircle size={18}/> Proses Transaksi Digital
            </button>
          </form>
      </div>

      {lastReceipt && (
        <DigitalReceiptModal tx={lastReceipt} profile={profile} onClose={() => setLastReceipt(null)} />
      )}
    </div>
  );
};

const DigitalReceiptModal = ({ tx, profile, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-black text-xs uppercase text-gray-500">Struk Transaksi Digital</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={18}/></button>
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
            <div className="flex justify-between"><span>Pelanggan:</span><span>{tx.customer}</span></div>
          </div>

          <div className="space-y-1 py-1 text-[10px]">
            <div className="flex justify-between text-gray-600">
              <span>Nominal Layanan</span>
              <span>{formatRp(tx.baseAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Biaya Admin / Jasa</span>
              <span>{formatRp(tx.fee)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-[10px]">
            <div className="flex justify-between font-bold text-xs">
              <span>TOTAL BAYAR</span>
              <span className="text-blue-600">{formatRp(tx.sellAmount)}</span>
            </div>
          </div>

          <div className="text-center text-[9px] text-gray-400 pt-3 border-t border-dashed border-gray-300">
            {profile.footerNote || 'Terima kasih atas kunjungan Anda!'}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2">
            <Printer size={16}/> Cetak Struk
          </button>
          <button onClick={onClose} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 4. STOK VIEW ---
const StokView = ({ products, setProducts }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [catFilter, setCatFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); 
  
  const [formData, setFormData] = useState({
    name: '', cat: 'Sembako', cost: '', sell: '', stock: '',
    isKeteng: false, ketengPrice: '', pcsPerPack: '12', eceranStock: '0', image: ''
  });

  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const openForm = (p = null) => {
    if (p) {
      setEditingId(p.id);
      setFormData({ 
        name: p.name, cat: p.category, cost: p.costPrice, sell: p.sellingPrice, stock: p.stock,
        isKeteng: p.isKeteng || false, ketengPrice: p.ketengPrice || '', 
        pcsPerPack: p.pcsPerPack || '12', eceranStock: p.eceranStock || '0',
        image: p.image || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', cat: 'Sembako', cost: '', sell: '', stock: '', isKeteng: false, ketengPrice: '', pcsPerPack: '12', eceranStock: '0', image: '' });
    }
    setShowForm(true);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Tidak dapat mengakses kamera perangkat.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setFormData({ ...formData, image: dataUrl });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData({ ...formData, image: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      id: editingId || `P-${Date.now().toString().slice(-4)}`,
      name: formData.name.trim(), 
      category: formData.cat, 
      costPrice: Number(formData.cost) || 0,
      sellingPrice: Number(formData.sell) || 0, 
      stock: Math.max(0, Math.floor(Number(formData.stock) || 0)),
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

  const filteredProducts = products.filter(p => 
    (catFilter === 'Semua' || p.category === catFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Gudang & Inventori Toko</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Kelola stok produk, foto barang, dan harga eceran</p>
        </div>
        <button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
          <Plus size={16}/> Tambah Produk
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari barang di stok..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none text-xs font-bold" />
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
                <th className="px-6 py-4">Produk</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Stok Bungkus</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Sisa Keteng</th>
                <th className="px-6 py-4">Harga Modal / Jual</th>
                <th className="px-6 py-4 text-center">Aksi</th>
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
                      onError={(e) => { e.target.src = `https://placehold.co/100x100/e2e8f0/1e293b?text=Produk`; }}
                    />
                    <div>
                      <p className="font-black text-gray-800 uppercase mb-0.5">{p.name}</p>
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{p.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className={`px-3 py-1 rounded-xl text-[10px] font-black whitespace-nowrap ${p.stock <= 2 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-600'}`}>
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
                        <span className="text-[9px] text-gray-400 font-normal">Modal: {formatRp(p.costPrice)}</span>
                        {p.isKeteng && <span className="text-[9px] text-orange-600 uppercase">Ecer: {formatRp(p.ketengPrice)}/Pcs</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openForm(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => setDeleteConfirm(p)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Foto / Gambar Produk</label>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-200">
                  <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden shrink-0 border border-gray-300">
                    <img 
                      src={formData.image || `https://placehold.co/150x150/e2e8f0/1e293b?text=Preview`} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.src = `https://placehold.co/150x150/e2e8f0/1e293b?text=Preview`; }}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Stok (Bungkus)</label>
                   <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-bold text-xs" required placeholder="10" />
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
    </div>
  );
};

// --- 5. HISTORY VIEW ---
const HistoryView = ({ transactions, setTransactions, digitalTransactions, setDigitalTransactions, profile }) => {
  const [activeTabHist, setActiveTabHist] = useState('retail');
  const [confirmModal, setConfirmModal] = useState(null); 
  const [cicilanModal, setCicilanModal] = useState(null);
  const [cicilanAmount, setCicilanAmount] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedDigitalTx, setSelectedDigitalTx] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  const filteredTrans = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      const isKasbon = tx.status === 'MENUNGGU' || (tx.shortage && tx.shortage > 0);
      const matchStatus = statusFilter === 'Semua' || 
        (statusFilter === 'LUNAS' && !isKasbon) || 
        (statusFilter === 'KASBON' && isKasbon);

      return d >= start && d <= end && matchStatus;
    });
  }, [transactions, startDate, endDate, statusFilter]);

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
     setTransactions(transactions.map(tx => tx.id === confirmModal ? { ...tx, status: 'LUNAS', shortage: 0 } : tx));
     setConfirmModal(null);
  };

  const handleCicilanSubmit = (e) => {
    e.preventDefault();
    if (!cicilanModal) return;
    const payNum = Number(cicilanAmount) || 0;
    if (payNum <= 0) return;

    setTransactions(transactions.map(tx => {
      if (tx.id === cicilanModal.id) {
        const currentShortage = tx.shortage !== undefined ? Number(tx.shortage) : Number(tx.totalAmount);
        const newShortage = Math.max(0, currentShortage - payNum);
        const newStatus = newShortage === 0 ? 'LUNAS' : tx.status;
        return {
          ...tx,
          shortage: newShortage,
          status: newStatus
        };
      }
      return tx;
    }));

    setCicilanModal(null);
    setCicilanAmount('');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Log Riwayat Transaksi</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Riwayat penjualan barang fisik, status lunas, dan cicilan kasbon pembeli</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => setActiveTabHist('retail')} className={`px-4 py-2 rounded-lg transition-all ${activeTabHist === 'retail' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Retail Fisik</button>
            <button onClick={() => setActiveTabHist('digital')} className={`px-4 py-2 rounded-lg transition-all ${activeTabHist === 'digital' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Layanan Digital</button>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => setStatusFilter('Semua')} className={`px-3 py-2 rounded-lg ${statusFilter === 'Semua' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Semua</button>
            <button onClick={() => setStatusFilter('LUNAS')} className={`px-3 py-2 rounded-lg ${statusFilter === 'LUNAS' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}>Kolom Lunas</button>
            <button onClick={() => setStatusFilter('KASBON')} className={`px-3 py-2 rounded-lg ${statusFilter === 'KASBON' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}>Pembeli Kasbon</button>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
            <span className="text-gray-300">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          </div>
        </div>
      </div>

      {activeTabHist === 'retail' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrans.length > 0 ? filteredTrans.map(tx => {
            const isKasbon = tx.status === 'MENUNGGU' || (tx.shortage !== undefined && tx.shortage > 0);
            const remainingKasbon = tx.shortage !== undefined ? tx.shortage : (isKasbon ? tx.totalAmount : 0);
            return (
              <div key={tx.id} className={`bg-white p-6 rounded-3xl border shadow-sm space-y-4 flex flex-col justify-between transition-all hover:shadow-md ${isKasbon ? 'border-amber-200 ring-2 ring-amber-50' : 'border-emerald-100'}`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    {isKasbon ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-500 text-white shadow-sm">
                        Kasbon / Belum Lunas
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 flex items-center gap-1">
                        <Check size={12}/> Lunas
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400">{formatDate(tx.date)}</span>
                  </div>

                  <div className="flex justify-between items-baseline mb-3">
                    <h4 className="font-black text-gray-800 text-lg">{formatRp(tx.totalAmount)}</h4>
                    <span className="text-[10px] font-black text-gray-400">{tx.id}</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl space-y-2 text-xs">
                     <div className="flex items-center justify-between text-gray-700 font-black border-b border-gray-200/50 pb-2">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400"/>
                          <span className="uppercase text-[11px]">{tx.buyer || 'Pelanggan Umum'}</span>
                        </div>
                        {isKasbon ? (
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
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSelectedTx(tx)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all">
                    <Printer size={14}/> Struk
                  </button>
                  {isKasbon && (
                    <>
                      <button onClick={() => setCicilanModal(tx)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-[9px] font-black uppercase shadow-sm transition-all">
                        Cicil
                      </button>
                      <button onClick={() => setConfirmModal(tx.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-[9px] font-black uppercase shadow-sm transition-all">
                        Lunas
                      </button>
                    </>
                  )}
                </div>
              </div>
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
                   <div className="flex justify-between text-emerald-600 font-bold pt-1 border-t border-gray-200">
                      <span>Admin/Fee:</span>
                      <span>+ {formatRp(tx.fee)}</span>
                   </div>
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

      {selectedTx && <ReceiptModal tx={selectedTx} profile={profile} onClose={() => setSelectedTx(null)} />}
      {selectedDigitalTx && <DigitalReceiptModal tx={selectedDigitalTx} profile={profile} onClose={() => setSelectedDigitalTx(null)} />}

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
    </div>
  );
};

// --- 6. REKAP VIEW ---
const RekapView = ({ transactions, digitalTransactions }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const dailyRecap = useMemo(() => {
    const map = {};

    transactions.filter(t => t.status === 'LUNAS').forEach(tx => {
      const date = tx.date.split('T')[0];
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      if (d >= start && d <= end) {
        if (!map[date]) map[date] = { date, retailOmset: 0, retailProfit: 0, digitalOmset: 0, digitalProfit: 0, count: 0 };
        map[date].retailOmset += (tx.totalAmount || 0);
        map[date].retailProfit += (tx.totalProfit || 0);
        map[date].count += 1;
      }
    });

    digitalTransactions.forEach(tx => {
      const date = tx.date.split('T')[0];
      const d = new Date(tx.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      if (d >= start && d <= end) {
        if (!map[date]) map[date] = { date, retailOmset: 0, retailProfit: 0, digitalOmset: 0, digitalProfit: 0, count: 0 };
        map[date].digitalOmset += (tx.sellAmount || 0);
        map[date].digitalProfit += (tx.fee || 0);
        map[date].count += 1;
      }
    });

    return Object.values(map).sort((a,b) => b.date.localeCompare(a.date));
  }, [transactions, digitalTransactions, startDate, endDate]);

  const totalRekap = useMemo(() => {
    return dailyRecap.reduce((acc, curr) => ({
      omset: acc.omset + curr.retailOmset + curr.digitalOmset,
      profit: acc.profit + curr.retailProfit + curr.digitalProfit,
      count: acc.count + curr.count
    }), { omset: 0, profit: 0, count: 0 });
  }, [dailyRecap]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
           <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">Rekapitulasi Keuangan Toko</h2>
           <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5">Laporan gabungan omset fisik dan keuntungan PPOB digital</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">Periode:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
          <span className="text-gray-300">-</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] font-black outline-none uppercase" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-100">Total Omset Gabungan</p>
          <h3 className="text-2xl font-black mt-1">{formatRp(totalRekap.omset)}</h3>
          <p className="text-[9px] text-blue-200 mt-2">{totalRekap.count} Total Transaksi</p>
        </div>

        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-500/20">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100">Total Laba Bersih</p>
          <h3 className="text-2xl font-black mt-1">{formatRp(totalRekap.profit)}</h3>
          <p className="text-[9px] text-emerald-200 mt-2">Retail + Fee PPOB Digital</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Rata-Rata Profit Margin</p>
          <h3 className="text-2xl font-black text-gray-800">
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
                  <td className="px-6 py-4 text-center font-black text-blue-600">{day.count} Tx</td>
                  <td className="px-6 py-4 font-bold text-gray-800">{formatRp(day.retailOmset)}</td>
                  <td className="px-6 py-4 font-bold text-indigo-600">{formatRp(day.digitalOmset)}</td>
                  <td className="px-6 py-4 font-black text-emerald-600">{formatRp(day.retailProfit + day.digitalProfit)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400 font-bold uppercase text-[10px]">
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
const ProfileView = ({ profile, setProfile, products, setProducts, transactions, setTransactions, digitalTransactions, setDigitalTransactions }) => {
  const [data, setData] = useState(profile);
  const [msg, setMsg] = useState('');
  const [printerDevice, setPrinterDevice] = useState(null);
  const [printerStatusInfo, setPrinterStatusInfo] = useState('Belum Terhubung');
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  
  // State Kamera & Foto Profil Toko
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => setData(profile), [profile]);

  const saveProfile = (e) => {
    e.preventDefault();
    setProfile(data);
    stopCamera();
    setMsg('Profil toko & foto berhasil disimpan!');
    setTimeout(() => setMsg(''), 3000);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Tidak dapat mengakses kamera perangkat.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setData({ ...data, avatar: dataUrl });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setData({ ...data, avatar: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const connectBluetoothPrinter = async () => {
    setIsConnectingPrinter(true);
    setPrinterStatusInfo('Mencari perangkat printer...');
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API tidak didukung di browser ini.");
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455']
      });

      setPrinterStatusInfo(`Menghubungkan ke ${device.name || 'Printer'}...`);
      const server = await device.gatt.connect();
      
      setPrinterDevice(device);
      setPrinterStatusInfo(`Terkoneksi: ${device.name || 'Printer Thermal'}`);

      device.addEventListener('gattserverdisconnected', () => {
        setPrinterDevice(null);
        setPrinterStatusInfo('Terputus (Disconnected)');
      });

    } catch (err) {
      console.warn("Bluetooth connection failed/canceled:", err);
      setPrinterStatusInfo('Gagal / Batal Terhubung');
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const disconnectBluetoothPrinter = () => {
    if (printerDevice && printerDevice.gatt.connected) {
      printerDevice.gatt.disconnect();
    }
    setPrinterDevice(null);
    setPrinterStatusInfo('Belum Terhubung');
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

  const importBackupFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.profile) setProfile(importedData.profile);
        if (importedData.products) setProducts(importedData.products);
        if (importedData.transactions) setTransactions(importedData.transactions);
        if (importedData.digitalTransactions) setDigitalTransactions(importedData.digitalTransactions);
        alert('Data berhasil dipulihkan dari file backup!');
      } catch (err) {
        alert('Format file JSON backup tidak valid!');
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
          <p className="text-[10px] font-black text-emerald-600 uppercase mt-0.5 tracking-wider">Storage Perangkat Lokal</p>
        </div>

        {!printerDevice && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-900">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase">Bluetooth Belum Terhubung</h4>
              <p className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Mohon nyalakan Bluetooth pada perangkat Anda dan pastikan printer thermal dalam keadaan aktif untuk mencetak struk.</p>
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${printerDevice ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                <Printer size={20}/>
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 uppercase">Pencetak Struk Bluetooth</h4>
                <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Status: <span className={printerDevice ? 'text-emerald-600 font-black' : 'text-amber-600'}>{printerStatusInfo}</span></p>
              </div>
            </div>

            {printerDevice ? (
              <button onClick={disconnectBluetoothPrinter} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase transition-all">
                Putuskan
              </button>
            ) : (
              <button disabled={isConnectingPrinter} onClick={connectBluetoothPrinter} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-sm">
                {isConnectingPrinter ? 'Menghubungkan...' : 'Hubungkan'}
              </button>
            )}
          </div>
          <p className="text-[9px] text-gray-400 font-medium">Pastikan Bluetooth perangkat menyala dan printer thermal dalam mode pairing/siap konek.</p>
        </div>

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

          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
            <Save size={16}/> Simpan Informasi & Foto Toko
          </button>
        </form>

        {msg && <div className="text-[10px] font-black text-emerald-600 text-center uppercase bg-emerald-50 py-3 rounded-xl border border-emerald-200">{msg}</div>}
      </div>

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
    </div>
  );
};