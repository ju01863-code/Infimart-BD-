import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Hash,
  Eye,
  Tag,
} from 'lucide-react';
import { SpecialOffer } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface SpecialOffersTabProps {
  specialOffers: SpecialOffer[];
  onAddSpecialOffer: (offer: Omit<SpecialOffer, 'id'>) => Promise<void>;
  onUpdateSpecialOffer: (id: string, offer: Partial<SpecialOffer>) => Promise<void>;
  onDeleteSpecialOffer: (id: string) => Promise<void>;
}

export const SpecialOffersTab: React.FC<SpecialOffersTabProps> = ({
  specialOffers = [],
  onAddSpecialOffer,
  onUpdateSpecialOffer,
  onDeleteSpecialOffer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<SpecialOffer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🎉');
  const [backgroundColor, setBackgroundColor] = useState('#0A4A29');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [order, setOrder] = useState<string>('1');
  const [deliveryChargeEnabled, setDeliveryChargeEnabled] = useState<boolean>(false);
  const [deliveryCharge, setDeliveryCharge] = useState<string>('0');

  const emojiSuggestions = ['🚚', '🎉', '✨', '🎁', '🔥', '🛒', '⚡', '🌟', '🌾', '🏷️', '📢', '🏆'];
  const bgPresets = ['#0A4A29', '#1E8A52', '#E11D48', '#EA580C', '#D97706', '#4F46E5', '#0284C7', '#1E293B'];
  const textPresets = ['#FFFFFF', '#FFE0A8', '#FFB300', '#F1F5F9', '#0A4A29'];

  const sortedOffers = useMemo(() => {
    return [...specialOffers].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [specialOffers]);

  const filteredOffers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedOffers;
    return sortedOffers.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(q)) ||
        (o.description && o.description.toLowerCase().includes(q))
    );
  }, [sortedOffers, searchTerm]);

  const openAddModal = () => {
    setEditingOffer(null);
    setTitle('');
    setSubtitle('');
    setDescription('');
    setIcon('🎉');
    setBackgroundColor('#0A4A29');
    setTextColor('#FFFFFF');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
    setOrder(String((specialOffers.length || 0) + 1));
    setDeliveryChargeEnabled(false);
    setDeliveryCharge('0');
    setIsModalOpen(true);
  };

  const openEditModal = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setSubtitle(offer.subtitle || '');
    setDescription(offer.description || '');
    setIcon(offer.icon || '🎉');
    setBackgroundColor(offer.backgroundColor || '#0A4A29');
    setTextColor(offer.textColor || '#FFFFFF');
    setStartDate(offer.startDate || '');
    setEndDate(offer.endDate || '');
    setIsActive(offer.isActive !== false);
    setOrder(offer.order !== undefined ? String(offer.order) : '1');
    setDeliveryChargeEnabled(offer.deliveryChargeEnabled === true);
    setDeliveryCharge(offer.deliveryCharge !== undefined ? String(offer.deliveryCharge) : '0');
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (offer: SpecialOffer) => {
    if (!offer.id) return;
    const newStatus = offer.isActive === false;
    try {
      setTogglingId(offer.id);
      await onUpdateSpecialOffer(offer.id, { isActive: newStatus });
      setSuccessMessage(
        newStatus ? 'অফারটি সফলভাবে সক্রিয় করা হয়েছে' : 'অফারটি নিষ্ক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling offer status:', err);
      setErrorMessage('স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('অনুগ্রহ করে অফারের শিরোনাম (Title) লিখুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Omit<SpecialOffer, 'id'> = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        icon: icon.trim() || '🎉',
        backgroundColor: backgroundColor || '#0A4A29',
        textColor: textColor || '#FFFFFF',
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        isActive,
        order: order ? Number(order) : specialOffers.length + 1,
        deliveryChargeEnabled,
        deliveryCharge: deliveryChargeEnabled ? (Number(deliveryCharge) || 0) : 0,
        createdAt: editingOffer?.createdAt || new Date().toISOString(),
      };

      if (editingOffer?.id) {
        await onUpdateSpecialOffer(editingOffer.id, payload);
        setSuccessMessage('স্পেশাল অফার সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddSpecialOffer(payload);
        setSuccessMessage('নতুন স্পেশাল অফার সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving special offer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (offer: SpecialOffer) => {
    setOfferToDelete(offer);
  };

  const confirmDelete = async () => {
    if (!offerToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteSpecialOffer(offerToDelete.id);
      setSuccessMessage('স্পেশাল অফার সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setOfferToDelete(null);
    } catch (err) {
      console.error('Error deleting special offer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredOffers.map((o, idx) => ({
      'ক্রমিক': idx + 1,
      'আইকন': o.icon || '',
      'শিরোনাম': o.title,
      'সাব_শিরোনাম': o.subtitle || '',
      'বর্ণনা': o.description || '',
      'ব্যাকগ্রাউন্ড_কালার': o.backgroundColor || '#0A4A29',
      'টেক্সট_কালার': o.textColor || '#FFFFFF',
      'শুরুর_তারিখ': o.startDate || '—',
      'শেষ_তারিখ': o.endDate || '—',
      'স্ট্যাটাস': o.isActive !== false ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)',
      'ডিসপ্লে_অর্ডার': o.order || idx + 1,
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_SpecialOffers_${dateStr}`, 'SpecialOffers');
    } else {
      exportToCSV(data, `InfiMart_SpecialOffers_${dateStr}`);
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
            <Sparkles className="w-6 h-6 text-[#1E8A52]" />
            <span>স্পেশাল অফার কর্নার (Special Offer Corner)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            কাস্টমার স্টোরের শীর্ষ ব্যানার নিয়ন্ত্রণ করুন। কোনো হার্ডকোডেড অফার নেই — যা যোগ করবেন শুধুমাত্র তাই দেখাবে।
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
            <span>নতুন অফার যোগ করুন</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="অফারের শিরোনাম বা সাব-শিরোনাম সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>
      </div>

      {/* Special Offers List */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-lg">কোনো স্পেশাল অফার নেই</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              কাস্টমার স্টোরে কোনো অফার ব্যানার হার্ডকোড করা নেই। প্রদর্শনের জন্য উপরের "নতুন অফার যোগ করুন" বাটনে ক্লিক করুন।
            </p>
          </div>
        ) : (
          filteredOffers.map((offer) => {
            const isOfferActive = offer.isActive !== false;
            return (
              <div
                key={offer.id || offer.title}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4"
              >
                {/* Header row with status, order and actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      অর্ডার: #{offer.order || 1}
                    </span>
                    <button
                      type="button"
                      disabled={togglingId === offer.id}
                      onClick={() => handleToggleStatus(offer)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isOfferActive ? 'bg-emerald-600' : 'bg-slate-300'
                      } ${togglingId === offer.id ? 'opacity-50' : ''}`}
                      title={isOfferActive ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'সক্রিয় করতে ক্লিক করুন'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isOfferActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-bold">
                      {isOfferActive ? (
                        <span className="text-emerald-700">🟢 সক্রিয় (Active)</span>
                      ) : (
                        <span className="text-rose-700">🔴 নিষ্ক্রিয় (Inactive)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(offer)}
                      className="p-2 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-slate-200"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(offer)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-rose-200"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* EXACT LIVE PREVIEW (MATCHING CUSTOMER STORE BANNER SPECIFICATION) */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>কাস্টমার স্টোরে যেভাবে দেখাবে (Live Preview):</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: offer.backgroundColor || '#0A4A29',
                      color: offer.textColor || '#FFFFFF',
                      borderRadius: '12px',
                    }}
                    className="p-4 sm:p-5 flex items-center gap-4 shadow-sm"
                  >
                    <div className="text-3xl sm:text-4xl shrink-0 select-none">
                      {offer.icon || '🎉'}
                    </div>
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <div className="text-base sm:text-lg font-bold leading-tight">
                        {offer.title}
                      </div>
                      {offer.subtitle && (
                        <div className="text-sm font-medium opacity-90 leading-snug">
                          {offer.subtitle}
                        </div>
                      )}
                      {offer.description && (
                        <div className="text-xs opacity-80 leading-relaxed pt-0.5">
                          {offer.description}
                        </div>
                      )}
                      {/* Delivery Charge Badge */}
                      <div className="pt-2">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                            offer.deliveryChargeEnabled
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : 'bg-emerald-400 text-slate-900 shadow-xs'
                          }`}
                        >
                          {offer.deliveryChargeEnabled
                            ? `🚚 ডেলিভারি: ৳${offer.deliveryCharge || 0}`
                            : '🚚 ডেলিভারি ফ্রি'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta details: date range & colors */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <span>
                      📅 মেয়াদ:{' '}
                      <strong className="text-slate-700">
                        {offer.startDate || offer.endDate
                          ? `${offer.startDate || 'এখন'} হতে ${offer.endDate || 'চলমান'}`
                          : 'কোনো মেয়াদ নির্দিষ্ট নেই (সর্বদা সক্রিয়)'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      কালার:{' '}
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                        style={{ backgroundColor: offer.backgroundColor || '#0A4A29' }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                        style={{ backgroundColor: offer.textColor || '#FFFFFF' }}
                      />
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Special Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingOffer ? 'স্পেশাল অফার সম্পাদনা' : 'নতুন স্পেশাল অফার তৈরি'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1 pb-16">
              {/* LIVE PREVIEW BOX INSIDE MODAL */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#1E8A52]" />
                  <span>লাইভ প্রিভিউ (Banner Preview):</span>
                </span>
                <div
                  style={{
                    backgroundColor: backgroundColor || '#0A4A29',
                    color: textColor || '#FFFFFF',
                    borderRadius: '12px',
                  }}
                  className="p-4 flex items-center gap-3.5 transition-all shadow-sm"
                >
                  <div className="text-3xl shrink-0 select-none">{icon || '🎉'}</div>
                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="text-base font-bold leading-tight">
                      {title || 'অফারের মূল শিরোনাম (Title)'}
                    </div>
                    {subtitle && (
                      <div className="text-xs font-medium opacity-90 leading-snug">{subtitle}</div>
                    )}
                    {description && (
                      <div className="text-[11px] opacity-80 leading-relaxed pt-0.5">{description}</div>
                    )}
                    <div className="pt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                          deliveryChargeEnabled
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-emerald-400 text-slate-900'
                        }`}
                      >
                        {deliveryChargeEnabled
                          ? `🚚 ডেলিভারি: ৳${deliveryCharge || 0}`
                          : '🚚 ডেলিভারি ফ্রি'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  অফারের মূল শিরোনাম (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: স্পেশাল অফার / ঈদ ধামাকা / গ্র্যান্ড ডিসকাউন্ট"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  সাব-শিরোনাম (Subtitle)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="যেমন: ৫০০৳+ অর্ডারে ডেলিভারি ফ্রি / ১০% নিশ্চিত ক্যাশব্যাক"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  বিস্তারিত বর্ণনা (Description - ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: সীমিত সময়ের জন্য প্রযোজ্য। দ্রুত আপনার প্রয়োজনীয় পণ্য অর্ডার করুন।"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              {/* Icon Emoji */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  আইকন বা ইমোজি (Emoji Icon)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🎉"
                    className="w-20 px-3 py-2.5 border border-slate-300 rounded-xl text-xl text-center focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[44px]"
                  />
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {emojiSuggestions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`text-lg p-1.5 rounded-lg border transition ${
                          icon === emoji
                            ? 'bg-[#0A4A29]/10 border-[#1E8A52]'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Pickers (Background & Text) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                {/* Background Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ব্যাকগ্রাউন্ড কালার (Background)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {bgPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBackgroundColor(c)}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition shadow-xs"
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    টেক্সট কালার (Text Color)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {textPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextColor(c)}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition shadow-xs"
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    শুরুর তারিখ (Start Date - ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    শেষ তারিখ (End Date - ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Delivery Charge Settings for this Offer */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryChargeEnabled(!deliveryChargeEnabled)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        deliveryChargeEnabled ? 'bg-amber-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          deliveryChargeEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        ডেলিভারি চার্জ যোগ করুন (Delivery Charge)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {deliveryChargeEnabled
                          ? 'অন (এই অফারে নির্দিষ্ট ডেলিভারি চার্জ প্রযোজ্য হবে)'
                          : 'অফ (এই অফারে ডেলিভারি সম্পূর্ণ ফ্রি)'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      deliveryChargeEnabled
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {deliveryChargeEnabled ? `🚚 ৳${deliveryCharge || 0}` : '🚚 ডেলিভারি ফ্রি'}
                  </span>
                </div>

                {deliveryChargeEnabled && (
                  <div className="pt-3 border-t border-slate-200 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      এই অফারে ডেলিভারি চার্জ কত? (ডেলিভারি চার্জ ৳) *
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                        ৳
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                        placeholder="যেমন: ৪০"
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E8A52] bg-white min-h-[44px]"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Active Toggle & Order */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      অফার সক্রিয় করুন (Active)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isActive ? 'কাস্টমার স্টোরে প্রদর্শিত হবে' : 'লুকানো থাকবে'}
                    </span>
                  </div>
                </div>

                <div className="w-24">
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                    অর্ডার (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm text-center font-bold"
                  />
                </div>
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-3 z-10 shadow-md">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[44px] cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-md cursor-pointer min-h-[44px] disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingOffer ? 'আপডেট করুন' : 'অফার সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!offerToDelete}
        title="স্পেশাল অফার মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${offerToDelete?.title}" অফারটি মুছে ফেলা হবে।`}
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setOfferToDelete(null)}
      />
    </div>
  );
};
