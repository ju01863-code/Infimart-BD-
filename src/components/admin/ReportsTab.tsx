import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Award,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import { Order, Transaction, Customer, Product } from '../../types';
import { DailyTrendChart, MonthlyBarChart } from '../Charts';
import { exportToExcel } from '../../utils/excelExport';

interface ReportsTabProps {
  orders: Order[];
  transactions: Transaction[];
  customers: Customer[];
  products: Product[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  orders,
  transactions,
  customers,
}) => {
  const [reportType, setReportType] = useState<'Daily' | 'Monthly' | 'Yearly'>('Monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Filter transactions based on selection
  const filteredTransactions = useMemo(() => {
    if (reportType === 'Daily') {
      return transactions.filter((t) => t.date.startsWith(selectedDate));
    } else if (reportType === 'Monthly') {
      return transactions.filter((t) => t.date.startsWith(selectedMonth));
    } else {
      return transactions.filter((t) => t.date.startsWith(selectedYear));
    }
  }, [transactions, reportType, selectedDate, selectedMonth, selectedYear]);

  // Filter orders based on selection
  const filteredOrders = useMemo(() => {
    if (reportType === 'Daily') {
      return orders.filter((o) => o.date.startsWith(selectedDate));
    } else if (reportType === 'Monthly') {
      return orders.filter((o) => o.date.startsWith(selectedMonth));
    } else {
      return orders.filter((o) => o.date.startsWith(selectedYear));
    }
  }, [orders, reportType, selectedDate, selectedMonth, selectedYear]);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpense;
  const totalOrdersCount = filteredOrders.length;
  const totalOrderSales = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  // Top Selling Products Calculation
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { quantity: number; revenue: number }> = {};
    filteredOrders.forEach((o) => {
      const pName = o.product || 'অজ্ঞাত পণ্য';
      if (!map[pName]) {
        map[pName] = { quantity: 0, revenue: 0 };
      }
      map[pName].quantity += Number(o.quantity || 1);
      map[pName].revenue += Number(o.total || 0);
    });

    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // Top Customers in this period
  const topCustomersInPeriod = useMemo(() => {
    const map: Record<string, { name: string; totalSpent: number; ordersCount: number }> = {};
    filteredOrders.forEach((o) => {
      const phoneKey = o.phone || o.customerName;
      if (!map[phoneKey]) {
        map[phoneKey] = { name: o.customerName, totalSpent: 0, ordersCount: 0 };
      }
      map[phoneKey].totalSpent += Number(o.total || 0);
      map[phoneKey].ordersCount += 1;
    });

    return Object.values(map)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [filteredOrders]);

  // Chart data setup for trend
  const dailyLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const chartIncomeTrend = dailyLabels.map((d) =>
    transactions
      .filter((t) => t.date.startsWith(d) && t.type === 'income')
      .reduce((s, t) => s + Number(t.amount || 0), 0)
  );

  const chartExpenseTrend = dailyLabels.map((d) =>
    transactions
      .filter((t) => t.date.startsWith(d) && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount || 0), 0)
  );

  const handleExportReport = () => {
    const summaryData = [
      {
        বিবরণ: 'রিপোর্ট ধরন',
        তথ্য: reportType === 'Daily' ? 'দৈনিক' : reportType === 'Monthly' ? 'মাসিক' : 'বাৎসরিক',
      },
      {
        বিবরণ: 'নির্বাচিত তারিখ / মাস / বছর',
        তথ্য:
          reportType === 'Daily'
            ? selectedDate
            : reportType === 'Monthly'
            ? selectedMonth
            : selectedYear,
      },
      { বিবরণ: 'মোট আয় (টাকা)', তথ্য: totalIncome },
      { বিবরণ: 'মোট ব্যয় (টাকা)', তথ্য: totalExpense },
      { বিবরণ: 'নিট লাভ (টাকা)', তথ্য: netProfit },
      { বিবরণ: 'মোট অর্ডারের সংখ্যা', তথ্য: totalOrdersCount },
      { বিবরণ: 'অর্ডার থেকে বিক্রয়মূল্য', তথ্য: totalOrderSales },
    ];

    exportToExcel(
      summaryData,
      `InfiMart_Report_${reportType}_${
        reportType === 'Daily'
          ? selectedDate
          : reportType === 'Monthly'
          ? selectedMonth
          : selectedYear
      }`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1E8A52]" />
            <span>বিজনেস রিপোর্ট ও অ্যানালিটিক্স (Business Reports)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            দৈনিক, মাসিক ও বাৎসরিক পূর্ণাঙ্গ ব্যবসায়িক প্রতিবেদন
          </p>
        </div>

        <button
          onClick={handleExportReport}
          className="flex items-center gap-1.5 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#FFB300]" />
          <span>রিপোর্ট এক্সপোর্ট (Excel)</span>
        </button>
      </div>

      {/* Selectors Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Toggle Report Type */}
        <div className="flex items-center gap-1.5">
          {(['Daily', 'Monthly', 'Yearly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                reportType === type
                  ? 'bg-[#0A4A29] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type === 'Daily'
                ? 'দৈনিক রিপোর্ট'
                : type === 'Monthly'
                ? 'মাসিক রিপোর্ট'
                : 'বাৎসরিক রিপোর্ট'}
            </button>
          ))}
        </div>

        {/* Date/Month/Year Picker */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0A4A29]" />
          {reportType === 'Daily' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
            />
          )}

          {reportType === 'Monthly' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
            />
          )}

          {reportType === 'Yearly' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y.toString()}>
                  {y} সাল
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary KPI Cards for Selected Report Period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold">মোট আয় (Income)</span>
          <h3 className="text-2xl font-black text-[#1E8A52] mt-1">
            ৳ {totalIncome.toLocaleString('en-US')}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">সকল সেলস ও সার্ভিস চার্জ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold">মোট ব্যয় (Expense)</span>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            ৳ {totalExpense.toLocaleString('en-US')}
          </h3>
          <span className="text-[11px] text-slate-400 mt-1 block">পণ্য ক্রয় ও ব্যবসায়িক খরচ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold">নিট প্রফিট (Net Profit)</span>
          <h3
            className={`text-2xl font-black mt-1 ${
              netProfit >= 0 ? 'text-[#0A4A29]' : 'text-rose-600'
            }`}
          >
            ৳ {netProfit.toLocaleString('en-US')}
          </h3>
          <span className="text-[11px] font-bold text-amber-600 mt-1 block">
            {netProfit >= 0 ? 'মুনাফাজনক সময়কাল' : 'ক্ষতি বা ঘাটতি'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-bold">অর্ডার ও বিক্রয়</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{totalOrdersCount} টি</h3>
          <span className="text-[11px] text-slate-500 mt-1 block">
            মূল্য: ৳ {totalOrderSales.toLocaleString('en-US')}
          </span>
        </div>
      </div>

      {/* Top Selling Products & Top Customers Table in this period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#0A4A29]" />
            <span>সর্বোচ্চ বিক্রীত পণ্য (Top Selling Products)</span>
          </h3>

          {topSellingProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              এই সময়কালে কোনো অর্ডারের পণ্য পাওয়া যায়নি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topSellingProducts.map((p, idx) => (
                <div key={p.name} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#0A4A29]">
                      ৳ {p.revenue.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">{p.quantity} টি বিক্রি</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#FFB300]" />
            <span>সর্বোচ্চ কেনাকাটাকারী কাস্টমার (Top Customers)</span>
          </h3>

          {topCustomersInPeriod.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              এই সময়কালে কোনো কাস্টমার অর্ডার পাওয়া যায়নি।
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topCustomersInPeriod.map((c, idx) => (
                <div key={c.name} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#0A4A29]">
                      ৳ {c.totalSpent.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400">{c.ordersCount} টি অর্ডার</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 text-sm sm:text-base mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#1E8A52]" />
          <span>দৈনিক আর্থিক তুলনা চিত্র (Daily Financial Comparison)</span>
        </h4>
        <p className="text-xs text-slate-400 mb-4">গত ৭ দিনের ব্যবসায়িক গ্রাফ</p>
        <DailyTrendChart
          labels={dailyLabels.map((d) => d.substring(5))}
          incomeData={chartIncomeTrend}
          expenseData={chartExpenseTrend}
        />
      </div>
    </div>
  );
};
