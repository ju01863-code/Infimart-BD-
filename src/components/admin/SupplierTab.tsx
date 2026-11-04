import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Supplier, Purchase } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface SupplierTabProps {
  suppliers: Supplier[];
  purchases?: Purchase[];
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  onUpdateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const SupplierTab: React.FC<SupplierTabProps> = ({
  suppliers,
  purchases = [],
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [totalPurchases, setTotalPurchases] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [suppliers, searchTerm]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
    setEmail('');
    setTotalPurchases('');
    setTotalAmount('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setEmail(s.email || '');
    setTotalPurchases(s.totalPurchases ? String(s.totalPurchases) : '');
    setTotalAmount(s.totalAmount ? String(s.totalAmount) : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('অনুগ্রহ করে সরবরাহকারীর নাম লিখুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Omit<Supplier, 'id'> = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        totalPurchases: totalPurchases ? Number(totalPurchases) : 0,
        totalAmount: totalAmount ? Number(totalAmount) : 0,
        createdAt: editingSupplier?.createdAt || new Date().toISOString(),
      };

      if (editingSupplier?.id) {
        await onUpdateSupplier(editingSupplier.id, payload);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddSupplier(payload);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving supplier:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteSupplier(supplierToDelete.id);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setSupplierToDelete(null);
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if supplier is linked to any purchases
  const linkedPurchasesCount = useMemo(() => {
    if (!supplierToDelete) return 0;
    const sName = supplierToDelete.name.trim().toLowerCase();
    return purchases.filter((p) => p.supplier.trim().toLowerCase() === sName).length;
  }, [supplierToDelete, purchases]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredSuppliers.map((s, idx) => ({
      ক্রমিক: idx + 1,
      সরবরাহকারীর_নাম: s.name,
      মোবাইল_নম্বর: s.phone || '',
      ঠিকানা: s.address || '',
      ইমেইল: s.email || '',
      মোট_ক্রয়_সংখ্যা: s.totalPurchases || 0,
      মোট_টাকা: s.totalAmount || 0,
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Suppliers_${dateStr}`);
    } else {
      exportToCSV(data, `InfiMart_Suppliers_${dateStr}`);
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
            <Building className="w-6 h-6 text-[#1E8A52]" />
            <span>সরবরাহকারী ব্যবস্থাপনা (Supplier Management)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট সরবরাহকারী: <span className="font-bold text-slate-800">{suppliers.length}</span> জন | সর্বমোট ক্রয়মূল্য:{' '}
            <span className="font-bold text-[#0A4A29]">
              ৳ {suppliers.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0).toLocaleString('en-US')}
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
            <span>নতুন সরবরাহকারী যোগ</span>
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
            placeholder="সরবরাহকারীর নাম, মোবাইল বা ঠিকানা খুঁজুন..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>
      </div>

      {/* Supplier List - Responsive Table on desktop, Cards on mobile */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">সরবরাহকারীর তথ্য</th>
                <th className="px-4 py-3.5">ঠিকানা</th>
                <th className="px-4 py-3.5">যোগাযোগ</th>
                <th className="px-4 py-3.5 text-center">মোট ক্রয়</th>
                <th className="px-4 py-3.5">সর্বমোট টাকা</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Building className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">এখনো কোনো সরবরাহকারী যোগ করা হয়নি।</p>
                      <p className="text-xs text-slate-400">নতুন সরবরাহকারী যুক্ত করতে উপরের বাটনে ক্লিক করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id || s.name} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 text-base">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {s.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.address}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 space-y-1">
                      {s.phone && (
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Phone className="w-3 h-3 text-[#1E8A52]" />
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.email}</span>
                        </div>
                      )}
                      {!s.phone && !s.email && '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800">
                      {s.totalPurchases || 0} টি
                    </td>
                    <td className="px-4 py-3 font-black text-[#0A4A29] text-base whitespace-nowrap">
                      ৳ {Number(s.totalAmount || 0).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="সম্পাদনা"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(s)}
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
          {filteredSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              এখনো কোনো সরবরাহকারী যোগ করা হয়নি।
            </div>
          ) : (
            filteredSuppliers.map((s) => (
              <div key={s.id || s.name} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{s.name}</h3>
                    {s.phone && (
                      <div className="flex items-center gap-1.5 text-sm text-[#0A4A29] font-semibold mt-1">
                        <Phone className="w-3.5 h-3.5 text-[#1E8A52]" />
                        <a href={`tel:${s.phone}`} className="hover:underline">
                          {s.phone}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(s)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {s.address && (
                  <div className="text-xs text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{s.address}</span>
                  </div>
                )}

                {s.email && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{s.email}</span>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block">মোট ক্রয় সংখ্যা</span>
                    <span className="font-bold text-slate-800 text-sm">{s.totalPurchases || 0} টি</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">সর্বমোট ক্রয়মূল্য</span>
                    <span className="font-black text-[#0A4A29] text-base">
                      ৳ {Number(s.totalAmount || 0).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Supplier Modal - 100% Mobile Friendly */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] mb-4 pb-2 border-b border-slate-100">
              {editingSupplier ? 'সরবরাহকারী তথ্য সম্পাদনা' : 'নতুন সরবরাহকারী নিবন্ধন'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  সরবরাহকারী / আড়তদারের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: হাজী রাইস এজেন্সি"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 018XXXXXXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ঠিকানা
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বড় বাজার, ফেনী"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  ইমেইল (ঐচ্ছিক)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supplier@example.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    মোট ক্রয়ের সংখ্যা
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalPurchases}
                    onChange={(e) => setTotalPurchases(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    সর্বমোট টাকা (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
              </div>

              {/* Actions Footer */}
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
                  disabled={isSubmitting}
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md cursor-pointer min-h-[48px] disabled:opacity-50"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingSupplier ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!supplierToDelete}
        title="সরবরাহকারী মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${supplierToDelete?.name}" সরবরাহকারীর তথ্য মুছে ফেলা হবে।`}
        warningNote={
          linkedPurchasesCount > 0
            ? `সতর্কতা: এই সরবরাহকারীর সাথে ${linkedPurchasesCount}টি ক্রয়ের চালান যুক্ত রয়েছে। সরবরাহকারী মুছে ফেললে চালানের তথ্যে সরবরাহকারীর বিবরণ অনুপস্থিত হতে পারে।`
            : undefined
        }
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
};
