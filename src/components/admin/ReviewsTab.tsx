import React, { useState, useMemo } from 'react';
import {
  Star,
  Search,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  AlertTriangle,
  X,
  MessageSquare,
  ThumbsUp,
  Download,
  Filter,
  Package,
  Calendar,
  Phone,
  User,
  CornerDownRight,
  Send,
  Sparkles,
} from 'lucide-react';
import { ProductReview, Product } from '../../types';
import { exportToExcel, exportToCSV } from '../../utils/excelExport';
import { ConfirmModal } from '../ConfirmModal';

interface ReviewsTabProps {
  reviews: ProductReview[];
  products: Product[];
  onUpdateReview: (id: string, review: Partial<ProductReview>) => Promise<void>;
  onDeleteReview: (id: string) => Promise<void>;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({
  reviews = [],
  products = [],
  onUpdateReview,
  onDeleteReview,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<ProductReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin reply states
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Metrics
  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter((r) => r.status === 'approved').length;
  const hiddenReviews = reviews.filter((r) => r.status === 'hidden').length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
    : '5.0';

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return reviews.filter((rev) => {
      // 1. Status Filter
      if (statusFilter !== 'all' && rev.status !== statusFilter) return false;

      // 2. Rating Filter
      if (ratingFilter !== 'all' && Math.round(rev.rating) !== ratingFilter) return false;

      // 3. Product Filter
      if (productFilter !== 'all' && rev.productId !== productFilter && rev.productName !== productFilter) return false;

      // 4. Search Filter
      if (!q) return true;
      const matchCust = (rev.customerName || '').toLowerCase().includes(q);
      const matchPhone = (rev.customerPhone || '').includes(q);
      const matchProd = (rev.productName || '').toLowerCase().includes(q);
      const matchComment = (rev.comment || '').toLowerCase().includes(q);
      const matchReply = (rev.adminReply || '').toLowerCase().includes(q);

      return matchCust || matchPhone || matchProd || matchComment || matchReply;
    });
  }, [reviews, searchTerm, statusFilter, ratingFilter, productFilter]);

