import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  Edit2,
  Trash2,
  X,
  Plus,
  Phone,
  Calendar,
  ShoppingBag,
  Gift,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Globe,
  Crown,
  Trophy,
  Medal,
  Award,
  Star,
  ArrowUpDown,
  Sparkles,
  DollarSign,
} from 'lucide-react';
import { Customer, Order } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';
import {
  calculateAllCustomerLoyalties,
  toBanglaDigits,
  LOYALTY_TIERS,
  LoyaltyTierKey,
  CustomerLoyaltyRankInfo,
} from '../../utils/loyalty';

interface CustomerTabProps {
  customers: Customer[];
  orders: Order[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  onUpdateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const CustomerTab: React.FC<CustomerTabProps> = ({
  customers,
  orders,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'local' | 'expat'>('all');
  const [loyaltyTierFilter, setLoyaltyTierFilter] = useState<'all' | LoyaltyTierKey>('all');
  const [sortBy, setSortBy] = useState<'loyalty_rank' | 'orders_desc' | 'name_asc' | 'purchase_asc'>('loyalty_rank');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Compute loyalty score, ranking, and tiers for all customers
  const loyaltyData = useMemo(() => {
    return calculateAllCustomerLoyalties(customers, orders);
  }, [customers, orders]);

  // Helper to retrieve customer's loyalty rank and score
  const getCustomerLoyalty = (c: Customer): CustomerLoyaltyRankInfo | undefined => {
    const clean = (c.phone || '').replace(/[^0-9]/g, '');
    if (clean && loyaltyData.rankMapByPhone.has(clean)) {
      return loyaltyData.rankMapByPhone.get(clean);
    }
    if (c.id && loyaltyData.rankMapById.has(c.id)) {
      return loyaltyData.rankMapById.get(c.id);
    }
    return undefined;
  };

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [totalOrders, setTotalOrders] = useState<number | ''>(1);
  const [totalPurchase, setTotalPurchase] = useState<number | ''>(0);
  const [giftStatus, setGiftStatus] = useState<'Not Sent' | 'Sent'>('Not Sent');
  const [customerType, setCustomerType] = useState<'local' | 'expat'>('local');
  const [country, setCountry] = useState('বাংলাদেশ (Bangladesh)');

  // Counts for filters
  const typeCounts = {
    all: customers.length,
    local: customers.filter((c) => c.customerType !== 'expat').length,
    expat: customers.filter((c) => c.customerType === 'expat').length,
  };

  const filteredCustomers = useMemo(() => {
    const result = customers.filter((c) => {
      // Customer Type Filter: 'all' | 'local' | 'expat'
      if (customerTypeFilter === 'local' && c.customerType === 'expat') {
        return false;
      }
      if (customerTypeFilter === 'expat' && c.customerType !== 'expat') {
        return false;
      }

      // Loyalty Tier Filter: 'all' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'starter'
      const loyalty = getCustomerLoyalty(c);
      if (loyaltyTierFilter !== 'all' && loyalty && loyalty.tier.key !== loyaltyTierFilter) {
        return false;
      }

      const s = searchTerm.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(s);
      const phoneMatch = c.phone.includes(searchTerm);
      const addressMatch = (c.address || '').toLowerCase().includes(s);
      const countryMatch = (c.country || '').toLowerCase().includes(s);
      const tierMatch = loyalty ? loyalty.tier.labelBn.toLowerCase().includes(s) || loyalty.tier.labelEn.toLowerCase().includes(s) : false;

      return nameMatch || phoneMatch || addressMatch || countryMatch || tierMatch;
    });

    // Apply sorting
    result.sort((a, b) => {
      const loyA = getCustomerLoyalty(a);
      const loyB = getCustomerLoyalty(b);

      if (sortBy === 'loyalty_rank') {
        const rankA = loyA?.rank ?? 99999;
        const rankB = loyB?.rank ?? 99999;
        return rankA - rankB;
      }
      if (sortBy === 'orders_desc') {
        return (Number(b.totalOrders || 0)) - (Number(a.totalOrders || 0));
      }
      if (sortBy === 'purchase_asc') {
        return (Number(a.totalPurchase || 0)) - (Number(b.totalPurchase || 0));
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'bn');
      }
      return 0;
    });

    return result;
  }, [customers, customerTypeFilter, loyaltyTierFilter, searchTerm, sortBy, loyaltyData]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setTotalOrders(1);
    setTotalPurchase(0);
    setGiftStatus('Not Sent');
    setCustomerType('local');
    setCountry('বাংলাদেশ (Bangladesh)');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address);
    setTotalOrders(c.totalOrders || 0);
    setTotalPurchase(c.totalPurchase || 0);
    setGiftStatus(c.giftStatus || 'Not Sent');
    setCustomerType(c.customerType || 'local');
    setCountry(c.country || (c.customerType === 'expat' ? 'প্রবাসী' : 'বাংলাদেশ (Bangladesh)'));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('অনুগ্রহ করে কাস্টমারের নাম ও মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    try {
      const payload: Omit<Customer, 'id'> = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        firstOrder: editingCustomer?.firstOrder || new Date().toISOString().split('T')[0],
        lastOrder: new Date().toISOString().split('T')[0],
        totalOrders: Number(totalOrders || 1),
        totalPurchase: Number(totalPurchase || 0),
        giftStatus,
        customerType,
        country: customerType === 'local' ? 'বাংলাদেশ (Bangladesh)' : (country.trim() || 'প্রবাসী'),
        createdAt: editingCustomer?.createdAt || new Date().toISOString(),
      };

      if (editingCustomer?.id) {
        await onUpdateCustomer(editingCustomer.id, payload);
        setSuccessMessage('সফলভাবে আপডেট হয়েছে');
      } else {
        await onAddCustomer(payload);
        setSuccessMessage('সফলভাবে সেভ হয়েছে');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving customer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteCustomer(customerToDelete.id);
      setSuccessMessage('সফলভাবে মুছে ফেলা হয়েছে');
      setTimeout(() => setSuccessMessage(null), 3000);
      setCustomerToDelete(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setErrorMessage('কিছু ভুল হয়েছে। আবার চেষ্টা করুন।');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredCustomers.map((c, idx) => {
      const loyalty = getCustomerLoyalty(c);
      return {
        ক্রমিক: idx + 1,
        লয়ালটি_র‍্যাঙ্ক: loyalty ? loyalty.rankDisplayBangla : `#${idx + 1}`,
        লয়ালটি_স্কোর: loyalty ? loyalty.score : 0,
        লয়ালটি_স্তর: loyalty ? `${loyalty.tier.badgeEmoji} ${loyalty.tier.labelBn}` : 'সাধারণ',
        কাস্টমার_নাম: c.name,
        মোবাইল: c.phone,
        ধরন: c.customerType === 'expat' ? 'প্রবাসী' : 'দেশি',
        দেশ: c.country || (c.customerType === 'expat' ? 'প্রবাসী' : 'বাংলাদেশ'),
        ঠিকানা: c.address,
        প্রথম_অর্ডার_তারিখ: c.firstOrder,
        সর্বশেষ_অর্ডার_তারিখ: c.lastOrder,
        মোট_অর্ডার_সংখ্যা: c.totalOrders,
        মোট_ক্রয়_টাকা: c.totalPurchase,
        উপহার_স্ট্যাটাস: c.giftStatus === 'Sent' ? 'পাঠানো হয়েছে' : 'পাঠানো হয়নি',
      };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Customers_${dateStr}`, 'Customers');
    } else {
      exportToCSV(data, `InfiMart_Customers_${dateStr}`);
    }
  };

  // Get orders of selected customer
  const customerOrders = selectedCustomerForHistory
    ? orders.filter(
        (o) =>
          o.phone.replace(/[^0-9]/g, '') ===
            selectedCustomerForHistory.phone.replace(/[^0-9]/g, '') ||
          o.customerName.toLowerCase() === selectedCustomerForHistory.name.toLowerCase()
      )
    : [];

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
              <Users className="w-6 h-6 text-[#1E8A52]" />
              <span>কাস্টমার ডাটাবেজ ও লয়ালটি র‍্যাংকিং</span>
            </h2>
            <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span>ভিআইপি র‍্যাঙ্ক</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            মোট নিবন্ধিত কাস্টমার: <span className="font-bold text-slate-800">{toBanglaDigits(customers.length)}</span> জন | মোট ক্রয় ভলিউমের ভিত্তিতে লয়ালটি স্কোর ও স্তর নির্ধারিত
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition border border-slate-300 min-h-[44px]"
            title="লয়ালটি র‍্যাঙ্ক সহ এক্সেল ডাউনলোড"
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
            <span>নতুন কাস্টমার যোগ</span>
          </button>
        </div>
      </div>

      {/* Loyalty & Database KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-bold">মোট কাস্টমার</span>
            <Users className="w-4 h-4 text-[#1E8A52]" />
          </div>
          <h4 className="text-2xl font-black text-slate-800">
            {toBanglaDigits(customers.length)} <span className="text-xs font-medium text-slate-400">জন</span>
          </h4>
          <span className="text-[11px] text-slate-400">ডাটাবেজে সংরক্ষিত</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-purple-700 font-bold">ভিআইপি গ্রাহক (টপ)</span>
            <Crown className="w-4 h-4 text-purple-600" />
          </div>
          <h4 className="text-2xl font-black text-purple-900">
            {toBanglaDigits(loyaltyData.summary.vipCount)} <span className="text-xs font-medium text-purple-600">জন</span>
          </h4>
          <span className="text-[11px] text-purple-600 font-medium">প্ল্যাটিনাম + গোল্ড টিয়ার</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-emerald-700 font-bold">মোট ক্রয় ভলিউম</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-emerald-900">
            ৳ {loyaltyData.summary.totalPurchaseVolume.toLocaleString('en-US')}
          </h4>
          <span className="text-[11px] text-emerald-600 font-medium">সর্বমোট গ্রাহক রাজস্ব</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-amber-700 font-bold">গড় লয়ালটি স্কোর</span>
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="text-2xl font-black text-amber-900">
            {toBanglaDigits(loyaltyData.summary.averageScore)} <span className="text-xs font-medium text-amber-600">পয়েন্ট</span>
          </h4>
          <span className="text-[11px] text-amber-600 font-medium">৳১০০ = ১ পয়েন্ট + বোনাস</span>
        </div>
      </div>

      {/* Filter Tabs, Loyalty Tier Pills, Sort & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Origin Filters & Sort Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Customer Origin Filter Tabs: All, Bangladeshi, Expat */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            <button
              type="button"
              onClick={() => setCustomerTypeFilter('all')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                customerTypeFilter === 'all'
                  ? 'bg-[#0A4A29] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>🔵 সব কাস্টমার</span>
              <span className="bg-black/15 text-inherit px-2 py-0.5 rounded-full text-[11px] font-bold">
                {toBanglaDigits(typeCounts.all)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerTypeFilter('local')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                customerTypeFilter === 'local'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>🇧🇩 দেশি কাস্টমার</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${customerTypeFilter === 'local' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'}`}>
                {toBanglaDigits(typeCounts.local)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerTypeFilter('expat')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                customerTypeFilter === 'expat'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <span>🌍 প্রবাসী কাস্টমার</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${customerTypeFilter === 'expat' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'}`}>
                {toBanglaDigits(typeCounts.expat)}
              </span>
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>সাজান:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E8A52] cursor-pointer"
            >
              <option value="loyalty_rank">👑 লয়ালটি র‍্যাঙ্ক (#১ থেকে)</option>
              <option value="orders_desc">📦 সর্বাধিক অর্ডার সংখ্যা</option>
              <option value="name_asc">🔤 নামানুসারে (A-Z)</option>
              <option value="purchase_asc">💰 সর্বনিম্ন ক্রয় প্রথমে</option>
            </select>
          </div>
        </div>

        {/* Row 2: Loyalty Tier Pills & Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">লয়ালটি স্তর:</span>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                loyaltyTierFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব স্তর ({toBanglaDigits(customers.length)})
            </button>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('platinum')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                loyaltyTierFilter === 'platinum'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              <span>👑 প্ল্যাটিনাম (৳২০k+)</span>
              <span className="bg-purple-200/60 px-1.5 py-0.2 rounded-full text-[10px]">
                {toBanglaDigits(loyaltyData.summary.tierCounts.platinum)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('gold')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                loyaltyTierFilter === 'gold'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>🥇 গোল্ড (৳১০k+)</span>
              <span className="bg-amber-200/60 px-1.5 py-0.2 rounded-full text-[10px]">
                {toBanglaDigits(loyaltyData.summary.tierCounts.gold)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('silver')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                loyaltyTierFilter === 'silver'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>🥈 সিলভার (৳৫k+)</span>
              <span className="bg-slate-200/80 px-1.5 py-0.2 rounded-full text-[10px]">
                {toBanglaDigits(loyaltyData.summary.tierCounts.silver)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('bronze')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                loyaltyTierFilter === 'bronze'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              <span>🥉 ব্রোঞ্জ (৳১.৫k+)</span>
              <span className="bg-orange-200/60 px-1.5 py-0.2 rounded-full text-[10px]">
                {toBanglaDigits(loyaltyData.summary.tierCounts.bronze)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLoyaltyTierFilter('starter')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                loyaltyTierFilter === 'starter'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>🌱 সাধারণ</span>
              <span className="bg-emerald-200/60 px-1.5 py-0.2 rounded-full text-[10px]">
                {toBanglaDigits(loyaltyData.summary.tierCounts.starter)}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="নাম, ফোন, স্তর বা ঠিকানা সার্চ..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
            />
          </div>
        </div>
      </div>

      {/* Customers Table (Desktop) / Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-[#0A4A29]/5 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-16">র‍্যাঙ্ক</th>
                <th className="px-4 py-3.5">কাস্টমারের তথ্য</th>
                <th className="px-4 py-3.5">লয়ালটি স্তর ও স্কোর</th>
                <th className="px-4 py-3.5">ঠিকানা</th>
                <th className="px-4 py-3.5 text-center">মোট অর্ডার</th>
                <th className="px-4 py-3.5 text-right">মোট ক্রয় (টাকা)</th>
                <th className="px-4 py-3.5 text-center">উপহার</th>
                <th className="px-4 py-3.5 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">এখনো কোনো কাস্টমার তথ্য পাওয়া যায়নি।</p>
                      <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করুন অথবা নতুন কাস্টমার যুক্ত করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const loyalty = getCustomerLoyalty(c);
                  const isRank1 = loyalty?.rank === 1;
                  const isRank2 = loyalty?.rank === 2;
                  const isRank3 = loyalty?.rank === 3;
                  const isVip = loyalty?.tier.key === 'platinum' || loyalty?.tier.key === 'gold';

                  return (
                    <tr
                      key={c.id || c.phone}
                      className={`transition ${
                        isRank1
                          ? 'bg-amber-50/40 hover:bg-amber-50/80 font-medium'
                          : isRank2
                          ? 'bg-slate-50/50 hover:bg-slate-100/70'
                          : isRank3
                          ? 'bg-orange-50/30 hover:bg-orange-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Loyalty Rank Column */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shadow-xs ${
                            isRank1
                              ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                              : isRank2
                              ? 'bg-slate-300 text-slate-900 ring-2 ring-slate-200'
                              : isRank3
                              ? 'bg-orange-300 text-orange-950 ring-2 ring-orange-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={`লয়ালটি র‍্যাঙ্ক: ${loyalty?.rankDisplayBangla || '#'}`}
                        >
                          {isRank1 ? '👑' : isRank2 ? '🥇' : isRank3 ? '🥈' : (loyalty ? loyalty.rankDisplayBangla : '—')}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div
                            onClick={() => setSelectedCustomerForHistory(c)}
                            className="font-bold text-slate-900 hover:text-[#1E8A52] cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{c.name}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </div>

                          {/* Customer Type Badge */}
                          {c.customerType === 'expat' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200">
                              <Globe className="w-2.5 h-2.5 text-indigo-600" />
                              <span>প্রবাসী {c.country && c.country !== 'প্রবাসী' && c.country !== 'বাংলাদেশ (Bangladesh)' ? `(${c.country.split('(')[0].trim()})` : ''}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-200">
                              <span>🇧🇩 দেশি</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#0A4A29]" />
                          <span>{c.phone}</span>
                        </div>
                      </td>

                      {/* Loyalty Tier & Score Column */}
                      <td className="px-4 py-3 min-w-[170px]">
                        {loyalty ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${loyalty.tier.bgClass} ${loyalty.tier.textClass} ${loyalty.tier.borderClass}`}
                              >
                                <span>{loyalty.tier.badgeEmoji}</span>
                                <span>{loyalty.tier.labelBn}</span>
                              </span>
                              <span className="bg-[#0A4A29]/10 text-[#0A4A29] px-2 py-0.5 rounded-md font-black text-xs">
                                {loyalty.scoreDisplayBangla} পয়েন্ট
                              </span>
                            </div>

                            {/* Mini progress to next tier */}
                            {loyalty.nextTier ? (
                              <div className="pt-0.5">
                                <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-amber-500 to-[#1E8A52] h-1.5 rounded-full"
                                    style={{ width: `${loyalty.progressPercent}%` }}
                                    title={`${loyalty.nextTier.labelBn}-এ যেতে আর ৳${loyalty.amountToNextTier.toLocaleString('en-US')} কেনাকাটা বাকি`}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {loyalty.nextTier.badgeEmoji} আর ৳{loyalty.amountToNextTier.toLocaleString('en-US')} বাকি
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-purple-700 font-bold block">
                                👑 সর্বোচ্চ স্তর অর্জিত
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                        {c.address || '—'}
                      </td>

                      {/* Total Orders */}
                      <td className="px-4 py-3 font-bold text-slate-800 text-center">
                        {toBanglaDigits(c.totalOrders)}
                      </td>

                      {/* Total Purchase Volume */}
                      <td className="px-4 py-3 font-black text-[#0A4A29] text-base text-right whitespace-nowrap">
                        ৳ {Number(c.totalPurchase || 0).toLocaleString('en-US')}
                      </td>

                      {/* Gift Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            c.giftStatus === 'Sent'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Gift className="w-3 h-3" />
                          <span>{c.giftStatus === 'Sent' ? 'পাঠানো হয়েছে' : 'পাঠানো হয়নি'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCustomerForHistory(c)}
                            className="px-2.5 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-[#0A4A29] rounded-lg font-bold transition cursor-pointer"
                            title="লয়ালটি ও অর্ডার হিস্ট্রি"
                          >
                            হিস্ট্রি
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 text-slate-600 hover:text-[#0A4A29] hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(c)}
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

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              এখনো কোনো কাস্টমার তথ্য নেই।
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const loyalty = getCustomerLoyalty(c);
              const isRank1 = loyalty?.rank === 1;
              const isRank2 = loyalty?.rank === 2;
              const isRank3 = loyalty?.rank === 3;
              const isVip = loyalty?.tier.key === 'platinum' || loyalty?.tier.key === 'gold';

              return (
                <div
                  key={c.id || c.phone}
                  className={`p-4 space-y-3 transition ${
                    isRank1
                      ? 'bg-amber-50/30 border-l-4 border-amber-500'
                      : isRank2
                      ? 'bg-slate-50/50 border-l-4 border-slate-400'
                      : isRank3
                      ? 'bg-orange-50/30 border-l-4 border-orange-400'
                      : isVip
                      ? 'bg-purple-50/20 border-l-4 border-purple-400'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  {/* Top Loyalty Rank Header on Mobile */}
                  {loyalty && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            isRank1
                              ? 'bg-amber-400 text-amber-950'
                              : isRank2
                              ? 'bg-slate-300 text-slate-900'
                              : isRank3
                              ? 'bg-orange-300 text-orange-950'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {isRank1 ? '👑' : isRank2 ? '🥇' : isRank3 ? '🥈' : loyalty.rankDisplayBangla}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border ${loyalty.tier.bgClass} ${loyalty.tier.textClass} ${loyalty.tier.borderClass}`}
                        >
                          <span>{loyalty.tier.badgeEmoji}</span>
                          <span>{loyalty.tier.labelBn}</span>
                        </span>
                      </div>
                      <span className="bg-[#0A4A29]/10 text-[#0A4A29] px-2 py-0.5 rounded font-black text-xs">
                        {loyalty.scoreDisplayBangla} পয়েন্ট
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{c.name}</h3>
                        {c.customerType === 'expat' ? (
                          <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200">
                            <Globe className="w-2.5 h-2.5 text-indigo-600" />
                            <span>প্রবাসী {c.country && c.country !== 'প্রবাসী' && c.country !== 'বাংলাদেশ (Bangladesh)' ? `(${c.country.split('(')[0].trim()})` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-200">
                            <span>🇧🇩 দেশি</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[#0A4A29] font-semibold mt-1">
                        <Phone className="w-3.5 h-3.5 text-[#1E8A52]" />
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
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
                        onClick={() => setCustomerToDelete(c)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {c.address && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {c.address}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">মোট অর্ডার</span>
                      <span className="font-bold text-slate-800 text-sm">{toBanglaDigits(c.totalOrders)} টি</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">মোট ক্রয়মূল্য (ভলিউম)</span>
                      <span className="font-black text-[#0A4A29] text-base">
                        ৳ {Number(c.totalPurchase || 0).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Loyalty Progress on Mobile */}
                  {loyalty?.nextTier && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="font-bold">পরবর্তী স্তর: {loyalty.nextTier.badgeEmoji} {loyalty.nextTier.labelBn}</span>
                        <span className="font-bold text-slate-800">{toBanglaDigits(loyalty.progressPercent)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-[#1E8A52] h-1.5 rounded-full"
                          style={{ width: `${loyalty.progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400">
                        আর মাত্র ৳ {loyalty.amountToNextTier.toLocaleString('en-US')} কেনাকাটায় স্তর আপডেট হবে
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        c.giftStatus === 'Sent'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Gift className="w-3 h-3" />
                      <span>{c.giftStatus === 'Sent' ? 'উপহার পাঠানো হয়েছে' : 'উপহার পাঠানো হয়নি'}</span>
                    </span>

                    <button
                      onClick={() => setSelectedCustomerForHistory(c)}
                      className="px-3 py-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-[#0A4A29] rounded-xl font-bold transition min-h-[40px] cursor-pointer"
                    >
                      লয়ালটি ও হিস্ট্রি
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Order History Modal */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 relative my-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#0A4A29]">
                  {selectedCustomerForHistory.name} - অর্ডার হিস্ট্রি
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ফোন: {selectedCustomerForHistory.phone} | মোট ক্রয়: ৳{' '}
                  {Number(selectedCustomerForHistory.totalPurchase || 0).toLocaleString('en-US')}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loyalty Profile Banner */}
            {(() => {
              const loyalty = getCustomerLoyalty(selectedCustomerForHistory);
              if (!loyalty) return null;
              return (
                <div className="bg-gradient-to-r from-amber-50 to-emerald-50 border-b border-amber-200/80 p-4 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-amber-950 font-black text-xs px-2.5 py-1 rounded-full shadow-xs">
                        লয়ালটি র‍্যাঙ্ক {loyalty.rankDisplayBangla}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${loyalty.tier.bgClass} ${loyalty.tier.textClass} ${loyalty.tier.borderClass}`}>
                        <span>{loyalty.tier.badgeEmoji}</span>
                        <span>{loyalty.tier.labelBn}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-medium">লয়ালটি স্কোর: </span>
                      <strong className="text-sm font-black text-[#0A4A29]">
                        {loyalty.scoreDisplayBangla} পয়েন্ট
                      </strong>
                    </div>
                  </div>

                  {loyalty.nextTier ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                        <span>পরবর্তী স্তর: {loyalty.nextTier.badgeEmoji} {loyalty.nextTier.labelBn}</span>
                        <span className="font-bold">{toBanglaDigits(loyalty.progressPercent)}% অর্জিত</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-[#1E8A52] h-2 rounded-full"
                          style={{ width: `${loyalty.progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        আর মাত্র ৳ {loyalty.amountToNextTier.toLocaleString('en-US')} কেনাকাটায় {loyalty.nextTier.labelBn} স্তরে উন্নীত হবেন (মোট ভলিউম লক্ষ্য: ৳{loyalty.nextTier.minPurchase.toLocaleString('en-US')})
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-purple-800 font-bold flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <span>অভিনন্দন! এই গ্রাহক InfiMart BD-এর সর্বোচ্চ প্ল্যাটিনাম ভিআইপি স্তরে অবস্থান করছেন।</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* List */}
            <div className="overflow-y-auto p-6 space-y-3 flex-1 pb-12">
              {customerOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  এই কাস্টমারের কোনো পূর্ববর্তী অর্ডার রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                customerOrders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 border border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="text-slate-400 text-[11px] block">{o.date}</span>
                      <strong className="text-slate-900 font-bold text-base block">{o.product}</strong>
                      <span className="text-slate-500">
                        {o.quantity} পিস × ৳{o.unitPrice} | পেমেন্ট: {o.paymentMethod}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-[#0A4A29] block">৳ {o.total}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status === 'Delivered' ? 'ডেলিভার্ড' : 'পেন্ডিং'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 relative my-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
              <h3 className="text-lg sm:text-xl font-black text-[#0A4A29]">
                {editingCustomer ? 'কাস্টমার তথ্য সম্পাদনা' : 'নতুন কাস্টমার নিবন্ধন'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 flex-1 pb-16">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  কাস্টমারের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যেমন: মোঃ ইকবাল হোসেন"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  মোবাইল নম্বর *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 018XXXXXXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[48px]"
                />
              </div>

              {/* Customer Type Selection: Local vs Expat */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  কাস্টমার ধরন (Customer Type) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerType('local');
                      setCountry('বাংলাদেশ (Bangladesh)');
                    }}
                    className={`min-h-[44px] p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      customerType === 'local'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>🇧🇩 দেশি কাস্টমার</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('expat')}
                    className={`min-h-[44px] p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      customerType === 'expat'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>🌍 প্রবাসী কাস্টমার</span>
                  </button>
                </div>

                {customerType === 'expat' && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      অবস্থানরত দেশ (Country) *
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="যেমন: সৌদি আরব, দুবাই (UAE), কাতার, কুয়েত, মালয়েশিয়া..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      required={customerType === 'expat'}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">ঠিকানা</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: শান্তি কোম্পানি মোড়, ফেনী"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    মোট অর্ডার সংখ্যা
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalOrders}
                    onChange={(e) => setTotalOrders(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    মোট ক্রয়মূল্য (টাকা)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={totalPurchase}
                    onChange={(e) => setTotalPurchase(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  উপহার স্ট্যাটাস
                </label>
                <select
                  value={giftStatus}
                  onChange={(e) => setGiftStatus(e.target.value as 'Not Sent' | 'Sent')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base min-h-[48px] bg-white font-medium"
                >
                  <option value="Not Sent">পাঠানো হয়নি (Not Sent)</option>
                  <option value="Sent">পাঠানো হয়েছে (Sent)</option>
                </select>
              </div>

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
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-6 py-3 rounded-xl text-sm font-bold transition shadow-md min-h-[48px] cursor-pointer"
                >
                  {editingCustomer ? 'আপডেট করুন' : 'কাস্টমার সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!customerToDelete}
        title="কাস্টমার মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত? "${customerToDelete?.name}" কাস্টমারটির সকল তথ্য মুছে ফেলা হবে।`}
        warningNote="কাস্টমার মুছে ফেললে তার পূর্ববর্তী ক্রয়ের ইতিহাস ও গিফট ট্র্যাকিং তালিকা থেকে তথ্য অপসারণ হতে পারে।"
        confirmLabel="হ্যাঁ, মুছে ফেলুন"
        cancelLabel="না, বাতিল"
        isProcessing={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setCustomerToDelete(null)}
      />
    </div>
  );
};
