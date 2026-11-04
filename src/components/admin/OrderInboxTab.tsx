import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Inbox,
  Bell,
  Volume2,
  VolumeX,
  Search,
  Calendar,
  ArrowUpDown,
  CheckCircle,
  Truck,
  XCircle,
  Phone,
  MessageCircle,
  Trash2,
  Eye,
  EyeOff,
  Download,
  Clock,
  MapPin,
  FileText,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Banknote,
  Globe,
  Gift,
  Copy,
  Check,
  X,
  Image,
} from 'lucide-react';
import { Order } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';
import {
  playOrderNotificationSound,
  requestNotificationPermission,
  triggerBrowserNotification,
} from '../../utils/notificationSound';

interface OrderInboxTabProps {
  orders: Order[];
  onUpdateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const OrderInboxTab: React.FC<OrderInboxTabProps> = ({
  orders,
  onUpdateOrder,
  onDeleteOrder,
  soundEnabled,
  onToggleSound,
  onNavigateToTab,
}) => {
  // Filter tabs: 'all' | 'new' | 'confirmed' | 'delivered' | 'cancelled'
  const [activeStatusTab, setActiveStatusTab] = useState<
    'all' | 'new' | 'confirmed' | 'delivered' | 'cancelled'
  >('all');

  // Origin Filter: 'all' | 'local' | 'expat' | 'verification_pending'
  const [originFilter, setOriginFilter] = useState<'all' | 'local' | 'expat' | 'verification_pending'>('all');

  // Search & Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Modal & Selection states
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [browserNotificationPerm, setBrowserNotificationPerm] = useState<NotificationPermission>('default');
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // Toast / feedback message
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Highlighting newly arrived orders (flash effect for 10 seconds)
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(new Set());
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const initialMountRef = useRef<boolean>(true);
  const orderListTopRef = useRef<HTMLDivElement | null>(null);

  // Check browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotificationPerm(Notification.permission);
    }
  }, []);

  const handleRequestNotificationPerm = async () => {
    const perm = await requestNotificationPermission();
    setBrowserNotificationPerm(perm);
    if (perm === 'granted') {
      showToast('ব্রাউজার নোটিফিকেশন সফলভাবে চালু হয়েছে!', 'success');
      triggerBrowserNotification(
        '🔔 InfiMart BD নোটিফিকেশন সক্রিয়',
        'নতুন অর্ডার আসলে তাৎক্ষণিক বিজ্ঞপ্তি পাবেন।'
      );
    } else {
      showToast('নোটিফিকেশন পারমিশন দেওয়া হয়নি।', 'error');
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Helper to normalize status
  const normalizeStatus = (status?: string): 'new' | 'confirmed' | 'delivered' | 'cancelled' => {
    if (!status) return 'new';
    const s = status.toLowerCase();
    if (s === 'confirmed') return 'confirmed';
    if (s === 'delivered') return 'delivered';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'new' || s === 'pending') return 'new';
    return 'new';
  };

  // Helper to check if order is unread
  const isUnread = (o: Order) => {
    if (typeof o.isRead === 'boolean') return !o.isRead;
    return normalizeStatus(o.status) === 'new';
  };

  // Helper to check if order is from abroad or a gift order
  const isExpatOrder = (o: Order) => {
    return (
      o.orderType === 'expat' ||
      (!!o.customerCountry && o.customerCountry !== 'বাংলাদেশ (Bangladesh)') ||
      !!o.isGiftOrder
    );
  };

  // Detect newly arrived orders in real-time
  useEffect(() => {
    if (initialMountRef.current) {
      // First mount: populate known IDs without beeping
      const ids = new Set<string>();
      orders.forEach((o) => {
        if (o.id) ids.add(o.id);
      });
      knownOrderIdsRef.current = ids;
      initialMountRef.current = false;
      return;
    }

    // Check for incoming new orders
    const freshNewIds: string[] = [];
    orders.forEach((o) => {
      if (o.id && !knownOrderIdsRef.current.has(o.id)) {
        knownOrderIdsRef.current.add(o.id);
        freshNewIds.push(o.id);

        // If sound enabled, play notification sound
        if (soundEnabled) {
          playOrderNotificationSound();
        }

        // Trigger native browser notification
        triggerBrowserNotification(
          `🛒 নতুন অর্ডার! ${o.customerName}`,
          `পণ্য: ${o.productName || o.product} — ৳${o.totalPrice ?? o.total}`
        );
      }
    });

    if (freshNewIds.length > 0) {
      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        freshNewIds.forEach((id) => next.add(id));
        return next;
      });

      // Auto-scroll to top of list if admin is on page
      if (orderListTopRef.current) {
        orderListTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }

      // Remove flash highlight after 10 seconds
      setTimeout(() => {
        setNewlyArrivedIds((prev) => {
          const next = new Set(prev);
          freshNewIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 10000);
    }
  }, [orders, soundEnabled]);

  // Relative time in Bengali
  const formatRelativeTimeBangla = (dateInput?: string): string => {
    if (!dateInput) return 'এইমাত্র';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return dateInput;

    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    const toBangla = (n: number) => n.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

    if (diffInSeconds < 60) return 'এইমাত্র';
    const diffInMin = Math.floor(diffInSeconds / 60);
    if (diffInMin < 60) return `${toBangla(diffInMin)} মিনিট আগে`;
    const diffInHr = Math.floor(diffInMin / 60);
    if (diffInHr < 24) return `${toBangla(diffInHr)} ঘণ্টা আগে`;
    const diffInDays = Math.floor(diffInHr / 24);
    if (diffInDays === 1) return 'গতকাল';
    if (diffInDays < 30) return `${toBangla(diffInDays)} দিন আগে`;
    return date.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    let unreadCount = 0;
    let newCount = 0;
    let confirmedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;
    let localCount = 0;
    let expatCount = 0;
    let pendingVerifCount = 0;

    orders.forEach((o) => {
      const norm = normalizeStatus(o.status);
      if (isUnread(o)) unreadCount++;
      if (norm === 'new') newCount++;
      else if (norm === 'confirmed') confirmedCount++;
      else if (norm === 'delivered') deliveredCount++;
      else if (norm === 'cancelled') cancelledCount++;

      if (isExpatOrder(o)) expatCount++;
      else localCount++;

      if (
        o.paymentType === 'advance' &&
        (!o.paymentVerificationStatus || o.paymentVerificationStatus === 'pending')
      ) {
        pendingVerifCount++;
      }
    });

    return {
      all: orders.length,
      new: newCount,
      confirmed: confirmedCount,
      delivered: deliveredCount,
      cancelled: cancelledCount,
      unread: unreadCount,
      local: localCount,
      expat: expatCount,
      pendingVerif: pendingVerifCount,
    };
  }, [orders]);

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Start of this week (Sunday)
    const startOfWeek = new Date();
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders
      .filter((o) => {
        const normStatus = normalizeStatus(o.status);

        // Status Tab Filter
        if (activeStatusTab !== 'all' && normStatus !== activeStatusTab) {
          return false;
        }

        // Origin Filter
        if (originFilter === 'local' && isExpatOrder(o)) {
          return false;
        }
        if (originFilter === 'expat' && !isExpatOrder(o)) {
          return false;
        }
        if (
          originFilter === 'verification_pending' &&
          (o.paymentType !== 'advance' ||
            o.paymentVerificationStatus === 'verified' ||
            o.paymentVerificationStatus === 'failed')
        ) {
          return false;
        }

        // Date Filter
        const orderDateStr = o.createdAt || o.date;
        if (orderDateStr) {
          const orderDate = new Date(orderDateStr);
          if (dateFilter === 'today' && !orderDateStr.startsWith(todayStr)) {
            return false;
          }
          if (dateFilter === 'week' && orderDate < startOfWeek) {
            return false;
          }
          if (dateFilter === 'month' && orderDate < startOfMonth) {
            return false;
          }
        }

        // Search Term Filter
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const name = (o.customerName || '').toLowerCase();
          const phone = (o.customerPhone || o.phone || '').toLowerCase();
          const prod = (o.productName || o.product || '').toLowerCase();
          const address = (o.customerAddress || o.address || '').toLowerCase();
          const notes = (o.customerNotes || o.notes || '').toLowerCase();
          const country = (o.customerCountry || '').toLowerCase();
          const txId = (o.transactionId || '').toLowerCase();
          if (
            !name.includes(s) &&
            !phone.includes(s) &&
            !prod.includes(s) &&
            !address.includes(s) &&
            !notes.includes(s) &&
            !country.includes(s) &&
            !txId.includes(s)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || '').getTime() || 0;
        const dateB = new Date(b.createdAt || b.date || '').getTime() || 0;
        const totalA = Number(a.totalPrice ?? a.total ?? 0);
        const totalB = Number(b.totalPrice ?? b.total ?? 0);

        if (sortBy === 'newest') return dateB - dateA;
        if (sortBy === 'oldest') return dateA - dateB;
        if (sortBy === 'highest') return totalB - totalA;
        if (sortBy === 'lowest') return totalA - totalB;
        return 0;
      });
  }, [orders, activeStatusTab, originFilter, dateFilter, searchTerm, sortBy]);

  // Actions on orders
  const handleMarkAsConfirmed = async (order: Order) => {
    if (!order.id) return;
    try {
      await onUpdateOrder(order.id, {
        status: 'confirmed',
        isRead: true,
        confirmedAt: new Date().toISOString(),
      });
      showToast(`অর্ডার #${order.id.slice(-4).toUpperCase()} কনফার্ম করা হয়েছে!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleMarkAsDelivered = async (order: Order) => {
    if (!order.id) return;
    try {
      await onUpdateOrder(order.id, {
        status: 'delivered',
        isRead: true,
        deliveredAt: new Date().toISOString(),
      });
      showToast(`অর্ডার #${order.id.slice(-4).toUpperCase()} ডেলিভার্ড হিসেবে সম্পন্ন হয়েছে!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleMarkAsCancelled = async (order: Order) => {
    if (!order.id) return;
    try {
      await onUpdateOrder(order.id, {
        status: 'cancelled',
        isRead: true,
      });
      showToast(`অর্ডার #${order.id.slice(-4).toUpperCase()} বাতিল করা হয়েছে।`, 'success');
    } catch (err) {
      console.error(err);
      showToast('স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleToggleReadStatus = async (order: Order) => {
    if (!order.id) return;
    const currentlyUnread = isUnread(order);
    try {
      await onUpdateOrder(order.id, {
        isRead: currentlyUnread, // toggling: if was unread, set isRead: true
      });
      showToast(currentlyUnread ? 'অর্ডারটি পঠিত চিহ্নিত হয়েছে' : 'অর্ডারটি অপঠিত চিহ্নিত হয়েছে', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Payment Verification Handler (Same for everyone: check screenshot, verify TxID, mark Verified or Failed)
  const handleVerifyPayment = async (order: Order, status: 'verified' | 'failed') => {
    if (!order.id) return;
    try {
      await onUpdateOrder(order.id, {
        paymentVerificationStatus: status,
      });
      showToast(
        status === 'verified'
          ? `পেমেন্ট সফলভাবে যাচাইকৃত (Verified) চিহ্নিত হয়েছে!`
          : `পেমেন্ট ব্যর্থ/অমিল (Failed) চিহ্নিত হয়েছে।`,
        status === 'verified' ? 'success' : 'error'
      );
    } catch (err) {
      console.error(err);
      showToast('পেমেন্ট যাচাই স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।', 'error');
    }
  };

  // Admin Manual Override for COD (can enable/disable COD for an abroad customer)
  const handleToggleCodOverride = async (order: Order) => {
    if (!order.id) return;
    const currentOverride = !!order.allowCodOverride;
    try {
      if (!currentOverride) {
        await onUpdateOrder(order.id, {
          allowCodOverride: true,
          paymentType: 'cod',
          paymentMethod: 'Cash on Delivery (অ্যাডমিন অনুমোদিত)',
        });
        showToast('এই প্রবাসী অর্ডারে ক্যাশ অন ডেলিভারি (COD) অনুমোদন করা হয়েছে!', 'success');
      } else {
        await onUpdateOrder(order.id, {
          allowCodOverride: false,
          paymentType: 'advance',
          paymentMethod: 'bKash',
        });
        showToast('প্রবাসী অর্ডারের COD অনুমোদন প্রত্যাহার করা হয়েছে।', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('COD অনুমোদন পরিবর্তন করতে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleCopyTxId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTxId(txId);
    showToast('ট্রানজেকশন আইডি কপি করা হয়েছে!', 'success');
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const confirmDelete = async () => {
    if (!orderToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteOrder(orderToDelete.id);
      showToast('অর্ডারটি স্থায়ীভাবে মুছে ফেলা হয়েছে।', 'success');
      setOrderToDelete(null);
    } catch (err) {
      console.error(err);
      showToast('মুছতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV/XLSX Export
  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredOrders.map((o, idx) => ({
      অর্ডার_আইডি: o.id ? `#${o.id.slice(-6).toUpperCase()}` : `#${idx + 1}`,
      তারিখ: o.createdAt || o.date || '',
      উৎস: o.source === 'website_form' ? 'Website' : 'WhatsApp',
      স্ট্যাটাস: o.status,
      কাস্টমার_নাম: o.customerName,
      ফোন_নম্বর: o.customerPhone || o.phone,
      ঠিকানা: o.customerAddress || o.address,
      পণ্য: o.productName || o.product,
      পরিমাণ: `${o.quantity} ${o.productUnit || ''}`,
      একক_দর: o.productPrice ?? o.unitPrice ?? 0,
      মোট_টাকা: o.totalPrice ?? o.total ?? 0,
      নোট: o.customerNotes || o.notes || '',
    }));

    const dateStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    const fileName = `InfiMart_Orders_${dateStr}`;
    if (format === 'xlsx') {
      exportToExcel(data, fileName);
    } else {
      exportToCSV(data, fileName);
    }
    showToast('অর্ডার তালিকা সফলভাবে ডাউনলোড হয়েছে!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border-2 animate-bounce ${
            feedbackMsg.type === 'success'
              ? 'bg-[#0A4A29] text-white border-[#FFB300]'
              : 'bg-rose-600 text-white border-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-[#FFB300]" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-white" />
          )}
          <span className="font-bold text-sm">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0A4A29] flex items-center gap-2.5">
              <span className="p-2 bg-emerald-100 rounded-2xl text-[#0A4A29]">
                <Inbox className="w-7 h-7" />
              </span>
              <span>📥 অর্ডার ইনবক্স (Order Inbox)</span>
            </h2>

            {/* Notification Badge */}
            {tabCounts.unread > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-md animate-pulse">
                <Bell className="w-3.5 h-3.5 fill-white" />
                <span>নতুন অর্ডার: {tabCounts.unread}টি</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            ওয়েবসাইট অর্ডার সরাসরি এখানে রিয়েল-টাইমে প্রদর্শিত হয় (কোনো পেজ রিলোড ছাড়াই)।
          </p>
        </div>

        {/* Right Actions: Sound Toggle, Browser Notification, Export */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Sound Toggle Button */}
          <button
            onClick={onToggleSound}
            className={`min-h-[44px] px-3.5 py-2 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer border ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'সাউন্ড চালু আছে (ক্লিক করে নিঃশব্দ করুন)' : 'সাউন্ড বন্ধ আছে (ক্লিক করে চালু করুন)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>শব্দ চালু</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span>নিঃশব্দ (Muted)</span>
              </>
            )}
          </button>

          {/* Browser Notification Button */}
          {browserNotificationPerm !== 'granted' && (
            <button
              onClick={handleRequestNotificationPerm}
              className="min-h-[44px] px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="ব্রাউজার নোটিফিকেশন চালু করুন"
            >
              <Bell className="w-4 h-4 text-amber-600" />
              <span>নোটিফিকেশন সক্রিয় করুন</span>
            </button>
          )}

          {/* Export XLSX Button */}
          <button
            onClick={() => handleExport('xlsx')}
            className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0A4A29]" />
            <span>Excel এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar (Sticky at top & Scrollable on Mobile) */}
      <div className="sticky top-[56px] lg:top-0 z-30 bg-slate-50/95 backdrop-blur-md py-2 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          <button
            onClick={() => setActiveStatusTab('all')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeStatusTab === 'all'
                ? 'bg-[#0A4A29] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>🔵 সব অর্ডার</span>
            <span className="bg-black/15 text-inherit px-2 py-0.5 rounded-full text-xs font-bold">
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setActiveStatusTab('new')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeStatusTab === 'new'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <span>🔴 নতুন</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeStatusTab === 'new' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
              {tabCounts.new}
            </span>
          </button>

          <button
            onClick={() => setActiveStatusTab('confirmed')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeStatusTab === 'confirmed'
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>🟡 কনফার্মড</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeStatusTab === 'confirmed' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
              {tabCounts.confirmed}
            </span>
          </button>

          <button
            onClick={() => setActiveStatusTab('delivered')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeStatusTab === 'delivered'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span>🟢 ডেলিভারড</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeStatusTab === 'delivered' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {tabCounts.delivered}
            </span>
          </button>

          <button
            onClick={() => setActiveStatusTab('cancelled')}
            className={`min-h-[48px] px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              activeStatusTab === 'cancelled'
                ? 'bg-slate-700 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>⚫ বাতিল</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeStatusTab === 'cancelled' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
              {tabCounts.cancelled}
            </span>
          </button>
        </div>

        {/* Origin / Payment Filter Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none snap-x">
          <button
            onClick={() => setOriginFilter('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              originFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>সব উৎস</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
              {tabCounts.all}
            </span>
          </button>

          <button
            onClick={() => setOriginFilter('local')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              originFilter === 'local'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span>🇧🇩 দেশি অর্ডার</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${originFilter === 'local' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
              {tabCounts.local}
            </span>
          </button>

          <button
            onClick={() => setOriginFilter('expat')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              originFilter === 'expat'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-indigo-800 hover:bg-indigo-50 border border-indigo-200'
            }`}
          >
            <span>🌍 প্রবাসী অর্ডার</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${originFilter === 'expat' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'}`}>
              {tabCounts.expat}
            </span>
          </button>

          <button
            onClick={() => setOriginFilter('verification_pending')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              originFilter === 'verification_pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span>💳 পেমেন্ট যাচাই অপেক্ষমান</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${originFilter === 'verification_pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
              {tabCounts.pendingVerif}
            </span>
          </button>
        </div>
      </div>

      {/* Search & Sort Controls (Sticky below filter tabs) */}
      <div className="sticky top-[112px] lg:top-[56px] z-20 bg-slate-50/95 backdrop-blur-md pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="কাস্টমার নাম, ফোন বা পণ্য সার্চ..."
              className="w-full min-h-[48px] pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
            />
          </div>

          {/* Date Range & Sort Selector */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Date range filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-700 w-full sm:w-auto justify-around sm:justify-start">
              {(['all', 'today', 'week', 'month'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl transition flex-1 sm:flex-initial text-center ${
                    dateFilter === d ? 'bg-[#0A4A29] text-white shadow-xs' : 'hover:bg-slate-200'
                  }`}
                >
                  {d === 'all' ? 'সব' : d === 'today' ? 'আজ' : d === 'week' ? 'সপ্তাহ' : 'মাস'}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="relative w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto min-h-[48px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="newest">🕒 নতুন আগে</option>
                <option value="oldest">⌛ পুরাতন আগে</option>
                <option value="highest">💰 সর্বোচ্চ মূল্য</option>
                <option value="lowest">📉 সর্বনিম্ন মূল্য</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div ref={orderListTopRef} />

      {/* Orders List Container */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Inbox className="w-8 h-8" />
            </div>
            <h4 className="font-black text-slate-800 text-lg">কোনো অর্ডার পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500">
              {searchTerm ? 'অনুসন্ধানের সাথে কোনো অর্ডার মিলছে না।' : 'এই ক্যাটাগরিতে বর্তমানে কোনো অর্ডার নেই।'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const norm = normalizeStatus(order.status);
            const unread = isUnread(order);
            const isFlash = order.id ? newlyArrivedIds.has(order.id) : false;
            const shortId = order.id ? `#${order.id.slice(-4).toUpperCase()}` : `#${String(index + 1).padStart(3, '0')}`;
            const relativeTime = formatRelativeTimeBangla(order.createdAt || order.date);
            const prodName = order.productName || order.product || 'পণ্য';
            const prodQty = order.quantity || 1;
            const prodUnit = order.productUnit || '';
            const totalPrice = order.totalPrice ?? order.total ?? 0;
            const phone = order.customerPhone || order.phone || '';
            const address = order.customerAddress || order.address || '';
            const notes = order.customerNotes || order.notes || '';

            // Card styling according to requirements
            let cardBg = 'bg-white';
            let cardBorder = 'border-slate-200';

            if (norm === 'new' || unread) {
              cardBg = 'bg-rose-50/50';
              cardBorder = 'border-2 border-rose-400 shadow-md';
            } else if (norm === 'confirmed') {
              cardBg = 'bg-white';
              cardBorder = 'border-l-8 border-l-amber-500 border-slate-200 shadow-sm';
            } else if (norm === 'delivered') {
              cardBg = 'bg-emerald-50/40';
              cardBorder = 'border-2 border-emerald-300 shadow-sm';
            } else if (norm === 'cancelled') {
              cardBg = 'bg-slate-100/70 opacity-75';
              cardBorder = 'border border-slate-300';
            }

            if (isFlash) {
              cardBorder = 'border-4 border-rose-500 ring-4 ring-rose-200 animate-pulse';
            }

            return (
              <div
                key={order.id || index}
                className={`${cardBg} ${cardBorder} rounded-3xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden`}
              >
                {/* Header row: Order ID, Time, Origin badge, Status badge, and Source badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-[#0A4A29] bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs">
                      {shortId}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{relativeTime}</span>
                    </span>

                    {/* Origin Badge: 🇧🇩 দেশি অর্ডার vs 🌍 প্রবাসী অর্ডার */}
                    {isExpatOrder(order) ? (
                      <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                        <Globe className="w-3 h-3 text-indigo-200" />
                        <span>🌍 প্রবাসী অর্ডার</span>
                        {order.customerCountry && order.customerCountry !== 'বাংলাদেশ (Bangladesh)' && (
                          <span className="bg-indigo-700 text-indigo-100 text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {order.customerCountry.split('(')[0].trim()}
                          </span>
                        )}
                        {order.isGiftOrder && (
                          <span className="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                            <Gift className="w-2.5 h-2.5" />
                            <span>উপহার</span>
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-700 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                        <span>🇧🇩 দেশি অর্ডার</span>
                      </span>
                    )}

                    {/* Admin Allowed COD Override Badge */}
                    {order.allowCodOverride && (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-900 text-[11px] font-black px-2 py-0.5 rounded-full shadow-xs">
                        <span>⚡ অ্যাডমিন অনুমোদিত COD</span>
                      </span>
                    )}

                    {order.source === 'website_form' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        🌐 Website
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5">
                    {norm === 'new' && (
                      <span className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🆕 নতুন</span>
                      </span>
                    )}
                    {norm === 'confirmed' && (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>✅ কনফার্মড</span>
                      </span>
                    )}
                    {norm === 'delivered' && (
                      <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                        <Truck className="w-3.5 h-3.5" />
                        <span>🚚 ডেলিভারড</span>
                      </span>
                    )}
                    {norm === 'cancelled' && (
                      <span className="inline-flex items-center gap-1 bg-slate-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>❌ বাতিল</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="py-3 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                  {/* Product Details (Col 1-5) */}
                  <div className="md:col-span-5 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      অর্ডারকৃত পণ্য
                    </span>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug">
                      {prodName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span>পরিমাণ: {prodQty} {prodUnit}</span>
                      {order.productPrice && (
                        <span>(৳{order.productPrice} / {prodUnit || 'একক'})</span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info (Col 6-9) */}
                  <div className="md:col-span-4 space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      কাস্টমার ও ঠিকানা
                    </span>
                    <div className="font-black text-slate-800 text-sm">
                      {order.customerName}
                    </div>
                    {phone && (
                      <div className="text-slate-600 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#1E8A52]" />
                        <span>{phone}</span>
                      </div>
                    )}
                    {address && (
                      <div className="text-slate-500 flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate max-w-xs">{address}</span>
                      </div>
                    )}
                    {notes && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 mt-1">
                        <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>নোট: {notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Price (Col 10-12) */}
                  <div className="md:col-span-3 text-left md:text-right space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      মোট মূল্য
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-[#0A4A29]">
                      ৳ {totalPrice.toLocaleString('en-US')}
                    </div>
                    <span className="text-[11px] text-slate-600 font-bold block">
                      {order.paymentType === 'cod' || order.paymentMethod?.toLowerCase().includes('cash')
                        ? '💵 ক্যাশ অন ডেলিভারি'
                        : `💳 অগ্রিম (${order.paymentMethod || 'পেমেন্ট'})`}
                    </span>
                  </div>
                </div>

                {/* Payment Verification & Origin Action Section */}
                <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">পেমেন্ট মেথড:</span>
                      <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                        {order.paymentType === 'cod' || order.paymentMethod?.toLowerCase().includes('cash') ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ক্যাশ অন ডেলিভারি (COD)</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            <span>অগ্রিম পেমেন্ট — {order.paymentMethod || 'bKash'}</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Verification Status Badge (For Advance Payment) */}
                    {order.paymentType === 'advance' && (
                      <div>
                        {order.paymentVerificationStatus === 'verified' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✅ পেমেন্ট যাচাইকৃত (Verified)</span>
                          </span>
                        ) : order.paymentVerificationStatus === 'failed' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-black px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>❌ অমিল / ব্যর্থ (Failed)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>🟡 যাচাই অপেক্ষমান (Pending)</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Advance Payment Details, TxID, Slip & Action Buttons */}
                  {order.paymentType === 'advance' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">অগ্রিম প্রদত্ত:</span>
                          <span className="text-sm font-black text-indigo-900">
                            ৳ {(order.advanceAmountPaid ?? totalPrice).toLocaleString('en-US')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">বাকি মূল্য (Due):</span>
                          <span className="text-sm font-black text-rose-700">
                            ৳ {(order.dueAmount ?? 0).toLocaleString('en-US')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">ট্রানজেকশন আইডি (TxID):</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="font-mono font-black text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 select-all">
                              {order.transactionId || 'প্রদান করা হয়নি'}
                            </span>
                            {order.transactionId && (
                              <button
                                type="button"
                                onClick={() => handleCopyTxId(order.transactionId!)}
                                className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                                title="TxID কপি করুন"
                              >
                                {copiedTxId === order.transactionId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Slip Preview & Admin Verification Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                        <div>
                          {order.paymentSlipUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingSlipUrl(order.paymentSlipUrl!)}
                              className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-indigo-200 cursor-pointer"
                            >
                              <img
                                src={order.paymentSlipUrl}
                                alt="Slip thumbnail"
                                className="w-5 h-5 object-cover rounded shrink-0 border border-indigo-300"
                              />
                              <span>📸 পেমেন্ট স্ক্রিনশট / রসিদ দেখুন</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">কোনো স্ক্রিনশট আপলোড করা হয়নি</span>
                          )}
                        </div>

                        {/* Admin Verification Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyPayment(order, 'verified')}
                            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              order.paymentVerificationStatus === 'verified'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>যাচাই নিশ্চিত (Verified)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyPayment(order, 'failed')}
                            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              order.paymentVerificationStatus === 'failed'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>ব্যর্থ চিহ্নিত (Failed)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual COD Override Control for Expat Orders */}
                  {isExpatOrder(order) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-600 font-medium">
                        {order.allowCodOverride ? (
                          <span className="text-amber-700 font-bold flex items-center gap-1">
                            <span>⚡ এই প্রবাসী অর্ডারে ক্যাশ অন ডেলিভারি (COD) সক্রিয় আছে</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            প্রবাসীদের জন্য COD সাধারণত বন্ধ থাকে। বিশেষ প্রয়োজনে চালু করতে পারেন:
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCodOverride(order)}
                        className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer text-xs ${
                          order.allowCodOverride
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <span>{order.allowCodOverride ? '↩️ COD অনুমোদন প্রত্যাহার' : '⚡ COD অনুমোদন করুন'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons (2 Buttons per Row on Mobile, Min 48px height) */}
                <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                  {/* Status Operations (Grid of 2 on mobile, flex on desktop) */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    {norm !== 'confirmed' && norm !== 'delivered' && (
                      <button
                        onClick={() => handleMarkAsConfirmed(order)}
                        className="min-h-[48px] bg-[#1E8A52] hover:bg-[#166c3f] text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4 text-[#FFB300]" />
                        <span>✅ কনফার্ম</span>
                      </button>
                    )}

                    {norm !== 'delivered' && (
                      <button
                        onClick={() => handleMarkAsDelivered(order)}
                        className="min-h-[48px] bg-[#0A4A29] hover:bg-[#125834] text-white px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                      >
                        <Truck className="w-4 h-4 text-[#FFB300]" />
                        <span>🚚 ডেলিভারি</span>
                      </button>
                    )}

                    {norm !== 'cancelled' && (
                      <button
                        onClick={() => handleMarkAsCancelled(order)}
                        className="min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span>❌ বাতিল</span>
                      </button>
                    )}

                    {/* Mark as read/unread toggle */}
                    <button
                      onClick={() => handleToggleReadStatus(order)}
                      className="min-h-[48px] px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                      title={unread ? 'পড়া হয়েছে হিসেবে চিহ্নিত করুন' : 'অপঠিত চিহ্নিত করুন'}
                    >
                      {unread ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      <span>{unread ? '👁️ পঠিত' : 'অপঠিত'}</span>
                    </button>
                  </div>

                  {/* Customer Communication & Delete (2 per row on mobile) */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-1">
                    {/* Phone Call Button */}
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="min-h-[48px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="সরাসরি ফোন কল করুন"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>📞 কল করুন</span>
                      </a>
                    )}

                    {/* WhatsApp Chat Button */}
                    {phone && (
                      <a
                        href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `আসসালামু আলাইকুম ${order.customerName} ভাই/আপু, InfiMart BD থেকে আপনার ${prodName} এর অর্ডার (${shortId}) কনফার্ম করতে যোগাযোগ করছি।`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[48px] px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                        title="WhatsApp এ মেসেজ দিন"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>💬 WhatsApp</span>
                      </a>
                    )}

                    {/* Delete Order Button */}
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="col-span-2 sm:col-span-1 min-h-[48px] px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                      title="অর্ডারটি মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>মুছুন</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal in Bengali */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="অর্ডার মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত? এই অর্ডারটি মুছে ফেলা হবে।"
        warningNote="মুছে ফেললে ইনবক্স ও ডাটাবেস থেকে এটি স্থায়ীভাবে অপসারিত হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setOrderToDelete(null)}
      />

      {/* Payment Slip / Screenshot Full Preview Modal */}
      {viewingSlipUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">পেমেন্ট রসিদ / স্ক্রিনশট প্রিভিউ</h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingSlipUrl(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-slate-900/5">
              <img
                src={viewingSlipUrl}
                alt="Payment Slip Full Preview"
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-md"
              />
            </div>
            <div className="p-3 border-t border-slate-200 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSlipUrl(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
