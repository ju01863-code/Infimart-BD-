import React, { useState, useRef, useMemo } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Upload,
  CheckCircle,
  AlertTriangle,
  Download,
  Search,
  X,
  Loader2,
  Check,
  FolderPlus,
  BellRing,
  PackageCheck,
  SlidersHorizontal,
  Layers,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { Product, Category, StoreSettings } from '../../types';
import { uploadProductImage, compressImage, FALLBACK_PRODUCT_IMAGE } from '../../utils/imageCompressor';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { testFirebaseConnection } from '../../firebase';
import { ConfirmModal } from '../ConfirmModal';

interface ProductTabProps {
  products: Product[];
  categories: Category[];
  settings?: StoreSettings;
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string, imageUrl?: string) => Promise<void>;
  onSeedInitialProducts?: () => Promise<void>;
  onAddCategory?: (category: Omit<Category, 'id'>) => Promise<void>;
  onUpdateSettings?: (newSettings: Partial<StoreSettings>) => Promise<void>;
}

export const ProductTab: React.FC<ProductTabProps> = ({
  products,
  categories,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onUpdateSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('সব');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Restock Threshold & Stock Filter State
  const [globalThreshold, setGlobalThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fenimart_stock_threshold');
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return settings?.defaultLowStockThreshold || 5;
  });

  const [stockFilter, setStockFilter] = useState<'all' | 'restock' | 'out_of_stock' | 'in_stock'>('all');

  // Quick Restock Modal State
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [quickRestockAmount, setQuickRestockAmount] = useState<number | ''>(10);
  const [isQuickRestocking, setIsQuickRestocking] = useState(false);

  // Quick category creation inside product form
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryIcon, setQuickCategoryIcon] = useState('🛒');
  const [isQuickCategorySubmitting, setIsQuickCategorySubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<{
    firestore: boolean;
    storage: boolean;
    checked: boolean;
  }>({ firestore: true, storage: true, checked: false });

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [unit, setUnit] = useState('কেজি');
  const [stock, setStock] = useState<'In Stock' | 'Low Stock' | 'Out of Stock'>('In Stock');
  const [stockQuantity, setStockQuantity] = useState<number | ''>('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileSizeText, setFileSizeText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const UNIT_OPTIONS = [
    { value: 'কেজি', label: 'কেজি (kg)' },
    { value: 'গ্রাম', label: 'গ্রাম (gram)' },
    { value: '১০০ গ্রাম', label: '১০০ গ্রাম (100 gram)' },
    { value: '২৫০ গ্রাম', label: '২৫০ গ্রাম (250 gram)' },
    { value: '৫০০ গ্রাম', label: '৫০০ গ্রাম (500 gram)' },
    { value: 'লিটার', label: 'লিটার (liter)' },
    { value: 'মিলি', label: 'মিলি (ml)' },
    { value: 'পিস', label: 'পিস (piece)' },
    { value: 'ডজন', label: 'ডজন (dozen)' },
    { value: 'প্যাকেট', label: 'প্যাকেট (packet)' },
    { value: 'বোতল', label: 'বোতল (bottle)' },
    { value: 'ভরি', label: 'ভরি (vori)' },
    { value: 'ছটাক', label: 'ছটাক (chotak)' },
    { value: 'আঁটি', label: 'আঁটি (aati)' },
    { value: 'হালি', label: 'হালি (hali)' },
    { value: 'বস্তা', label: 'বস্তা (sack)' },
  ];

  // Restock calculation helpers
  const getProductThreshold = (p: Product): number => {
    return typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0
      ? p.lowStockThreshold
      : globalThreshold;
  };

  const isOutOfStockProduct = (p: Product): boolean => {
    if (p.stock === 'Out of Stock') return true;
    if (typeof p.stockQuantity === 'number') {
      return p.stockQuantity <= 0;
    }
    return false;
  };

  const isLowStockProduct = (p: Product): boolean => {
    if (isOutOfStockProduct(p)) return true;
    if (typeof p.stockQuantity === 'number') {
      return p.stockQuantity <= getProductThreshold(p);
    }
    return p.stock === 'Low Stock';
  };

  // Restock and healthy counts
  const restockNeededCount = useMemo(() => {
    return products.filter(isLowStockProduct).length;
  }, [products, globalThreshold]);

  const outOfStockCount = useMemo(() => {
    return products.filter(isOutOfStockProduct).length;
  }, [products]);

  const inStockCount = useMemo(() => {
    return products.filter((p) => !isLowStockProduct(p)).length;
  }, [products, globalThreshold]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'সব' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStock = true;
      if (stockFilter === 'restock') {
        matchStock = isLowStockProduct(p);
      } else if (stockFilter === 'out_of_stock') {
        matchStock = isOutOfStockProduct(p);
      } else if (stockFilter === 'in_stock') {
        matchStock = !isLowStockProduct(p);
      }

      return matchCat && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchTerm, stockFilter, globalThreshold]);

  const handleUpdateGlobalThreshold = (newVal: number) => {
    const validVal = Math.max(1, Math.min(999, newVal));
    setGlobalThreshold(validVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fenimart_stock_threshold', String(validVal));
    }
    if (onUpdateSettings) {
      onUpdateSettings({ defaultLowStockThreshold: validVal }).catch(() => {});
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    const defaultCat = categories.length > 0 ? categories[0].name : '';
    setCategory(defaultCat);
    setPrice('');
    setUnit('কেজি');
    setStock('In Stock');
    setStockQuantity('');
    setLowStockThreshold('');
    setImageUrl('');
    setPreviewUrl('');
    setSelectedFile(null);
    setFileSizeText('');
    setModalError(null);
    setShowQuickAddCategory(false);
    setQuickCategoryName('');
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setPrice(prod.price);
    setUnit(prod.unit);
    setStock(prod.stock);
    setStockQuantity(prod.stockQuantity !== undefined ? prod.stockQuantity : '');
    setLowStockThreshold(prod.lowStockThreshold !== undefined ? prod.lowStockThreshold : '');

    const existingImg = typeof prod.image === 'string' ? prod.image : FALLBACK_PRODUCT_IMAGE;

    setImageUrl(existingImg);
    setPreviewUrl(existingImg);
    setSelectedFile(null);
    setFileSizeText('');
    setModalError(null);
    setShowQuickAddCategory(false);
    setQuickCategoryName('');
    setIsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setModalError(null);

      // Compress image client side (< 300KB)
      const { dataUrl, blob } = await compressImage(file, 1000, 250);
      setSelectedFile(file);
      setPreviewUrl(dataUrl);
      const kb = Math.round(blob.size / 1024);
      setFileSizeText(`সাইজ: ${kb} KB (অনূর্ধ্ব ৩০০ KB নিশ্চিত)`);
    } catch (err: unknown) {
      console.error(err);
      setModalError('ছবি প্রসেসিং ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickAddCategorySubmit = async () => {
    if (!quickCategoryName.trim()) {
      alert('ক্যাটাগরির নাম লিখুন');
      return;
    }
    if (!onAddCategory) return;

    try {
      setIsQuickCategorySubmitting(true);
      const newCatPayload: Omit<Category, 'id'> = {
        name: quickCategoryName.trim(),
        icon: quickCategoryIcon || '🛒',
        order: categories.length + 1,
        createdAt: new Date().toISOString(),
      };
      await onAddCategory(newCatPayload);
      setCategory(quickCategoryName.trim());
      setQuickCategoryName('');
      setShowQuickAddCategory(false);
    } catch (err) {
      console.error('Failed to quick add category:', err);
      alert('ক্যাটাগরি যুক্ত করা সম্ভব হয়নি।');
    } finally {
      setIsQuickCategorySubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setModalError('পণ্যের নাম আবশ্যক');
      return;
    }
    if (price === '' || Number(price) <= 0) {
      setModalError('সঠিক মূল্য প্রদান করুন');
      return;
    }
    if (!category && categories.length === 0) {
      setModalError('অনুগ্রহ করে প্রথমে একটি ক্যাটাগরি তৈরি করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);

      let finalImageUrl = imageUrl || FALLBACK_PRODUCT_IMAGE;

      if (selectedFile) {
        try {
          finalImageUrl = await uploadProductImage(selectedFile);
        } catch (uploadErr) {
          console.warn('Storage upload fallback:', uploadErr);
          if (previewUrl) {
            finalImageUrl = previewUrl;
          }
        }
      }

      const chosenCategory = category || (categories[0]?.name ?? 'মুদি পণ্য');

      let resolvedStock = stock;
      if (stockQuantity !== '') {
        const qty = Number(stockQuantity);
        const thresh = lowStockThreshold !== '' ? Number(lowStockThreshold) : globalThreshold;
        if (qty <= 0) {
          resolvedStock = 'Out of Stock';
        } else if (qty <= thresh) {
          resolvedStock = 'Low Stock';
        } else {
          resolvedStock = 'In Stock';
        }
      }

      const productPayload: Omit<Product, 'id'> = {
        name: name.trim(),
        category: chosenCategory,
        price: Number(price),
        unit,
        stock: resolvedStock,
        stockQuantity: stockQuantity === '' ? undefined : Number(stockQuantity),
        lowStockThreshold: lowStockThreshold === '' ? undefined : Number(lowStockThreshold),
        image: finalImageUrl,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
      };

      if (editingProduct?.id) {
        await onUpdateProduct(editingProduct.id, productPayload);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddProduct(productPayload);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3500);
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      setModalError('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRestockProduct?.id) return;
    const addQty = Number(quickRestockAmount);
    if (isNaN(addQty) || addQty <= 0) {
      alert('সঠিক সংখ্যা লিখুন (যেমন: ৫, ১০, ২০)');
      return;
    }

    try {
      setIsQuickRestocking(true);
      const currentQty = typeof quickRestockProduct.stockQuantity === 'number' ? quickRestockProduct.stockQuantity : 0;
      const newStockQuantity = currentQty + addQty;
      const threshold = getProductThreshold(quickRestockProduct);
      const newStockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' =
        newStockQuantity <= 0 ? 'Out of Stock' : newStockQuantity <= threshold ? 'Low Stock' : 'In Stock';

      await onUpdateProduct(quickRestockProduct.id, {
        stockQuantity: newStockQuantity,
        stock: newStockStatus,
      });

      setSuccessMessage(`${quickRestockProduct.name} সফলভাবে রিস্টক করা হয়েছে! নতুন মজুদ: ${newStockQuantity} ${quickRestockProduct.unit}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setQuickRestockProduct(null);
      setQuickRestockAmount(10);
    } catch (err) {
      console.error('Quick restock error:', err);
      setErrorMessage('রিস্টক আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsQuickRestocking(false);
    }
  };

  const handleDeleteClick = (prod: Product) => {
    setProductToDelete(prod);
  };

  const confirmDelete = async () => {
    if (!productToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteProduct(productToDelete.id, productToDelete.image);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setProductToDelete(null);
    } catch (err: unknown) {
      console.error('Error deleting product:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredProducts.map((p, idx) => ({
      ক্রমিক: idx + 1,
      পণ্যের_নাম: p.name,
      ক্যাটাগরি: p.category,
      মূল্য_টাকা: p.price,
      একক: p.unit,
      স্টক_স্ট্যাটাস: p.stock === 'In Stock' ? 'স্টকে আছে' : p.stock === 'Low Stock' ? 'সীমিত স্টক' : 'স্টক শেষ',
      যোগ_হওয়ার_তারিখ: p.createdAt ? p.createdAt.split('T')[0] : '',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `FeniMart_Products_${dateStr}`, 'Products');
    } else {
      exportToCSV(data, `FeniMart_Products_${dateStr}`);
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
            <Package className="w-6 h-6 text-[#1E8A52]" />
            <span>পণ্য ব্যবস্থাপনা (Product Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট পণ্য: <span className="font-bold text-slate-800">{products.length}</span> টি | স্টকে আছে:{' '}
            <span className="font-bold text-emerald-600">
              {products.filter((p) => p.stock === 'In Stock').length}
            </span>{' '}
            | স্টক শেষ:{' '}
            <span className="font-bold text-rose-600">
              {products.filter((p) => p.stock === 'Out of Stock').length}
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
            <span>নতুন পণ্য যোগ</span>
          </button>
        </div>
      </div>

      {/* Restock Tracker & Stock Threshold Controls */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-emerald-500/10 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                ইনভেন্টরি রিস্টক ট্র্যাকার ও থ্রেশহোল্ড (Low Stock Alert)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              পণ্যের স্টক নির্ধারিত থ্রেশহোল্ড (<span className="font-bold text-amber-900">{globalThreshold}</span> টি)-এর নিচে নামলে তালিকায় স্বয়ংক্রিয়ভাবে হলুদ ও লাল রঙে হাইলাইট হবে।
            </p>
          </div>

          {/* Threshold Stepper & Presets */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white/95 px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              <span>অ্যালার্ট থ্রেশহোল্ড:</span>
            </span>
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => handleUpdateGlobalThreshold(globalThreshold - 1)}
                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer border-r border-slate-200"
                title="১ কমান"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="999"
                value={globalThreshold}
                onChange={(e) => handleUpdateGlobalThreshold(Number(e.target.value) || 1)}
                className="w-12 text-center text-sm font-black text-slate-900 focus:outline-none py-1"
              />
              <button
                type="button"
                onClick={() => handleUpdateGlobalThreshold(globalThreshold + 1)}
                className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm cursor-pointer border-l border-slate-200"
                title="১ বাড়ান"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1">
              {[3, 5, 10, 15].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleUpdateGlobalThreshold(preset)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition cursor-pointer ${
                    globalThreshold === preset
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Status Pills & Restock Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/60">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">স্টক ফিল্টার:</span>
          
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>সব পণ্য</span>
            <span className="opacity-75">({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('restock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              stockFilter === 'restock'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200/90 border border-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>⚠️ রিস্টক প্রয়োজন (হাইলাইটেড)</span>
            <span className="px-1.5 py-0.2 bg-amber-700 text-white rounded-full text-[10px]">
              {restockNeededCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              stockFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300'
                : 'bg-rose-100/90 text-rose-900 hover:bg-rose-200/90 border border-rose-300'
            }`}
          >
            <span>❌ স্টক শেষ</span>
            <span className="px-1.5 py-0.2 bg-rose-700 text-white rounded-full text-[10px]">
              {outOfStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>✅ পর্যাপ্ত মজুদ</span>
            <span className="opacity-75">({inStockCount})</span>
          </button>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="পণ্য বা ক্যাটাগরি সার্চ করুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>

        {/* Dynamic Category Pill Filters from Firestore */}
        <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap mr-1">ফিল্টার:</span>
          <button
            onClick={() => setSelectedCategory('সব')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'সব'
                ? 'bg-[#0A4A29] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সব ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.name).length;
            return (
              <button
                key={cat.id || cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  selectedCategory === cat.name
                    ? 'bg-[#0A4A29] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">ছবি</th>
                <th className="px-4 py-3.5">পণ্যের নাম</th>
                <th className="px-4 py-3.5">ক্যাটাগরি</th>
                <th className="px-4 py-3.5">মূল্য (টাকা)</th>
                <th className="px-4 py-3.5">স্টক মজুদ / থ্রেশহোল্ড</th>
                <th className="px-4 py-3.5">স্টক অবস্থা</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">কোনো পণ্য পাওয়া যায়নি।</p>
                      <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করুন অথবা নতুন পণ্য যোগ করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const displayImg = typeof prod.image === 'string' ? prod.image : FALLBACK_PRODUCT_IMAGE;
                  const threshold = getProductThreshold(prod);
                  const isOut = isOutOfStockProduct(prod);
                  const isLow = isLowStockProduct(prod);
                  const hasQty = typeof prod.stockQuantity === 'number';

                  return (
                    <tr
                      key={prod.id}
                      className={`transition ${
                        isOut
                          ? 'bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-rose-500'
                          : isLow
                          ? 'bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-amber-500'
                          : 'hover:bg-slate-50 border-l-4 border-transparent'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img
                            src={displayImg}
                            alt={prod.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-base">{prod.name}</div>
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md mt-1 border border-rose-300">
                            <AlertCircle className="w-3 h-3" /> স্টক শূন্য — জরুরি রিস্টক প্রয়োজন!
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md mt-1 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> থ্রেশহোল্ড সতর্কতা: মজুদ {hasQty ? prod.stockQuantity : 0} ≤ {threshold}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {prod.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-[#0A4A29] text-base whitespace-nowrap">
                        ৳ {prod.price.toLocaleString('en-US')} <span className="text-xs text-slate-500 font-medium">/ {prod.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className={`font-black text-sm flex items-center gap-1 ${isOut ? 'text-rose-600' : isLow ? 'text-amber-800' : 'text-slate-800'}`}>
                            <span>{hasQty ? `${prod.stockQuantity} ${prod.unit}` : 'অনির্দিষ্ট'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            থ্রেশহোল্ড: <span className="font-semibold text-slate-600">{threshold}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {isOut ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>স্টক শেষ</span>
                            </>
                          ) : isLow ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>সীমিত স্টক (রিস্টক)</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>পর্যাপ্ত স্টক</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Restock Action Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setQuickRestockProduct(prod);
                              setQuickRestockAmount(10);
                            }}
                            className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              isLow || isOut
                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="দ্রুত রিস্টক করুন"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>রিস্টক</span>
                          </button>
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(prod)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
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

        {/* Mobile Cards View (Single Column Vertically Stacked, No Horizontal Overflow) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              কোনো পণ্য পাওয়া যায়নি।
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const displayImg = typeof prod.image === 'string' ? prod.image : FALLBACK_PRODUCT_IMAGE;
              const threshold = getProductThreshold(prod);
              const isOut = isOutOfStockProduct(prod);
              const isLow = isLowStockProduct(prod);
              const hasQty = typeof prod.stockQuantity === 'number';

              return (
                <div
                  key={prod.id}
                  className={`p-4 space-y-3 relative transition ${
                    isOut
                      ? 'bg-rose-50/80 border-l-4 border-rose-500'
                      : isLow
                      ? 'bg-amber-50/80 border-l-4 border-amber-500'
                      : 'bg-white'
                  }`}
                >
                  {/* Top Restock Warning Pill on Mobile */}
                  {(isOut || isLow) && (
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 text-xs">
                      <span className={`font-black flex items-center gap-1 ${isOut ? 'text-rose-700' : 'text-amber-800'}`}>
                        {isOut ? <AlertCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        {isOut ? 'স্টক শেষ — জরুরি রিস্টক প্রয়োজন!' : '⚠️ রিস্টক সতর্কতা: সীমিত স্টক'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickRestockProduct(prod);
                          setQuickRestockAmount(10);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ রিস্টক</span>
                      </button>
                    </div>
                  )}

                  {/* Top-Right Edit / Delete Action Icons (48px Touch Targets) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="p-2.5 text-slate-600 hover:text-[#0A4A29] bg-slate-100 hover:bg-slate-200 rounded-xl transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer shadow-xs"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(prod)}
                      className="p-2.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer shadow-xs border border-rose-200"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex items-start gap-3 pr-24">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={displayImg}
                        alt={prod.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        {prod.category}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base leading-snug mt-1 truncate">{prod.name}</h3>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-black text-[#0A4A29]">৳ {prod.price.toLocaleString('en-US')}</span>
                        <span className="text-xs text-slate-500">/ {prod.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">মজুদ:</span>
                      <span className={`font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-800' : 'text-slate-800'}`}>
                        {hasQty ? `${prod.stockQuantity} ${prod.unit}` : 'অনির্দিষ্ট'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (থ্রেশহোল্ড: {threshold})
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        isOut
                          ? 'bg-rose-100 text-rose-800'
                          : isLow
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isOut ? '✕ স্টক শেষ' : isLow ? '⚠ সীমিত স্টক' : '✓ স্টকে আছে'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) for Mobile: "+ নতুন পণ্য" */}
      <button
        onClick={openAddModal}
        className="md:hidden fixed bottom-20 right-4 z-40 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black text-sm border-2 border-[#FFB300] min-h-[48px] cursor-pointer animate-in fade-in"
        title="নতুন পণ্য যোগ করুন"
      >
        <Plus className="w-5 h-5 text-[#FFB300]" />
        <span>+ নতুন পণ্য</span>
      </button>

      {/* =========================================================================
          REBUILT 100% SCROLLABLE & MOBILE-FRIENDLY ADD / EDIT PRODUCT MODAL
          - Sticky Header at top with Title and Close (✕)
          - Vertically scrollable form body with max-height and bottom padding (100px+)
          - Sticky Footer at bottom with Cancel and Save buttons (ALWAYS VISIBLE & REACHABLE)
          - Dynamic Category from Firestore with "+ নতুন ক্যাটাগরি" quick-add feature
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* 1. STICKY HEADER */}
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingProduct ? 'পণ্য সম্পাদনা (Edit Product)' : 'নতুন পণ্য যোগ (Add Product)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY (WITH BOTTOM PADDING SO LAST FIELD IS NEVER COVERED) */}
            <form id="productForm" onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 pb-28">
              {/* Modal Error Alert */}
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  পণ্যের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মিনিকেট চাল (৫০ কেজি)"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Category (Dynamic from Firestore) & Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">
                    ক্যাটাগরি *
                  </label>
                  {onAddCategory && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCategory(!showQuickAddCategory)}
                      className="text-xs font-bold text-[#0A4A29] hover:text-[#1E8A52] flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>{showQuickAddCategory ? 'লুকান' : '+ নতুন ক্যাটাগরি'}</span>
                    </button>
                  )}
                </div>

                {/* Inline Quick Add Category Box */}
                {showQuickAddCategory && (
                  <div className="mb-3 p-3 bg-slate-50 border border-emerald-200 rounded-2xl space-y-2.5 animate-fadeIn">
                    <p className="text-xs font-bold text-[#0A4A29]">দ্রুত নতুন ক্যাটাগরি তৈরি করুন:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickCategoryIcon}
                        onChange={(e) => setQuickCategoryIcon(e.target.value)}
                        className="w-14 px-2 py-2 border border-slate-300 rounded-xl text-center text-lg min-h-[44px]"
                        title="ইমোজি"
                      />
                      <input
                        type="text"
                        value={quickCategoryName}
                        onChange={(e) => setQuickCategoryName(e.target.value)}
                        placeholder="ক্যাটাগরির নাম লিখুন..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddCategorySubmit}
                        disabled={isQuickCategorySubmitting}
                        className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-3.5 py-2 rounded-xl text-xs font-bold min-h-[44px] shrink-0"
                      >
                        {isQuickCategorySubmitting ? '...' : 'যোগ'}
                      </button>
                    </div>
                  </div>
                )}

                {categories.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
                    কোনো ক্যাটাগরি নেই। প্রথমে ক্যাটাগরি যোগ করুন।
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.icon ? `${c.icon} ` : ''}{c.name} {c.nameEn ? `(${c.nameEn})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Price & Unit (Vertically Stacked on Mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    মূল্য (টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    একক (Unit) *
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time Store Price Preview */}
              {price !== '' && Number(price) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm animate-fadeIn">
                  <span className="text-emerald-800 font-semibold">স্টোরে মূল্য প্রদর্শন হবে:</span>
                  <span className="font-black text-[#0A4A29] text-sm sm:text-base">
                    ৳{Number(price).toLocaleString('en-US')} / {unit}
                  </span>
                </div>
              )}

              {/* Stock Quantity & Restock Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>বর্তমান মজুদ পরিমাণ (Stock Qty)</span>
                    <span className="text-xs text-slate-400 font-normal">সংখ্যা লিখুন</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      placeholder="যেমন: ২৫"
                      value={stockQuantity}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setStockQuantity(val);
                        if (val !== '') {
                          const thresh = lowStockThreshold !== '' ? Number(lowStockThreshold) : globalThreshold;
                          if (Number(val) <= 0) setStock('Out of Stock');
                          else if (Number(val) <= thresh) setStock('Low Stock');
                          else setStock('In Stock');
                        }
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>রিস্টক থ্রেশহোল্ড (Threshold)</span>
                    <span className="text-xs text-amber-700 font-semibold">ডিফল্ট: {globalThreshold}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder={`ডিফল্ট (${globalThreshold})`}
                    value={lowStockThreshold}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setLowStockThreshold(val);
                      if (stockQuantity !== '') {
                        const thresh = val !== '' ? Number(val) : globalThreshold;
                        const qty = Number(stockQuantity);
                        if (qty <= 0) setStock('Out of Stock');
                        else if (qty <= thresh) setStock('Low Stock');
                        else setStock('In Stock');
                      }
                    }}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Stock Status */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  স্টক অবস্থা (Stock Status)
                </label>
                <select
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value as 'In Stock' | 'Low Stock' | 'Out of Stock')
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px] bg-white font-medium"
                >
                  <option value="In Stock">স্টকে আছে (In Stock)</option>
                  <option value="Low Stock">সীমিত স্টক — রিস্টক প্রয়োজন (Low Stock)</option>
                  <option value="Out of Stock">স্টক শেষ (Out of Stock)</option>
                </select>
              </div>

              {/* Image Upload (Accepts JPG, PNG, WEBP; < 300KB) */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  পণ্যের ছবি আপলোড (Firebase Storage Image)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  JPG, PNG বা WEBP ছবি নির্বাচন করুন। স্বয়ংক্রিয়ভাবে ৩০০ KB-এর নিচে অপটিমাইজ হবে।
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  {previewUrl ? (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#1E8A52] shrink-0 bg-white shadow-xs">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-10 h-10" />
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2 text-center sm:text-left">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {isUploading ? (
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-[#0A4A29] py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#1E8A52]" />
                        <span>ছবি অপটিমাইজ ও আপলোড হচ্ছে...</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2.5 rounded-xl text-sm font-bold transition border border-slate-300 cursor-pointer min-h-[48px] shadow-xs"
                      >
                        <Upload className="w-4 h-4 text-[#0A4A29]" />
                        <span>{previewUrl ? 'অন্য ছবি পরিবর্তন করুন' : 'ছবি আপলোড করুন (Upload)'}</span>
                      </button>
                    )}

                    {fileSizeText && (
                      <p className="text-xs text-emerald-700 font-bold flex items-center justify-center sm:justify-start gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{fileSizeText}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* 3. STICKY FOOTER (ALWAYS VISIBLE & REACHABLE) */}
            <div className="sticky bottom-0 bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex items-center justify-end gap-3 z-20 shrink-0 shadow-lg">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px] cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                form="productForm"
                disabled={isSubmitting || isUploading}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[48px] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFB300]" />
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <span>{editingProduct ? 'আপডেট করুন' : 'পণ্য যোগ করুন'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Restock Modal */}
      {quickRestockProduct && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FFE0A8]" />
                <h3 className="font-black text-base">দ্রুত রিস্টক (Quick Restock)</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickRestockProduct(null)}
                className="text-white/80 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold">পণ্য:</p>
                <h4 className="text-base font-black text-slate-900">{quickRestockProduct.name}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="text-slate-600">
                    বর্তমান মজুদ:{' '}
                    <span className="font-bold text-slate-900">
                      {typeof quickRestockProduct.stockQuantity === 'number'
                        ? quickRestockProduct.stockQuantity
                        : 0}{' '}
                      {quickRestockProduct.unit}
                    </span>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-amber-700 font-semibold">
                    থ্রেশহোল্ড: {getProductThreshold(quickRestockProduct)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  কত পরিমাণ যোগ করবেন? ({quickRestockProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quickRestockAmount}
                  onChange={(e) =>
                    setQuickRestockAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[48px]"
                  placeholder="যেমন: ১০"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                {[5, 10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuickRestockAmount(amt)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      quickRestockAmount === amt
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Preview */}
              {quickRestockAmount !== '' && Number(quickRestockAmount) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">রিস্টকের পর মোট মজুদ হবে:</span>
                  <span className="font-black text-[#0A4A29] text-sm">
                    {(typeof quickRestockProduct.stockQuantity === 'number'
                      ? quickRestockProduct.stockQuantity
                      : 0) + Number(quickRestockAmount)}{' '}
                    {quickRestockProduct.unit}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickRestockProduct(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer min-h-[44px]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isQuickRestocking}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] disabled:opacity-50"
                >
                  {isQuickRestocking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>রিস্টক নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog in Bengali with Yes/No buttons */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="পণ্য মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${productToDelete?.name}" পণ্যটি মুছে ফেলা হবে।`}
        warningNote="পণ্যটি মুছে ফেললে কাস্টমার স্টোর থেকে অবিলম্বে মুছে যাবে এবং ফায়ারবেস স্টোরেজ থেকেও ইমেজটি মুছে ফেলা হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};
