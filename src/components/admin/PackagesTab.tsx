import React, { useState, useRef } from 'react';
import {
  PackagePlus,
  Plus,
  Edit2,
  Trash2,
  Download,
  CheckCircle,
  AlertTriangle,
  X,
  Upload,
  Search,
  Layers,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { ComboPackage, ComboPackageProduct, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';
import { compressImage } from '../../utils/imageCompressor';

interface PackagesTabProps {
  packages: ComboPackage[];
  products: Product[];
  onAddPackage: (pkg: Omit<ComboPackage, 'id'>) => Promise<void>;
  onUpdatePackage: (id: string, pkg: Partial<ComboPackage>) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
}

export const PackagesTab: React.FC<PackagesTabProps> = ({
  packages,
  products,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ComboPackage | null>(null);
  const [packageToDelete, setPackageToDelete] = useState<ComboPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<ComboPackageProduct[]>([]);
  const [packagePrice, setPackagePrice] = useState<number | ''>('');
  const [image, setImage] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-calculated original price: sum of (quantity * unitPrice)
  const originalPrice = selectedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.unitPrice || 0),
    0
  );

  // Auto-calculated discount amount and percentage
  const numPackagePrice = packagePrice === '' ? 0 : Number(packagePrice);
  const discountAmount = Math.max(0, originalPrice - numPackagePrice);
  const discountPercentage =
    originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;

  const filteredPackages = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingPackage(null);
    setName('');
    setNameEn('');
    setDescription('');
    setSelectedItems([]);
    setPackagePrice('');
    setImage('');
    setPreviewImage('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: ComboPackage) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setNameEn(pkg.nameEn || '');
    setDescription(pkg.description || '');
    setSelectedItems(pkg.products || []);
    setPackagePrice(pkg.packagePrice);
    setImage(pkg.image || '');
    setPreviewImage(pkg.image || '');
    setIsActive(pkg.isActive !== false);
    setIsModalOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { dataUrl } = await compressImage(file, 1000, 250);
      setPreviewImage(dataUrl);
      setImage(dataUrl);
    } catch (err) {
      console.error(err);
      alert('ছবি আপলোড ব্যর্থ হয়েছে।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddProductItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId || p.name === productId);
    if (!prod) return;

    const existingIdx = selectedItems.findIndex((it) => it.productId === productId);
    if (existingIdx >= 0) {
      const copy = [...selectedItems];
      copy[existingIdx].quantity += 1;
      setSelectedItems(copy);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: prod.id || prod.name,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.price,
        },
      ]);
    }
  };

  const handleUpdateItemQuantity = (idx: number, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter((_, i) => i !== idx));
      return;
    }
    const copy = [...selectedItems];
    copy[idx].quantity = qty;
    setSelectedItems(copy);
  };

  const handleRemoveItem = (idx: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('প্যাকেজের নাম লিখুন');
      return;
    }
    if (selectedItems.length === 0) {
      alert('কমপক্ষে একটি পণ্য প্যাকেজে যোগ করুন');
      return;
    }
    if (!packagePrice || numPackagePrice <= 0) {
      alert('প্যাকেজের বিক্রয়মূল্য লিখুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Omit<ComboPackage, 'id'> = {
        name: name.trim(),
        nameEn: nameEn.trim(),
        description: description.trim(),
        products: selectedItems,
        originalPrice,
        packagePrice: numPackagePrice,
        discount: discountAmount,
        image: image.trim(),
        isActive,
        createdAt: editingPackage?.createdAt || new Date().toISOString(),
      };

      if (editingPackage?.id) {
        await onUpdatePackage(editingPackage.id, payload);
        setSuccessMessage('প্যাকেজ সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddPackage(payload);
        setSuccessMessage('নতুন কম্বো প্যাকেজ তৈরি হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving package:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (pkg: ComboPackage) => {
    if (!pkg.id) return;
    try {
      await onUpdatePackage(pkg.id, { isActive: !pkg.isActive });
      setSuccessMessage(
        pkg.isActive ? 'প্যাকেজ নিষ্ক্রিয় করা হয়েছে' : 'প্যাকেজ সক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const confirmDelete = async () => {
    if (!packageToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeletePackage(packageToDelete.id);
      setSuccessMessage('প্যাকেজ মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setPackageToDelete(null);
    } catch (err) {
      console.error(err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredPackages.map((p, idx) => ({
      ক্রমিক: idx + 1,
      প্যাকেজের_নাম: p.name,
      ইংরেজি_নাম: p.nameEn || '',
      মোট_পণ্য_সংখ্যা: p.products ? p.products.length : 0,
      আসল_মূল্য_টাকা: p.originalPrice,
      প্যাকেজ_মূল্য_টাকা: p.packagePrice,
      সঞ্চয়_টাকা: p.discount,
      স্ট্যাটাস: p.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Packages_${dateStr}`, 'Packages');
    } else {
      exportToCSV(data, `InfiMart_Packages_${dateStr}`);
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
            <PackagePlus className="w-6 h-6 text-[#1E8A52]" />
            <span>কম্বো প্যাকেজ ব্যবস্থাপনা (Combo Package Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট প্যাকেজ: <span className="font-bold text-slate-800">{packages.length}</span> টি | সক্রিয়:{' '}
            <span className="font-bold text-emerald-600">
              {packages.filter((p) => p.isActive).length}
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
            <span>নতুন প্যাকেজ তৈরি</span>
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
            placeholder="প্যাকেজের নাম সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>
      </div>

      {/* Packages Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPackages.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
            <PackagePlus className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">কোনো কম্বো প্যাকেজ পাওয়া যায়নি।</p>
            <p className="text-xs text-slate-400">নতুন কম্বো প্যাকেজ তৈরি করতে উপরের বাটনে ক্লিক করুন।</p>
          </div>
        ) : (
          filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-snug">{pkg.name}</h3>
                    {pkg.nameEn && <p className="text-xs text-slate-400">{pkg.nameEn}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleActive(pkg)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition min-h-[36px] ${
                      pkg.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {pkg.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </button>
                </div>

                {pkg.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{pkg.description}</p>
                )}

                {/* Items in Package */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    প্যাকেজে অন্তর্ভুক্ত পণ্যসমূহ ({pkg.products?.length || 0}):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {pkg.products?.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-700 flex items-center justify-between"
                      >
                        <span className="truncate max-w-[180px]">
                          • {item.productName}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.quantity} পিস
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Box */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div>
                    <span className="text-xs text-slate-400 line-through block">
                      আসল: ৳ {pkg.originalPrice}
                    </span>
                    <span className="text-xl font-black text-[#0A4A29]">
                      ৳ {pkg.packagePrice.toLocaleString('en-US')}
                    </span>
                  </div>
                  {pkg.discount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shadow-xs">
                      সঞ্চয় ৳ {pkg.discount}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(pkg)}
                  className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#0A4A29] hover:bg-slate-100 rounded-xl transition flex items-center gap-1 min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>সম্পাদনা</span>
                </button>
                <button
                  onClick={() => setPackageToDelete(pkg)}
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

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingPackage ? 'প্যাকেজ সম্পাদনা' : 'নতুন কম্বো প্যাকেজ তৈরি'}</span>
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
            <form id="pkgForm" onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 pb-28">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  প্যাকেজের বাংলা নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: রমজান স্পেশাল বাজার প্যাকেজ"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ইংরেজি নাম (English Name)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Ramadan Special Bazar Pack"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  প্যাকেজের বিবরণ / বিস্তারিত
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="যেমন: মিনিকেট চাল ৫ কেজি, সয়াবিন তেল ২ লিটার এবং মসুর ডাল ১ কেজি..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              {/* Product Selection with Quantity */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  পণ্য নির্বাচন করুন (প্যাকেজে অন্তর্ভুক্ত পণ্য) *
                </label>
                <div className="flex gap-2 mb-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddProductItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white min-h-[44px]"
                  >
                    <option value="">+ তালিকা থেকে পণ্য বেছে নিন</option>
                    {products.map((p) => (
                      <option key={p.id || p.name} value={p.id || p.name}>
                        {p.name} (৳ {p.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Products List */}
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {selectedItems.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400">
                      কোনো পণ্য যোগ করা হয়নি। উপরের ড্রপডাউন থেকে পণ্য নির্বাচন করুন।
                    </div>
                  ) : (
                    selectedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <strong className="text-slate-900 block truncate">{item.productName}</strong>
                          <span className="text-slate-500">
                            একক দর: ৳{item.unitPrice} × {item.quantity} = ৳{item.quantity * item.unitPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded font-bold"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded ml-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Price & Auto-Calculations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="block text-xs font-bold text-slate-500 mb-1">
                    স্বয়ংক্রিয় আসল মূল্য (Original Price):
                  </span>
                  <div className="text-lg font-black text-slate-700">
                    ৳ {originalPrice.toLocaleString('en-US')}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    প্যাকেজ বিক্রয়মূল্য (টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={packagePrice}
                    onChange={(e) =>
                      setPackagePrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-black text-[#0A4A29] focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[44px]"
                  />
                </div>

                <div className="col-span-full pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-800">
                    গ্রাহকের সঞ্চয় / ছাড়: ৳ {discountAmount.toLocaleString('en-US')} ({discountPercentage}%)
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  প্যাকেজের ছবি (ঐচ্ছিক)
                </label>
                <div className="flex items-center gap-3">
                  {previewImage ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-400 shrink-0">
                      <img src={previewImage} alt="Package" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                  )}

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
                    className="bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition border border-slate-300 min-h-[44px]"
                  >
                    {isUploading ? 'প্রসেসিং হচ্ছে...' : 'ছবি আপলোড করুন'}
                  </button>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="pkgActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-[#1E8A52] focus:ring-0"
                />
                <label htmlFor="pkgActiveToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                  প্যাকেজটি কাস্টমার স্টোরে সক্রিয় রাখুন
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
                form="pkgForm"
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingPackage ? 'আপডেট সম্পন্ন করুন' : 'প্যাকেজ সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!packageToDelete}
        title="প্যাকেজ মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${packageToDelete?.name}" কম্বো প্যাকেজটি মুছে ফেলা হবে।`}
        warningNote="প্যাকেজটি মুছে ফেললে কাস্টমার স্টোর থেকে তাৎক্ষণিকভাবে এটি অপসারণ করা হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPackageToDelete(null)}
      />
    </div>
  );
};
