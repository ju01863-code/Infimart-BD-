import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  X,
  CreditCard,
  AlertCircle,
  Building,
  Phone,
  MapPin,
  Mail,
  Calendar,
  Package,
  Save,
  CheckCircle,
} from 'lucide-react';
import { Purchase, Product, Supplier } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface PurchaseTabProps {
  purchases: Purchase[];
  products: Product[];
  suppliers?: Supplier[];
  onAddPurchase: (purchase: Omit<Purchase, 'id'>) => Promise<void>;
  onUpdatePurchase: (id: string, purchase: Partial<Purchase>) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
}

export const PurchaseTab: React.FC<PurchaseTabProps> = ({
  purchases,
  products,
  suppliers = [],
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states - Strictly string / empty by default (NO "0" default value!)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState<string>(''); // Empty by default
  const [unitPrice, setUnitPrice] = useState<string>(''); // Empty by default
  const [paid, setPaid] = useState<string>(''); // Empty by default
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time calculation: Treat empty string as 0 for arithmetic, but input stays empty
  const numQuantity = quantity === '' ? 0 : Number(quantity);
  const numUnitPrice = unitPrice === '' ? 0 : Number(unitPrice);
  const numPaid = paid === '' ? 0 : Number(paid);

  const calculatedTotal = numQuantity * numUnitPrice;
  const calculatedDue = Math.max(0, calculatedTotal - numPaid);

  // Unique list of suppliers from purchases & suppliers collection
  const allSuppliersList = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => s.name && set.add(s.name));
    purchases.forEach((p) => p.supplier && set.add(p.supplier));
    return Array.from(set);
  }, [suppliers, purchases]);

  // Autocomplete / autofill supplier details when selecting or typing an existing supplier
  const handleSupplierNameChange = (nameInput: string) => {
    setSupplier(nameInput);
    const found = suppliers.find(
      (s) => s.name.trim().toLowerCase() === nameInput.trim().toLowerCase()
    );
    if (found) {
      if (found.phone) setSupplierPhone(found.phone);
      if (found.address) setSupplierAddress(found.address);
      if (found.email) setSupplierEmail(found.email);
    }
  };

  // Supplier-wise summary balances
  const supplierSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      { totalPurchased: number; totalPaid: number; totalDue: number; count: number }
    > = {};

    purchases.forEach((p) => {
      const sName = p.supplier || 'অজ্ঞাত সরবরাহকারী';
      if (!summaryMap[sName]) {
        summaryMap[sName] = { totalPurchased: 0, totalPaid: 0, totalDue: 0, count: 0 };
      }
      summaryMap[sName].totalPurchased += Number(p.total || 0);
      summaryMap[sName].totalPaid += Number(p.paid || 0);
      summaryMap[sName].totalDue += Number(p.due || 0);
      summaryMap[sName].count += 1;
    });

    return Object.entries(summaryMap).map(([sName, data]) => ({
      supplier: sName,
      ...data,
    }));
  }, [purchases]);

  const filteredPurchases = purchases.filter((item) => {
    const matchSupplier = supplierFilter === 'All' || item.supplier === supplierFilter;
    const matchSearch =
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplierPhone && item.supplierPhone.includes(searchTerm));
    return matchSupplier && matchSearch;
  });

  const openAddModal = () => {
    setEditingPurchase(null);
    setDate(new Date().toISOString().split('T')[0]);
    setSupplier('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierEmail('');
    setProduct(products[0]?.name || '');
    // Empty inputs by default as requested
    setQuantity('');
    setUnitPrice('');
    setPaid('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Purchase) => {
    setEditingPurchase(p);
    setDate(p.date);
    setSupplier(p.supplier);
    setSupplierPhone(p.supplierPhone || '');
    setSupplierAddress(p.supplierAddress || '');
    setSupplierEmail(p.supplierEmail || '');
    setProduct(p.product);
    setQuantity(p.quantity ? String(p.quantity) : '');
    setUnitPrice(p.unitPrice ? String(p.unitPrice) : '');
    setPaid(p.paid ? String(p.paid) : '');
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      alert('অনুগ্রহ করে সরবরাহকারীর নাম লিখুন।');
      return;
    }
    if (!product.trim()) {
      alert('অনুগ্রহ করে পণ্যের নাম লিখুন বা নির্বাচন করুন।');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      alert('অনুগ্রহ করে পণ্যের সঠিক পরিমাণ লিখুন।');
      return;
    }
    if (!unitPrice || Number(unitPrice) < 0) {
      alert('অনুগ্রহ করে পণ্যের একক ক্রয়মূল্য লিখুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const totalAmount = numQuantity * numUnitPrice;
      const dueAmount = Math.max(0, totalAmount - numPaid);

      const payload: Omit<Purchase, 'id'> = {
        date,
        supplier: supplier.trim(),
        supplierPhone: supplierPhone.trim(),
        supplierAddress: supplierAddress.trim(),
        supplierEmail: supplierEmail.trim(),
        product: product.trim(),
        quantity: numQuantity,
        unitPrice: numUnitPrice,
        total: totalAmount,
        paid: numPaid,
        due: dueAmount,
        notes: notes.trim(),
        createdAt: editingPurchase?.createdAt || new Date().toISOString(),
      };

      if (editingPurchase?.id) {
        await onUpdatePurchase(editingPurchase.id, payload);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddPurchase(payload);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }
      setTimeout(() => setSuccessMessage(null), 3000);

      // Reset and clear all fields after saving
      setSupplier('');
      setSupplierPhone('');
      setSupplierAddress('');
      setSupplierEmail('');
      setProduct('');
      setQuantity('');
      setUnitPrice('');
      setPaid('');
      setNotes('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving purchase:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!purchaseToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeletePurchase(purchaseToDelete.id);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setPurchaseToDelete(null);
    } catch (err) {
      console.error('Error deleting purchase:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredPurchases.map((p, idx) => ({
      ক্রমিক: idx + 1,
      তারিখ: p.date,
      সরবরাহকারী: p.supplier,
      সরবরাহকারী_মোবাইল: p.supplierPhone || '',
      সরবরাহকারী_ঠিকানা: p.supplierAddress || '',
      সরবরাহকারী_ইমেইল: p.supplierEmail || '',
      পণ্য: p.product,
      পরিমাণ: p.quantity,
      একক_দর: p.unitPrice,
      মোট_টাকা: p.total,
      পরিশোধিত: p.paid,
      বকেয়া_টাকা: p.due,
      মন্তব্য: p.notes || '',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Purchases_${dateStr}`);
    } else {
      exportToCSV(data, `InfiMart_Purchases_${dateStr}`);
    }
  };

  return (
    <div className="space-y-6">
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
            <AlertCircle className="w-5 h-5 text-white" />
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
            <Truck className="w-6 h-6 text-[#1E8A52]" />
            <span>ক্রয় ব্যবস্থাপনা (Purchase Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট ক্রয়: <span className="font-bold text-slate-800">{purchases.length}</span> টি | মোট বকেয়া:{' '}
            <span className="font-bold text-rose-600">
              ৳ {purchases.reduce((s, p) => s + Number(p.due || 0), 0).toLocaleString('en-US')}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition border border-slate-300"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-[#FFB300]" />
            <span>ক্রয় যোগ করুন (Add Purchase)</span>
          </button>
        </div>
      </div>

      {/* Supplier-wise Summary Cards */}
      {supplierSummary.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#0A4A29]" />
            <span>সরবরাহকারীভিত্তিক সারসংক্ষেপ (Supplier Summary)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {supplierSummary.map((s) => (
              <div
                key={s.supplier}
                className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 hover:border-[#1E8A52] transition"
              >
                <div className="font-bold text-slate-900 text-sm truncate">{s.supplier}</div>
                <div className="mt-2 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>মোট ক্রয়:</span>
                    <span className="font-semibold">৳ {s.totalPurchased.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>পরিশোধিত:</span>
                    <span className="font-semibold">৳ {s.totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>বকেয়া (Due):</span>
                    <span>৳ {s.totalDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="সরবরাহকারী বা পণ্য খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">সরবরাহকারী:</span>
          {['All', ...allSuppliersList].map((sup) => (
            <button
              key={sup}
              onClick={() => setSupplierFilter(sup)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                supplierFilter === sup
                  ? 'bg-[#0A4A29] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {sup === 'All' ? 'সব' : sup}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Table - Responsive desktop table, responsive cards on mobile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">তারিখ</th>
                <th className="px-4 py-3.5">সরবরাহকারী</th>
                <th className="px-4 py-3.5">পণ্য ও পরিমাণ</th>
                <th className="px-4 py-3.5">মোট মূল্য</th>
                <th className="px-4 py-3.5">পরিশোধ</th>
                <th className="px-4 py-3.5">বকেয়া (Due)</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Truck className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">এখনো কোনো ক্রয়ের চালান যোগ করা হয়নি।</p>
                      <p className="text-xs text-slate-400">নতুন ক্রয় যোগ করতে উপরের বাটনে ক্লিক করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {p.date}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{p.supplier}</div>
                      {p.supplierPhone && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#1E8A52]" />
                          <span>{p.supplierPhone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.product}</div>
                      <div className="text-xs text-slate-500">
                        {p.quantity} x ৳{p.unitPrice}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                      ৳ {p.total.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-bold whitespace-nowrap">
                      ৳ {p.paid.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.due > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                          <AlertCircle className="w-3 h-3" />৳ {p.due.toLocaleString('en-US')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded">
                          পরিশোধিত
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPurchaseToDelete(p)}
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

        {/* Mobile Cards View (Single Column, No Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredPurchases.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              এখনো কোনো ক্রয়ের চালান যোগ করা হয়নি।
            </div>
          ) : (
            filteredPurchases.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">{p.date}</span>
                    <h3 className="font-bold text-slate-900 text-base">{p.supplier}</h3>
                    {p.supplierPhone && (
                      <div className="flex items-center gap-1 text-xs text-[#0A4A29] font-medium mt-0.5">
                        <Phone className="w-3 h-3 text-[#1E8A52]" />
                        <span>{p.supplierPhone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPurchaseToDelete(p)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-700">{p.product}</span>
                    <span className="text-xs text-slate-500">{p.quantity} x ৳{p.unitPrice}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোট ক্রয়মূল্য</span>
                      <span className="font-black text-slate-900 text-sm">৳ {p.total.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">পরিশোধ</span>
                      <span className="font-bold text-emerald-700 text-sm">৳ {p.paid.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">বকেয়া (Due)</span>
                      <span className={`font-black text-sm ${p.due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳ {p.due.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================================
          REBUILT 100% MOBILE-FRIENDLY ADD / EDIT PURCHASE MODAL
          - Vertically stacked single column on mobile (< 768px)
          - All Bengali labels above inputs
          - Min 16px font size on inputs (prevents mobile Safari unwanted zoom)
          - Min 48px height for inputs and buttons
          - Card-based layout per section with clear spacing
          - Empty default input fields (NO value="0")
          - Real-time auto-calculation for Total and Due (Read-Only)
          - Sticky "সেভ করুন" button at bottom of form
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 relative my-3 sm:my-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingPurchase ? 'ক্রয় তথ্য সম্পাদনা' : 'নতুন ক্রয় যোগ করুন (Add Purchase)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Card 1: ক্রয়ের তারিখ */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#1E8A52]" />
                  <span>ক্রয়ের তারিখ *</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Card 2: সরবরাহকারীর তথ্য (Supplier Information) */}
              <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-3.5">
                <h4 className="text-sm font-black text-[#0A4A29] flex items-center gap-1.5 border-b border-emerald-100/80 pb-2">
                  <Building className="w-4 h-4 text-[#1E8A52]" />
                  <span>সরবরাহকারীর তথ্য (Supplier Details)</span>
                </h4>

                {/* 1. সরবরাহকারীর নাম * */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    সরবরাহকারীর নাম (Supplier Name) *
                  </label>
                  <input
                    type="text"
                    required
                    list="supplier-suggestions"
                    value={supplier}
                    onChange={(e) => handleSupplierNameChange(e.target.value)}
                    placeholder="সরবরাহকারীর নাম লিখুন বা নির্বাচন করুন"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                  {/* Autocomplete Datalist */}
                  <datalist id="supplier-suggestions">
                    {allSuppliersList.map((sName) => (
                      <option key={sName} value={sName} />
                    ))}
                  </datalist>
                </div>

                {/* 2. সরবরাহকারীর মোবাইল নম্বর */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#1E8A52]" />
                    <span>সরবরাহকারীর মোবাইল নম্বর (ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="যেমন: 018XXXXXXXX"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                {/* 3. সরবরাহকারীর ঠিকানা */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#1E8A52]" />
                    <span>সরবরাহকারীর ঠিকানা (ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="text"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="যেমন: বড় বাজার আড়ত, ফেনী"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                {/* 4. সরবরাহকারীর ইমেইল */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#1E8A52]" />
                    <span>সরবরাহকারীর ইমেইল (ঐচ্ছিক)</span>
                  </label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="supplier@example.com"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Card 3: পণ্যের বিবরণ (Product & Pricing Details) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Package className="w-4 h-4 text-[#0A4A29]" />
                  <span>ক্রয়কৃত পণ্যের বিবরণ (Product Details)</span>
                </h4>

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    পণ্য নির্বাচন বা নাম লিখুন *
                  </label>
                  <input
                    type="text"
                    required
                    list="product-suggestions"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="যেমন: মিনিকেট চাল (৫০ কেজি বস্তা)"
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                  <datalist id="product-suggestions">
                    {products.map((p) => (
                      <option key={p.id || p.name} value={p.name} />
                    ))}
                  </datalist>
                </div>

                {/* পরিমাণ (Quantity) - Empty by default, no value="0" */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    পরিমাণ (Quantity) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                {/* একক দর (Unit Price) - Empty by default, no value="0" */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    একক দর / ক্রয়মূল্য (Unit Price in ৳) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Card 4: হিসাব ও পেমেন্ট বিবরণী (Auto-calculated Fields & Paid Amount) */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70 space-y-3.5">
                <h4 className="text-sm font-black text-amber-950 flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                  <CreditCard className="w-4 h-4 text-amber-700" />
                  <span>হিসাব ও পরিশোধ বিবরণী (Calculation & Payment)</span>
                </h4>

                {/* Auto-Calculated Read-Only Total Card */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    মোট ক্রয়মূল্য (স্বয়ংক্রিয় হিসাব: পরিমাণ × একক দর)
                  </label>
                  <div className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-between min-h-[48px]">
                    <span className="text-xs text-slate-500 font-semibold">অটো-ক্যালকুলেটেড:</span>
                    <span className="text-lg font-black text-slate-900">
                      ৳ {calculatedTotal ? calculatedTotal.toLocaleString('en-US') : '০'}
                    </span>
                  </div>
                  {/* Readonly input field for form compatibility */}
                  <input
                    type="text"
                    readOnly
                    value={calculatedTotal ? `৳ ${calculatedTotal.toLocaleString('en-US')}` : '৳ ০'}
                    className="sr-only"
                    tabIndex={-1}
                  />
                </div>

                {/* পরিশোধ (Paid Amount) - Empty by default, no value="0" */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    পরিশোধ (Paid Amount in ৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                  <span className="text-xs text-slate-400 mt-1 block">
                    খালি থাকলে পরিশোধ ০ ধরা হবে
                  </span>
                </div>

                {/* Auto-Calculated Read-Only Due / বাকি */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-1.5">
                    বাকি / বকেয়া (স্বয়ংক্রিয় হিসাব: মোট - পরিশোধ)
                  </label>
                  <div
                    className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between min-h-[48px] ${
                      calculatedDue > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                  >
                    <span className="text-xs font-semibold">
                      {calculatedDue > 0 ? 'বকেয়া টাকা:' : 'পরিশোধ সম্পন্ন'}
                    </span>
                    <span className="text-lg font-black">
                      ৳ {calculatedDue ? calculatedDue.toLocaleString('en-US') : '০'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 5: চালান নোট / মন্তব্য */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  চালান নম্বর / অতিরিক্ত নোট (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: ট্রাক চালান নং ১২৩, চালের বস্তা অক্ষত..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              {/* STICKY "সেভ করুন" (SAVE) BUTTON AT THE BOTTOM */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3 pb-1 border-t border-slate-200 mt-4 flex items-center justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-7 py-3 rounded-xl text-base font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer min-h-[48px] flex-1 sm:flex-initial disabled:opacity-50 active:scale-98"
                >
                  <Save className="w-5 h-5 text-[#FFB300]" />
                  <span>
                    {isSubmitting
                      ? 'সংরক্ষণ হচ্ছে...'
                      : editingPurchase
                      ? 'আপডেট সম্পন্ন করুন'
                      : 'সেভ করুন (Save Purchase)'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal in Bengali */}
      <ConfirmModal
        isOpen={!!purchaseToDelete}
        title="ক্রয়ের চালান মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${purchaseToDelete?.product}" (${purchaseToDelete?.supplier}) ক্রয়ের চালানটি মুছে ফেলা হবে।`}
        warningNote="চালানটি মুছে ফেললে হিসাব ও ব্যয়ের রিপোর্ট থেকে এর বিবরণ স্থায়ীভাবে মুছে যাবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setPurchaseToDelete(null)}
      />
    </div>
  );
};
