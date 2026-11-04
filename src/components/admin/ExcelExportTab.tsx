import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import { Order, Purchase, Transaction, Customer } from '../../types';
import { exportToExcel, exportToCSV, exportMultiSheetExcel } from '../../utils/excelExport';

interface ExcelExportTabProps {
  orders: Order[];
  purchases: Purchase[];
  transactions: Transaction[];
  customers: Customer[];
}

export const ExcelExportTab: React.FC<ExcelExportTabProps> = ({
  orders,
  purchases,
  transactions,
  customers,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7) // "2026-09"
  );
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // 1. Export Income & Expense
  const handleExportIncomeExpense = (format: 'xlsx' | 'csv') => {
    const data = transactions.map((t, i) => ({
      ক্রমিক: i + 1,
      তারিখ: t.date,
      ধরন: t.type === 'income' ? 'আয়' : 'ব্যয়',
      ক্যাটাগরি: t.category,
      বিবরণ: t.description,
      পরিমাণ_টাকা: t.amount,
      পেমেন্ট_পদ্ধতি: t.paymentMethod,
      মন্তব্য: t.notes || '',
    }));
    const filename = `InfiMart_Income_Expense_${selectedMonth}`;
    if (format === 'xlsx') exportToExcel(data, filename, 'Income_Expense');
    else exportToCSV(data, filename);
    showNotification('আয়-ব্যয় রিপোর্ট ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // 2. Export Purchases
  const handleExportPurchases = (format: 'xlsx' | 'csv') => {
    const data = purchases.map((p, i) => ({
      ক্রমিক: i + 1,
      তারিখ: p.date,
      সাপ্লায়ার: p.supplier,
      পণ্য: p.product,
      পরিমাণ: p.quantity,
      একক_দর: p.unitPrice,
      মোট_টাকা: p.total,
      পরিশোধিত: p.paid,
      বকেয়া_টাকা: p.due,
      মন্তব্য: p.notes || '',
    }));
    const filename = `InfiMart_Purchases_${selectedMonth}`;
    if (format === 'xlsx') exportToExcel(data, filename, 'Purchases');
    else exportToCSV(data, filename);
    showNotification('ক্রয় রিপোর্ট ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // 3. Export Sales
  const handleExportSales = (format: 'xlsx' | 'csv') => {
    const data = orders.map((o, i) => ({
      ক্রমিক: i + 1,
      তারিখ: o.date,
      কাস্টমার_নাম: o.customerName,
      মোবাইল: o.phone,
      ঠিকানা: o.address,
      পণ্য: o.product,
      পরিমাণ: o.quantity,
      একক_দর: o.unitPrice,
      মোট_টাকা: o.total,
      পেমেন্ট: o.paymentMethod,
      অবস্থা: o.status,
    }));
    const filename = `InfiMart_Sales_${selectedMonth}`;
    if (format === 'xlsx') exportToExcel(data, filename, 'Sales');
    else exportToCSV(data, filename);
    showNotification('বিক্রয় রিপোর্ট ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // 4. Export Customers
  const handleExportCustomers = (format: 'xlsx' | 'csv') => {
    const data = customers.map((c, i) => ({
      ক্রমিক: i + 1,
      কাস্টমার_নাম: c.name,
      মোবাইল: c.phone,
      ঠিকানা: c.address,
      প্রথম_অর্ডার: c.firstOrder,
      সর্বশেষ_অর্ডার: c.lastOrder,
      মোট_অর্ডার: c.totalOrders,
      মোট_কেনাকাটা_টাকা: c.totalPurchase,
      উপহার_অবস্থা: c.giftStatus,
    }));
    const filename = `InfiMart_Customers_${selectedMonth}`;
    if (format === 'xlsx') exportToExcel(data, filename, 'Customers');
    else exportToCSV(data, filename);
    showNotification('কাস্টমার ডাটাবেজ ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // 5. Monthly Summary
  const handleExportMonthlySummary = () => {
    const monthTx = transactions.filter((t) => t.date.startsWith(selectedMonth));
    const monthOrders = orders.filter((o) => o.date.startsWith(selectedMonth));
    const monthPurchases = purchases.filter((p) => p.date.startsWith(selectedMonth));

    const totalInc = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExp = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const netProfit = totalInc - totalExp;
    const totalOrderTotal = monthOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalPurchaseAmt = monthPurchases.reduce((s, p) => s + Number(p.total || 0), 0);

    const data = [
      { মেট্রিক: 'নির্বাচিত মাস', তথ্য: selectedMonth },
      { মেট্রিক: 'মোট আয় (টাকা)', তথ্য: totalInc },
      { মেট্রিক: 'মোট ব্যয় (টাকা)', তথ্য: totalExp },
      { মেট্রিক: 'নিট লাভ (টাকা)', তথ্য: netProfit },
      { মেট্রিক: 'মোট অর্ডার সংখ্যা', তথ্য: monthOrders.length },
      { মেট্রিক: 'অর্ডার থেকে বিক্রয়মূল্য', তথ্য: totalOrderTotal },
      { মেট্রিক: 'মোট মালামাল ক্রয়মূল্য', তথ্য: totalPurchaseAmt },
      { মেট্রিক: 'সাপ্লায়ারদের মোট বকেয়া', তথ্য: monthPurchases.reduce((s, p) => s + Number(p.due || 0), 0) },
    ];

    exportToExcel(data, `InfiMart_Monthly_Summary_${selectedMonth}`, 'Monthly_Summary');
    showNotification('মাসিক সারসংক্ষেপ ডাউনলোড সম্পন্ন হয়েছে!');
  };

  // 6. Full Multi-Sheet Report
  const handleExportFullReport = () => {
    const salesData = orders.map((o, i) => ({
      ক্রমিক: i + 1,
      তারিখ: o.date,
      কাস্টমার: o.customerName,
      মোবাইল: o.phone,
      ঠিকানা: o.address,
      পণ্য: o.product,
      পরিমাণ: o.quantity,
      একক_দর: o.unitPrice,
      মোট_টাকা: o.total,
      পেমেন্ট: o.paymentMethod,
      অবস্থা: o.status,
    }));

    const purchaseData = purchases.map((p, i) => ({
      ক্রমিক: i + 1,
      তারিখ: p.date,
      সাপ্লায়ার: p.supplier,
      পণ্য: p.product,
      পরিমাণ: p.quantity,
      একক_দর: p.unitPrice,
      মোট_টাকা: p.total,
      পরিশোধিত: p.paid,
      বকেয়া: p.due,
      মন্তব্য: p.notes || '',
    }));

    const txData = transactions.map((t, i) => ({
      ক্রমিক: i + 1,
      তারিখ: t.date,
      ধরন: t.type === 'income' ? 'আয়' : 'ব্যয়',
      ক্যাটাগরি: t.category,
      বিবরণ: t.description,
      পরিমাণ_টাকা: t.amount,
      পেমেন্ট: t.paymentMethod,
    }));

    const customerData = customers.map((c, i) => ({
      ক্রমিক: i + 1,
      নাম: c.name,
      মোবাইল: c.phone,
      ঠিকানা: c.address,
      মোট_অর্ডার: c.totalOrders,
      মোট_কেনাকাটা: c.totalPurchase,
      গিফট_অবস্থা: c.giftStatus,
    }));

    const totalInc = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExp = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);

    const summaryData = [
      { বিবরণ: 'তৈরির তারিখ', মান: new Date().toISOString() },
      { বিবরণ: 'স্টোর নাম', মান: 'InfiMart BD' },
      { বিবরণ: 'সর্বমোট আয়', মান: totalInc },
      { বিবরণ: 'সর্বমোট ব্যয়', মান: totalExp },
      { বিবরণ: 'নিট লাভ', মান: totalInc - totalExp },
      { বিবরণ: 'মোট অর্ডার', মান: orders.length },
      { বিবরণ: 'মোট কাস্টমার', মান: customers.length },
      { বিবরণ: 'মোট পণ্য ক্রয় এন্ট্রি', মান: purchases.length },
    ];

    exportMultiSheetExcel(
      [
        { sheetName: 'Summary', data: summaryData },
        { sheetName: 'Sales', data: salesData },
        { sheetName: 'Purchases', data: purchaseData },
        { sheetName: 'Income_Expense', data: txData },
        { sheetName: 'Customers', data: customerData },
      ],
      `InfiMart_Full_Report_${selectedMonth}`
    );

    showNotification('সব শিটসহ পূর্ণাঙ্গ এক্সেল ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#1E8A52]" />
            <span>CSV ও Excel ডাটা ডাউনলোড (Data Export)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            SheetJS লাইব্রেরির মাধ্যমে এক ক্লিকেই সম্পূর্ণ ডাটা এক্সেল বা সিএসভি ফাইলে এক্সপোর্ট করুন
          </p>
        </div>

        {/* Selected Month Target */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-[#0A4A29]" />
          <span className="text-xs font-bold text-slate-600">টার্গেট মাস:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-lg text-slate-800 bg-white"
          />
        </div>
      </div>

      {downloadSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Featured Master Download: Full Report */}
      <div className="bg-gradient-to-br from-[#0A4A29] via-[#125834] to-[#1E8A52] text-white p-6 rounded-3xl shadow-lg border-2 border-[#FFB300]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="bg-[#FFB300] text-[#0A4A29] font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
              অল-ইন-ওয়ান মাল্টি-শিট এক্সেল
            </span>
            <h3 className="text-xl sm:text-2xl font-black mt-2 text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#FFB300]" />
              <span>পূর্ণাঙ্গ ব্যবসায়িক রিপোর্ট (Full Master Report)</span>
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
              একটি এক্সেল ফাইলের ভেতর আলাদা আলাদা শিটে (Summary, Sales, Purchases, Income & Expense, Customers) সকল ডাটা সুসজ্জিতভাবে সংরক্ষিত থাকবে।
            </p>
            <p className="text-xs text-[#FFE0A8] font-mono mt-2">
              ফাইলের নাম: InfiMart_Full_Report_{selectedMonth}.xlsx
            </p>
          </div>

          <button
            onClick={handleExportFullReport}
            className="shrink-0 bg-[#FFB300] hover:bg-[#e6a100] text-[#0A4A29] font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>পূর্ণাঙ্গ রিপোর্ট ডাউনলোড করুন</span>
          </button>
        </div>
      </div>

      {/* Grid of Individual Section Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Income & Expense */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#1E8A52] transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0A4A29] flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">১. আয় ও ব্যয় (Income/Expense)</h4>
            <p className="text-xs text-slate-500 mt-1">
              মোট {transactions.length} টি আয় ও ব্যয়ের হিসাব বিবরণী
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportIncomeExpense('xlsx')}
              className="flex-1 bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XLSX</span>
            </button>
            <button
              onClick={() => handleExportIncomeExpense('csv')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 2. Purchases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#1E8A52] transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">২. ক্রয় ও আড়তদার (Purchases)</h4>
            <p className="text-xs text-slate-500 mt-1">
              মোট {purchases.length} টি ক্রয়ের ভাউচার ও সাপ্লায়ার বকেয়া
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportPurchases('xlsx')}
              className="flex-1 bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XLSX</span>
            </button>
            <button
              onClick={() => handleExportPurchases('csv')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 3. Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#1E8A52] transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">৩. বিক্রয় ও অর্ডার (Sales)</h4>
            <p className="text-xs text-slate-500 mt-1">
              মোট {orders.length} টি কাস্টমার অর্ডার এবং ডেলিভারি স্ট্যাটাস
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportSales('xlsx')}
              className="flex-1 bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XLSX</span>
            </button>
            <button
              onClick={() => handleExportSales('csv')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 4. Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#1E8A52] transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">৪. কাস্টমার ডাটা (Customers)</h4>
            <p className="text-xs text-slate-500 mt-1">
              মোট {customers.length} জন কাস্টমারের নাম, ফোন, কেনাকাটা ও গিফট
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportCustomers('xlsx')}
              className="flex-1 bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XLSX</span>
            </button>
            <button
              onClick={() => handleExportCustomers('csv')}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* 5. Monthly Summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-[#1E8A52] transition">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0A4A29] flex items-center justify-center font-bold mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">৫. মাসিক সামারি (Monthly Summary)</h4>
            <p className="text-xs text-slate-500 mt-1">
              {selectedMonth} মাসের মোট আয়, ব্যয়, লাভ ও বিক্রয়ের সারসংক্ষেপ
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={handleExportMonthlySummary}
              className="w-full bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>মাসিক সামারি ডাউনলোড (XLSX)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
