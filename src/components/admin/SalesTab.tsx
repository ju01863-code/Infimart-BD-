import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Download,
  Search,
  X,
  Phone,
  MessageCircle,
  AlertTriangle,
  Globe,
  FileText,
} from 'lucide-react';
import { Order, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface SalesTabProps {
  orders: Order[];
  products: Product[];
  onAddOrder: (order: Omit<Order, 'id'>) => Promise<void>;
  onUpdateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
}

export const SalesTab: React.FC<SalesTabProps> = ({
  orders,
  products,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Website' | 'WhatsApp'>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [status, setStatus] = useState<'Pending' | 'Delivered' | 'Cancelled'>('Pending');
  const [source, setSource] = useState<'website_form' | 'whatsapp' | 'admin'>('admin');

  const numQuantity = quantity === '' ? 0 : Number(quantity);
  const numUnitPrice = unitPrice === '' ? 0 : Number(unitPrice);
  const total = numQuantity * numUnitPrice;

  const paymentOptions = ['Cash on Delivery', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer'];

  // Safe helper getters to support both website_form fields and manual sales fields
  const getOrderProductName = (o: Order) => o.productName || o.product || 'অজানা পণ্য';
  const getOrderQuantity = (o: Order) => o.quantity || 1;
  const getOrderUnit = (o: Order) => o.productUnit || '';
  const getOrderUnitPrice = (o: Order) => o.productPrice ?? o.unitPrice ?? 0;
  const getOrderTotal = (o: Order) => o.totalPrice ?? o.total ?? (getOrderQuantity(o) * getOrderUnitPrice(o));
  const getOrderCustomerPhone = (o: Order) => o.customerPhone || o.phone || '';
  const getOrderCustomerAddress = (o: Order) => o.customerAddress || o.address || '';
  const getOrderNotes = (o: Order) => o.customerNotes || o.notes || '';
  const getOrderSource = (o: Order): 'Website' | 'WhatsApp' => {
    if (o.source === 'website_form') return 'Website';
    if (o.source === 'whatsapp') return 'WhatsApp';
    return o.source === 'Website' ? 'Website' : 'WhatsApp';
  };
  const isDelivered = (o: Order) => o.status?.toLowerCase() === 'delivered';
  const isPending = (o: Order) => !isDelivered(o);

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && isPending(order)) ||
      (statusFilter === 'Delivered' && isDelivered(order));

    const orderDate = order.date || order.createdAt?.split('T')[0] || '';
    const matchDate = !dateFilter || orderDate.startsWith(dateFilter);

    const orderSrc = getOrderSource(order);
    const matchSource = sourceFilter === 'All' || orderSrc === sourceFilter;

    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      (order.customerName || '').toLowerCase().includes(searchLower) ||
      getOrderCustomerPhone(order).includes(searchLower) ||
      getOrderCustomerAddress(order).toLowerCase().includes(searchLower) ||
      getOrderProductName(order).toLowerCase().includes(searchLower) ||
      getOrderNotes(order).toLowerCase().includes(searchLower);

    return matchStatus && matchDate && matchSource && matchSearch;
  });

  const openAddModal = () => {
    setEditingOrder(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setNotes('');
    const firstProd = products[0];
    setProductName(firstProd ? firstProd.name : '');
    setUnitPrice(firstProd ? firstProd.price : '');
    setQuantity(1);
    setPaymentMethod('Cash on Delivery');
    setStatus('Pending');
    setSource('admin');
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setDate(order.date || order.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setCustomerName(order.customerName || '');
    setPhone(getOrderCustomerPhone(order));
    setAddress(getOrderCustomerAddress(order));
    setNotes(getOrderNotes(order));
    setProductName(getOrderProductName(order));
    setQuantity(getOrderQuantity(order));
    setUnitPrice(getOrderUnitPrice(order));
    setPaymentMethod(order.paymentMethod || 'Cash on Delivery');
    setStatus(isDelivered(order) ? 'Delivered' : 'Pending');
    setSource((order.source as any) || 'website_form');
    setIsModalOpen(true);
  };

  const handleProductSelect = (pName: string) => {
    setProductName(pName);
    const found = products.find((p) => p.name === pName);
    if (found) {
      setUnitPrice(found.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !productName || numQuantity <= 0) {
      alert('অনুগ্রহ করে কাস্টমারের নাম, ফোন নম্বর এবং পণ্যের পরিমাণ দিন।');
      return;
    }

    try {
      const orderData: Omit<Order, 'id'> = {
        date,
        customerName: customerName.trim(),
        phone: phone.trim(),
        customerPhone: phone.trim(),
        address: address.trim(),
        customerAddress: address.trim(),
        notes: notes.trim(),
        customerNotes: notes.trim(),
        product: productName,
        productName: productName,
        productUnit: products.find((p) => p.name === productName)?.unit || editingOrder?.productUnit || '',
        quantity: numQuantity,
        unitPrice: numUnitPrice,
        productPrice: numUnitPrice,
        total: total,
        totalPrice: total,
        paymentMethod,
        status,
        source: source || (editingOrder?.source || 'admin'),
        createdAt: editingOrder?.createdAt || new Date().toISOString(),
      };

      if (editingOrder?.id) {
        await onUpdateOrder(editingOrder.id, orderData);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddOrder(orderData);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving order:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleStatusToggle = async (order: Order) => {
    if (!order.id) return;
    try {
      const nextStatus = isDelivered(order) ? 'Pending' : 'Delivered';
      await onUpdateOrder(order.id, { status: nextStatus });
      setSuccessMessage(
        `অর্ডার স্ট্যাটাস '${nextStatus === 'Delivered' ? 'ডেলিভার্ড (Delivered)' : 'পেন্ডিং (Pending)'}' হিসেবে আপডেট হয়েছে`
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteOrder(orderToDelete.id);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Error deleting order:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredOrders.map((o, idx) => ({
      ক্রমিক: idx + 1,
      তারিখ: o.date || o.createdAt?.split('T')[0] || '',
      উৎস: getOrderSource(o),
      কাস্টমার_নাম: o.customerName,
      ফোন_নম্বর: getOrderCustomerPhone(o),
      ঠিকানা: getOrderCustomerAddress(o),
      নোট: getOrderNotes(o),
      পণ্য: getOrderProductName(o),
      পরিমাণ: getOrderQuantity(o),
      একক_দর_টাকা: getOrderUnitPrice(o),
      মোট_টাকা: getOrderTotal(o),
      পেমেন্ট_পদ্ধতি: o.paymentMethod || 'Cash on Delivery',
      ডেলিভারি_স্ট্যাটাস: isDelivered(o) ? 'ডেলিভার্ড' : 'পেন্ডিং',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Sales_${dateStr}`);
    } else {
      exportToCSV(data, `InfiMart_Sales_${dateStr}`);
    }
  };

  const totalDelivered = orders.filter((o) => isDelivered(o)).length;
  const totalPending = orders.filter((o) => isPending(o)).length;
  const totalWebsite = orders.filter((o) => getOrderSource(o) === 'Website').length;

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
            <ShoppingBag className="w-6 h-6 text-[#1E8A52]" />
            <span>বিক্রয় ও অর্ডার (Sales & Orders)</span>
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1">
            <span>মোট অর্ডার: <strong className="text-slate-800">{orders.length}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Website: {totalWebsite}
            </span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">
              ডেলিভার্ড: {totalDelivered}
            </span>
            <span>•</span>
            <span className="text-amber-600 font-bold">
              পেন্ডিং: {totalPending}
            </span>
          </div>
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
            className="flex items-center gap-1.5 bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#FFB300]" />
            <span>নতুন বিক্রয় / অর্ডার এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* Filters Bar: Search, Date, Source Filter, Status Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="w-full lg:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="কাস্টমার নাম, ফোন, ঠিকানা, পণ্য..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
          />
        </div>

        <div className="w-full lg:w-auto flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-rose-500 font-bold hover:underline"
            >
              রিসেট
            </button>
          )}

          {/* Source Filter: All, Website, WhatsApp */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['All', 'Website', 'WhatsApp'] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  sourceFilter === src
                    ? 'bg-[#0A4A29] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {src === 'All' ? 'সব উৎস' : src === 'Website' ? '🌐 Website' : '💬 WhatsApp'}
              </button>
            ))}
          </div>

          {/* Status Filter: All, Pending, Delivered */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {['All', 'Pending', 'Delivered'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-[#0A4A29] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'All' ? 'সব স্ট্যাটাস' : st === 'Pending' ? 'পেন্ডিং' : 'ডেলিভার্ড'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">তারিখ ও উৎস</th>
                <th className="px-4 py-3.5">কাস্টমারের তথ্য</th>
                <th className="px-4 py-3.5">অর্ডারকৃত পণ্য</th>
                <th className="px-4 py-3.5">পরিমাণ ও দর</th>
                <th className="px-4 py-3.5">মোট মূল্য</th>
                <th className="px-4 py-3.5">স্ট্যাটাস</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">কোনো অর্ডার পাওয়া যায়নি।</p>
                      <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করুন বা নতুন বিক্রয় এন্ট্রি করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isDeliv = isDelivered(order);
                  const orderSrc = getOrderSource(order);
                  const custPhone = getOrderCustomerPhone(order);
                  const custAddress = getOrderCustomerAddress(order);
                  const custNotes = getOrderNotes(order);
                  const prodName = getOrderProductName(order);
                  const prodQty = getOrderQuantity(order);
                  const prodUnit = getOrderUnit(order);
                  const prodUnitPrice = getOrderUnitPrice(order);
                  const orderTotal = getOrderTotal(order);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      {/* 1. Date & Source */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="font-semibold text-slate-600">
                          {order.date || order.createdAt?.split('T')[0] || '—'}
                        </div>
                        <div className="mt-1">
                          {orderSrc === 'Website' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                              <Globe className="w-3 h-3 text-emerald-600" />
                              <span>Website</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                              <MessageCircle className="w-3 h-3 text-green-600" />
                              <span>WhatsApp</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Customer Info */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{order.customerName}</div>
                        {custPhone && (
                          <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#1E8A52]" />
                            <a
                              href={`tel:${custPhone}`}
                              className="hover:underline font-mono"
                            >
                              {custPhone}
                            </a>
                          </div>
                        )}
                        {custAddress && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            📍 {custAddress}
                          </div>
                        )}
                        {custNotes && (
                          <div className="text-[11px] text-amber-900 bg-amber-50 rounded-md px-1.5 py-0.5 mt-1 border border-amber-200 flex items-center gap-1 max-w-xs truncate">
                            <FileText className="w-3 h-3 shrink-0 text-amber-600" />
                            <span>নোট: {custNotes}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Product */}
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {prodName}
                      </td>

                      {/* 4. Quantity & Unit Price */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span className="font-bold">{prodQty} {prodUnit}</span>
                        <span className="text-xs text-slate-400 ml-1">x ৳{prodUnitPrice}</span>
                      </td>

                      {/* 5. Total Price */}
                      <td className="px-4 py-3 font-black text-[#0A4A29] whitespace-nowrap">
                        ৳ {orderTotal.toLocaleString('en-US')}
                      </td>

                      {/* 6. Status: Pending / Delivered */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleStatusToggle(order)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            isDeliv
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                        >
                          {isDeliv ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          <span>{isDeliv ? 'ডেলিভার্ড' : 'পেন্ডিং'}</span>
                        </button>
                      </td>

                      {/* 7. Action buttons: Mark as Delivered, WhatsApp, Edit, Delete */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark as Delivered Quick Action */}
                          {!isDeliv && (
                            <button
                              onClick={() => handleStatusToggle(order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                              title="ডেলিভার্ড হিসেবে চিহ্নিত করুন"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">ডেলিভার্ড</span>
                            </button>
                          )}

                          {/* WhatsApp Customer Link */}
                          {custPhone && (
                            <a
                              href={`https://wa.me/${custPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `আসসালামু আলাইকুম ${order.customerName} ভাই/আপু, InfiMart BD থেকে আপনার ${prodName} এর অর্ডার বিষয়ে যোগাযোগ করছি।`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="কাস্টমারকে WhatsApp মেসেজ দিন"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="সম্পাদনা (Edit)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="মুছে ফেলুন (Delete)"
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

        {/* Mobile Cards View (100% Mobile Friendly, Zero Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">কোনো অর্ডার পাওয়া যায়নি।</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isDeliv = isDelivered(order);
              const orderSrc = getOrderSource(order);
              const custPhone = getOrderCustomerPhone(order);
              const custAddress = getOrderCustomerAddress(order);
              const prodName = getOrderProductName(order);
              const prodQty = getOrderQuantity(order);
              const prodUnit = getOrderUnit(order);
              const prodUnitPrice = getOrderUnitPrice(order);
              const orderTotal = getOrderTotal(order);

              return (
                <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                  {/* Top Bar: Date, Source & Delivery Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-600">
                        {order.date || order.createdAt?.split('T')[0] || '—'}
                      </span>
                      {orderSrc === 'Website' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                          <Globe className="w-3 h-3 text-emerald-600" />
                          <span>Website</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-300">
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          <span>WhatsApp</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStatusToggle(order)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition min-h-[36px] cursor-pointer ${
                        isDeliv
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {isDeliv ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ডেলিভার্ড</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>পেন্ডিং</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Customer & Address */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{order.customerName}</span>
                      {custPhone && (
                        <a
                          href={`tel:${custPhone}`}
                          className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#1E8A52] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 min-h-[32px]"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{custPhone}</span>
                        </a>
                      )}
                    </div>
                    {custAddress && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        📍 {custAddress}
                      </p>
                    )}
                  </div>

                  {/* Product & Price Details */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{prodName}</div>
                      <div className="text-xs text-slate-500">
                        পরিমাণ: {prodQty} {prodUnit} {prodUnitPrice > 0 && `(৳${prodUnitPrice}/${prodUnit})`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-[#0A4A29]">
                        ৳{orderTotal.toLocaleString('en-US')}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {order.paymentMethod || 'ক্যাশ অন ডেলিভারি'}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions: WhatsApp chat, Edit, Delete */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {custPhone && (
                      <a
                        href={`https://wa.me/${custPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `আসসালামু আলাইকুম ${order.customerName} ভাই/আপু, InfiMart BD থেকে আপনার ${prodName} এর অর্ডার বিষয়ে যোগাযোগ করছি।`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[44px] px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(order)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                      title="সম্পাদনা"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Order Modal - 100% Mobile Friendly */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg sm:text-xl font-black text-[#0A4A29] mb-4">
              {editingOrder ? 'অর্ডার সম্পাদনা (Edit Order)' : 'নতুন বিক্রয় / অর্ডার এন্ট্রি'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ডেলিভারি স্ট্যাটাস *
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'Pending' | 'Delivered' | 'Cancelled')
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  >
                    <option value="Pending">পেন্ডিং (Pending)</option>
                    <option value="Delivered">ডেলিভার্ড (Delivered)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কাস্টমার নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: মোঃ ইকবাল হোসেন"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ফোন নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="যেমন: 018XXXXXXXX"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: শহীদ শহীদুল্লাহ কায়সার সড়ক, ফেনী"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অর্ডার নোট / অতিরিক্ত নির্দেশনা
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="যেমন: বিকেলে ডেলিভারি দিন..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পণ্য নির্বাচন *</label>
                  <select
                    value={productName}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px] font-medium"
                  >
                    <option value="">পণ্য বেছে নিন</option>
                    {products.map((p) => (
                      <option key={p.id || p.name} value={p.name}>
                        {p.name} (৳ {p.price} / {p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অর্ডারের উৎস (Source)
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  >
                    <option value="website_form">Website (ওয়েবসাইট ফর্ম)</option>
                    <option value="whatsapp">WhatsApp (হোয়াটসঅ্যাপ)</option>
                    <option value="admin">Admin (ম্যানুয়াল এন্ট্রি)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পরিমাণ *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    একক দর (টাকা) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              {/* Auto-calculated Total Display */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">মোট মূল্য (পরিমাণ × দর):</span>
                <span className="text-xl font-black text-[#0A4A29]">
                  ৳ {total.toLocaleString('en-US')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পেমেন্ট পদ্ধতি
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-base min-h-[48px]"
                >
                  {paymentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-h-[48px]"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-2.5 rounded-xl text-base font-bold transition shadow-sm cursor-pointer min-h-[48px]"
                >
                  {editingOrder ? 'আপডেট করুন' : 'অর্ডার সেভ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal in Bengali */}
      <ConfirmModal
        isOpen={!!orderToDelete}
        title="অর্ডার মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${orderToDelete?.customerName}" এর ${orderToDelete?.product} অর্ডারটি মুছে ফেলা হবে।`}
        warningNote="অর্ডারটি মুছে ফেললে বিক্রয় রিপোর্ট ও কাস্টমার হিসাব থেকে এটি স্থায়ীভাবে মুছে যাবে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setOrderToDelete(null)}
      />
    </div>
  );
};
