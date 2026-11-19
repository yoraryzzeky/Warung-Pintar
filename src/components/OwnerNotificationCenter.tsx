import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Trash2,
  X,
  RotateCcw,
  ShoppingCart,
  Zap,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import { formatRp } from '../utils/storeLogic';
import type { OwnerNotificationItem, OwnerNotificationType } from '../utils/ownerNotifications';

export type { OwnerNotificationItem, OwnerNotificationType };

interface OwnerNotificationCenterProps {
  notifications: OwnerNotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectNotification?: (item: OwnerNotificationItem) => void;
  playBeep?: (type?: string) => void;
}

export const OwnerNotificationCenter: React.FC<OwnerNotificationCenterProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onSelectNotification,
  playBeep,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClose = () => {
    if (unreadCount > 0) {
      onMarkAllAsRead();
    }
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (playBeep) playBeep('click');
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  const getIcon = (type: OwnerNotificationType) => {
    switch (type) {
      case 'TRANSACTION_RETURN':
        return <RotateCcw size={15} className="text-amber-600" />;
      case 'DIGITAL_NEW':
        return <Zap size={15} className="text-cyan-600" />;
      case 'CLOSING_CONFIRM':
        return <ClipboardCheck size={15} className="text-teal-600" />;
      case 'TRANSACTION_NEW':
      default:
        return <ShoppingCart size={15} className="text-emerald-600" />;
    }
  };

  const getBgColor = (type: OwnerNotificationType) => {
    switch (type) {
      case 'TRANSACTION_RETURN':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'DIGITAL_NEW':
        return 'bg-cyan-50 border-cyan-200 text-cyan-900';
      case 'CLOSING_CONFIRM':
        return 'bg-teal-50 border-teal-200 text-teal-900';
      case 'TRANSACTION_NEW':
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifikasi Kasir (${unreadCount} belum dibaca)`}
        className={`relative p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          unreadCount > 0
            ? `bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 ${!isOpen ? 'ring-2 ring-amber-300/70' : ''}`
            : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
        title="Pusat Notifikasi Aktivitas Kasir"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            data-testid="owner-notif-badge"
            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-white min-w-[18px] text-center shadow-sm"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={handleClose}
          />
          <div
            role="region"
            aria-label="Daftar Notifikasi Mode Owner"
            className="absolute right-0 mt-2 z-50 w-80 sm:w-96 max-w-[90vw] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bell size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight">
                    Notifikasi Mode Owner
                  </h4>
                  <p className="text-[9px] font-medium text-slate-300">
                    Transaksi, Retur/Tukar &amp; Closing Kasir
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup panel notifikasi"
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Sub-bar Actions */}
            {notifications.length > 0 && (
              <div className="px-3 py-2 bg-slate-50 border-b border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
                <span>{notifications.length} Aktivitas Kasir</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 size={11} />
                      Tandai Dibaca
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={11} />
                    Bersihkan
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-300 mx-auto flex items-center justify-center">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold text-gray-600">Belum ada notifikasi baru</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Setiap transaksi baru dan retur/tukar barang dari Mode Kasir akan muncul di sini.
                  </p>
                </div>
              ) : (
                notifications.slice(0, 30).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (onSelectNotification) onSelectNotification(n);
                      setIsOpen(false);
                    }}
                    className={`p-3 sm:p-3.5 transition-colors cursor-pointer flex items-start gap-2.5 sm:gap-3 ${
                      !n.read ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getBgColor(
                        n.type
                      )}`}
                    >
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10.5px] sm:text-xs font-black text-gray-800 truncate">
                          {n.title}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 shrink-0 flex items-center gap-0.5">
                          <Clock size={9} />
                          {new Date(n.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-medium line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      {n.detail && (
                        <p className="text-[9.5px] text-amber-700 font-bold mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                          {n.detail}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400 font-bold">
                        <span>Oleh: {n.handledBy}</span>
                        {n.amount !== undefined && n.amount > 0 && (
                          <span className="text-emerald-700 font-black">
                            {formatRp(n.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-gray-100 text-center">
              <span className="text-[9.5px] font-bold text-slate-500">
                Fitur aktif di Mode Owner • Notifikasi realtime
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
