import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Search,
  X,
  Phone,
  Layers,
  Sparkles,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { PreBookingCampaign, PreBookingOrder, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface PreBookingTabProps {
  campaigns: PreBookingCampaign[];
  preBookingOrders: PreBookingOrder[];
  products: Product[];
  onAddCampaign: (campaign: Omit<PreBookingCampaign, 'id'>) => Promise<void>;
  onUpdateCampaign: (id: string, campaign: Partial<PreBookingCampaign>) => Promise<void>;
  onDeleteCampaign: (id: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: 'Confirmed' | 'Pending' | 'Cancelled') => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export const PreBookingTab: React.FC<PreBookingTabProps> = ({
  campaigns,
  preBookingOrders,
  products,
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onUpdateOrderStatus,
  onDeleteOrder,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'orders'>('campaigns');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PreBookingCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<PreBookingCampaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>(200);
  const [fullPrice, setFullPrice] = useState<number | ''>('');
  const [bookingEndDate, setBookingEndDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [deliveryDate, setDeliveryDate] = useState(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [totalSlots, setTotalSlots] = useState<number | ''>(50);
  const [isActive, setIsActive] = useState(true);

  const handleProductSelect = (pId: string) => {
    setProductId(pId);
    const prod = products.find((p) => p.id === pId || p.name === pId);
    if (prod) {
      setProductName(prod.name);
      setFullPrice(prod.price);
      if (!advanceAmount) {
        setAdvanceAmount(Math.round(prod.price * 0.2)); // default 20% advance
      }
    }
  };

  const openAddModal = () => {
    setEditingCampaign(null);
    const firstProd = products[0];
    if (firstProd) {
      setProductId(firstProd.id || firstProd.name);
      setProductName(firstProd.name);
      setFullPrice(firstProd.price);
      setAdvanceAmount(Math.round(firstProd.price * 0.25));
    } else {
      setProductId('');
      setProductName('');
      setFullPrice('');
      setAdvanceAmount(200);
    }
    setBookingEndDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
    setDeliveryDate(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    setTotalSlots(50);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: PreBookingCampaign) => {
    setEditingCampaign(c);
    setProductId(c.productId);
    setProductName(c.productName);
    setAdvanceAmount(c.advanceAmount);
    setFullPrice(c.fullPrice);
    setBookingEndDate(c.bookingEndDate);
    setDeliveryDate(c.deliveryDate);
    setTotalSlots(c.totalSlots);
    setIsActive(c.isActive !== false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !advanceAmount || !fullPrice) {
      alert('অনুগ্রহ করে পণ্যের তথ্য এবং অগ্রিম পরিমাণ নির্ধারণ করুন।');
      return;
    }

    try {
      setIsSubmitting(true);
      const prod = products.find((p) => p.id === productId || p.name === productName);

      const payload: Omit<PreBookingCampaign, 'id'> = {
        productId,
        productName,
        productImage: typeof prod?.image === 'string' ? prod.image : '',
        advanceAmount: Number(advanceAmount),
        fullPrice: Number(fullPrice),
        bookingEndDate,
        deliveryDate,
        isActive,
        totalSlots: Number(totalSlots || 50),
        bookedSlots: editingCampaign?.bookedSlots || 0,
        createdAt: editingCampaign?.createdAt || new Date().toISOString(),
      };

      if (editingCampaign?.id) {
        await onUpdateCampaign(editingCampaign.id, payload);
        setSuccessMessage('প্রি-বুকিং তথ্য আপডেট হয়েছে');
      } else {
        await onAddCampaign(payload);
        setSuccessMessage('নতুন প্রি-বুকিং চালু হয়েছে');
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

  const handleToggleActive = async (c: PreBookingCampaign) => {
    if (!c.id) return;
    try {
      await onUpdateCampaign(c.id, { isActive: !c.isActive });
      setSuccessMessage(
        c.isActive ? 'প্রি-বুকিং নিষ্ক্রিয় করা হয়েছে' : 'প্রি-বুকিং সক্রিয় করা হয়েছে'
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!campaignToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteCampaign(campaignToDelete.id);
      setSuccessMessage('প্রি-বুকিং ক্যাম্পেইন মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setCampaignToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOrderStatusChange = async (
    orderId: string,
    status: 'Confirmed' | 'Pending' | 'Cancelled'
  ) => {
    try {
      await onUpdateOrderStatus(orderId, status);
      setSuccessMessage(`প্রি-বুকিং স্ট্যাটাস "${status === 'Confirmed' ? 'নিশ্চিত' : status === 'Pending' ? 'পেন্ডিং' : 'বাতিল'}" করা হয়েছে`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage('স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleExportCampaigns = (format: 'xlsx' | 'csv') => {
    const data = campaigns.map((c, idx) => ({
      ক্রমিক: idx + 1,
      পণ্যের_নাম: c.productName,
      মোট_মূল্য: c.fullPrice,
      অগ্রিম_টাকা: c.advanceAmount,
      বুকিং_শেষের_তারিখ: c.bookingEndDate,
      সম্ভাব্য_ডেলিভারি_তারিখ: c.deliveryDate,
      মোট_স্লট: c.totalSlots,
      বুক_হয়েছে: c.bookedSlots,
      অবস্থা: c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') exportToExcel(data, `InfiMart_PreBookings_${dateStr}`, 'Campaigns');
    else exportToCSV(data, `InfiMart_PreBookings_${dateStr}`);
  };

  const handleExportOrders = (format: 'xlsx' | 'csv') => {
    const data = preBookingOrders.map((o, idx) => ({
      ক্রমিক: idx + 1,
      তারিখ: o.createdAt ? o.createdAt.split('T')[0] : '',
      কাস্টমার_নাম: o.customerName,
      মোবাইল: o.phone,
      ঠিকানা: o.address,
      পণ্য: o.productName,
      পরিমাণ: o.quantity,
      পরিশোধিত_অগ্রিম: o.advanceAmountPaid,
      বকেয়া: o.dueAmount,
      পেমেন্ট_পদ্ধতি: o.paymentMethod,
      লেনদেন_আইডি: o.transactionId || 'N/A',
      স্ট্যাটাস: o.status === 'Confirmed' ? 'নিশ্চিত' : o.status === 'Pending' ? 'পেন্ডিং' : 'বাতিল',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') exportToExcel(data, `InfiMart_PreBookingOrders_${dateStr}`, 'Orders');
    else exportToCSV(data, `InfiMart_PreBookingOrders_${dateStr}`);
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
            <CalendarDays className="w-6 h-6 text-[#1E8A52]" />
            <span>প্রি-বুকিং ব্যবস্থাপনা (Pre-Booking System)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            আগাম পণ্য অর্ডার, অগ্রিম টাকা গ্রহণ ও স্লট ট্র্যাকিং
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              activeSubTab === 'campaigns'
                ? handleExportCampaigns('xlsx')
                : handleExportOrders('xlsx')
            }
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border border-slate-300 min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() =>
              activeSubTab === 'campaigns'
                ? handleExportCampaigns('csv')
                : handleExportOrders('csv')
            }
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
            <span>নতুন প্রি-বুকিং শুরু</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm max-w-md">
        <button
          onClick={() => setActiveSubTab('campaigns')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition min-h-[42px] cursor-pointer ${
            activeSubTab === 'campaigns'
              ? 'bg-[#0A4A29] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ক্যাম্পেইন তালিকা ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition min-h-[42px] cursor-pointer ${
            activeSubTab === 'orders'
              ? 'bg-[#0A4A29] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          গ্রাহকের প্রি-বুকিং অর্ডার ({preBookingOrders.length})
        </button>
      </div>

      {/* VIEW 1: PRE-BOOKING CAMPAIGNS */}
      {activeSubTab === 'campaigns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">বর্তমানে কোনো প্রি-বুকিং ক্যাম্পেইন সক্রিয় নেই।</p>
              <p className="text-xs text-slate-400">নতুন প্রি-বুকিং চালু করতে উপরের বাটনে ক্লিক করুন।</p>
            </div>
          ) : (
            campaigns.map((c) => {
              const bookedPct =
                c.totalSlots > 0 ? Math.min(100, Math.round((c.bookedSlots / c.totalSlots) * 100)) : 0;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          প্রি-বুকিং আইটেম
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg leading-snug mt-1">
                          {c.productName}
                        </h3>
                      </div>
                      <button
                        onClick={() => handleToggleActive(c)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition min-h-[36px] ${
                          c.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">মোট মূল্য</span>
                        <strong className="text-slate-900 text-sm">৳ {c.fullPrice}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">অগ্রিম গ্রহণ</span>
                        <strong className="text-emerald-700 text-sm">৳ {c.advanceAmount}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>বুকিং শেষ:</span>
                        <span className="font-semibold text-slate-900">{c.bookingEndDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>সম্ভাব্য ডেলিভারি:</span>
                        <span className="font-semibold text-slate-900">{c.deliveryDate}</span>
                      </div>
                    </div>

                    {/* Slot Progress */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">বুকিং স্লট:</span>
                        <span className="text-[#0A4A29]">
                          {c.bookedSlots} / {c.totalSlots} বুকড ({bookedPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#1E8A52] h-full rounded-full transition-all duration-500"
                          style={{ width: `${bookedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEditModal(c)}
                      className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-[#0A4A29] hover:bg-slate-100 rounded-xl transition flex items-center gap-1 min-h-[40px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => setCampaignToDelete(c)}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছে ফেলুন</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: CUSTOMER PRE-BOOKING ORDERS */}
      {activeSubTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">তারিখ</th>
                  <th className="px-4 py-3.5">কাস্টমারের নাম ও মোবাইল</th>
                  <th className="px-4 py-3.5">পণ্য ও পরিমাণ</th>
                  <th className="px-4 py-3.5">অগ্রিম পরিশোধ</th>
                  <th className="px-4 py-3.5">বকেয়া</th>
                  <th className="px-4 py-3.5">লেনদেন (TxID)</th>
                  <th className="px-4 py-3.5">স্ট্যাটাস</th>
                  <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preBookingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      কোনো প্রি-বুকিং অর্ডার জমা পড়েনি।
                    </td>
                  </tr>
                ) : (
                  preBookingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {order.createdAt ? order.createdAt.split('T')[0] : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{order.customerName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#1E8A52]" />
                          <span>{order.phone}</span>
                        </div>
                        {order.address && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {order.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {order.productName} ({order.quantity} পিস)
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-bold whitespace-nowrap">
                        ৳ {order.advanceAmountPaid}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-bold whitespace-nowrap">
                        ৳ {order.dueAmount}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        <div>{order.paymentMethod}</div>
                        <div className="text-slate-800 font-bold">{order.transactionId || '—'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            order.status === 'Confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.status === 'Confirmed'
                            ? 'নিশ্চিত'
                            : order.status === 'Cancelled'
                            ? 'বাতিল'
                            : 'অপেক্ষমাণ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.status !== 'Confirmed' && (
                            <button
                              onClick={() => handleOrderStatusChange(order.id!, 'Confirmed')}
                              className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition"
                              title="নিশ্চিত করুন"
                            >
                              নিশ্চিত
                            </button>
                          )}
                          {order.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleOrderStatusChange(order.id!, 'Cancelled')}
                              className="px-2.5 py-1 text-xs bg-rose-100 text-rose-800 rounded-lg font-bold hover:bg-rose-200 transition"
                              title="বাতিল করুন"
                            >
                              বাতিল
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (100% Mobile Friendly, Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-slate-100">
            {preBookingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                কোনো প্রি-বুকিং অর্ডার জমা পড়েনি।
              </div>
            ) : (
              preBookingOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      {order.createdAt ? order.createdAt.split('T')[0] : '—'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        order.status === 'Confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.status === 'Confirmed'
                        ? 'নিশ্চিত'
                        : order.status === 'Cancelled'
                        ? 'বাতিল'
                        : 'অপেক্ষমাণ'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{order.customerName}</span>
                      <a
                        href={`tel:${order.phone}`}
                        className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#1E8A52] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 min-h-[32px]"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{order.phone}</span>
                      </a>
                    </div>
                    {order.address && (
                      <p className="text-xs text-slate-500 leading-relaxed">📍 {order.address}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{order.productName}</span>
                      <span className="text-slate-500">পরিমাণ: {order.quantity} পিস</span>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-700 font-bold">অগ্রিম: ৳{order.advanceAmountPaid}</div>
                      <div className="text-slate-500">বকেয়া: ৳{order.dueAmount}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-slate-500 font-mono">
                      {order.paymentMethod} • TxID: <span className="font-bold text-slate-800">{order.transactionId || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {order.status !== 'Confirmed' && (
                        <button
                          onClick={() => handleOrderStatusChange(order.id!, 'Confirmed')}
                          className="min-h-[40px] px-3 text-xs bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition cursor-pointer"
                        >
                          নিশ্চিত
                        </button>
                      )}
                      {order.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleOrderStatusChange(order.id!, 'Cancelled')}
                          className="min-h-[40px] px-3 text-xs bg-rose-100 text-rose-800 rounded-xl font-bold hover:bg-rose-200 transition cursor-pointer"
                        >
                          বাতিল
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#1E8A52]" />
                <span>{editingCampaign ? 'প্রি-বুকিং সম্পাদনা' : 'নতুন প্রি-বুকিং চালু'}</span>
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
            <form id="campaignForm" onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1 pb-28">
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
                      {p.name} (৳ {p.price} / {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    পূর্ণ মূল্য (টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={fullPrice}
                    onChange={(e) =>
                      setFullPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    অগ্রিম গ্রহণের পরিমাণ (টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={advanceAmount}
                    onChange={(e) =>
                      setAdvanceAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    বুকিং শেষের তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingEndDate}
                    onChange={(e) => setBookingEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    সম্ভাব্য ডেলিভারি তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  সর্বমোট প্রাপ্য স্লট সংখ্যা (Total Slots) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="50"
                  value={totalSlots}
                  onChange={(e) =>
                    setTotalSlots(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="campaignActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-[#1E8A52] focus:ring-0"
                />
                <label htmlFor="campaignActiveToggle" className="text-sm font-bold text-slate-700 cursor-pointer">
                  প্রি-বুকিং কাস্টমার স্টোরে সক্রিয় রাখুন
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
                form="campaignForm"
                disabled={isSubmitting}
                className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : editingCampaign ? 'আপডেট করুন' : 'প্রি-বুকিং চালু করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!campaignToDelete}
        title="প্রি-বুকিং মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${campaignToDelete?.productName}" এর প্রি-বুকিং মুছে ফেলা হবে।`}
        warningNote="এটি মুছে ফেললে কাস্টমার স্টোর থেকে প্রি-বুকিং বিকল্পটি অপসারণ করা হবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setCampaignToDelete(null)}
      />
    </div>
  );
};
