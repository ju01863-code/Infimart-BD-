import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Inbox,
  Bell,
  CheckCircle,
  Truck,
  XCircle,
  Phone,
  MessageCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  Eye,
  Crown,
  Trophy,
  Award,
  Medal,
  Star,
  ChevronRight,
} from 'lucide-react';
import { Order, Transaction, Customer, Product } from '../../types';
import { DailyTrendChart, MonthlyBarChart } from '../Charts';
import { MonthlyDeliveredSalesReport } from './MonthlyDeliveredSalesReport';
import { exportToExcel } from '../../utils/excelExport';
import {
  calculateAllCustomerLoyalties,
  toBanglaDigits,
  LOYALTY_TIERS,
} from '../../utils/loyalty';

interface DashboardTabProps {
  orders: Order[];
  transactions: Transaction[];
  customers: Customer[];
  products: Product[];
  onNavigateTab: (tab: string) => void;
  onUpdateOrder?: (id: string, order: Partial<Order>) => Promise<void>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  orders,
  transactions,
  customers,
  products,
  onNavigateTab,
  onUpdateOrder,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Today's metrics
  const todayTransactions = transactions.filter((t) => t.date.startsWith(todayStr));
  const todayIncome = todayTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const todayExpense = todayTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const todayNetProfit = todayIncome - todayExpense;

