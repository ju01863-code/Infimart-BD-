import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Calendar,
  CheckCircle2,
  Download,
  BarChart3,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Award,
} from 'lucide-react';
import { Order } from '../../types';
import { exportToExcel } from '../../utils/excelExport';

interface MonthlyDeliveredSalesReportProps {
  orders: Order[];
  onNavigateTab?: (tab: string) => void;
}

const BANGLA_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const BANGLA_MONTHS_SHORT = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];

const toBanglaDigits = (num: number | string): string => {
  return num.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
};

function getYearMonthKey(dateInput?: string): string | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}/.test(dateInput)) {
      return dateInput.substring(0, 7);
    }
    return null;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatYearMonthBangla(ymStr: string, isShort = false): string {
  const [yearStr, monthStr] = ymStr.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = isShort
    ? BANGLA_MONTHS_SHORT[monthIdx] || monthStr
    : BANGLA_MONTHS[monthIdx] || monthStr;
  const yearBn = toBanglaDigits(yearStr);
  return isShort ? `${monthName} '${yearBn.slice(-2)}` : `${monthName} ${yearBn}`;
}

interface MonthlyDataPoint {
  monthKey: string; // YYYY-MM
  label: string;
  fullLabel: string;
  deliveredIncome: number;
  deliveredOrders: number;
  avgOrderValue: number;
}

