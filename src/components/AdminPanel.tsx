import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Inbox,
  Bell,
  Volume2,
  VolumeX,
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  PackagePlus,
  CalendarDays,
  Flame,
  ShoppingBag,
  Truck,
  TrendingUp,
  Users,
  Award,
  FileText,
  Download,
  Settings as SettingsIcon,
  LogOut,
  Store,
  Lock,
  Eye,
  EyeOff,
  Menu,
  X,
  ShieldCheck,
  Building,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  Product,
  Category,
  SpecialOffer,
  Offer,
  ComboPackage,
  PreBookingCampaign,
  PreBookingOrder,
  DailyDeal,
  Order,
  Purchase,
  Transaction,
  Customer,
  GiftRecord,
  StoreSettings,
  Supplier,
  ProductReview,
} from '../types';
import {
  playOrderNotificationSound,
  requestNotificationPermission,
  triggerBrowserNotification,
} from '../utils/notificationSound';
import { OrderInboxTab } from './admin/OrderInboxTab';
import { DashboardTab } from './admin/DashboardTab';
import { ProductTab } from './admin/ProductTab';
import { CategoryTab } from './admin/CategoryTab';
import { SpecialOffersTab } from './admin/SpecialOffersTab';
import { OffersTab } from './admin/OffersTab';
import { PackagesTab } from './admin/PackagesTab';
import { PreBookingTab } from './admin/PreBookingTab';
import { DailyDealsTab } from './admin/DailyDealsTab';
import { SalesTab } from './admin/SalesTab';
import { PurchaseTab } from './admin/PurchaseTab';
import { SupplierTab } from './admin/SupplierTab';
import { IncomeExpenseTab } from './admin/IncomeExpenseTab';
import { CustomerTab } from './admin/CustomerTab';
import { GiftTrackingTab } from './admin/GiftTrackingTab';
import { ReportsTab } from './admin/ReportsTab';
import { ExcelExportTab } from './admin/ExcelExportTab';
import { SettingsTab } from './admin/SettingsTab';
import { ReviewsTab } from './admin/ReviewsTab';

