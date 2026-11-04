import React, { useState } from 'react';
import {
  Flame,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { DailyDeal, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface DailyDealsTabProps {
  deals: DailyDeal[];
  products: Product[];
  onAddDeal: (deal: Omit<DailyDeal, 'id'>) => Promise<void>;
  onUpdateDeal: (id: string, deal: Partial<DailyDeal>) => Promise<void>;
  onDeleteDeal: (id: string) => Promise<void>;
}

export const DailyDealsTab: React.FC<DailyDealsTabProps> = ({
  deals,
  products,
  onAddDeal,
  onUpdateDeal,
  onDeleteDeal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DailyDeal | null>(null);
  const [dealToDelete, setDealToDelete] = useState<DailyDeal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number | ''>(10); // percentage or amount
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('23:59');
  const [isActive, setIsActive] = useState(true);

  const numDiscount = discount === '' ? 0 : Number(discount);
  const calculatedDealPrice =
    discountType === 'percent'
      ? Math.max(0, Math.round(originalPrice * (1 - numDiscount / 100)))
      : Math.max(0, originalPrice - numDiscount);

  const handleProductSelect = (pId: string) => {
    setProductId(pId);
    const prod = products.find((p) => p.id === pId || p.name === pId);
    if (prod) {
      setProductName(prod.name);
      setOriginalPrice(prod.price);
    }
  };

  const openAddModal = () => {
    setEditingDeal(null);
    const firstProd = products[0];
    if (firstProd) {
      setProductId(firstProd.id || firstProd.name);
      setProductName(firstProd.name);
      setOriginalPrice(firstProd.price);
    } else {
      setProductId('');
      setProductName('');
      setOriginalPrice(0);
    }
    setDiscount(15);
    setDiscountType('percent');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('23:59');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (d: DailyDeal) => {
    setEditingDeal(d);
    setProductId(d.productId);
    setProductName(d.productName);
    setOriginalPrice(d.originalPrice);
    setDiscount(d.discount);
    setDiscountType('percent');
    setDate(d.date);
    setStartTime(d.startTime);
    setEndTime(d.endTime);
    setIsActive(d.isActive !== false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !originalPrice || numDiscount <= 0) {
      alert('অনুগ্রহ করে সঠিক পণ্য ও ছাড়ের পরিমাণ দিন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const prod = products.find((p) => p.id === productId || p.name === productName);

      const payload: Omit<DailyDeal, 'id'> = {
        productId,
        productName,
        productImage: typeof prod?.image === 'string' ? prod.image : '',
        originalPrice,
        discount: numDiscount,
        dealPrice: calculatedDealPrice,
        startTime,
        endTime,
        date,
        isActive,
        createdAt: editingDeal?.createdAt || new Date().toISOString(),
      };

      if (editingDeal?.id) {
        await onUpdateDeal(editingDeal.id, payload);
        setSuccessMessage('আজকের ডিল আপডেট হয়েছে');
      } else {
        await onAddDeal(payload);
        setSuccessMessage('আজকের নতুন ডিল চালু হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (deal: DailyDeal) => {
    if (!deal.id) return;
    try {
      await onUpdateDeal(deal.id, { isActive: !deal.isActive });
      setSuccessMessage(
        deal.isActive ? 'ডিল নিষ্ক্রিয় করা হয়েছে' : 'ডিল সক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!dealToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteDeal(dealToDelete.id);
      setSuccessMessage('ডিল মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setDealToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = deals.map((d, idx) => ({
      ক্রমিক: idx + 1,
      পণ্য: d.productName,
      তারিখ: d.date,
      শুরুর_সময়: d.startTime,
      শেষের_সময়: d.endTime,
      আসল_মূল্য: d.originalPrice,
      ছাড়: `${d.discount}%`,
      ডিল_মূল্য: d.dealPrice,
      স্ট্যাটাস: d.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') exportToExcel(data, `InfiMart_DailyDeals_${dateStr}`, 'DailyDeals');
    else exportToCSV(data, `InfiMart_DailyDeals_${dateStr}`);
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
            <Flame className="w-6 h-6 text-orange-500 animate-bounce" />
            <span>আজকের ডিল (Daily Deals & Flash Sales)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            নির্দিষ্ট সময়সীমার মধ্যে বিশেষ ছাড়ে পণ্য অফার ও কাউন্টডাউন টাইমার
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
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer min-h-[48px]"
          >
            <Plus className="w-4 h-4 text-[#FFB300]" />
            <span>নতুন ডিল সেট করুন</span>
          </button>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {deals.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            <Flame className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">বর্তমানে কোনো ডেইলি ডিল সক্রিয় নেই।</p>
            <p className="text-xs text-slate-400">আজকের জন্য বিশেষ ডিল তৈরি করতে উপরের বাটনে ক্লিক করুন।</p>
          </div>
        ) : (
          deals.map((deal) => (
            <div
              key={deal.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      <Flame className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {deal.productName}
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">{deal.date}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(deal)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition min-h-[36px] ${
                      deal.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {deal.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>
                    সময়সীমা: <strong>{deal.startTime}</strong> হতে <strong>{deal.endTime}</strong>
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                  <div>
                    <span className="text-xs text-slate-400 line-through block">
                      নিয়মিত: ৳ {deal.originalPrice}
                    </span>
                    <span className="text-2xl font-black text-orange-600">
                      ৳ {deal.dealPrice.toLocaleString('en-US')}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-orange-600 text-white shadow-xs">
                    {deal.discount}% ছাড়!
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(deal)}
                  className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#0A4A29] hover:bg-slate-100 rounded-xl transition flex items-center gap-1 min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা</span>
                </button>
                <button
                  onClick={() => setDealToDelete(deal)}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 min-h-[40px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছে ফেলুন</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Deal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <span>{editingDeal ? 'ডিল সম্পাদনা' : 'আজকের ডিল নির্ধারণ'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form id="dealForm" onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 pb-28">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  পণ্য নির্বাচন *
                </label>
                <select
                  value={productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                >
                  <option value="">পণ্য বেছে নিন</option>
                  {products.map((p) => (
                    <option key={p.id || p.name} value={p.id || p.name}>
                      {p.name} (নিয়মিত মূল্য: ৳ {p.price})
                    </option>
                  ))}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    শুরুর সময় *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    শেষের সময় *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    ছাড়ের শতাংশ (%) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    placeholder="15"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                <div>
                  <span className="block text-sm font-bold text-slate-700 mb-1.5">
                    হিসাবকৃত ডিল মূল্য (টাকা)
                  </span>
                  <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-xl font-black text-orange-600 min-h-[48px] flex items-center">
                    ৳ {calculatedDealPrice.toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="dealActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-[#1E8A52] focus:ring-0"
                />
                <label htmlFor="dealActiveToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                  ডিলটি কাস্টমার স্টোরে সক্রিয় রাখুন
                </label>
              </div>
            </form>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-3 z-20 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px] cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                form="dealForm"
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingDeal ? 'আপডেট করুন' : 'আজকের ডিল সক্রিয় করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!dealToDelete}
        title="ডিল মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${dealToDelete?.productName}" এর ডিলটি মুছে ফেলা হবে।`}
        warningNote="ডিলটি মুছে ফেললে কাস্টমার স্টোরের কাউন্টডাউন এবং বিশেষ অফার বন্ধ হয়ে যাবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDealToDelete(null)}
      />
    </div>
  );
};
