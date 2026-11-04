import React, { useState } from 'react';
import {
  Menu,
  X,
  ShoppingBag,
  Store,
  MessageCircle,
  Phone,
  Bell,
  Sparkles,
  Flame,
  PackagePlus,
  CalendarDays,
  Tag,
  Home,
  ChevronRight,
  MapPin,
  Settings as SettingsIcon,
} from 'lucide-react';
import { StoreSettings } from '../types';

interface HeaderProps {
  currentView: 'store' | 'admin';
  onViewChange: (view: 'store' | 'admin') => void;
  settings: StoreSettings;
  onSelectCategory?: (category: string) => void;
  cartCount?: number;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  settings,
  onSelectCategory,
  cartCount = 0,
  unreadCount = 0,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const rawPhone = (settings.whatsapp || '+8801821558813').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('880')
    ? rawPhone
    : rawPhone.startsWith('0')
    ? `88${rawPhone}`
    : rawPhone
    ? `880${rawPhone}`
    : '8801821558813';

  const handleMenuItemClick = (categoryName?: string, sectionId?: string) => {
    setDrawerOpen(false);
    if (currentView !== 'store') {
      onViewChange('store');
    }

    if (categoryName && onSelectCategory) {
      onSelectCategory(categoryName);
    }

    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const menuItems = [
    { label: '🏠 হোম', en: 'Home', action: () => handleMenuItemClick('সব') },
    { label: '🛒 সব পণ্য', en: 'All Products', action: () => handleMenuItemClick('সব', 'products-section') },
    { label: '🔥 চলমান অফার', en: 'Offers', action: () => handleMenuItemClick('সব', 'offers-section') },
    { label: '🎁 প্যাকেজ', en: 'Packages', action: () => handleMenuItemClick('সব', 'packages-section') },
    { label: '📅 প্রি-বুকিং', en: 'Pre-Booking', action: () => handleMenuItemClick('সব', 'prebooking-section') },
    { label: '🌿 হারবাল', en: 'Herbal', action: () => handleMenuItemClick('হারবাল', 'products-section') },
    { label: '💄 রূপচর্চা', en: 'Beauty', action: () => handleMenuItemClick('রূপচর্চা', 'products-section') },
    { label: '🍯 খেজুর ও মধু', en: 'Dates & Honey', action: () => handleMenuItemClick('খেজুর ও মধু', 'products-section') },
    { label: '🍮 মিষ্টি ও দই', en: 'Sweets & Curd', action: () => handleMenuItemClick('মিষ্টি ও দই', 'products-section') },
    {
      label: '📞 যোগাযোগ',
      en: 'Contact',
      action: () => {
        setDrawerOpen(false);
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      },
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0A4A29] shadow-md border-b-2 border-[#FFB300]">
        {/* Compact Mobile Header (56px on mobile, 64px on tablet/desktop) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Left: Hamburger menu (☰) on mobile */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl text-white hover:bg-white/10 active:scale-95 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
              aria-label="মেনু খুলুন"
              title="মেনু খুলুন"
            >
              <Menu className="w-6 h-6 text-[#FFB300]" />
            </button>

            {/* Quick Back to Store button on Admin View */}
            {currentView === 'admin' && (
              <button
                onClick={() => onViewChange('store')}
                className="hidden md:flex items-center gap-1.5 text-xs text-[#FFE0A8] hover:text-white px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 min-h-[40px] cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#FFB300]" />
                <span>স্টোর দেখুন</span>
              </button>
            )}
          </div>

          {/* Center: Logo, Bengali Brand Name & Slogan */}
          <div
            onClick={() => {
              if (currentView !== 'store') onViewChange('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center cursor-pointer select-none text-center px-1 max-w-[200px] sm:max-w-none"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#1E8A52] to-[#06331C] border border-[#FFB300] flex items-center justify-center shadow-sm shrink-0">
                <ShoppingBag className="w-4 h-4 text-[#FFB300]" />
              </div>
              <div className="text-lg sm:text-2xl font-black tracking-wider leading-none">
                <span className="text-white">InfiMart </span>
                <span className="text-[#FFB300]">BD</span>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-[#FFE0A8] font-medium tracking-tight truncate max-w-[220px] sm:max-w-sm mt-0.5">
              {settings.slogan || 'সাশ্রয়ের ঠিকানা, ভরসার বাজার'}
            </p>
          </div>

          {/* Right: Notification Bell & Quick WhatsApp & ⚙️ Settings Icon */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Quick WhatsApp Order Icon */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                'আসসালামু আলাইকুম InfiMart BD, আমি বাজার অর্ডার করতে চাই।'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white active:scale-95 transition flex items-center gap-1.5 shadow-sm min-h-[44px] min-w-[44px] justify-center"
              aria-label="হোয়াটসঅ্যাপে অর্ডার"
              title="হোয়াটসঅ্যাপে সরাসরি অর্ডার করুন"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span className="hidden lg:inline text-xs font-bold">অর্ডার</span>
            </a>

            {/* Notification Bell */}
            <button
              onClick={() => {
                setShowNotificationToast(true);
                setTimeout(() => setShowNotificationToast(false), 4000);
              }}
              className="relative p-2 rounded-xl text-white hover:bg-white/10 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label="নোটিফিকেশন"
              title="নোটিফিকেশন"
            >
              <Bell className="w-5 h-5 text-white/90" />
              {unreadCount > 0 ? (
                <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FFB300] rounded-full"></span>
              )}
            </button>

            {/* Small ⚙️ Gear/Settings Icon at Top-Right Corner (Size: 20-24px, light green / white, opens ?page=admin / admin view) */}
            <button
              onClick={() => onViewChange(currentView === 'store' ? 'admin' : 'store')}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 active:scale-90 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer opacity-90 hover:opacity-100"
              aria-label="Settings"
              title="সেটিংস"
            >
              <span className="text-[20px] sm:text-[22px] leading-none select-none inline-block transform hover:rotate-45 transition-transform duration-300">
                ⚙️
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {showNotificationToast && (
        <div className="fixed top-16 right-4 z-50 bg-[#0A4A29] text-white border-2 border-[#FFB300] rounded-2xl p-4 shadow-2xl max-w-xs animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-5 h-5 text-[#FFB300] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm text-[#FFB300]">InfiMart BD নোটিফিকেশন</h4>
              <p className="text-xs text-slate-100 mt-1 leading-relaxed">
                আপনার ঠিকানায় দ্রুততম সময়ে ফ্রেশ গ্রোসারি হোম ডেলিভারি পৌঁছে দেওয়া হচ্ছে। সকাল ৮টা থেকে রাত ১০টা পর্যন্ত সার্ভিস চালু।
              </p>
            </div>
            <button
              onClick={() => setShowNotificationToast(false)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          B. SIDE DRAWER MENU (Mobile-First 80% width, 320px on desktop)
          ========================================================================= */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark Overlay Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            aria-hidden="true"
          />

          {/* Drawer Content Panel */}
          <div
            className="relative w-[80%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between z-10 transform transition-transform duration-300 ease-out overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="প্রধান মেনু"
          >
            {/* Drawer Header */}
            <div className="bg-[#0A4A29] text-white p-4 flex items-center justify-between border-b-2 border-[#FFB300]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E8A52] to-[#06331C] border border-[#FFB300] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#FFB300]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white leading-tight">InfiMart BD</h3>
                  <p className="text-[11px] text-[#FFE0A8] font-medium">মেনু নেভিগেশন</p>
                </div>
              </div>

              {/* Close Button (✕) */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                aria-label="মেনু বন্ধ করুন"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Menu Items (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              {menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl font-bold text-slate-700 hover:text-[#0A4A29] hover:bg-emerald-50 active:bg-emerald-100 transition text-left min-h-[48px] cursor-pointer"
                >
                  <span className="text-base">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Drawer Footer Hotline & Address */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#0A4A29]">
                <Phone className="w-4 h-4 text-[#1E8A52]" />
                <span>হটলাইন: {settings.whatsapp}</span>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{settings.address || 'ফেনী সদর, ফেনী, বাংলাদেশ'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
