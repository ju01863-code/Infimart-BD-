import React, { useState, useMemo } from 'react';
import {
  Gift,
  Award,
  Crown,
  MessageCircle,
  CheckCircle,
  Download,
  Filter,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { Customer, GiftRecord, Order, StoreSettings } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';

interface GiftTrackingTabProps {
  customers: Customer[];
  orders: Order[];
  giftRecords: GiftRecord[];
  settings: StoreSettings;
  onRecordGift: (gift: Omit<GiftRecord, 'id'>) => Promise<void>;
  onUpdateCustomerGiftStatus: (customerId: string, status: 'Sent' | 'Not Sent') => Promise<void>;
}

export const GiftTrackingTab: React.FC<GiftTrackingTabProps> = ({
  customers,
  orders,
  giftRecords,
  settings,
  onRecordGift,
  onUpdateCustomerGiftStatus,
}) => {
  const [periodFilter, setPeriodFilter] = useState<
    'This Month' | 'Last Month' | 'This Year' | 'All Time' | 'Custom'
  >('This Month');
  const [minPurchase, setMinPurchase] = useState<number>(0);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7); // "2026-09"
  const currentYear = now.getFullYear();

  // Filter orders by period to calculate dynamic customer spend
  const customerSpendMap = useMemo(() => {
    const map: Record<string, { totalSpend: number; orderCount: number; lastOrder: string }> = {};

    orders.forEach((o) => {
      // Check period
      let matchesPeriod = true;
      const oDate = o.date;
      if (periodFilter === 'This Month') {
        matchesPeriod = oDate.startsWith(currentMonth);
      } else if (periodFilter === 'Last Month') {
        const lastM = new Date();
        lastM.setMonth(now.getMonth() - 1);
        const lastMStr = lastM.toISOString().substring(0, 7);
        matchesPeriod = oDate.startsWith(lastMStr);
      } else if (periodFilter === 'This Year') {
        matchesPeriod = oDate.startsWith(`${currentYear}`);
      } else if (periodFilter === 'Custom') {
        if (customStart && oDate < customStart) matchesPeriod = false;
        if (customEnd && oDate > customEnd) matchesPeriod = false;
      }

      if (!matchesPeriod) return;

      const phoneKey = o.phone.replace(/[^0-9]/g, '');
      if (!map[phoneKey]) {
        map[phoneKey] = { totalSpend: 0, orderCount: 0, lastOrder: oDate };
      }
      map[phoneKey].totalSpend += Number(o.total || 0);
      map[phoneKey].orderCount += 1;
      if (oDate > map[phoneKey].lastOrder) {
        map[phoneKey].lastOrder = oDate;
      }
    });

    return map;
  }, [orders, periodFilter, currentMonth, currentYear, customStart, customEnd]);

  // Merge with customer profiles and sort by spend descending
  const rankedCustomers = useMemo(() => {
    const list = customers.map((c) => {
      const cleanPhone = c.phone.replace(/[^0-9]/g, '');
      const dynamicData = customerSpendMap[cleanPhone];

      // If user selected 'All Time', we can use the customer's lifetime totalPurchase or order sum
      const totalAmount =
        periodFilter === 'All Time'
          ? Math.max(c.totalPurchase || 0, dynamicData?.totalSpend || 0)
          : dynamicData?.totalSpend || 0;

      const totalOrdersCount =
        periodFilter === 'All Time'
          ? Math.max(c.totalOrders || 0, dynamicData?.orderCount || 0)
          : dynamicData?.orderCount || 0;

      const lastOrderDate = dynamicData?.lastOrder || c.lastOrder || c.firstOrder || '—';

      // Check if this customer already got a gift this selected month/year
      const alreadyGiftedThisMonth = giftRecords.some(
        (g) => g.phone.replace(/[^0-9]/g, '') === cleanPhone && g.month === currentMonth
      );

      return {
        customer: c,
        totalAmount,
        totalOrdersCount,
        lastOrderDate,
        isGiftedThisMonth: alreadyGiftedThisMonth || c.giftStatus === 'Sent',
      };
    });

    return list
      .filter((item) => item.totalAmount >= minPurchase)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [customers, customerSpendMap, periodFilter, minPurchase, giftRecords, currentMonth]);

  const top5 = rankedCustomers.slice(0, 5);

  const handleSendGiftWhatsApp = async (
    customer: Customer,
    totalSpent: number,
    rank: number
  ) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const message = `আসসালামু আলাইকুম ${customer.name} ভাই/আপু,
${settings.storeName || 'InfiMart BD'}-এ শীর্ষ ${rank} নম্বর সেরা কাস্টমার হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ ও মোবারকবাদ! 🎉

আপনার সর্বমোট কেনাকাটা: ৳ ${totalSpent.toLocaleString('en-US')}
আপনার আন্তরিক ভালোবাসায় আমাদের পথচলা। আপনার জন্য InfiMart BD-এর পক্ষ থেকে রয়েছে একটি বিশেষ শুভেচ্ছা উপহার।
উপহারটি অতি শীঘ্রই আপনার ঠিকানায় পৌঁছে দেয়া হবে।

সাশ্রয়ের ঠিকানা, ভরসার বাজার — InfiMart BD`;

    // Record gift in Firestore to prevent duplicate gifts in the same month
    if (customer.id) {
      await onRecordGift({
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        month: currentMonth,
        year: currentYear,
        sentAt: new Date().toISOString(),
        status: 'Sent',
        note: `র‌্যাংক #${rank} (কেনাকাটা ৳ ${totalSpent.toLocaleString('en-US')})`,
      });

      await onUpdateCustomerGiftStatus(customer.id, 'Sent');
    }

    // Open WhatsApp
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMarkAsSent = async (customer: Customer, rank: number, totalSpent: number) => {
    if (!customer.id) return;
    await onRecordGift({
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      month: currentMonth,
      year: currentYear,
      sentAt: new Date().toISOString(),
      status: 'Sent',
      note: `ম্যানুয়ালি গিফট চিহ্নিত (র‌্যাংক #${rank})`,
    });
    await onUpdateCustomerGiftStatus(customer.id, 'Sent');
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = rankedCustomers.map((item, idx) => ({
      র‌্যাংক: idx + 1,
      কাস্টমার_নাম: item.customer.name,
      মোবাইল: item.customer.phone,
      ঠিকানা: item.customer.address,
      মোট_অর্ডার: item.totalOrdersCount,
      মোট_কেনাকাটা_টাকা: item.totalAmount,
      সর্বশেষ_অর্ডার: item.lastOrderDate,
      উপহার_অবস্থা: item.isGiftedThisMonth ? 'উপহার পাঠানো হয়েছে' : 'পাঠানো হয়নি',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Top_Customers_${periodFilter}_${dateStr}`);
    } else {
      exportToCSV(data, `InfiMart_Top_Customers_${periodFilter}_${dateStr}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <Award className="w-6 h-6 text-[#FFB300]" />
            <span>সেরা কাস্টমার অ্যানালিটিক্স ও গিফট ট্র্যাকিং</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মাসের সেরা কাস্টমারদের নির্বাচন করুন ও বিশেষ উপহার পাঠিয়ে তাদের সন্তুষ্টি বৃদ্ধি করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Top 5 Highlight Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-[#FFB300]" />
          <span>উপহার বিতরণের জন্য সেরা ৫ কাস্টমার (Top 5 Customers for Gifts)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {top5.length === 0 ? (
            <div className="col-span-full bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              নির্বাচিত ফিল্টারে কোনো কাস্টমার তথ্য পাওয়া যায়নি।
            </div>
          ) : (
            top5.map((item, idx) => (
              <div
                key={item.customer.id || item.customer.phone}
                className="bg-white p-4 rounded-2xl border-2 border-[#FFB300]/30 hover:border-[#FFB300] shadow-sm relative overflow-hidden transition-all flex flex-col justify-between"
              >
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0A4A29] text-[#FFB300] flex items-center justify-center font-black text-xs">
                  #{idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm truncate pr-8">
                    {item.customer.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">{item.customer.phone}</p>
                  <div className="mt-2 bg-emerald-50 px-2 py-1 rounded-lg">
                    <span className="text-[10px] text-slate-500 font-semibold block">কেনাকাটা:</span>
                    <span className="text-base font-black text-[#0A4A29]">
                      ৳ {item.totalAmount.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100">
                  {item.isGiftedThisMonth ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg w-full justify-center">
                      <CheckCircle className="w-3 h-3" /> গিফট পাঠানো হয়েছে
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendGiftWhatsApp(item.customer, item.totalAmount, idx + 1)}
                      className="w-full flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white py-1.5 px-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>উপহার পাঠান</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter and Criteria Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        {/* Time Period Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 font-bold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#0A4A29]" />
            সময়কাল:
          </span>
          {(['This Month', 'Last Month', 'This Year', 'All Time', 'Custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                periodFilter === p
                  ? 'bg-[#0A4A29] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p === 'This Month'
                ? 'চলতি মাস'
                : p === 'Last Month'
                ? 'গত মাস'
                : p === 'This Year'
                ? 'এই বছর'
                : p === 'All Time'
                ? 'সর্বমোট (সব সময়)'
                : 'কাস্টম রেঞ্জ'}
            </button>
          ))}
        </div>

        {/* Custom Range if selected */}
        {periodFilter === 'Custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 border rounded text-xs"
            />
            <span className="text-xs text-slate-400">থেকে</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 border rounded text-xs"
            />
          </div>
        )}

        {/* Minimum Purchase Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-semibold whitespace-nowrap flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#FFB300]" />
            নূন্যতম কেনাকাটা:
          </span>
          <select
            value={minPurchase}
            onChange={(e) => setMinPurchase(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
          >
            <option value={0}>সকল পরিমাণ</option>
            <option value={1000}>১,০০০+ টাকা</option>
            <option value={3000}>৩,০০০+ টাকা</option>
            <option value={5000}>৫,০০০+ টাকা</option>
            <option value={10000}>১০,০০০+ টাকা</option>
          </select>
        </div>
      </div>

      {/* Ranked Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-16">র‌্যাংক</th>
                <th className="px-4 py-3.5">কাস্টমার নাম ও মোবাইল</th>
                <th className="px-4 py-3.5">ঠিকানা</th>
                <th className="px-4 py-3.5 text-center">অর্ডার সংখ্যা</th>
                <th className="px-4 py-3.5">মোট ক্রয় (টাকা)</th>
                <th className="px-4 py-3.5">সর্বশেষ অর্ডার</th>
                <th className="px-4 py-3.5">গিফট স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-right">উপহার একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    কোনো কাস্টমার এই ফিল্টারে পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                rankedCustomers.map((item, idx) => (
                  <tr key={item.customer.id || item.customer.phone} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block w-7 h-7 leading-7 rounded-full font-black text-xs ${
                          idx === 0
                            ? 'bg-[#FFB300] text-[#0A4A29]'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{item.customer.name}</div>
                      <div className="text-xs text-slate-500">{item.customer.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                      {item.customer.address || '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">
                      {item.totalOrdersCount}
                    </td>
                    <td className="px-4 py-3 font-black text-[#0A4A29] text-base whitespace-nowrap">
                      ৳ {item.totalAmount.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {item.lastOrderDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.isGiftedThisMonth
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.isGiftedThisMonth ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{item.isGiftedThisMonth ? 'পাঠানো হয়েছে' : 'পাঠানো হয়নি'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendGiftWhatsApp(item.customer, item.totalAmount, idx + 1)}
                          className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                          title="WhatsApp এ কৃতজ্ঞতা মেসেজ পাঠিয়ে উপহার নিশ্চিত করুন"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>গিফট পাঠান</span>
                        </button>
                        {!item.isGiftedThisMonth && (
                          <button
                            onClick={() => handleMarkAsSent(item.customer, idx + 1, item.totalAmount)}
                            className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg text-xs font-semibold"
                            title="সরাসরি পাঠানো হয়েছে হিসেবে মার্ক করুন"
                          >
                            মার্ক
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (100% Mobile Friendly, Zero Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100">
          {rankedCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              কোনো কাস্টমার এই ফিল্টারে পাওয়া যায়নি।
            </div>
          ) : (
            rankedCustomers.map((item, idx) => (
              <div key={item.customer.id || item.customer.phone} className="p-4 space-y-3 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                        idx === 0
                          ? 'bg-[#FFB300] text-[#0A4A29]'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.customer.name}</h4>
                      <p className="text-xs text-slate-500">{item.customer.phone}</p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      item.isGiftedThisMonth
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.isGiftedThisMonth ? (
                      <CheckCircle className="w-3 h-3 text-purple-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{item.isGiftedThisMonth ? 'উপহার সম্পন্ন' : 'উপহার বাকি'}</span>
                  </span>
                </div>

                {item.customer.address && (
                  <p className="text-xs text-slate-500">
                    📍 {item.customer.address}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <div>
                    <span className="text-slate-500">মোট অর্ডার: </span>
                    <span className="font-bold text-slate-800">{item.totalOrdersCount} টি</span>
                  </div>
                  <div>
                    <span className="text-slate-500">মোট ক্রয়: </span>
                    <span className="font-black text-[#0A4A29] text-sm">৳{item.totalAmount.toLocaleString('en-US')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">সর্বশেষ: {item.lastOrderDate}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendGiftWhatsApp(item.customer, item.totalAmount, idx + 1)}
                      className="min-h-[44px] px-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>গিফট পাঠান</span>
                    </button>
                    {!item.isGiftedThisMonth && (
                      <button
                        onClick={() => handleMarkAsSent(item.customer, idx + 1, item.totalAmount)}
                        className="min-h-[44px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        মার্ক
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
