import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  Smile,
  Hash,
  ToggleLeft,
  ToggleRight,
  Clock,
  Sparkles,
  Calendar,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { Category, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';
import { STANDARD_CATEGORY_ORDER } from '../../data/seedData';

interface CategoryTabProps {
  categories: Category[];
  products?: Product[];
  onAddCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  onUpdateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export const CategoryTab: React.FC<CategoryTabProps> = ({
  categories,
  products = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFixingOrders, setIsFixingOrders] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('🛒');
  const [order, setOrder] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [comingSoonMessage, setComingSoonMessage] = useState<string>('');
  const [estimatedDate, setEstimatedDate] = useState<string>('');

  const emojiSuggestions = ['🛒', '🌶️', '🐟', '🫒', '🥚', '🥬', '🍎', '🌿', '🧴', '🍯', '🍨', '🔌', '🏠', '👶', '🐾', '🧸', '📚', '⚽', '🪴', '🍿', '🌦️', '🛋️', '👟', '👗', '👔', '🍚'];

  // Calculate next available order number (auto-increment)
  const nextAvailableOrder = useMemo(() => {
    if (categories.length === 0) return 1;
    const maxOrd = categories.reduce((max, c) => Math.max(max, Number(c.order) || 0), 0);
    return maxOrd + 1;
  }, [categories]);

  // Check for duplicate order numbers across all categories
  const duplicateOrderGroups = useMemo(() => {
    const map: Record<number, Category[]> = {};
    categories.forEach((c) => {
      const ord = Number(c.order);
      if (ord) {
        if (!map[ord]) map[ord] = [];
        map[ord].push(c);
      }
    });
    return Object.entries(map)
      .filter(([_, cats]) => cats.length > 1)
      .map(([ord, cats]) => ({
        order: Number(ord),
        categories: cats,
      }));
  }, [categories]);

  // Check if current order in modal conflicts with another category
  const conflictingCategory = useMemo(() => {
    const ordNum = Number(order);
    if (!ordNum || ordNum <= 0) return null;
    return categories.find(
      (c) => Number(c.order) === ordNum && (!editingCategory || c.id !== editingCategory.id)
    );
  }, [order, categories, editingCategory]);

  // Filter & sort categories strictly by order ascending
  const sortedCategories = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = categories;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.nameEn && c.nameEn.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      const ordA = Number(a.order ?? 999);
      const ordB = Number(b.order ?? 999);
      if (ordA !== ordB) return ordA - ordB;
      return a.name.localeCompare(b.name, 'bn');
    });
  }, [categories, searchTerm]);

  // Auto-increment order number when opening add modal
  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setNameEn('');
    setIcon('🛒');
    setOrder(String(nextAvailableOrder));
    setIsActive(true);
    setComingSoonMessage('শীঘ্রই পণ্য যোগ করা হবে');
    setEstimatedDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setNameEn(c.nameEn || '');
    setIcon(c.icon || '🛒');
    setOrder(c.order !== undefined ? String(c.order) : '1');
    setIsActive(c.isActive !== false);
    setComingSoonMessage(c.comingSoonMessage || '');
    setEstimatedDate(c.estimatedDate || '');
    setIsModalOpen(true);
  };

  // Re-sequence and auto-fix all category orders to the requested standard sequence
  const handleAutoFixAllOrders = async () => {
    try {
      setIsFixingOrders(true);
      let updatedCount = 0;
      const usedOrders = new Set<number>();

      // 1. Assign official requested standard orders to standard categories
      for (const cat of categories) {
        if (!cat.id) continue;
        const targetOrder = STANDARD_CATEGORY_ORDER[cat.name];
        if (targetOrder) {
          usedOrders.add(targetOrder);
          if (cat.order !== targetOrder) {
            await onUpdateCategory(cat.id, { order: targetOrder });
            updatedCount++;
          }
        }
      }

      // 2. Assign unique sequential orders to any custom categories
      let nextOrd = 1;
      for (const cat of categories) {
        if (!cat.id) continue;
        if (!STANDARD_CATEGORY_ORDER[cat.name]) {
          while (usedOrders.has(nextOrd)) {
            nextOrd++;
          }
          usedOrders.add(nextOrd);
          if (cat.order !== nextOrd) {
            await onUpdateCategory(cat.id, { order: nextOrd });
            updatedCount++;
          }
        }
      }

      setSuccessMessage(`সফলভাবে ${updatedCount} টি ক্যাটাগরির ক্রমিক নম্বর অনন্য ও প্রমিত ক্রমানুসারে সাজানো হয়েছে!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error auto-fixing category orders:', err);
      setErrorMessage('ক্যাটাগরি ক্রমিক নম্বর সাজাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsFixingOrders(false);
    }
  };

  const handleToggleStatus = async (c: Category) => {
    if (!c.id) return;
    const newStatus = c.isActive === false ? true : false;
    try {
      setTogglingId(c.id);
      await onUpdateCategory(c.id, { isActive: newStatus });
      setSuccessMessage(
        newStatus
          ? 'ক্যাটাগরি সক্রিয় করা হয়েছে'
          : 'ক্যাটাগরি নিষ্ক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling category status:', err);
      setErrorMessage('স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('অনুগ্রহ করে ক্যাটাগরির বাংলা নাম লিখুন।');
      return;
    }

    const numericOrder = Number(order);
    if (!numericOrder || numericOrder < 1) {
      alert('অনুগ্রহ করে ১ বা তার বেশি একটি ধনাত্মক ক্রমিক নম্বর প্রদান করুন।');
      return;
    }

    if (conflictingCategory) {
      alert(
        `সতর্কতা: ক্রমিক নম্বর ${order} ইতিমধ্যে "${conflictingCategory.name}" ক্যাটাগরিতে ব্যবহৃত হয়েছে। প্রতিটি ক্যাটাগরির ক্রমিক নম্বর অবশ্যই অনন্য (Unique) হতে হবে। অনুগ্রহ করে ${nextAvailableOrder} বা অন্য কোনো খালি নম্বর ব্যবহার করুন।`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Omit<Category, 'id'> = {
        name: name.trim(),
        nameEn: nameEn.trim(),
        icon: icon.trim() || '🛒',
        order: numericOrder,
        isActive: isActive,
        comingSoonMessage: comingSoonMessage.trim() || '',
        estimatedDate: estimatedDate.trim() || '',
        createdAt: editingCategory?.createdAt || new Date().toISOString(),
      };

      if (editingCategory?.id) {
        await onUpdateCategory(editingCategory.id, payload);
        setSuccessMessage('ক্যাটাগরি সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddCategory(payload);
        setSuccessMessage('নতুন ক্যাটাগরি সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving category:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (c: Category) => {
    setCategoryToDelete(c);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteCategory(categoryToDelete.id);
      setSuccessMessage('ক্যাটাগরি সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Count products linked to this category
  const linkedProductsCount = useMemo(() => {
    if (!categoryToDelete) return 0;
    return products.filter((p) => p.category === categoryToDelete.name).length;
  }, [categoryToDelete, products]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = sortedCategories.map((c, idx) => ({
      ক্রমিক: idx + 1,
      আইকন: c.icon || '',
      বাংলা_নাম: c.name,
      ইংরেজি_নাম: c.nameEn || '',
      সিরিয়াল_অর্ডার: c.order || idx + 1,
      স্ট্যাটাস: c.isActive !== false ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)',
      কমিং_সুন_মেসেজ: c.comingSoonMessage || '',
      আনুমানিক_তারিখ: c.estimatedDate || '',
      পণ্য_সংখ্যা: products.filter((p) => p.category === c.name).length,
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Categories_${dateStr}`, 'Categories');
    } else {
      exportToCSV(data, `InfiMart_Categories_${dateStr}`);
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

      {/* Duplicate Order Warning Banner */}
      {duplicateOrderGroups.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-2xl shadow-sm space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-amber-950 text-sm sm:text-base flex items-center gap-2">
                <span>ক্যাটাগরি ক্রমিক নম্বরে অমিল পাওয়া গেছে! (Duplicate Category Orders)</span>
                <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {duplicateOrderGroups.length} টি ডুপ্লিকেট গ্রুপ
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                নিচের ক্যাটাগরিগুলোতে একই ক্রমিক নম্বর রয়েছে, যার ফলে ক্যাটাগরিগুলো ভুল ক্রমে প্রদর্শিত হতে পারে:
              </p>
              <div className="mt-2 space-y-1">
                {duplicateOrderGroups.map((grp) => (
                  <div key={grp.order} className="text-xs text-amber-900 bg-amber-100/70 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2">
                    <span className="font-bold bg-amber-300 px-1.5 py-0.5 rounded text-[11px]">
                      ক্রমিক #{grp.order}
                    </span>
                    <span>{grp.categories.map((c) => c.name).join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={isFixingOrders}
              onClick={handleAutoFixAllOrders}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#FFE0A8]" />
              <span>{isFixingOrders ? 'ক্রমিক ঠিক করা হচ্ছে...' : '🛠️ ১-ক্লিকে প্রমিত ক্রম অনুযায়ী সব ঠিক করুন'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <FolderTree className="w-6 h-6 text-[#1E8A52]" />
            <span>ক্যাটাগরি ব্যবস্থাপনা (Category Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট ক্যাটাগরি: <span className="font-bold text-slate-800">{categories.length}</span> টি | সক্রিয়: <span className="font-bold text-emerald-700">{categories.filter(c => c.isActive !== false).length}</span> টি | নিষ্ক্রিয় (Coming Soon): <span className="font-bold text-rose-700">{categories.filter(c => c.isActive === false).length}</span> টি
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isFixingOrders}
            onClick={handleAutoFixAllOrders}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition min-h-[44px] cursor-pointer disabled:opacity-50"
            title="সব ক্যাটাগরির ক্রমিক নম্বর প্রমিত ক্রমানুসারে (১-২৫) সাজান"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isFixingOrders ? 'animate-spin' : ''}`} />
            <span>{isFixingOrders ? 'ক্রমিক ঠিক হচ্ছে...' : 'ক্রমিক ঠিক করুন'}</span>
          </button>
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
            <span>নতুন ক্যাটাগরি যোগ</span>
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
            placeholder="ক্যাটাগরির বাংলা বা ইংরেজি নাম সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>
      </div>

      {/* Category List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-16">ক্রম</th>
                <th className="px-4 py-3.5">আইকন ও নাম</th>
                <th className="px-4 py-3.5">ইংরেজি নাম</th>
                <th className="px-4 py-3.5 text-center">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-center">টগল (Active)</th>
                <th className="px-4 py-3.5 text-center">সংযুক্ত পণ্য</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FolderTree className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">কোনো ক্যাটাগরি নেই। প্রথমে ক্যাটাগরি যোগ করুন।</p>
                      <p className="text-xs text-slate-400">উপরের "নতুন ক্যাটাগরি যোগ" বাটনে ক্লিক করে ক্যাটাগরি তৈরি করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCategories.map((c, idx) => {
                  const pCount = products.filter((p) => p.category === c.name).length;
                  const isCatActive = c.isActive !== false;
                  return (
                    <tr key={c.id || c.name} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-center font-bold text-slate-500">
                        {c.order || idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                            {c.icon || '🛒'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-base">{c.name}</span>
                              {!isCatActive && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            {c.nameEn && (
                              <div className="text-xs text-slate-400">{c.nameEn}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                        {c.nameEn || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isCatActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            🟢 সক্রিয়
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            🔴 নিষ্ক্রিয়
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={togglingId === c.id}
                          onClick={() => handleToggleStatus(c)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isCatActive ? 'bg-emerald-600' : 'bg-slate-300'
                          } ${togglingId === c.id ? 'opacity-50' : ''}`}
                          title={isCatActive ? 'নিষ্ক্রিয় করতে ক্লিক করুন' : 'সক্রিয় করতে ক্লিক করুন'}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isCatActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {pCount} টি পণ্য
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(c)}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {sortedCategories.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              কোনো ক্যাটাগরি নেই। প্রথমে ক্যাটাগরি যোগ করুন।
            </div>
          ) : (
            sortedCategories.map((c, idx) => {
              const pCount = products.filter((p) => p.category === c.name).length;
              const isCatActive = c.isActive !== false;
              return (
                <div key={c.id || c.name} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                        {c.icon || '🛒'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-lg leading-tight">{c.name}</h3>
                          {!isCatActive && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                              Coming Soon
                            </span>
                          )}
                        </div>
                        {c.nameEn && (
                          <p className="text-xs text-slate-500 font-medium">{c.nameEn}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="সম্পাদনা"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(c)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Toggle Row */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-semibold">স্ট্যাটাস:</span>
                      {isCatActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🟢 সক্রিয়
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          🔴 নিষ্ক্রিয়
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">টগল:</span>
                      <button
                        type="button"
                        disabled={togglingId === c.id}
                        onClick={() => handleToggleStatus(c)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isCatActive ? 'bg-emerald-600' : 'bg-slate-300'
                        } ${togglingId === c.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isCatActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1 text-slate-500">
                    <span>ক্রমিক ক্রম: <strong className="text-slate-800">#{c.order || idx + 1}</strong></span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {pCount} টি পণ্য
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingCategory ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 pb-16">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ক্যাটাগরির বাংলা নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: চাল ও ডাল, মসলা ও মশলা"
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
                  placeholder="e.g. Rice & Lentils, Spices"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Status Toggle in Form */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-slate-800 block">
                      ক্যাটাগরি সক্রিয় করুন (Active Status)
                    </label>
                    <p className="text-xs text-slate-500">
                      নিষ্ক্রিয় রাখলে কাস্টমার স্টোরে "Coming Soon" পেজ প্রদর্শিত হবে।
                    </p>
                  </div>
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
                </div>
                <div className="text-xs font-bold pt-1">
                  {isActive ? (
                    <span className="text-emerald-700">🟢 ক্যাটাগরিটি সক্রিয় রয়েছে (পণ্য প্রদর্শন হবে)</span>
                  ) : (
                    <span className="text-rose-700">🔴 ক্যাটাগরিটি নিষ্ক্রিয় রয়েছে (Coming Soon পেজ আসবে)</span>
                  )}
                </div>
              </div>

              {/* Coming Soon Fields (Only relevant or editable for inactive/customization) */}
              <div className={`space-y-4 p-4 rounded-2xl border transition-all ${
                !isActive ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/60 border-slate-200'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>"Coming Soon" পেজের বার্তা ও আনুমানিক তারিখ (ঐচ্ছিক)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    "Coming Soon" মেসেজ (বাংলা)
                  </label>
                  <input
                    type="text"
                    value={comingSoonMessage}
                    onChange={(e) => setComingSoonMessage(e.target.value)}
                    placeholder="যেমন: শীঘ্রই প্রিমিয়াম ফ্রেশ পণ্য যোগ করা হবে"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    ডিফল্ট মেসেজ: "শীঘ্রই পণ্য যোগ করা হবে"
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    আনুমানিক তারিখ (Estimated Date)
                  </label>
                  <input
                    type="text"
                    value={estimatedDate}
                    onChange={(e) => setEstimatedDate(e.target.value)}
                    placeholder="যেমন: ১ নভেম্বর ২০২৬ বা আগামী সপ্তাহে"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  আইকন বা ইমোজি (Emoji Icon)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="যেমন: 🍚, 🌶️, 🐟"
                    className="w-24 px-4 py-3 border border-slate-300 rounded-xl text-xl text-center focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {emojiSuggestions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`text-xl p-2 rounded-xl border transition ${
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

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>প্রদর্শনের ক্রম (Order Sequence) *</span>
                  <span className="text-xs text-slate-500 font-normal">
                    পরবর্তী প্রস্তাবিত ক্রম: <strong className="text-emerald-700">#{nextAvailableOrder}</strong>
                  </span>
                </label>
                <div className="relative max-w-xs">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    placeholder="1, 2, 3..."
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 min-h-[48px] ${
                      conflictingCategory
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-[#1E8A52]'
                    }`}
                  />
                </div>

                {conflictingCategory ? (
                  <div className="mt-2 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">সতর্কতা: ক্রমিক নম্বর #{order} ইতিমধ্যে ব্যবহৃত হয়েছে!</p>
                      <p className="mt-0.5">
                        এই নম্বরটি <strong>"{conflictingCategory.name}"</strong> ক্যাটাগরিতে বরাদ্দ রয়েছে। প্রতিটি ক্যাটাগরির ক্রমিক নম্বর ইউনিক হওয়া আবশ্যক। পরবর্তী ফাঁকা ক্রমিক নম্বর <strong>#{nextAvailableOrder}</strong> ব্যবহার করুন।
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 mt-1 block">
                    মেনু এবং ফিল্টারে ক্যাটাগরিটি কোন স্থানে প্রদর্শিত হবে তা নির্ধারণ করে। প্রতিটি ক্যাটাগরির ক্রমিক নম্বর ইউনিক রাখা বাধ্যতামূলক।
                  </span>
                )}
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-3 z-10 shadow-md">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px] cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md cursor-pointer min-h-[48px] disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingCategory ? 'আপডেট করুন' : 'ক্যাটাগরি সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        title="ক্যাটাগরি মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${categoryToDelete?.name}" ক্যাটাগরিটি মুছে ফেলা হবে।`}
        warningNote={
          linkedProductsCount > 0
            ? `সতর্কতা: এই ক্যাটাগরির সাথে ${linkedProductsCount}টি পণ্য যুক্ত রয়েছে। ক্যাটাগরি মুছে ফেললে ওই পণ্যগুলো ক্যাটাগরিহীন হয়ে পড়তে পারে।`
            : undefined
        }
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
};
