import React, { useState, useRef } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Download,
  Calendar,
  Percent,
  CheckCircle,
  AlertTriangle,
  X,
  Upload,
  Loader2,
  Search,
  Eye,
  Check,
  Truck,
  Package,
} from 'lucide-react';
import { Offer, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';
import { compressImage, FALLBACK_PRODUCT_IMAGE } from '../../utils/imageCompressor';

interface OffersTabProps {
  offers: Offer[];
  products: Product[];
  onAddOffer: (offer: Omit<Offer, 'id'>) => Promise<void>;
  onUpdateOffer: (id: string, offer: Partial<Offer>) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
}

export const OffersTab: React.FC<OffersTabProps> = ({
  offers,
  products,
  onAddOffer,
  onUpdateOffer,
  onDeleteOffer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed' | 'combo' | 'freeDelivery'>('percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [applicableProducts, setApplicableProducts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [bannerImage, setBannerImage] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredOffers = offers.filter(
    (o) =>
      o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.titleEn && o.titleEn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingOffer(null);
    setTitle('');
    setTitleEn('');
    setType('percentage');
    setDiscountValue('');
    setApplicableProducts([]);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setBannerImage('');
    setPreviewImage('');
    setIsActive(true);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setTitle(offer.title);
    setTitleEn(offer.titleEn || '');
    setType(offer.type);
    setDiscountValue(offer.discountValue || '');
    setApplicableProducts(offer.applicableProducts || []);
    setStartDate(offer.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(offer.endDate || '');
    setBannerImage(offer.bannerImage || '');
    setPreviewImage(offer.bannerImage || '');
    setIsActive(offer.isActive !== false);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { dataUrl } = await compressImage(file, 1200, 300);
      setPreviewImage(dataUrl);
      setBannerImage(dataUrl);
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('ছবি প্রসেসিং ব্যর্থ হয়েছে। অন্য ছবি চেষ্টা করুন।');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    setApplicableProducts((prev) =>
      prev.includes(productId) ? prev.filter((p) => p !== productId) : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setApplicableProducts(products.map((p) => p.id || p.name));
  };

  const clearAllProducts = () => {
    setApplicableProducts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('অফারের শিরোনাম লিখুন');
      return;
    }
    if (type !== 'freeDelivery' && (!discountValue || Number(discountValue) <= 0)) {
      alert('সঠিক ছাড়ের পরিমাণ প্রদান করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Omit<Offer, 'id'> = {
        title: title.trim(),
        titleEn: titleEn.trim(),
        type,
        discountValue: type === 'freeDelivery' ? 0 : Number(discountValue),
        applicableProducts,
        startDate,
        endDate,
        bannerImage: bannerImage.trim(),
        isActive,
        createdAt: editingOffer?.createdAt || new Date().toISOString(),
      };

      if (editingOffer?.id) {
        await onUpdateOffer(editingOffer.id, payload);
        setSuccessMessage('অফার সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddOffer(payload);
        setSuccessMessage('নতুন অফার সফলভাবে তৈরি হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving offer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    if (!offer.id) return;
    try {
      await onUpdateOffer(offer.id, { isActive: !offer.isActive });
      setSuccessMessage(
        offer.isActive ? 'অফার নিষ্ক্রিয় করা হয়েছে' : 'অফার সক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to toggle offer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const confirmDelete = async () => {
    if (!offerToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteOffer(offerToDelete.id);
      setSuccessMessage('অফার সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setOfferToDelete(null);
    } catch (err) {
      console.error('Error deleting offer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredOffers.map((o, idx) => ({
      ক্রমিক: idx + 1,
      শিরোনাম: o.title,
      ইংরেজি_শিরোনাম: o.titleEn || '',
      ধরন:
        o.type === 'percentage'
          ? 'শতাংশ ছাড় (%)'
          : o.type === 'fixed'
          ? 'নির্দিষ্ট টাকা (৳)'
          : o.type === 'freeDelivery'
          ? 'ফ্রি ডেলিভারি'
          : 'কম্বো অফার',
      ছাড়ের_পরিমাণ: o.discountValue,
      প্রযোজ্য_পণ্য_সংখ্যা: o.applicableProducts ? o.applicableProducts.length : 'সব',
      শুরুর_তারিখ: o.startDate,
      শেষের_তারিখ: o.endDate,
      স্ট্যাটাস: o.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Offers_${dateStr}`, 'Offers');
    } else {
      exportToCSV(data, `InfiMart_Offers_${dateStr}`);
    }
  };

  const filteredSelectableProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

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
            <Tag className="w-6 h-6 text-[#1E8A52]" />
            <span>অফার ব্যবস্থাপনা (Offer & Discount Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট অফার: <span className="font-bold text-slate-800">{offers.length}</span> টি | সক্রিয়:{' '}
            <span className="font-bold text-emerald-600">
              {offers.filter((o) => o.isActive).length}
            </span>
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
            <span>নতুন অফার যোগ</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="অফারের নাম বা বিবরণ সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>
      </div>

      {/* Offers List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">ব্যানার / ছবি</th>
                <th className="px-4 py-3.5">অফারের শিরোনাম</th>
                <th className="px-4 py-3.5">ধরন ও পরিমাণ</th>
                <th className="px-4 py-3.5">প্রযোজ্য পণ্য</th>
                <th className="px-4 py-3.5">মেয়াদ</th>
                <th className="px-4 py-3.5 text-center">সক্রিয় অবস্থা</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Tag className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">এখনো কোনো অফার তৈরি করা হয়নি।</p>
                      <p className="text-xs text-slate-400">নতুন অফার যোগ করতে উপরের বাটনে ক্লিক করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      {offer.bannerImage ? (
                        <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img
                            src={offer.bannerImage}
                            alt={offer.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-12 rounded-xl bg-emerald-50 border border-dashed border-emerald-300 flex items-center justify-center text-[#0A4A29]">
                          <Tag className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-base">{offer.title}</div>
                      {offer.titleEn && (
                        <div className="text-xs text-slate-400 font-medium">{offer.titleEn}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                        {offer.type === 'percentage' && `${offer.discountValue}% ছাড়`}
                        {offer.type === 'fixed' && `৳ ${offer.discountValue} ছাড়`}
                        {offer.type === 'freeDelivery' && 'ফ্রি ডেলিভারি'}
                        {offer.type === 'combo' && `কম্বো (৳ ${offer.discountValue} ছাড়)`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-medium">
                      {!offer.applicableProducts || offer.applicableProducts.length === 0 ? (
                        <span className="text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                          সকল পণ্য
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {offer.applicableProducts.length} টি নির্দিষ্ট পণ্য
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      <div>শুরু: {offer.startDate}</div>
                      <div className="font-semibold text-slate-700">শেষ: {offer.endDate}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(offer)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          offer.isActive
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            offer.isActive ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        <span>{offer.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(offer)}
                          className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setOfferToDelete(offer)}
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
          {filteredOffers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              এখনো কোনো অফার তৈরি করা হয়নি।
            </div>
          ) : (
            filteredOffers.map((offer) => (
              <div key={offer.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {offer.title}
                    </h3>
                    {offer.titleEn && (
                      <p className="text-xs text-slate-400 mt-0.5">{offer.titleEn}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(offer)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOfferToDelete(offer)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                    {offer.type === 'percentage' && `${offer.discountValue}% ছাড়`}
                    {offer.type === 'fixed' && `৳ ${offer.discountValue} ছাড়`}
                    {offer.type === 'freeDelivery' && 'ফ্রি ডেলিভারি'}
                    {offer.type === 'combo' && `কম্বো (৳ ${offer.discountValue} ছাড়)`}
                  </span>

                  <button
                    onClick={() => handleToggleActive(offer)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition min-h-[40px] ${
                      offer.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {offer.isActive ? '● সক্রিয়' : '○ নিষ্ক্রিয়'}
                  </button>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span>মেয়াদ: {offer.startDate} হতে {offer.endDate}</span>
                  <span className="font-semibold text-slate-700">
                    {!offer.applicableProducts || offer.applicableProducts.length === 0
                      ? 'সকল পণ্য'
                      : `${offer.applicableProducts.length}টি পণ্য`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Offer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingOffer ? 'অফার সম্পাদনা' : 'নতুন অফার তৈরি'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="offerForm" onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 pb-28">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  অফারের বাংলা শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: মাসিক বাজার স্পেশাল ১০% ছাড়!"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ইংরেজি শিরোনাম (English Title)
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Monthly Bazar Special 10% Off"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    অফারের ধরন *
                  </label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(
                        e.target.value as 'percentage' | 'fixed' | 'combo' | 'freeDelivery'
                      )
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                  >
                    <option value="percentage">শতাংশ ছাড় (%)</option>
                    <option value="fixed">নির্দিষ্ট টাকা ছাড় (৳)</option>
                    <option value="freeDelivery">ফ্রি ডেলিভারি অফার</option>
                    <option value="combo">কম্বো প্যাকেজ অফার</option>
                  </select>
                </div>

                {type !== 'freeDelivery' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {type === 'percentage' ? 'ছাড়ের শতাংশ (%) *' : 'ছাড়ের পরিমাণ (টাকা) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={discountValue}
                      onChange={(e) =>
                        setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    শুরুর তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    শেষের তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              {/* Banner Image */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  অফার ব্যানার ছবি (ঐচ্ছিক)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {previewImage ? (
                    <div className="relative w-32 h-20 rounded-xl overflow-hidden border border-emerald-400 shrink-0 bg-white">
                      <img src={previewImage} alt="Banner" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage('');
                          setBannerImage('');
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Upload className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 w-full text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold transition border border-slate-300 min-h-[44px]"
                    >
                      <Upload className="w-4 h-4 text-[#0A4A29]" />
                      <span>{isUploading ? 'প্রসেসিং হচ্ছে...' : 'ব্যানার আপলোড করুন'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Applicable Products Multi-Select */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700">
                    প্রযোজ্য পণ্য নির্বাচন
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllProducts}
                      className="text-[#0A4A29] font-bold hover:underline"
                    >
                      সব নির্বাচন
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllProducts}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      সব বাতিল
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  কোনো পণ্য নির্বাচন না করলে অফারটি স্বয়ংক্রিয়ভাবে স্টোরের সকল পণ্যের ক্ষেত্রে প্রযোজ্য হবে।
                </p>

                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="পণ্য সার্চ করুন..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2"
                />

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
                  {filteredSelectableProducts.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">কোনো পণ্য পাওয়া যায়নি</div>
                  ) : (
                    filteredSelectableProducts.map((p) => {
                      const pId = p.id || p.name;
                      const isSelected = applicableProducts.includes(pId);
                      return (
                        <div
                          key={pId}
                          onClick={() => toggleProductSelection(pId)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-100 text-[#0A4A29]'
                              : 'bg-white hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-[#1E8A52] focus:ring-0"
                            />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-slate-400">৳{p.price}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="text-right text-xs font-bold text-[#0A4A29] mt-1">
                  নির্বাচিত: {applicableProducts.length} টি
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="offerActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-[#1E8A52] focus:ring-0"
                />
                <label htmlFor="offerActiveToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                  অফারটি অবিলম্বে গ্রাহক স্টোরে সক্রিয় রাখুন
                </label>
              </div>
            </form>

            {/* Sticky Footer */}
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
                form="offerForm"
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingOffer ? 'আপডেট সম্পন্ন করুন' : 'অফার সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!offerToDelete}
        title="অফার মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${offerToDelete?.title}" অফারটি মুছে ফেলা হবে।`}
        warningNote="অফারটি মুছে ফেললে কাস্টমার স্টোর থেকে তাৎক্ষণিকভাবে ছাড় এবং ব্যানার অপসারণ হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setOfferToDelete(null)}
      />
    </div>
  );
};