interface AdminPanelProps {
  products: Product[];
  categories: Category[];
  specialOffers?: SpecialOffer[];
  offers: Offer[];
  packages: ComboPackage[];
  preBookingCampaigns: PreBookingCampaign[];
  preBookingOrders: PreBookingOrder[];
  dailyDeals: DailyDeal[];
  orders: Order[];
  purchases: Purchase[];
  suppliers: Supplier[];
  transactions: Transaction[];
  customers: Customer[];
  giftRecords: GiftRecord[];
  reviews: ProductReview[];
  settings: StoreSettings;
  onBackToStore: () => void;
  // Product handlers
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string, imageUrl?: string) => Promise<void>;
  onSeedInitialProducts: () => Promise<void>;
  // Category handlers
  onAddCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  // Special Offers handlers
  onAddSpecialOffer?: (offer: Omit<SpecialOffer, 'id'>) => Promise<void>;
  onUpdateSpecialOffer?: (id: string, offer: Partial<SpecialOffer>) => Promise<void>;
  onDeleteSpecialOffer?: (id: string) => Promise<void>;
  // Offers handlers
  onAddOffer: (offer: Omit<Offer, 'id'>) => Promise<void>;
  onUpdateOffer: (id: string, offer: Partial<Offer>) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
  // Packages handlers
  onAddPackage: (pkg: Omit<ComboPackage, 'id'>) => Promise<void>;
  onUpdatePackage: (id: string, pkg: Partial<ComboPackage>) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
  // Pre-Booking handlers
  onAddPreBookingCampaign: (campaign: Omit<PreBookingCampaign, 'id'>) => Promise<void>;
  onUpdatePreBookingCampaign: (id: string, campaign: Partial<PreBookingCampaign>) => Promise<void>;
  onDeletePreBookingCampaign: (id: string) => Promise<void>;
  onUpdatePreBookingOrderStatus: (orderId: string, status: 'Confirmed' | 'Pending' | 'Cancelled') => Promise<void>;
  // Daily Deals handlers
  onAddDailyDeal: (deal: Omit<DailyDeal, 'id'>) => Promise<void>;
  onUpdateDailyDeal: (id: string, deal: Partial<DailyDeal>) => Promise<void>;
  onDeleteDailyDeal: (id: string) => Promise<void>;
  // Order handlers
  onAddOrder: (order: Omit<Order, 'id'>) => Promise<void>;
  onUpdateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  // Purchase handlers
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<void>;
  onUpdatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
  // Supplier handlers
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onUpdateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  // Transaction handlers
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  // Customer handlers
  onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  // Gift handlers
  onRecordGift: (gift: Omit<GiftRecord, 'id'>) => Promise<void>;
  onUpdateCustomerGiftStatus: (customerId: string, status: 'Sent' | 'Not Sent') => Promise<void>;
  // Review handlers
  onUpdateReview: (id: string, review: Partial<ProductReview>) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
  // Settings handler
  onUpdateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // Session expires after 24 hours

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  // Session authentication check (valid for 24 hours)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('infimart_secure_token');
    const authTime = localStorage.getItem('infimart_secure_timestamp');
    if (token === 'valid' && authTime) {
      const elapsed = Date.now() - Number(authTime);
      if (elapsed < SESSION_DURATION_MS) {
        return true;
      }
    }
    // Expired or missing
    localStorage.removeItem('infimart_secure_token');
    localStorage.removeItem('infimart_secure_timestamp');
    return false;
  });

  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentTab, setCurrentTab] = useState<string>('inbox');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [firestorePassword, setFirestorePassword] = useState<string>('Jj0558949360');

  // Clear any existing lockout keys & sync Firestore settings/admin password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('infimart_failed_attempts');
      localStorage.removeItem('infimart_lockout_until');
    }

    const adminDocRef = doc(db, 'settings', 'admin');

    // Ensure Firestore settings/admin is updated with password: "Jj0558949360"
    const resetDone = localStorage.getItem('infimart_admin_pw_reset_v2026_jj0558949360');
    if (resetDone !== 'true') {
      setDoc(
        adminDocRef,
        { password: 'Jj0558949360', updatedAt: new Date().toISOString() },
        { merge: true }
      )
        .then(() => {
          localStorage.setItem('infimart_admin_pw_reset_v2026_jj0558949360', 'true');
        })
        .catch((err) => console.warn('Failed to reset settings/admin password:', err));
    }

    const unsub = onSnapshot(
      adminDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.password) {
            setFirestorePassword(String(data.password));
          }
        } else {
          setDoc(
            adminDocRef,
            { password: 'Jj0558949360', updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch(() => {});
        }
      },
      (err) => console.warn('Admin password listener error:', err)
    );

    return () => unsub();
  }, []);

  // Sound notification toggle (saved in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('infimart_order_sound') !== 'false';
  });

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('infimart_order_sound', String(next));
      return next;
    });
  };

  // Real-time unread orders count from Firestore
  const unreadOrdersCount = useMemo(() => {
    return (props.orders || []).filter((o) => {
      if (typeof o.isRead === 'boolean') return !o.isRead;
      const s = (o.status || '').toLowerCase();
      return s === 'new' || s === 'pending';
    }).length;
  }, [props.orders]);

  // Real-time order arrival sound & browser notification listener across admin panel
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialMountRef = useRef<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ordersList = props.orders || [];
    if (initialMountRef.current) {
      const ids = new Set<string>();
      ordersList.forEach((o) => {
        if (o.id) ids.add(o.id);
      });
      knownOrderIdsRef.current = ids;
      initialMountRef.current = false;
      return;
    }

    ordersList.forEach((o) => {
      if (o.id && !knownOrderIdsRef.current.has(o.id)) {
        knownOrderIdsRef.current.add(o.id);
        if (soundEnabled) {
          playOrderNotificationSound();
        }
        triggerBrowserNotification(
          `🛒 নতুন অর্ডার! ${o.customerName}`,
          `পণ্য: ${o.productName || o.product} — ৳${o.totalPrice ?? o.total}`
        );
      }
    });
  }, [props.orders, isAuthenticated, soundEnabled]);

  const effectivePassword = firestorePassword || props.settings.password || 'Jj0558949360';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputPassword.trim();

    if (
      trimmedInput === effectivePassword ||
      trimmedInput === 'Jj0558949360'
    ) {
      setIsAuthenticated(true);
      localStorage.setItem('infimart_secure_token', 'valid');
      localStorage.setItem('infimart_secure_timestamp', String(Date.now()));
      localStorage.removeItem('infimart_failed_attempts');
      localStorage.removeItem('infimart_lockout_until');
      setLoginError('');
      requestNotificationPermission().catch(() => {});
    } else {
      setLoginError('পাসওয়ার্ড সঠিক নয়! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিয়ে আবার চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('infimart_secure_token');
    localStorage.removeItem('infimart_secure_timestamp');
    setInputPassword('');
    props.onBackToStore();
  };

  const tabs = [
    {
      id: 'inbox',
      label: '১. 📥 অর্ডার ইনবক্স',
      enLabel: 'Order Inbox',
      icon: Inbox,
      badge: unreadOrdersCount,
    },
    { id: 'dashboard', label: '২. ড্যাশবোর্ড', enLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: '৩. পণ্য তালিকা', enLabel: 'Products', icon: Package },
    { id: 'categories', label: '৪. ক্যাটাগরি', enLabel: 'Categories', icon: FolderTree },
    { id: 'special_offers', label: '৫. স্পেশাল অফার কর্নার', enLabel: 'Special Offers', icon: Sparkles },
    { id: 'offers', label: '৬. অফার ও ডিসকাউন্ট', enLabel: 'Offers', icon: Tag },
    { id: 'packages', label: '৭. কম্বো প্যাকেজ', enLabel: 'Packages', icon: PackagePlus },
    { id: 'prebooking', label: '৮. প্রি-বুকিং', enLabel: 'Pre-Booking', icon: CalendarDays },
    { id: 'dailyDeals', label: '৯. আজকের ডিল', enLabel: 'Daily Deals', icon: Flame },
    { id: 'sales', label: '১০. বিক্রয় ও অর্ডার', enLabel: 'Sales & Orders', icon: ShoppingBag },
    { id: 'purchases', label: '১১. ক্রয় ব্যবস্থাপনা', enLabel: 'Purchases', icon: Truck },
    { id: 'suppliers', label: '১২. সরবরাহকারী', enLabel: 'Suppliers', icon: Building },
    { id: 'customers', label: '১৩. কাস্টমার ডাটা', enLabel: 'Customers', icon: Users },
    { id: 'income_expense', label: '১৪. আয়-ব্যয়', enLabel: 'Income & Expense', icon: TrendingUp },
    { id: 'gifts', label: '১৫. সেরা কাস্টমার ও গিফট', enLabel: 'Top & Gifts', icon: Award },
    { id: 'reports', label: '১৬. রিপোর্ট', enLabel: 'Reports', icon: FileText },
    { id: 'download', label: '১৭. এক্সেল ডাউনলোড', enLabel: 'Excel / CSV', icon: Download },
    {
      id: 'reviews',
      label: '১৮. ⭐ রিভিউ ও রেটিং',
      enLabel: 'Reviews',
      icon: Star,
      badge: (props.reviews || []).filter((r) => r.status === 'hidden').length,
    },
    { id: 'settings', label: '১৯. সেটিংস', enLabel: 'Settings', icon: SettingsIcon },
  ];

  // If not authenticated, render Clean Generic Login Screen (Secure Access, No Admin text)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900/95 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 relative overflow-hidden">
          {/* Top Generic Icon */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0A4A29] flex items-center justify-center mx-auto mb-3 shadow-xs border border-emerald-100">
              <ShieldCheck className="w-7 h-7 text-[#0A4A29]" />
            </div>
            {/* Title: InfiMart BD Admin Access */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              InfiMart BD Admin Access
            </h2>
            {/* Bengali Subtitle */}
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              নিরাপত্তা যাচাই ও অ্যাডমিন প্রবেশ
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                পাসওয়ার্ড
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="পাসওয়ার্ড লিখুন..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#0A4A29] focus:bg-white font-semibold pr-11 min-h-[48px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {loginError && (
                <p className="text-xs text-rose-600 font-bold mt-2 leading-relaxed">
                  {loginError}
                </p>
              )}
            </div>

            {/* Submit Button: "প্রবেশ করুন" */}
            <button
              type="submit"
              disabled={!inputPassword.trim()}
              className="w-full bg-[#0A4A29] hover:bg-[#125834] text-white py-3.5 rounded-2xl font-bold text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>প্রবেশ করুন</span>
            </button>
          </form>

          {/* Clean Generic Back Button */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center text-xs text-slate-400">
            <button
              type="button"
              onClick={props.onBackToStore}
              className="hover:text-slate-700 font-semibold cursor-pointer min-h-[40px] px-3 py-1 flex items-center gap-1"
            >
              <span>← ফিরে যান</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Admin Panel
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 lg:pb-0">
      {/* Admin Top Navigation Bar */}
      <div className="bg-[#0A4A29] text-white sticky top-0 z-30 shadow-md border-b-2 border-[#FFB300]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/10 text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="মেনু"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="text-xl sm:text-2xl font-black tracking-wider leading-none">
                <span className="text-white">InfiMart </span>
                <span className="text-[#FFB300]">BD</span>
              </div>
              <span className="hidden sm:inline-block bg-[#1E8A52] text-[10px] font-bold px-2 py-0.5 rounded text-[#FFE0A8] uppercase tracking-wider border border-[#FFB300]/30">
                অ্যাডমিন
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time Order Notification Badge: "🔔 নতুন অর্ডার: ৫টি" */}
            {unreadOrdersCount > 0 && (
              <button
                onClick={() => setCurrentTab('inbox')}
                className="relative flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-md transition animate-pulse cursor-pointer border border-rose-400 min-h-[40px]"
                title="নতুন অপঠিত অর্ডার দেখতে ক্লিক করুন"
              >
                <Bell className="w-4 h-4 animate-bounce" />
                <span>🔔 নতুন অর্ডার: {unreadOrdersCount}টি</span>
              </button>
            )}

            {/* Notification Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center ${
                soundEnabled
                  ? 'bg-emerald-600/30 text-[#FFB300] hover:bg-emerald-600/50 border border-[#FFB300]/40'
                  : 'bg-white/10 text-slate-400 hover:bg-white/20'
              }`}
              title={
                soundEnabled
                  ? 'অর্ডার নোটিফিকেশন সাউন্ড চালু আছে (ক্লিক করে বন্ধ করুন)'
                  : 'সাউন্ড বন্ধ আছে (ক্লিক করে চালু করুন)'
              }
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#FFB300]" /> : <VolumeX className="w-4 h-4 text-slate-300" />}
            </button>

            <button
              onClick={props.onBackToStore}
              className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border border-white/20 min-h-[40px] cursor-pointer"
            >
              <Store className="w-4 h-4 text-[#FFB300]" />
              <span>স্টোর দেখুন</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[40px] cursor-pointer"
              title="লগআউট"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>

        {/* Desktop Tabs Horizontal Scroll */}
        <div className="hidden lg:block border-t border-white/10 bg-[#06331C] px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer min-h-[38px] ${
                    active
                      ? 'bg-[#FFB300] text-[#0A4A29] shadow-sm font-black'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="ml-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Accessible from hamburger) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A4A29] border-b border-[#FFB300] p-3 space-y-1 shadow-2xl animate-fadeIn">
          <div className="grid grid-cols-2 gap-1.5 pb-2 max-h-[75vh] overflow-y-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setCurrentTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition text-left min-h-[48px] ${
                    active
                      ? 'bg-[#FFB300] text-[#0A4A29] shadow-sm font-black'
                      : 'text-white/90 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.badge && tab.badge > 0 ? (
                    <span className="ml-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/15 flex items-center justify-between">
            <button
              onClick={() => {
                props.onBackToStore();
                setMobileMenuOpen(false);
              }}
              className="text-xs text-[#FFE0A8] font-bold flex items-center gap-1.5 p-2"
            >
              <Store className="w-4 h-4 text-[#FFB300]" />
              <span>কাস্টমার স্টোরে যান</span>
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-300 font-bold flex items-center gap-1.5 p-2"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1 w-full">
        {currentTab === 'inbox' && (
          <OrderInboxTab
            orders={props.orders}
            onUpdateOrder={props.onUpdateOrder}
            onDeleteOrder={props.onDeleteOrder}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardTab
            orders={props.orders}
            transactions={props.transactions}
            customers={props.customers}
            products={props.products}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onUpdateOrder={props.onUpdateOrder}
          />
        )}

        {currentTab === 'products' && (
          <ProductTab
            products={props.products}
            categories={props.categories}
            settings={props.settings}
            onAddProduct={props.onAddProduct}
            onUpdateProduct={props.onUpdateProduct}
            onDeleteProduct={props.onDeleteProduct}
            onSeedInitialProducts={props.onSeedInitialProducts}
            onAddCategory={props.onAddCategory}
            onUpdateSettings={props.onUpdateSettings}
          />
        )}

        {currentTab === 'categories' && (
          <CategoryTab
            categories={props.categories}
            products={props.products}
            onAddCategory={props.onAddCategory}
            onUpdateCategory={props.onUpdateCategory}
            onDeleteCategory={props.onDeleteCategory}
          />
        )}

        {currentTab === 'special_offers' && props.onAddSpecialOffer && props.onUpdateSpecialOffer && props.onDeleteSpecialOffer && (
          <SpecialOffersTab
            specialOffers={props.specialOffers || []}
            onAddSpecialOffer={props.onAddSpecialOffer}
            onUpdateSpecialOffer={props.onUpdateSpecialOffer}
            onDeleteSpecialOffer={props.onDeleteSpecialOffer}
          />
        )}

        {currentTab === 'offers' && (
          <OffersTab
            offers={props.offers}
            products={props.products}
            onAddOffer={props.onAddOffer}
            onUpdateOffer={props.onUpdateOffer}
            onDeleteOffer={props.onDeleteOffer}
          />
        )}

        {currentTab === 'packages' && (
          <PackagesTab
            packages={props.packages}
            products={props.products}
            onAddPackage={props.onAddPackage}
            onUpdatePackage={props.onUpdatePackage}
            onDeletePackage={props.onDeletePackage}
          />
        )}

        {currentTab === 'prebooking' && (
          <PreBookingTab
            campaigns={props.preBookingCampaigns}
            preBookingOrders={props.preBookingOrders}
            products={props.products}
            onAddCampaign={props.onAddPreBookingCampaign}
            onUpdateCampaign={props.onUpdatePreBookingCampaign}
            onDeleteCampaign={props.onDeletePreBookingCampaign}
            onUpdateOrderStatus={props.onUpdatePreBookingOrderStatus}
          />
        )}

        {currentTab === 'dailyDeals' && (
          <DailyDealsTab
            deals={props.dailyDeals}
            products={props.products}
            onAddDeal={props.onAddDailyDeal}
            onUpdateDeal={props.onUpdateDailyDeal}
            onDeleteDeal={props.onDeleteDailyDeal}
          />
        )}

        {currentTab === 'sales' && (
          <SalesTab
            orders={props.orders}
            products={props.products}
            onAddOrder={props.onAddOrder}
            onUpdateOrder={props.onUpdateOrder}
            onDeleteOrder={props.onDeleteOrder}
          />
        )}

        {currentTab === 'purchases' && (
          <PurchaseTab
            purchases={props.purchases}
            products={props.products}
            suppliers={props.suppliers}
            onAddPurchase={props.onAddPurchase}
            onUpdatePurchase={props.onUpdatePurchase}
            onDeletePurchase={props.onDeletePurchase}
          />
        )}

        {currentTab === 'suppliers' && (
          <SupplierTab
            suppliers={props.suppliers}
            purchases={props.purchases}
            onAddSupplier={props.onAddSupplier}
            onUpdateSupplier={props.onUpdateSupplier}
            onDeleteSupplier={props.onDeleteSupplier}
          />
        )}

        {currentTab === 'income_expense' && (
          <IncomeExpenseTab
            transactions={props.transactions}
            onAddTransaction={props.onAddTransaction}
            onUpdateTransaction={props.onUpdateTransaction}
            onDeleteTransaction={props.onDeleteTransaction}
          />
        )}

        {currentTab === 'customers' && (
          <CustomerTab
            customers={props.customers}
            orders={props.orders}
            onAddCustomer={props.onAddCustomer}
            onUpdateCustomer={props.onUpdateCustomer}
            onDeleteCustomer={props.onDeleteCustomer}
          />
        )}

        {currentTab === 'gifts' && (
          <GiftTrackingTab
            customers={props.customers}
            orders={props.orders}
            giftRecords={props.giftRecords}
            settings={props.settings}
            onRecordGift={props.onRecordGift}
            onUpdateCustomerGiftStatus={props.onUpdateCustomerGiftStatus}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsTab
            orders={props.orders}
            transactions={props.transactions}
            customers={props.customers}
            products={props.products}
          />
        )}

        {currentTab === 'download' && (
          <ExcelExportTab
            orders={props.orders}
            purchases={props.purchases}
            transactions={props.transactions}
            customers={props.customers}
          />
        )}

        {currentTab === 'reviews' && (
          <ReviewsTab
            reviews={props.reviews}
            products={props.products}
            onUpdateReview={props.onUpdateReview}
            onDeleteReview={props.onDeleteReview}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            settings={props.settings}
            onUpdateSettings={props.onUpdateSettings}
            onSeedInitialProducts={props.onSeedInitialProducts}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (5 Main Sections for 1-Tap Thumb Access) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl px-1 py-1 flex items-center justify-around safe-bottom-space">
        {[
          { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
          { id: 'inbox', label: 'ইনবক্স', icon: Inbox, badge: unreadOrdersCount },
          { id: 'products', label: 'পণ্য', icon: Package },
          { id: 'reports', label: 'রিপোর্ট', icon: FileText },
          { id: 'settings', label: 'সেটিংস', icon: SettingsIcon },
        ].map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition min-h-[48px] min-w-[54px] cursor-pointer ${
                active ? 'text-[#0A4A29] font-black' : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'text-[#1E8A52]' : ''}`} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-0.5 leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