export const MonthlyDeliveredSalesReport: React.FC<MonthlyDeliveredSalesReportProps> = ({
  orders,
  onNavigateTab,
}) => {
  const [timeRange, setTimeRange] = useState<'6M' | '12M' | 'all'>('6M');
  const [chartType, setChartType] = useState<'area' | 'composed'>('area');
  const [showTable, setShowTable] = useState<boolean>(false);

  // 1. Filter delivered orders and calculate totals
  const deliveredOrders = useMemo(() => {
    return orders.filter((o) => (o.status || '').toLowerCase() === 'delivered');
  }, [orders]);

  // 2. Aggregate monthly delivered sales based on delivered order date
  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; count: number }>();

    deliveredOrders.forEach((o) => {
      // Prioritize deliveredAt, fallback to order date or createdAt
      const dateStr = o.deliveredAt || o.date || o.createdAt;
      const ym = getYearMonthKey(dateStr);
      if (!ym) return;

      const orderTotal =
        o.totalPrice ??
        o.total ??
        Number(o.quantity || 1) * Number(o.productPrice ?? o.unitPrice ?? 0);

      const existing = map.get(ym) || { income: 0, count: 0 };
      existing.income += Number(orderTotal || 0);
      existing.count += 1;
      map.set(ym, existing);
    });

    // Build months list based on timeRange
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    let monthsToInclude: string[] = [];

    if (timeRange === '6M' || timeRange === '12M') {
      const count = timeRange === '6M' ? 6 : 12;
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        monthsToInclude.push(`${y}-${m}`);
      }
    } else {
      // 'all': get all keys from map, plus at least last 6 months
      const allKeys = new Set(map.keys());
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        allKeys.add(`${y}-${m}`);
      }
      monthsToInclude = Array.from(allKeys).sort();
    }

    return monthsToInclude.map((ym): MonthlyDataPoint => {
      const data = map.get(ym) || { income: 0, count: 0 };
      const avg = data.count > 0 ? Math.round(data.income / data.count) : 0;
      return {
        monthKey: ym,
        label: formatYearMonthBangla(ym, true),
        fullLabel: formatYearMonthBangla(ym, false),
        deliveredIncome: Math.round(data.income),
        deliveredOrders: data.count,
        avgOrderValue: avg,
      };
    });
  }, [deliveredOrders, timeRange]);

  // Key KPI stats
  const totalDeliveredRevenue = useMemo(() => {
    return deliveredOrders.reduce((sum, o) => {
      const total =
        o.totalPrice ??
        o.total ??
        Number(o.quantity || 1) * Number(o.productPrice ?? o.unitPrice ?? 0);
      return sum + Number(total || 0);
    }, 0);
  }, [deliveredOrders]);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const currentMonthData = useMemo(() => {
    return (
      monthlyData.find((d) => d.monthKey === currentMonthKey) || {
        deliveredIncome: 0,
        deliveredOrders: 0,
        avgOrderValue: 0,
      }
    );
  }, [monthlyData, currentMonthKey]);

  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    let max = monthlyData[0];
    monthlyData.forEach((d) => {
      if (d.deliveredIncome > max.deliveredIncome) {
        max = d;
      }
    });
    return max.deliveredIncome > 0 ? max : null;
  }, [monthlyData]);

  const averageOrderValueAll = useMemo(() => {
    if (deliveredOrders.length === 0) return 0;
    return Math.round(totalDeliveredRevenue / deliveredOrders.length);
  }, [deliveredOrders, totalDeliveredRevenue]);

  // Export monthly report to Excel
  const handleExportMonthlyReport = () => {
    const rows = monthlyData.map((d, idx) => ({
      ক্রমিক: idx + 1,
      মাস: d.fullLabel,
      মাস_কোড: d.monthKey,
      ডেলিভার্ড_অর্ডার_সংখ্যা: d.deliveredOrders,
      মোট_ডেলিভার্ড_আয়_টাকা: d.deliveredIncome,
      গড়_অর্ডার_মূল্য_টাকা: d.avgOrderValue,
    }));

    exportToExcel(
      rows,
      `FeniMart_Delivered_Monthly_Sales_${new Date().toISOString().split('T')[0]}`
    );
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; dataKey: string; payload: MonthlyDataPoint }>;
  }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs min-w-[210px] space-y-2">
        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {data.fullLabel}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">#{data.monthKey}</span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ডেলিভার্ড সেলস আয়:
            </span>
            <span className="font-black text-white text-sm">
              ৳ {data.deliveredIncome.toLocaleString('en-US')}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              ডেলিভার্ড অর্ডার:
            </span>
            <span className="font-bold text-amber-300">
              {toBanglaDigits(data.deliveredOrders)} টি
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">গড় অর্ডার সাইজ:</span>
            <span className="font-semibold text-slate-200">
              ৳ {data.avgOrderValue.toLocaleString('en-US')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
      {/* 1. Header with Title & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-[#0A4A29] rounded-2xl shadow-xs border border-emerald-100">
              <TrendingUp className="w-5 h-5 text-[#0A4A29]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] tracking-tight">
                মাসিক সেলস রিপোর্ট ও আয়ের ট্রেন্ড
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                সম্পন্ন (Delivered) অর্ডারের তারিখ অনুযায়ী মাসিক আয়ের ভিজ্যুয়ালাইজেশন
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Chart Type, Time Range, Export */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart View Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setChartType('area')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-[#0A4A29] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="স্মুথ এরিয়া কার্ভ"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>এরিয়া</span>
            </button>
            <button
              onClick={() => setChartType('composed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'composed'
                  ? 'bg-white text-[#0A4A29] shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="বার ও অর্ডারের সমন্বয়"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>বার + লাইন</span>
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setTimeRange('6M')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '6M'
                  ? 'bg-[#0A4A29] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ৬ মাস
            </button>
            <button
              onClick={() => setTimeRange('12M')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === '12M'
                  ? 'bg-[#0A4A29] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ১২ মাস
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-[#0A4A29] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সর্বমোট
            </button>
          </div>

          {/* Download Excel Button */}
          <button
            onClick={handleExportMonthlyReport}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300 cursor-pointer min-h-[36px]"
            title="মাসিক রিপোর্ট এক্সেলে নামান"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">রিপোর্ট এক্সেল</span>
          </button>
        </div>
      </div>

      {/* 2. Key Delivered Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Delivered Revenue */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-800">মোট ডেলিভার্ড সেলস</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[#0A4A29]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-black text-[#0A4A29]">
              ৳ {totalDeliveredRevenue.toLocaleString('en-US')}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-1 font-medium">
              <span>{toBanglaDigits(deliveredOrders.length)} টি সফল অর্ডার</span>
            </div>
          </div>
        </div>

        {/* Current Month Delivered */}
        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-blue-800">চলতি মাসের সেলস</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-black text-blue-900">
              ৳ {currentMonthData.deliveredIncome.toLocaleString('en-US')}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-blue-700 mt-1 font-medium">
              <span>চলতি মাসে {toBanglaDigits(currentMonthData.deliveredOrders)} টি ডেলিভারি</span>
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-amber-900">গড় অর্ডার মূল্য (AOV)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-xl sm:text-2xl font-black text-amber-900">
              ৳ {averageOrderValueAll.toLocaleString('en-US')}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-1 font-medium">
              <span>প্রতি অর্ডারের গড় আয়</span>
            </div>
          </div>
        </div>

        {/* Peak Sales Month */}
        <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-purple-900">সর্বোচ্চ বিক্রির মাস</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-purple-950 truncate">
              {peakMonth ? peakMonth.fullLabel : '—'}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-purple-700 mt-1 font-medium">
              {peakMonth ? (
                <span>৳ {peakMonth.deliveredIncome.toLocaleString('en-US')} ({toBanglaDigits(peakMonth.deliveredOrders)}টি)</span>
              ) : (
                <span>কোনো রেকর্ড নেই</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Visualization Area */}
      <div className="pt-2">
        {deliveredOrders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-[#0A4A29] rounded-2xl flex items-center justify-center mx-auto">
              <PackageCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-base">এখনও কোনো ডেলিভার্ড অর্ডার নেই</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              অর্ডার ইনবক্স বা সেলস ট্যাব থেকে অর্ডার ডেলিভারি সম্পন্ন (Delivered) চিহ্নিত করা হলে, তাদের ডেলিভারি তারিখ অনুযায়ী মাসিক আয়ের গ্রাফ এখানে তৈরি হবে।
            </p>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('inbox')}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0A4A29] text-white rounded-xl text-xs font-bold hover:bg-[#1E8A52] transition shadow-xs cursor-pointer"
              >
                <span>অর্ডার ইনবক্সে যান</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-72 sm:h-84 select-none">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="deliveredIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A4A29" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1E8A52" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="deliveredIncome"
                    name="ডেলিভার্ড সেলস আয়"
                    stroke="#0A4A29"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#deliveredIncomeGrad)"
                    activeDot={{ r: 6, fill: '#FFB300', stroke: '#0A4A29', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    stroke="#64748B"
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    yAxisId="incomeAxis"
                    stroke="#64748B"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <YAxis
                    yAxisId="orderAxis"
                    orientation="right"
                    stroke="#D97706"
                    tick={{ fontSize: 11, fill: '#D97706' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}টি`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar
                    yAxisId="incomeAxis"
                    dataKey="deliveredIncome"
                    name="ডেলিভার্ড সেলস আয় (৳)"
                    fill="#1E8A52"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                  <Line
                    yAxisId="orderAxis"
                    type="monotone"
                    dataKey="deliveredOrders"
                    name="অর্ডার সংখ্যা (টি)"
                    stroke="#FFB300"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#D97706' }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 4. Collapsible Detailed Monthly Table */}
      <div className="border-t border-slate-100 pt-3">
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-[#0A4A29] py-2 transition cursor-pointer select-none"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1E8A52]" />
            <span>মাসিক বিস্তারিত টেবিল ডেটা {showTable ? 'লুকান' : 'দেখুন'}</span>
          </span>
          {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTable && (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#0A4A29]/5 text-slate-800 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">মাস</th>
                  <th className="px-4 py-3 text-center">সম্পন্ন ডেলিভারি</th>
                  <th className="px-4 py-3 text-right">মোট ডেলিভার্ড আয়</th>
                  <th className="px-4 py-3 text-right">গড় অর্ডার মূল্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthlyData.map((d) => (
                  <tr key={d.monthKey} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{d.fullLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">
                      {toBanglaDigits(d.deliveredOrders)} টি
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#0A4A29]">
                      ৳ {d.deliveredIncome.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      ৳ {d.avgOrderValue.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
