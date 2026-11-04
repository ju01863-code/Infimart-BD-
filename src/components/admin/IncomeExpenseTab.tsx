import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  X,
  PieChart,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Transaction } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface IncomeExpenseTabProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  onUpdateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const IncomeExpenseTab: React.FC<IncomeExpenseTabProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<
    'Today' | 'This Week' | 'This Month' | 'Last Month' | 'Custom' | 'All'
  >('This Month');
  const [typeFilter, setTypeFilter] = useState<'All' | 'income' | 'expense'>('All');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('Sale');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  const incomeCategories = ['Sale', 'Delivery Charge', 'Other'];
  const expenseCategories = [
    'Purchase',
    'Transport',
    'Packaging',
    'Salary',
    'Rent',
    'Marketing',
    'Other',
  ];
  const paymentMethods = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Bank'];

  // Period filtering logic
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type match
      if (typeFilter !== 'All' && t.type !== typeFilter) return false;

      // Period match
      const tDate = new Date(t.date);
      if (filterPeriod === 'Today') {
        return t.date.startsWith(todayStr);
      } else if (filterPeriod === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      } else if (filterPeriod === 'This Month') {
        const curMonth = todayStr.substring(0, 7);
        return t.date.startsWith(curMonth);
      } else if (filterPeriod === 'Last Month') {
        const lastM = new Date();
        lastM.setMonth(now.getMonth() - 1);
        const lastMStr = lastM.toISOString().substring(0, 7);
        return t.date.startsWith(lastMStr);
      } else if (filterPeriod === 'Custom') {
        if (customStart && t.date < customStart) return false;
        if (customEnd && t.date > customEnd) return false;
        return true;
      }
      return true; // 'All'
    });
  }, [transactions, typeFilter, filterPeriod, todayStr, customStart, customEnd]);

  // Financial totals of filtered list
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const openAddModal = (defaultType: 'income' | 'expense' = 'income') => {
    setEditingItem(null);
    setDate(new Date().toISOString().split('T')[0]);
    setType(defaultType);
    setCategory(defaultType === 'income' ? 'Sale' : 'Purchase');
    setDescription('');
    setAmount('');
    setPaymentMethod('Cash');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingItem(t);
    setDate(t.date);
    setType(t.type);
    setCategory(t.category);
    setDescription(t.description);
    setAmount(t.amount);
    setPaymentMethod(t.paymentMethod);
    setNotes(t.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description.trim()) {
      alert('অনুগ্রহ করে সঠিক পরিমাণ ও বিবরণ লিখুন।');
      return;
    }

    try {
      const payload: Omit<Transaction, 'id'> = {
        date,
        type,
        category,
        description: description.trim(),
        amount: Number(amount),
        paymentMethod,
        notes: notes.trim(),
        createdAt: editingItem?.createdAt || new Date().toISOString(),
      };

      if (editingItem?.id) {
        await onUpdateTransaction(editingItem.id, payload);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddTransaction(payload);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving transaction:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const confirmDelete = async () => {
    if (!transactionToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteTransaction(transactionToDelete.id);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setTransactionToDelete(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredTransactions.map((t, idx) => ({
      ক্রমিক: idx + 1,
      তারিখ: t.date,
      ধরন: t.type === 'income' ? 'আয় (Income)' : 'ব্যয় (Expense)',
      ক্যাটাগরি: t.category,
      বিবরণ: t.description,
      পরিমাণ_টাকা: t.amount,
      পেমেন্ট_পদ্ধতি: t.paymentMethod,
      মন্তব্য: t.notes || '',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Income_Expense_${dateStr}`, 'Transactions');
    } else {
      exportToCSV(data, `InfiMart_Income_Expense_${dateStr}`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn border-2 border-emerald-400">
          <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
            <CheckCircle className="w-5 h-5 text-[#FFE0A8]" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn border-2 border-rose-400">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-white" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[#1E8A52]" />
            <span>দৈনিক আয়-ব্যয় (Income & Expense)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            InfiMart BD-এর আর্থিক আয়, খরচ ও নিট মুনাফা ব্যবস্থাপনা
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border border-slate-300 min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border border-slate-300 min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer min-h-[48px]"
          >
            <Plus className="w-4 h-4 text-[#FFB300]" />
            <span>+ আয় যুক্ত</span>
          </button>
          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer min-h-[48px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ খরচ যুক্ত</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              মোট আয় (Total Income)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-900">
            ৳ {totalIncome.toLocaleString('en-US')}
          </div>
          <p className="text-xs text-emerald-700 mt-1">নির্বাচিত ফিল্টারের ভিত্তিতে</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              মোট ব্যয় (Total Expense)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-900">
            ৳ {totalExpense.toLocaleString('en-US')}
          </div>
          <p className="text-xs text-rose-700 mt-1">নির্বাচিত ফিল্টারের ভিত্তিতে</p>
        </div>

        <div
          className={`border rounded-2xl p-5 shadow-xs ${
            netBalance >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              নিট ব্যালেন্স / লাভ (Net Balance)
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white ${
                netBalance >= 0 ? 'bg-[#0A4A29]' : 'bg-orange-600'
              }`}
            >
              ৳
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black ${
              netBalance >= 0 ? 'text-[#0A4A29]' : 'text-orange-900'
            }`}
          >
            ৳ {netBalance.toLocaleString('en-US')}
          </div>
          <p className="text-xs text-slate-600 mt-1">আয় বিয়োগ ব্যয়ের পরিমাণ</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              সময়কাল:
            </span>
            {(['Today', 'This Week', 'This Month', 'Last Month', 'Custom', 'All'] as const).map(
              (period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                    filterPeriod === period
                      ? 'bg-[#0A4A29] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {period === 'Today'
                    ? 'আজ'
                    : period === 'This Week'
                    ? 'এই সপ্তাহ'
                    : period === 'This Month'
                    ? 'এই মাস'
                    : period === 'Last Month'
                    ? 'গত মাস'
                    : period === 'Custom'
                    ? 'কাস্টম রেঞ্জ'
                    : 'সব'}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTypeFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                typeFilter === 'All'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              উভয়
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                typeFilter === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-emerald-800 hover:bg-slate-200'
              }`}
            >
              শুধু আয়
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[38px] ${
                typeFilter === 'expense'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-rose-800 hover:bg-slate-200'
              }`}
            >
              শুধু ব্যয়
            </button>
          </div>
        </div>

        {filterPeriod === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">শুরু:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">শেষ:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">তারিখ</th>
                <th className="px-4 py-3.5">ধরন</th>
                <th className="px-4 py-3.5">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">বিবরণ ও নোট</th>
                <th className="px-4 py-3.5">পরিমাণ (টাকা)</th>
                <th className="px-4 py-3.5">পেমেন্ট মেথড</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <PieChart className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">এখনো কোনো আয়-ব্যয় এন্ট্রি যোগ করা হয়নি।</p>
                      <p className="text-xs text-slate-400">নতুন আয় বা ব্যয় যুক্ত করতে উপরের বাটনে ক্লিক করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {t.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          t.type === 'income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.type === 'income' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{t.type === 'income' ? 'আয়' : 'ব্যয়'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                      {t.category}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.description}</div>
                      {t.notes && <div className="text-[11px] text-slate-400">{t.notes}</div>}
                    </td>
                    <td
                      className={`px-4 py-3 font-black text-base whitespace-nowrap ${
                        t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'} ৳ {t.amount.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTransactionToDelete(t)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              এখনো কোনো আয়-ব্যয় এন্ট্রি যোগ করা হয়নি।
            </div>
          ) : (
            filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        t.type === 'income'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.type === 'income' ? 'আয়' : 'ব্যয়'}
                    </span>
                    <span className="text-xs text-slate-400">{t.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTransactionToDelete(t)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{t.description}</h3>
                    <p className="text-xs text-slate-500">{t.category} | {t.paymentMethod}</p>
                    {t.notes && <p className="text-[11px] text-slate-400">{t.notes}</p>}
                  </div>
                  <span
                    className={`text-lg font-black shrink-0 ${
                      t.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'} ৳ {t.amount.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29]">
                {editingItem
                  ? 'লেনদেন সম্পাদনা'
                  : type === 'income'
                  ? 'নতুন আয় এন্ট্রি'
                  : 'নতুন ব্যয়/খরচ এন্ট্রি'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1 pb-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    লেনদেনের ধরন *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as 'income' | 'expense';
                      setType(newType);
                      setCategory(newType === 'income' ? 'Sale' : 'Purchase');
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                  >
                    <option value="income">আয় (Income)</option>
                    <option value="expense">ব্যয় (Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ক্যাটাগরি *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px] bg-white font-medium"
                >
                  {(type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c} value={c}>
                      {c === 'Sale'
                        ? 'বিক্রয় (Sale)'
                        : c === 'Purchase'
                        ? 'পণ্য ক্রয় (Purchase)'
                        : c === 'Transport'
                        ? 'পরিবহন খরচ'
                        : c === 'Packaging'
                        ? 'প্যাকেজিং'
                        : c === 'Salary'
                        ? 'বেতন'
                        : c === 'Rent'
                        ? 'দোকান ভাড়া'
                        : c === 'Marketing'
                        ? 'বিজ্ঞাপন/মার্কেটিং'
                        : c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  বিবরণ (Description) *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: পাইকারি চাল ক্রয় বাবদ পরিশোধ"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    টাকার পরিমাণ (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    পেমেন্ট মাধ্যম *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px] bg-white font-medium"
                  >
                    {paymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  অতিরিক্ত মন্তব্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="রশিদ বা ভাউচার নম্বর..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer"
                >
                  {editingItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!transactionToDelete}
        title="লেনদেন মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${transactionToDelete?.description}" (${transactionToDelete?.amount} ৳) এর ${
          transactionToDelete?.type === 'income' ? 'আয়ের' : 'ব্যয়ের'
        } রেকর্ডটি মুছে ফেলা হবে।`}
        warningNote="এটি মুছে ফেললে মোট আয়, মোট ব্যয় এবং নিট ব্যালেন্স রিপোর্ট থেকে পরিমাণটি সমন্বয় করা হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setTransactionToDelete(null)}
      />
    </div>
  );
};