  // Toggle review approval status
  const handleToggleStatus = async (review: ProductReview) => {
    if (!review.id) return;
    try {
      setTogglingId(review.id);
      const nextStatus = review.status === 'approved' ? 'hidden' : 'approved';
      await onUpdateReview(review.id, { status: nextStatus });
      showToast(
        nextStatus === 'approved'
          ? `"${review.customerName}"-এর রিভিউটি সফলভাবে অনুমোদন করা হয়েছে (স্টোরে দৃশ্যমান)`
          : `রিভিউটি স্টোর থেকে লুকানো হয়েছে (Hidden)`,
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle review status:', err);
      showToast('স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে।', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Submit or update admin reply
  const handleSaveReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      setIsSubmittingReply(true);
      await onUpdateReview(reviewId, { adminReply: replyText.trim() });
      showToast('অ্যাডমিন রিপ্লাই সফলভাবে সংরক্ষণ করা হয়েছে!', 'success');
      setReplyingReviewId(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to save reply:', err);
      showToast('রিপ্লাই সংরক্ষণ ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete review
  const handleConfirmDelete = async () => {
    if (!reviewToDelete?.id) return;
    try {
      setIsDeleting(true);
      await onDeleteReview(reviewToDelete.id);
      showToast('রিভিউটি সফলভাবে মুছে ফেলা হয়েছে।', 'success');
      setReviewToDelete(null);
    } catch (err) {
      console.error('Failed to delete review:', err);
      showToast('রিভিউ মোছা ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel/CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    const data = filteredReviews.map((r, idx) => ({
      ক্রমিক: idx + 1,
      পণ্যের_নাম: r.productName,
      কাস্টমার_নাম: r.customerName,
      ফোন_নম্বর: r.customerPhone || 'প্রযোজ্য নয়',
      রেটিং: `${r.rating} স্টার`,
      মন্তব্য: r.comment,
      অবস্থা: r.status === 'approved' ? 'অনুমোদিত (Live)' : 'লুকানো (Hidden)',
      অ্যাডমিন_রিপ্লাই: r.adminReply || 'নেই',
      তারিখ: r.createdAt ? r.createdAt.split('T')[0] : '',
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    if (format === 'xlsx') {
      exportToExcel(data, `InfiMart_Product_Reviews_${dateStr}`, 'Reviews');
    } else {
      exportToCSV(data, `InfiMart_Product_Reviews_${dateStr}`);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl shadow-lg flex items-center justify-between text-white font-bold text-sm animate-fadeIn border-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 border-emerald-400'
              : 'bg-rose-600 border-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#FFE0A8]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Reviews */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#0A4A29] flex items-center justify-center shrink-0 border border-emerald-100">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">মোট রিভিউ</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900">{totalReviews} টি</div>
          </div>
        </div>

        {/* Approved Reviews */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">অনুমোদিত (Live)</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">{approvedReviews} টি</div>
          </div>
        </div>

        {/* Hidden Reviews */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <EyeOff className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">লুকানো (Hidden)</span>
            <div className="text-xl sm:text-2xl font-black text-amber-700">{hiddenReviews} টি</div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#FFB300] flex items-center justify-center shrink-0 border border-amber-200">
            <Star className="w-6 h-6 fill-[#FFB300]" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">গড় রেটিং</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-1">
              <span>{averageRating}</span>
              <span className="text-xs text-[#FFB300]">★</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter, Rating Filter, Excel Export */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="কাস্টমার নাম, ফোন, পণ্য বা রিভিউ সার্চ..."
              className="w-full min-h-[46px] pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons: Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('xlsx')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-200 min-h-[44px] cursor-pointer"
              title="এক্সেলে এক্সপোর্ট করুন"
            >
              <Download className="w-4 h-4 text-[#0A4A29]" />
              <span>Excel Export</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 min-h-[44px] cursor-pointer"
              title="সিএসভিতে এক্সপোর্ট করুন"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Sub-row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সব ({totalReviews})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                statusFilter === 'approved'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>অনুমোদিত ({approvedReviews})</span>
            </button>
            <button
              onClick={() => setStatusFilter('hidden')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                statusFilter === 'hidden'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <EyeOff className="w-3 h-3" />
              <span>লুকানো ({hiddenReviews})</span>
            </button>
          </div>

          {/* Rating Filter Dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[40px]"
          >
            <option value="all">সকল রেটিং (★ সব)</option>
            <option value="5">৫ স্টার (★★★★★)</option>
            <option value="4">৪ স্টার (★★★★)</option>
            <option value="3">৩ স্টার (★★★)</option>
            <option value="2">২ স্টার (★★)</option>
            <option value="1">১ স্টার (★)</option>
          </select>

          {/* Product Filter Dropdown */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E8A52] min-h-[40px] max-w-[220px] truncate"
          >
            <option value="all">সকল পণ্য</option>
            {products.map((p) => (
              <option key={p.id || p.name} value={p.id || p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto shadow-xs my-6">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">কোনো রিভিউ পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {searchTerm || statusFilter !== 'all' || ratingFilter !== 'all' || productFilter !== 'all'
              ? 'ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।'
              : 'গ্রাহকেরা যখন পণ্য সম্পর্কে রিভিউ দেবেন, তখন এখানে প্রদর্শিত হবে।'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReviews.map((review) => {
            const isApproved = review.status === 'approved';
            const isToggling = togglingId === review.id;
            const isReplying = replyingReviewId === review.id;

            return (
              <div
                key={review.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all shadow-xs ${
                  isApproved
                    ? 'border-slate-200 hover:border-emerald-300'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                {/* Header row: Product, Customer, Rating, Status Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0A4A29] flex items-center justify-center shrink-0 border border-emerald-100 font-black text-sm">
                      {review.customerName ? review.customerName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{review.customerName}</span>
                        {review.customerPhone && (
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-[#1E8A52]" />
                            <span>{review.customerPhone}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {review.createdAt ? review.createdAt.split('T')[0] : ''}
                        </span>
                      </div>

                      {/* Product Name reference */}
                      <div className="flex items-center gap-1.5 text-xs text-[#0A4A29] font-bold mt-0.5">
                        <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[280px] sm:max-w-md">{review.productName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Star Rating & One-Click Status Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? 'text-[#FFB300] fill-[#FFB300]'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-black text-amber-900 ml-1">
                        {review.rating}.0
                      </span>
                    </div>

                    {/* TOGGLE BUTTON: Approve / Hide Review */}
                    <button
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(review)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 ${
                        isApproved
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title={isApproved ? 'ক্লিক করে রিভিউটি লুকান' : 'ক্লিক করে রিভিউটি অনুমোদন করুন'}
                    >
                      {isApproved ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>অনুমোদিত (Live)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>লুকানো (Hidden)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="py-3 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                  "{review.comment}"
                </div>

                {/* Admin Reply Section (if already exists) */}
                {review.adminReply && !isReplying && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 my-2 text-xs flex items-start gap-2.5">
                    <CornerDownRight className="w-4 h-4 text-[#0A4A29] shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0A4A29]">InfiMart BD (অ্যাডমিন রিপ্লাই):</span>
                        <button
                          onClick={() => {
                            setReplyingReviewId(review.id || null);
                            setReplyText(review.adminReply || '');
                          }}
                          className="text-[11px] text-emerald-800 hover:underline font-bold"
                        >
                          সম্পাদনা
                        </button>
                      </div>
                      <p className="text-slate-700">{review.adminReply}</p>
                    </div>
                  </div>
                )}

                {/* Reply Form (when replying) */}
                {isReplying && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 my-2 space-y-2 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-700">
                      অ্যাডমিন রিপ্লাই লিখুন (স্টোরে গ্রাহকের মন্তব্যের নিচে দৃশ্যমান হবে):
                    </label>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="ধন্যবাদ আপনার সুন্দর মতামতের জন্য! আমরা সর্বদা সেরা মানের সেবা দিতে প্রতিশ্রুতিবদ্ধ।"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setReplyingReviewId(null);
                          setReplyText('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200"
                      >
                        বাতিল
                      </button>
                      <button
                        disabled={isSubmittingReply || !replyText.trim()}
                        onClick={() => handleSaveReply(review.id!)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0A4A29] hover:bg-[#1E8A52] text-white flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSubmittingReply ? 'সংরক্ষণ হচ্ছে...' : 'রিপ্লাই প্রকাশ'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {!review.adminReply && !isReplying && (
                      <button
                        onClick={() => {
                          setReplyingReviewId(review.id || null);
                          setReplyText('');
                        }}
                        className="text-[#0A4A29] hover:text-[#1E8A52] font-bold flex items-center gap-1 p-1 hover:underline cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>রিপ্লাই দিন</span>
                      </button>
                    )}
                    <span className="text-slate-400">
                      স্ট্যাটাস: <strong className={isApproved ? 'text-emerald-700' : 'text-amber-700'}>{isApproved ? 'লাইভ' : 'লুকানো'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewToDelete(review)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="রিভিউটি মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reviewToDelete && (
        <ConfirmModal
          isOpen={!!reviewToDelete}
          title="রিভিউ মুছে ফেলতে নিশ্চিত?"
          message={`"${reviewToDelete.customerName}"-এর ${reviewToDelete.rating} স্টার রিভিউটি স্থায়ীভাবে মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা যাবে না।`}
          confirmLabel="হ্যাঁ, মুছে ফেলুন"
          cancelLabel="না, রাখুন"
          isProcessing={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setReviewToDelete(null)}
        />
      )}
    </div>
  );
};