  // This month's metrics
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));
  const monthIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthExpense = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const monthNetProfit = monthIncome - monthExpense;

  // Order stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
  const totalCustomers = customers.length;

  // Customer Loyalty Score & VIP Rankings Calculation based on total purchase volume
  const loyaltyData = useMemo(() => {
    return calculateAllCustomerLoyalties(customers, orders);
  }, [customers, orders]);

  // Order status normalization & calculations for Order Inbox
  const normalizeStatus = (status?: string): 'new' | 'confirmed' | 'delivered' | 'cancelled' => {
    if (!status) return 'new';
    const s = status.toLowerCase();
    if (s === 'confirmed') return 'confirmed';
    if (s === 'delivered') return 'delivered';
    if (s === 'cancelled') return 'cancelled';
    return 'new';
  };

  const isUnread = (o: Order) => {
    if (typeof o.isRead === 'boolean') return !o.isRead;
    return normalizeStatus(o.status) === 'new';
  };

  const unreadCount = orders.filter(isUnread).length;
  const newCount = orders.filter((o) => normalizeStatus(o.status) === 'new').length;
  const confirmedCount = orders.filter((o) => normalizeStatus(o.status) === 'confirmed').length;
  const deliveredCount = orders.filter((o) => normalizeStatus(o.status) === 'delivered').length;
  const cancelledCount = orders.filter((o) => normalizeStatus(o.status) === 'cancelled').length;

  // Format relative time in Bengali
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

  // Recent orders sorted by newest first (up to 4 orders)
  const recentInboxOrders = [...orders]
    .sort((a, b) => {
      const dateA = a.createdAt || a.date || '';
      const dateB = b.createdAt || b.date || '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 4);

  // Low stock products
  const lowStockCount = products.filter(
    (p) => p.stock === 'Low Stock' || p.stock === 'Out of Stock'
  ).length;

  // 7-day trend calculation
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const dailyTrendIncome = last7Days.map((dateStr) => {
    return transactions
      .filter((t) => t.date.startsWith(dateStr) && t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  });

  const dailyTrendExpense = last7Days.map((dateStr) => {
    return transactions
      .filter((t) => t.date.startsWith(dateStr) && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  });

  // Recent 6 months for bar chart
  const recentMonths: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    recentMonths.push(d.toISOString().substring(0, 7));
  }

  const monthlyIncomeArr = recentMonths.map((m) =>
    transactions
      .filter((t) => t.date.startsWith(m) && t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  );

  const monthlyExpenseArr = recentMonths.map((m) =>
    transactions
      .filter((t) => t.date.startsWith(m) && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0)
  );

  const monthlyProfitArr = monthlyIncomeArr.map((inc, idx) => inc - monthlyExpenseArr[idx]);

  const handleExportSummary = () => {
    const data = [
      {
        বিবরণ: 'আজকের আয় (Today Income)',
        পরিমাণ_টাকা: todayIncome,
      },
      {
        বিবরণ: 'আজকের ব্যয় (Today Expense)',
        পরিমাণ_টাকা: todayExpense,
      },
      {
        বিবরণ: 'আজকের নিট লাভ (Today Net Profit)',
        পরিমাণ_টাকা: todayNetProfit,
      },
      {
        বিবরণ: 'চলতি মাসের আয় (Month Income)',
        পরিমাণ_টাকা: monthIncome,
      },
      {
        বিবরণ: 'চলতি মাসের ব্যয় (Month Expense)',
        পরিমাণ_টাকা: monthExpense,
      },
      {
        বিবরণ: 'চলতি মাসের নিট লাভ (Month Net Profit)',
        পরিমাণ_টাকা: monthNetProfit,
      },
      {
        বিবরণ: 'মোট কাস্টমার',
        পরিমাণ_টাকা: totalCustomers,
      },
      {
        বিবরণ: 'মোট অর্ডার',
        পরিমাণ_টাকা: totalOrders,
      },
      {
        বিবরণ: 'অপেক্ষমাণ অর্ডার (Pending Orders)',
        পরিমাণ_টাকা: pendingOrders,
      },
      {
        বিবরণ: 'কম স্টকের পণ্য',
        পরিমাণ_টাকা: lowStockCount,
      },
    ];
    exportToExcel(data, `FeniMart_Dashboard_Summary_${todayStr}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29]">
            ড্যাশবোর্ড (এক নজরে সব)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            আজকের তারিখ: <span className="font-semibold text-slate-800">{todayStr}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>এক্সেল ডাউনলোড</span>
          </button>
        </div>
      </div>

      {/* 📥 ORDER INBOX SECTION AT TOP OF DASHBOARD */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#1E8A52]/30 shadow-sm space-y-4 relative overflow-hidden">
        {/* Header with Title and Real-time Notification Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-[#0A4A29] text-[#FFB300] rounded-2xl shadow-xs">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-[#0A4A29]">
                  📥 অর্ডার ইনবক্স (নতুন অর্ডার ইনবক্স)
                </h3>
                {/* Notification Badge: Show only if count > 0 */}
                {unreadCount > 0 && (
                  <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-xs animate-pulse flex items-center gap-1 border border-rose-400">
                    <Bell className="w-3.5 h-3.5 animate-bounce" />
                    <span>🔔 নতুন অর্ডার: {unreadCount}টি</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ওয়েবসাইট ও হোয়াটসঅ্যাপ থেকে আসা কাস্টমারদের তাৎক্ষণিক অর্ডার
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('inbox')}
              className="flex items-center gap-2 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer ml-auto"
            >
              <span>সম্পূর্ণ ইনবক্স খুলুন</span>
              <ArrowRight className="w-4 h-4 text-[#FFB300]" />
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div
            onClick={() => onNavigateTab('inbox')}
            className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              newCount > 0
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div>
              <p className="text-[11px] font-bold text-slate-500">🆕 নতুন অর্ডার</p>
              <h5 className="text-xl font-black text-rose-600 mt-0.5">{newCount}টি</h5>
            </div>
            <span className="text-xs bg-rose-600 text-white font-black px-2 py-0.5 rounded-full">
              {newCount}
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('inbox')}
            className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-950 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-emerald-700">✅ কনফার্মড</p>
              <h5 className="text-xl font-black text-[#1E8A52] mt-0.5">{confirmedCount}টি</h5>
            </div>
            <span className="text-xs bg-[#1E8A52] text-white font-black px-2 py-0.5 rounded-full">
              {confirmedCount}
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('inbox')}
            className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl text-teal-950 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-teal-700">🚚 ডেলিভারড</p>
              <h5 className="text-xl font-black text-teal-700 mt-0.5">{deliveredCount}টি</h5>
            </div>
            <span className="text-xs bg-teal-600 text-white font-black px-2 py-0.5 rounded-full">
              {deliveredCount}
            </span>
          </div>

          <div
            onClick={() => onNavigateTab('inbox')}
            className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-slate-500">❌ বাতিল</p>
              <h5 className="text-xl font-black text-slate-600 mt-0.5">{cancelledCount}টি</h5>
            </div>
            <span className="text-xs bg-slate-400 text-white font-black px-2 py-0.5 rounded-full">
              {cancelledCount}
            </span>
          </div>
        </div>

        {/* Recent Order Cards Preview (up to 4 orders) */}
        {recentInboxOrders.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-500">এখনও কোনো অর্ডার আসেনি।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {recentInboxOrders.map((order, idx) => {
              const normStatus = normalizeStatus(order.status);
              const unread = isUnread(order);
              const shortId = order.id ? `#${order.id.slice(-4).toUpperCase()}` : `#${idx + 1}`;
              const prodName = order.productName || order.product || 'অজানা পণ্য';
              const price = order.totalPrice ?? order.total ?? 0;
              const phone = order.customerPhone || order.phone || '';
              const address = order.customerAddress || order.address || '';
              const qty = order.quantity || 1;
              const unit = order.productUnit || 'কেজি/পিস';

              // Visual Indicators:
              // - New/unread orders: RED border + "🆕 নতুন" badge + light red background
              // - Read orders: normal white background
              // - Confirmed orders: green left border + ✅ badge
              // - Delivered orders: green background + 🚚 badge
              // - Cancelled orders: gray, faded + ❌ badge
              let cardStyle = 'bg-white border-slate-200';
              let statusBadge = (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                  {order.status || 'পেন্ডিং'}
                </span>
              );

              if (normStatus === 'new' || unread) {
                cardStyle = 'bg-rose-50/60 border-2 border-rose-400 shadow-xs';
                statusBadge = (
                  <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black animate-pulse">
                    🆕 নতুন
                  </span>
                );
              } else if (normStatus === 'confirmed') {
                cardStyle = 'bg-white border-l-4 border-l-emerald-600 border-slate-200';
                statusBadge = (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    ✅ কনফার্মড
                  </span>
                );
              } else if (normStatus === 'delivered') {
                cardStyle = 'bg-emerald-50/40 border border-emerald-200';
                statusBadge = (
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    🚚 ডেলিভারড
                  </span>
                );
              } else if (normStatus === 'cancelled') {
                cardStyle = 'bg-slate-100/60 border-slate-200 opacity-70';
                statusBadge = (
                  <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                    ❌ বাতিল
                  </span>
                );
              }

              return (
                <div
                  key={order.id || idx}
                  className={`rounded-2xl p-4 border transition hover:shadow-md ${cardStyle}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {shortId}
                      </span>
                      {statusBadge}
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatRelativeTimeBangla(order.createdAt || order.date)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <h4 className="text-sm font-black text-slate-900 truncate">
                      🛒 {prodName}
                    </h4>
                    <span className="text-base font-black text-[#0A4A29] shrink-0">
                      ৳{price}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    পরিমাণ: <span className="font-bold text-slate-800">{qty} {unit}</span>
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-xs">
                    <p className="font-bold text-slate-800">
                      👤 {order.customerName}
                    </p>
                    {address && (
                      <p className="text-slate-600 text-[11px] line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{address}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {/* Confirm Button */}
                      {normStatus !== 'confirmed' && normStatus !== 'delivered' && (
                        <button
                          onClick={async () => {
                            if (order.id && onUpdateOrder) {
                              await onUpdateOrder(order.id, {
                                status: 'confirmed',
                                isRead: true,
                                confirmedAt: new Date().toISOString(),
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>কনফার্ম</span>
                        </button>
                      )}

                      {/* Deliver Button */}
                      {normStatus !== 'delivered' && normStatus !== 'cancelled' && (
                        <button
                          onClick={async () => {
                            if (order.id && onUpdateOrder) {
                              await onUpdateOrder(order.id, {
                                status: 'delivered',
                                isRead: true,
                                deliveredAt: new Date().toISOString(),
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>ডেলিভারি</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition border border-emerald-200"
                          title="কল করুন"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                        </a>
                      )}

                      {phone && (
                        <a
                          href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-lg text-xs font-bold transition"
                          title="WhatsApp এ যোগাযোগ করুন"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-white" />
                        </a>
                      )}

                      <button
                        onClick={() => onNavigateTab('inbox')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ইনবক্স</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metrics Row 1: Today's Financials */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#0A4A29]" />
          <span>আজকের আর্থিক অবস্থা (Today's Overview)</span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">আজকের আয়</p>
              <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg text-[#1E8A52] shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-lg sm:text-2xl font-black text-[#1E8A52]">৳ {todayIncome.toLocaleString('en-US')}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">ক্যাশ ও অনলাইন সেলস</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate">আজকের ব্যয়</p>
              <div className="p-1.5 sm:p-2 bg-rose-50 rounded-lg text-rose-600 shrink-0">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div>
              <h4 className="text-lg sm:text-2xl font-black text-rose-600">৳ {todayExpense.toLocaleString('en-US')}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">পণ্য ক্রয় ও খরচ</p>
            </div>
          </div>

          <div className={`col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
            todayNetProfit >= 0 ? 'border-amber-200 bg-amber-50/20' : 'border-rose-200 bg-rose-50/20'
          }`}>
            <div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-semibold">আজকের নিট লাভ</p>
              <h4 className={`text-xl sm:text-2xl font-black mt-0.5 ${todayNetProfit >= 0 ? 'text-[#0A4A29]' : 'text-rose-600'}`}>
                ৳ {todayNetProfit.toLocaleString('en-US')}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">আয় বিয়োগ ব্যয়</p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-100 rounded-xl text-[#FFB300] shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#0A4A29]" />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Monthly Financials */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#0A4A29]" />
          <span>চলতি মাসের আর্থিক হিসাব ({currentMonthStr})</span>
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-gradient-to-br from-[#1E8A52] to-[#0A4A29] p-3.5 sm:p-4 rounded-2xl text-white shadow-md flex flex-col justify-between">
            <p className="text-[11px] sm:text-xs text-emerald-100 font-semibold">মাসের আয়</p>
            <h4 className="text-lg sm:text-2xl font-black text-white mt-1">৳ {monthIncome.toLocaleString('en-US')}</h4>
            <span className="inline-block mt-1 text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-medium truncate">
              মোট সেলস
            </span>
          </div>

          <div className="bg-gradient-to-br from-rose-600 to-rose-800 p-3.5 sm:p-4 rounded-2xl text-white shadow-md flex flex-col justify-between">
            <p className="text-[11px] sm:text-xs text-rose-100 font-semibold">মাসের ব্যয়</p>
            <h4 className="text-lg sm:text-2xl font-black text-white mt-1">৳ {monthExpense.toLocaleString('en-US')}</h4>
            <span className="inline-block mt-1 text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-medium truncate">
              ক্রয় ও খরচ
            </span>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-[#FFB300] to-amber-600 p-3.5 sm:p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-amber-100 font-semibold">মাসের নিট লাভ</p>
              <h4 className="text-xl sm:text-2xl font-black text-white mt-0.5">৳ {monthNetProfit.toLocaleString('en-US')}</h4>
              <span className="inline-block mt-1 text-[10px] bg-black/20 px-2 py-0.5 rounded text-white font-bold">
                {monthNetProfit >= 0 ? '✓ প্রফিটেবল' : '⚠ লোকসানে আছে'}
              </span>
            </div>
            <DollarSign className="w-8 h-8 text-white/40" />
          </div>
        </div>
      </div>

      {/* Metrics Row 3: Operations & Inventory */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-[#0A4A29]" />
          <span>অপারেশনাল স্ট্যাটাস ও স্টক</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigateTab('customers')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#1E8A52] transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">মোট কাস্টমার</span>
              <Users className="w-4 h-4 text-[#1E8A52]" />
            </div>
            <h5 className="text-2xl font-black text-slate-800 group-hover:text-[#1E8A52]">
              {totalCustomers}
            </h5>
            <span className="text-[11px] text-slate-400 underline">ডাটাবেজ দেখুন</span>
          </div>

          <div
            onClick={() => onNavigateTab('sales')}
            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-[#1E8A52] transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">মোট অর্ডার</span>
              <ShoppingBag className="w-4 h-4 text-[#0A4A29]" />
            </div>
            <h5 className="text-2xl font-black text-slate-800 group-hover:text-[#0A4A29]">
              {totalOrders}
            </h5>
            <span className="text-[11px] text-slate-400 underline">সব অর্ডার</span>
          </div>

          <div
            onClick={() => onNavigateTab('sales')}
            className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm cursor-pointer hover:border-amber-400 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-700 font-medium">পেন্ডিং অর্ডার</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h5 className="text-2xl font-black text-amber-600 group-hover:scale-105 transition-transform">
              {pendingOrders}
            </h5>
            <span className="text-[11px] text-amber-700 underline font-medium">ডেলিভারি দিন</span>
          </div>

          <div
            onClick={() => onNavigateTab('products')}
            className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm cursor-pointer hover:border-rose-400 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-rose-700 font-medium">কম স্টক / শেষ</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <h5 className="text-2xl font-black text-rose-600 group-hover:scale-105 transition-transform">
              {lowStockCount}
            </h5>
            <span className="text-[11px] text-rose-600 underline font-medium">স্টক রিফিল করুন</span>
          </div>
        </div>
      </div>

      {/* Recharts Monthly Delivered Sales Report Visualization */}
      <MonthlyDeliveredSalesReport orders={orders} onNavigateTab={onNavigateTab} />

      {/* Customer Loyalty Score & VIP Rankings Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800">
                  গ্রাহক লয়ালটি স্কোর ও ভিআইপি লিডারবোর্ড
                </h3>
                <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ক্রয় ভলিউম ভিত্তিক
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                মোট ক্রয় ভলিউমের (৳১০০ = ১ পয়েন্ট + মাইলস্টোন বোনাস) ভিত্তিতে গ্রাহকদের স্বয়ংক্রিয় লয়ালটি র‍্যাঙ্কিং
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('customers')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-[#0A4A29] text-white text-xs font-bold transition shadow-xs cursor-pointer min-h-[44px]"
          >
            <span>কাস্টমার ম্যানেজমেন্টে বিস্তারিত দেখুন</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Loyalty Summary Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-purple-50/70 border border-purple-200/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-purple-700 text-xs font-bold mb-1">
              <span>ভিআইপি গ্রাহক</span>
              <Crown className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">
              {toBanglaDigits(loyaltyData.summary.vipCount)} <span className="text-xs font-medium text-purple-600">জন</span>
            </div>
            <span className="text-[10px] text-purple-600 font-medium">প্ল্যাটিনাম ও গোল্ড সদস্য</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
              <span>মোট ক্রয় ভলিউম</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-900">
              ৳ {loyaltyData.summary.totalPurchaseVolume.toLocaleString('en-US')}
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">নিবন্ধিত সকল গ্রাহকের মোট ক্রয়</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold mb-1">
              <span>গড় লয়ালটি স্কোর</span>
              <Star className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-900">
              {toBanglaDigits(loyaltyData.summary.averageScore)} <span className="text-xs font-medium text-amber-600">পয়েন্ট</span>
            </div>
            <span className="text-[10px] text-amber-600 font-medium">গ্রাহক প্রতি গড় স্কোর</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-slate-700 text-xs font-bold mb-1">
              <span>সর্বোচ্চ স্কোরার (#১)</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {loyaltyData.summary.topCustomer?.name || 'ডাটা নেই'}
            </div>
            <span className="text-[11px] text-[#0A4A29] font-bold">
              {loyaltyData.summary.topCustomer ? `${loyaltyData.summary.topCustomer.scoreDisplayBangla} পয়েন্ট (৳${loyaltyData.summary.topCustomer.totalPurchase.toLocaleString('en-US')})` : '—'}
            </span>
          </div>
        </div>

        {/* Tier Distribution Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-bold text-slate-500">স্তর বিন্যাস:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold border border-purple-200">
            <span>👑 প্ল্যাটিনাম (৳২০k+)</span>
            <span className="bg-purple-200/70 text-purple-900 px-1.5 py-0.2 rounded-full text-[10px]">{toBanglaDigits(loyaltyData.summary.tierCounts.platinum)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200">
            <span>🥇 গোল্ড (৳১০k+)</span>
            <span className="bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">{toBanglaDigits(loyaltyData.summary.tierCounts.gold)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
            <span>🥈 সিলভার (৳৫k+)</span>
            <span className="bg-slate-200/70 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px]">{toBanglaDigits(loyaltyData.summary.tierCounts.silver)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800 font-bold border border-orange-200">
            <span>🥉 ব্রোঞ্জ (৳১.৫k+)</span>
            <span className="bg-orange-200/70 text-orange-900 px-1.5 py-0.2 rounded-full text-[10px]">{toBanglaDigits(loyaltyData.summary.tierCounts.bronze)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            <span>🌱 সাধারণ গ্রাহক</span>
            <span className="bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full text-[10px]">{toBanglaDigits(loyaltyData.summary.tierCounts.starter)}</span>
          </span>
        </div>

        {/* Top Loyalty Customers Table / Podium */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>শীর্ষ লয়াল কাস্টমার লিডারবোর্ড (টপ ৫)</span>
            </span>
            <span className="text-[11px] text-slate-400">সর্বোচ্চ ক্রয় ও স্কোর অনুযায়ী ক্রমবিন্যাস</span>
          </div>

          {loyaltyData.rankedList.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              কোনো কাস্টমার তথ্য পাওয়া যায়নি
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center">র‍্যাঙ্ক</th>
                    <th className="px-4 py-3">গ্রাহকের নাম ও ফোন</th>
                    <th className="px-4 py-3">লয়ালটি স্তর (Tier)</th>
                    <th className="px-4 py-3 text-right">মোট ক্রয় ভলিউম</th>
                    <th className="px-4 py-3 text-center">লয়ালটি স্কোর</th>
                    <th className="px-4 py-3">পরবর্তী স্তর অগ্রগতি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loyaltyData.rankedList.slice(0, 5).map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;
                    return (
                      <tr
                        key={item.phone || item.name}
                        onClick={() => onNavigateTab('customers')}
                        className={`transition hover:bg-amber-50/40 cursor-pointer ${
                          isTop1 ? 'bg-amber-50/20 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shadow-xs ${
                              isTop1
                                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                                : isTop2
                                ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-200'
                                : isTop3
                                ? 'bg-orange-300 text-orange-950 ring-2 ring-orange-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isTop1 ? '👑' : isTop2 ? '🥇' : isTop3 ? '🥈' : item.rankDisplayBangla}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-slate-500 text-xs flex items-center gap-2">
                            <span>{item.phone}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({toBanglaDigits(item.totalOrders)} টি অর্ডার)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${item.tier.bgClass} ${item.tier.textClass} ${item.tier.borderClass}`}
                          >
                            <span>{item.tier.badgeEmoji}</span>
                            <span>{item.tier.labelBn}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-900">
                          ৳ {item.totalPurchase.toLocaleString('en-US')}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-block bg-[#0A4A29]/10 text-[#0A4A29] px-2.5 py-1 rounded-lg font-black text-xs">
                            {item.scoreDisplayBangla} পয়েন্ট
                          </span>
                        </td>
                        <td className="px-4 py-3.5 min-w-[140px]">
                          {item.nextTier ? (
                            <div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                <span>{item.nextTier.badgeEmoji} {item.nextTier.labelBn}</span>
                                <span className="font-bold text-slate-700">{toBanglaDigits(item.progressPercent)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-[#1E8A52] h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${item.progressPercent}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                আর ৳ {item.amountToNextTier.toLocaleString('en-US')} প্রয়োজন
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-purple-700 font-bold">
                              <span>👑</span>
                              <span>সর্বোচ্চ স্তর অর্জিত</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* General Cashflow Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">দৈনিক আয়-ব্যয় ট্রেন্ড (বিগত ৭ দিন)</h4>
              <p className="text-xs text-slate-400">প্রতিদিনের আয় বনাম ব্যয়ের তুলনা</p>
            </div>
          </div>
          <DailyTrendChart
            labels={last7Days.map((d) => d.substring(5))}
            incomeData={dailyTrendIncome}
            expenseData={dailyTrendExpense}
          />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">মাসিক আয়, ব্যয় ও লাভ (বিগত ৬ মাস)</h4>
              <p className="text-xs text-slate-400">মাসিক প্রফিট ও পারফরম্যান্স গ্রাফ</p>
            </div>
          </div>
          <MonthlyBarChart
            labels={recentMonths}
            incomeData={monthlyIncomeArr}
            expenseData={monthlyExpenseArr}
            profitData={monthlyProfitArr}
          />
        </div>
      </div>
    </div>
  );
};
