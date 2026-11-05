import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  MessageCircle,
  AlertCircle,
  Sparkles,
  Filter,
  X,
  Tag,
  ChevronDown,
  Layers,
  Truck,
  Flame,
  CalendarDays,
  PackagePlus,
  Clock,
  Check,
  CheckCircle,
  Copy,
  ChevronRight,
  Phone,
  Gift,
  ArrowLeft,
  Mail,
  HelpCircle,
  ShoppingBag,
  Globe,
  CreditCard,
  Banknote,
  Upload,
  ShieldCheck,
  Scale,
  Star,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import {
  Product,
  Category,
  StoreSettings,
  Offer,
  ComboPackage,
  PreBookingCampaign,
  PreBookingOrder,
  DailyDeal,
  SpecialOffer,
  Order,
  ProductReview,
} from '../types';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { FALLBACK_PRODUCT_IMAGE, compressImage } from '../utils/imageCompressor';

// Official Brand Icons for WhatsApp & Messenger
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 fill-white' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const MessengerIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4 fill-white' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.517 3.736 7.21V22l3.383-1.856c.917.254 1.887.391 2.881.391 5.523 0 10-4.145 10-9.277C22 6.145 17.523 2 12 2zm1.002 12.433l-2.56-2.73-4.996 2.73 5.498-5.836 2.62 2.73 4.935-2.73-5.497 5.836z" />
  </svg>
);

interface CustomerStoreProps {
  products: Product[];
  categories?: Category[];
  specialOffers?: SpecialOffer[];
  offers?: Offer[];
  packages?: ComboPackage[];
  preBookingCampaigns?: PreBookingCampaign[];
  dailyDeals?: DailyDeal[];
  reviews?: ProductReview[];
  settings: StoreSettings;
  loading: boolean;
  onCreateOrder?: (order: Omit<Order, 'id'>) => Promise<void>;
  onCreatePreBookingOrder?: (order: Omit<PreBookingOrder, 'id'>) => Promise<void>;
  onAddReview?: (review: Omit<ProductReview, 'id'>) => Promise<void>;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const CustomerStore: React.FC<CustomerStoreProps> = ({
  products = [],
  categories = [],
  specialOffers = [],
  offers = [],
  packages = [],
  preBookingCampaigns = [],
  dailyDeals = [],
  reviews = [],
  settings,
  loading,
  onCreateOrder,
  onCreatePreBookingOrder,
  onAddReview,
  selectedCategory: externalCategory,
  onSelectCategory: onSelectCategoryProp,
}) => {
  const [internalCategory, setInternalCategory] = useState<string>('সব');
  const selectedCategory = externalCategory !== undefined ? externalCategory : internalCategory;
  const setSelectedCategory = (cat: string) => {
    setInternalCategory(cat);
    if (onSelectCategoryProp) onSelectCategoryProp(cat);
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Pre-booking modal state
  const [selectedCampaignForBooking, setSelectedCampaignForBooking] =
    useState<PreBookingCampaign | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [bookingQty, setBookingQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Website Order Form Modal State
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [selectedOfferForOrder, setSelectedOfferForOrder] = useState<SpecialOffer | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number | ''>(1);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [orderCustomerPhone, setOrderCustomerPhone] = useState('');
  const [orderCustomerAddress, setOrderCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Expat & Payment states
  const [orderCountry, setOrderCountry] = useState<string>('বাংলাদেশ (Bangladesh)');
  const [isGiftOrder, setIsGiftOrder] = useState<boolean>(false);
  const [giftRecipientName, setGiftRecipientName] = useState<string>('');
  const [giftRecipientPhone, setGiftRecipientPhone] = useState<string>('');
  const [giftRecipientAddress, setGiftRecipientAddress] = useState<string>('');
  const [orderPaymentType, setOrderPaymentType] = useState<'cod' | 'advance'>('cod');
  const [orderAdvanceProvider, setOrderAdvanceProvider] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [orderTransactionId, setOrderTransactionId] = useState<string>('');
  const [orderPaymentSlipUrl, setOrderPaymentSlipUrl] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);
  const [copiedPaymentNumber, setCopiedPaymentNumber] = useState<boolean>(false);

  const [orderFormErrors, setOrderFormErrors] = useState<{
    quantity?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    transactionId?: string;
  }>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessToast, setOrderSuccessToast] = useState<string | null>(null);

  // ================= Product Reviews Modal States =================
  const [selectedProductForReviews, setSelectedProductForReviews] = useState<Product | null>(null);
  const [reviewTab, setReviewTab] = useState<'list' | 'write'>('list');
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewHoverRating, setNewReviewHoverRating] = useState<number>(0);
  const [newReviewName, setNewReviewName] = useState<string>('');
  const [newReviewPhone, setNewReviewPhone] = useState<string>('');
  const [newReviewComment, setNewReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewToast, setReviewToast] = useState<string | null>(null);
  const [reviewFormErrors, setReviewFormErrors] = useState<{ name?: string; comment?: string }>({});

  const openProductReviewsModal = (product: Product, initialTab: 'list' | 'write' = 'list') => {
    setSelectedProductForReviews(product);
    setReviewTab(initialTab);
    setNewReviewRating(5);
    setNewReviewHoverRating(0);
    setNewReviewName('');
    setNewReviewPhone('');
    setNewReviewComment('');
    setReviewFormErrors({});
  };

  const closeProductReviewsModal = () => {
    setSelectedProductForReviews(null);
    setReviewFormErrors({});
  };

  // Helper to get approved reviews for a product
  const getProductApprovedReviews = (productId?: string, productName?: string) => {
    return (reviews || []).filter(
      (r) =>
        r.status === 'approved' &&
        ((productId && r.productId === productId) || (productName && r.productName === productName))
    );
  };

  // Helper to get product rating stats
  const getProductRatingStats = (productId?: string, productName?: string) => {
    const list = getProductApprovedReviews(productId, productName);
    if (list.length === 0) {
      return { average: 5.0, count: 0, hasReviews: false, list: [] };
    }
    const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return {
      average: Number((sum / list.length).toFixed(1)),
      count: list.length,
      hasReviews: true,
      list,
    };
  };

  // Handle Review Submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForReviews) return;

    const errors: { name?: string; comment?: string } = {};
    if (!newReviewName.trim() || newReviewName.trim().length < 2) {
      errors.name = 'আপনার নাম কমপক্ষে ২ অক্ষরের হতে হবে';
    }
    if (!newReviewComment.trim() || newReviewComment.trim().length < 5) {
      errors.comment = 'অনুগ্রহ করে কমপক্ষে ৫ অক্ষরের বিস্তারিত মন্তব্য লিখুন';
    }

    if (Object.keys(errors).length > 0) {
      setReviewFormErrors(errors);
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewFormErrors({});

      const newReview: Omit<ProductReview, 'id'> = {
        productId: selectedProductForReviews.id || '',
        productName: selectedProductForReviews.name,
        productImage: selectedProductForReviews.image || '',
        customerName: newReviewName.trim(),
        customerPhone: newReviewPhone.trim() || undefined,
        rating: Number(newReviewRating) || 5,
        comment: newReviewComment.trim(),
        status: 'approved', // Auto-approved by default so user sees their review immediately; admin can toggle to 'hidden' anytime
        createdAt: new Date().toISOString(),
      };

      if (onAddReview) {
        await onAddReview(newReview);
      } else {
        await addDoc(collection(db, 'reviews'), newReview);
      }

      setReviewToast('ধন্যবাদ! আপনার মূল্যবান রিভিউটি সফলভাবে প্রকাশিত হয়েছে।');
      setNewReviewComment('');
      setReviewTab('list');
      setTimeout(() => setReviewToast(null), 4500);
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('রিভিউ জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const COUNTRIES_LIST = [
    'বাংলাদেশ (Bangladesh)',
    'সৌদি আরব (Saudi Arabia)',
    'সংযুক্ত আরব আমিরাত (UAE / Dubai)',
    'ওমান (Oman)',
    'কাতার (Qatar)',
    'কুয়েত (Kuwait)',
    'মালয়েশিয়া (Malaysia)',
    'সিঙ্গাপুর (Singapore)',
    'যুক্তরাজ্য (United Kingdom)',
    'যুক্তরাষ্ট্র (United States)',
    'ইতালি (Italy)',
    'অন্যান্য দেশ (Other Country)',
  ];

  // Normalize WhatsApp phone number with country code for wa.me links
  const rawPhone = (settings.whatsapp || '+8801821558813').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('880')
    ? rawPhone
    : rawPhone.startsWith('0')
    ? `88${rawPhone}`
    : rawPhone
    ? `880${rawPhone}`
    : '8801821558813';

  // Normalize Messenger username and call phone
  const messengerUser = (settings.messengerUsername || 'infimartbd')
    .trim()
    .replace(/^https?:\/\/(www\.)?(m\.me|facebook\.com)\//, '')
    .replace(/\/$/, '');

  const callPhone = settings.primaryPhone || settings.whatsapp || '01821-558813';
  const cleanCallPhone = callPhone.replace(/[^0-9+]/g, '');

  const isWhatsappEnabled = settings.whatsappEnabled !== false;
  const isMessengerEnabled = settings.messengerEnabled !== false;
  const isCallEnabled = settings.callEnabled !== false;

  // Floating Action Button (FAB) state
  const [fabOpen, setFabOpen] = useState(false);

  // Order modal: selected order channel ('whatsapp' | 'messenger' | 'call')
  const [orderChannel, setOrderChannel] = useState<'whatsapp' | 'messenger' | 'call'>('whatsapp');

  useEffect(() => {
    if (!isWhatsappEnabled && isMessengerEnabled) {
      setOrderChannel('messenger');
    } else if (!isWhatsappEnabled && !isMessengerEnabled && isCallEnabled) {
      setOrderChannel('call');
    } else {
      setOrderChannel('whatsapp');
    }
  }, [isWhatsappEnabled, isMessengerEnabled, isCallEnabled]);

  // Pre-filled Messenger Message Generator (Official exact template)
  const getProductMessengerUrl = (prod: { name: string; unit: string }, price: number, qtyVal = 1) => {
    const totalVal = price * qtyVal;
    const msg = `আসসালামু আলাইকুম InfiMart BD,

আমি এই পণ্যটি অর্ডার করতে চাই:

🛒 পণ্য: ${prod.name}
💰 দাম: ৳${price}/${prod.unit}
🔢 পরিমাণ: ${qtyVal} ${prod.unit}
💵 মোট: ৳${totalVal}

📍 নাম: 
📞 ফোন: 
🏠 ঠিকানা: 
📝 নোট: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;
    return `https://m.me/${messengerUser}?text=${encodeURIComponent(msg)}`;
  };

  // Pre-filled WhatsApp Message Generator
  const getProductWhatsAppUrl = (prod: { name: string; unit: string }, price: number, qtyVal = 1) => {
    const totalVal = price * qtyVal;
    const msg = `আসসালামু আলাইকুম InfiMart BD,

আমি এই পণ্যটি অর্ডার করতে চাই:

🛒 পণ্য: ${prod.name}
💰 দাম: ৳${price} / ${prod.unit}
🔢 পরিমাণ: ${qtyVal} ${prod.unit}
💵 মোট: ৳${totalVal}

📍 নাম: 
📞 ফোন: 
🏠 ঠিকানা: 
📝 নোট: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Active filters for offers, packages, prebookings, deals
  const activeSpecialOffers = useMemo(() => {
    const now = new Date();
    // Format current date as YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];

    return specialOffers
      .filter((o) => {
        if (o.isActive === false) return false;
        // Check date range if specified
        if (o.startDate && o.startDate > todayStr) return false;
        if (o.endDate && o.endDate < todayStr) return false;
        return true;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [specialOffers]);

  const activeOffers = useMemo(() => offers.filter((o) => o.isActive !== false), [offers]);
  const activePackages = useMemo(() => packages.filter((p) => p.isActive !== false), [packages]);
  const activePreBookings = useMemo(
    () => preBookingCampaigns.filter((c) => c.isActive !== false),
    [preBookingCampaigns]
  );
  const activeDailyDeals = useMemo(
    () => dailyDeals.filter((d) => d.isActive !== false),
    [dailyDeals]
  );

  // Top featured offer for hero banner
  const featuredOffer = activeOffers[0];

  // Countdown timer for Daily Deals
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 30,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      let targetDeal = activeDailyDeals[0];
      let endDateTime: Date;

      if (targetDeal && targetDeal.endTime) {
        const [h, m] = targetDeal.endTime.split(':').map(Number);
        endDateTime = new Date();
        endDateTime.setHours(h || 23, m || 59, 59, 999);
      } else {
        endDateTime = new Date();
        endDateTime.setHours(23, 59, 59, 999);
      }

      const diff = endDateTime.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeDailyDeals]);

  // Merge categories from Firestore with categories present on products
  const displayCategories = useMemo(() => {
    // If categories prop is available from Firestore, sort by order
    const list: Category[] = [...categories];
    // Sort by order asc
    list.sort((a, b) => {
      const ordA = Number(a.order ?? 999);
      const ordB = Number(b.order ?? 999);
      if (ordA !== ordB) return ordA - ordB;
      return a.name.localeCompare(b.name, 'bn');
    });

    // If Firestore has categories, use them; if some product categories are missing, append them as active
    const knownNames = new Set(list.map((c) => c.name));
    products.forEach((p) => {
      if (p.category && !knownNames.has(p.category)) {
        list.push({
          name: p.category,
          isActive: true,
          icon: '🛒',
        });
        knownNames.add(p.category);
      }
    });

    return list;
  }, [categories, products]);

  // Selected Category Object (to know if it is active or inactive)
  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === 'সব') return null;
    return displayCategories.find((c) => c.name === selectedCategory) || null;
  }, [selectedCategory, displayCategories]);

  // Is selected category inactive?
  const isSelectedCategoryInactive = useMemo(() => {
    if (!selectedCategoryObj) return false;
    return selectedCategoryObj.isActive === false;
  }, [selectedCategoryObj]);

  // Real-time filtering by product name and category
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      let matchCat = selectedCategory === 'সব' || product.category === selectedCategory;
      if (!query) return matchCat;
      const nameMatch = product.name.toLowerCase().includes(query);
      const categoryMatch = product.category.toLowerCase().includes(query);
      return (nameMatch || categoryMatch) && matchCat;
    });
  }, [products, selectedCategory, searchQuery]);

  // Calculate product discount if an active offer or deal applies to it
  const getProductDiscountInfo = (product: Product) => {
    // 1. Check daily deal
    const deal = activeDailyDeals.find(
      (d) => d.productId === product.id || d.productName === product.name
    );
    if (deal) {
      return {
        hasDiscount: true,
        discountText: `${deal.discount}% ছাড়`,
        discountedPrice: deal.dealPrice,
        originalPrice: product.price,
        isDeal: true,
      };
    }

    // 2. Check active offer
    for (const offer of activeOffers) {
      const isApplicable =
        !offer.applicableProducts ||
        offer.applicableProducts.length === 0 ||
        offer.applicableProducts.includes(product.id || '') ||
        offer.applicableProducts.includes(product.name);

      if (isApplicable && offer.discountValue > 0) {
        let finalPrice = product.price;
        let badge = '';
        if (offer.type === 'percentage') {
          finalPrice = Math.max(1, Math.round(product.price * (1 - offer.discountValue / 100)));
          badge = `${offer.discountValue}% ছাড়`;
        } else if (offer.type === 'fixed') {
          finalPrice = Math.max(1, product.price - offer.discountValue);
          badge = `৳ ${offer.discountValue} ছাড়`;
        }
        return {
          hasDiscount: true,
          discountText: badge,
          discountedPrice: finalPrice,
          originalPrice: product.price,
          isDeal: false,
        };
      }
    }

    return {
      hasDiscount: false,
      discountText: '',
      discountedPrice: product.price,
      originalPrice: product.price,
      isDeal: false,
    };
  };

  // Helper to parse weight in kg from product name and unit
  const parseProductWeightInKg = (product: { name: string; unit: string }): number => {
    const rawUnit = (product.unit || '').trim();
    if (rawUnit === '১০০ গ্রাম') return 0.1;
    if (rawUnit === '২৫০ গ্রাম') return 0.25;
    if (rawUnit === '৫০০ গ্রাম') return 0.5;
    if (rawUnit === 'ভরি') return 0.01166;
    if (rawUnit === 'ছটাক') return 0.05832;
    if (rawUnit === 'গ্রাম') return 0.001;
    if (rawUnit === 'লিটার') return 1;
    if (rawUnit === 'মিলি') return 0.001;
    if (rawUnit === 'কেজি' || rawUnit === 'kg') return 1;

    const combined = `${product.name} ${product.unit}`.toLowerCase();
    const bengaliToEnglishDigits: Record<string, string> = {
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
    };
    const normalized = combined.replace(/[০-৯]/g, (d) => bengaliToEnglishDigits[d] || d);

    const matchKg = normalized.match(/(\d+(?:\.\d+)?)\s*(?:কেজি|কে\.জি|kg|kgs|kilogram)/i);
    if (matchKg) {
      return parseFloat(matchKg[1]);
    }

    const matchGram = normalized.match(/(\d+(?:\.\d+)?)\s*(?:গ্রাম|gm|g|gram)/i);
    if (matchGram) {
      return parseFloat(matchGram[1]) / 1000;
    }

    return 0;
  };

  // Rule 2 & 3: Check if product is eligible for free delivery
  // Condition: Order total >= ৳3000 (settings.freeDeliveryThreshold) OR total weight >= 10 kg (settings.freeDeliveryWeight)
  // Do NOT show the badge on all products by default!
  const isProductEligibleForFreeDelivery = (product: Product): boolean => {
    const threshold = settings.freeDeliveryThreshold ?? 3000;
    const weightThreshold = settings.freeDeliveryWeight ?? 10;
    const unitWeight = parseProductWeightInKg(product);

    return (product.price >= threshold) || (unitWeight >= weightThreshold && unitWeight > 0);
  };

  // Find active prebooking campaign for a product
  const getProductPreBooking = (product: Product) => {
    return activePreBookings.find(
      (c) => c.productId === product.id || c.productName === product.name
    );
  };

  // 1 & 2. Regular products & Products with discounts
  const handleWhatsAppOrder = (product: Product) => {
    const discountInfo = getProductDiscountInfo(product);

    let priceLine = `💰 দাম: ৳${product.price} / ${product.unit}`;
    if (discountInfo.hasDiscount) {
      let discountPercent = 0;
      if (
        discountInfo.originalPrice > 0 &&
        discountInfo.discountedPrice < discountInfo.originalPrice
      ) {
        discountPercent = Math.round(
          ((discountInfo.originalPrice - discountInfo.discountedPrice) /
            discountInfo.originalPrice) *
            100
        );
      }
      const discountText =
        discountPercent > 0
          ? `${discountPercent}% ছাড়`
          : discountInfo.discountText || 'বিশেষ ছাড়';
      priceLine = `💰 দাম: ~~৳${discountInfo.originalPrice}~~ ৳${discountInfo.discountedPrice} / ${product.unit} (${discountText})`;
    }

    const message = `আসসালামু আলাইকুম InfiMart BD,

আমি এই পণ্যটি অর্ডার করতে চাই:

🛒 পণ্য: ${product.name}
${priceLine}
📦 একক: ${product.unit}
🔢 পরিমাণ: 

📍 আমার নাম: 
📍 ঠিকানা: 
📞 ফোন: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // 3. Combo packages
  const handlePackageWhatsAppOrder = (pkg: ComboPackage) => {
    const productsList = (pkg.products || [])
      .map((p) => `${p.productName} (${p.quantity} পিস)`)
      .join(', ');
    const savings =
      pkg.discount || Math.max(0, (pkg.originalPrice || 0) - (pkg.packagePrice || 0));

    const message = `আসসালামু আলাইকুম InfiMart BD,

আমি এই প্যাকেজটি অর্ডার করতে চাই:

🎁 প্যাকেজ: ${pkg.name}
📦 পণ্য: ${productsList || 'প্যাকেজের সকল পণ্য'}
💰 বাজার মূল্য: ৳${pkg.originalPrice}
🎉 প্যাকেজ দাম: ৳${pkg.packagePrice} (${savings}৳ সাশ্রয়)
🔢 পরিমাণ: 

📍 আমার নাম: 
📍 ঠিকানা: 
📞 ফোন: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Daily flash deals
  const handleDealWhatsAppOrder = (deal: DailyDeal) => {
    const message = `আসসালামু আলাইকুম InfiMart BD,

আমি আজকের ডিলের এই পণ্যটি অর্ডার করতে চাই:

🛒 পণ্য: ${deal.productName}
💰 দাম: ~~৳${deal.originalPrice}~~ ৳${deal.dealPrice} (${deal.discount}% ছাড়)
🔢 পরিমাণ: 

📍 আমার নাম: 
📍 ঠিকানা: 
📞 ফোন: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // 4. Pre-booking products
  const handlePreBookingWhatsAppOrder = (camp: PreBookingCampaign) => {
    const message = `আসসালামু আলাইকুম InfiMart BD,

আমি এই পণ্যটি প্রি-বুকিং করতে চাই:

🛒 পণ্য: ${camp.productName}
💰 মূল মূল্য: ৳${camp.fullPrice}
💳 প্রয়োজনীয় অগ্রিম: ৳${camp.advanceAmount}
📅 সম্ভাব্য ডেলিভারি: ${camp.deliveryDate}
🔢 পরিমাণ: 

📍 আমার নাম: 
📍 ঠিকানা: 
📞 ফোন: 

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // ================= WEBSITE ORDER FORM HANDLERS =================
  const openProductOrderModal = (product: Product) => {
    setSelectedProductForOrder(product);
    setSelectedOfferForOrder(null);
    setOrderQuantity(1);
    setOrderCustomerName('');
    setOrderCustomerPhone('');
    setOrderCustomerAddress('');
    setOrderNotes('');
    setOrderCountry('বাংলাদেশ (Bangladesh)');
    setIsGiftOrder(false);
    setGiftRecipientName('');
    setGiftRecipientPhone('');
    setGiftRecipientAddress('');
    setOrderPaymentType(settings.codEnabled !== false ? 'cod' : 'advance');
    setOrderAdvanceProvider('bKash');
    setOrderTransactionId('');
    setOrderPaymentSlipUrl('');
    setOrderFormErrors({});
  };

  const openSpecialOfferOrderModal = (offer: SpecialOffer) => {
    setSelectedOfferForOrder(offer);
    setSelectedProductForOrder({
      id: offer.id,
      name: offer.title,
      category: 'স্পেশাল অফার',
      price: 0,
      unit: 'অফার',
      stock: 'In Stock',
      image: '',
    });
    setOrderQuantity(1);
    setOrderCustomerName('');
    setOrderCustomerPhone('');
    setOrderCustomerAddress('');
    setOrderNotes(offer.subtitle ? `অফার: ${offer.subtitle}` : '');
    setOrderCountry('বাংলাদেশ (Bangladesh)');
    setIsGiftOrder(false);
    setGiftRecipientName('');
    setGiftRecipientPhone('');
    setGiftRecipientAddress('');
    setOrderPaymentType(settings.codEnabled !== false ? 'cod' : 'advance');
    setOrderAdvanceProvider('bKash');
    setOrderTransactionId('');
    setOrderPaymentSlipUrl('');
    setOrderFormErrors({});
  };

  const closeProductOrderModal = () => {
    setSelectedProductForOrder(null);
    setSelectedOfferForOrder(null);
    setOrderFormErrors({});
  };

  // Upload payment slip image with compression
  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingSlip(true);
      const res = await compressImage(file, 800, 200);
      setOrderPaymentSlipUrl(res.dataUrl);
    } catch (err) {
      console.error('Slip upload error:', err);
      alert('রসিদের ছবি আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Selected product discount & real-time calculation
  const orderProductDiscount = selectedProductForOrder && !selectedOfferForOrder
    ? getProductDiscountInfo(selectedProductForOrder)
    : null;
  const orderUnitPrice = orderProductDiscount?.hasDiscount
    ? orderProductDiscount.discountedPrice
    : selectedProductForOrder?.price || 0;
  const numOrderQty = typeof orderQuantity === 'number' ? orderQuantity : 0;
  const orderSubtotal = Math.round(numOrderQty * orderUnitPrice);

  // Unit weight & total weight
  const orderUnitWeight = selectedProductForOrder
    ? parseProductWeightInKg(selectedProductForOrder)
    : 0;
  const orderTotalWeight = Math.round(numOrderQty * orderUnitWeight * 100) / 100;

  // Delivery charge calculation
  let orderDeliveryCharge = 0;
  let isFreeDelivery = false;
  let freeDeliveryReason: 'amount' | 'weight' | 'special_offer' | null = null;

  if (selectedOfferForOrder) {
    // Rule 1: Special Offers - Admin Controlled Delivery Charge
    if (selectedOfferForOrder.deliveryChargeEnabled) {
      orderDeliveryCharge = selectedOfferForOrder.deliveryCharge || 0;
      isFreeDelivery = orderDeliveryCharge === 0;
    } else {
      orderDeliveryCharge = 0;
      isFreeDelivery = true;
      freeDeliveryReason = 'special_offer';
    }
  } else {
    // Rule 2: All Other Products - Conditional Free Delivery
    const threshold = settings.freeDeliveryThreshold ?? 3000;
    const weightThreshold = settings.freeDeliveryWeight ?? 10;

    const isFreeByAmount = orderSubtotal >= threshold;
    const isFreeByWeight = orderTotalWeight >= weightThreshold && orderTotalWeight > 0;

    if (isFreeByAmount) {
      orderDeliveryCharge = 0;
      isFreeDelivery = true;
      freeDeliveryReason = 'amount';
    } else if (isFreeByWeight) {
      orderDeliveryCharge = 0;
      isFreeDelivery = true;
      freeDeliveryReason = 'weight';
    } else {
      // Tiered delivery charges
      if (orderSubtotal >= 2000) {
        orderDeliveryCharge = settings.tieredDeliveryCharge2000_2999 ?? 20;
      } else if (orderSubtotal >= 1000) {
        orderDeliveryCharge = settings.tieredDeliveryCharge1000_1999 ?? 30;
      } else if (orderSubtotal >= 500) {
        orderDeliveryCharge = settings.tieredDeliveryCharge500_999 ?? 40;
      } else if (orderSubtotal >= 200) {
        orderDeliveryCharge = settings.tieredDeliveryCharge200_499 ?? 50;
      } else {
        orderDeliveryCharge = settings.deliveryCharge ?? 50;
      }
    }
  }

  const orderTotalPrice = orderSubtotal + orderDeliveryCharge;

  // Advance amount calculation
  let requiredAdvanceAmount = orderTotalPrice;
  if (settings.advanceAmountType === 'half') {
    requiredAdvanceAmount = Math.round(orderTotalPrice / 2);
  } else if (settings.advanceAmountType === 'fixed') {
    requiredAdvanceAmount = Math.min(orderTotalPrice, settings.advanceFixedAmount ?? 200);
  }
  const dueAmount = Math.max(0, orderTotalPrice - requiredAdvanceAmount);

  // Check if Customer is Expat (abroad) or Gift Order
  const isAbroadCustomer = orderCountry !== 'বাংলাদেশ (Bangladesh)';
  const isCodHidden = isAbroadCustomer || isGiftOrder;

  // Effective payment method for order
  const effectivePaymentType = isCodHidden ? 'advance' : orderPaymentType;

  const getSelectedProviderNumber = () => {
    switch (orderAdvanceProvider) {
      case 'bKash':
        return settings.bkashNumber || '01821-558813 (Personal)';
      case 'Nagad':
        return settings.nagadNumber || '01821-558813 (Personal)';
      case 'Rocket':
        return settings.rocketNumber || '01821-558813-0';
      case 'Bank':
        return settings.bankDetails || 'ইসলামী ব্যাংক বাংলাদেশ লিঃ, ফেনী শাখা';
      default:
        return settings.whatsapp || '01821-558813';
    }
  };

  const handleCopyPaymentNumber = () => {
    const num = getSelectedProviderNumber();
    navigator.clipboard.writeText(num);
    setCopiedPaymentNumber(true);
    setTimeout(() => setCopiedPaymentNumber(false), 2500);
  };

  const handleProductOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    const errors: {
      quantity?: string;
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      transactionId?: string;
    } = {};

    // Minimum order check (default 200 BDT) for regular products
    const minAmount = settings.minOrderAmount ?? 200;
    if (!selectedOfferForOrder && orderSubtotal < minAmount) {
      errors.quantity = `সর্বনিম্ন ৳${minAmount}-এর অর্ডার করতে হবে (বর্তমান: ৳${orderSubtotal})`;
    }

    // 1. Quantity validation: required, number, > 0
    const qty = Number(orderQuantity);
    if (!orderQuantity || isNaN(qty) || qty <= 0) {
      errors.quantity = 'পরিমাণ অবশ্যই ০ এর বেশি হতে হবে';
    }

    // 2. Customer Name: required, min 3 characters
    const trimmedName = orderCustomerName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      errors.customerName = 'আপনার নাম কমপক্ষে ৩ অক্ষরের হতে হবে';
    }

    // 3. Customer Phone: required
    const trimmedPhone = orderCustomerPhone.trim();
    if (!trimmedPhone || trimmedPhone.length < 6) {
      errors.customerPhone = 'সঠিক মোবাইল নম্বর লিখুন';
    }

    // 4. Customer Address: required, textarea, min 10 characters
    const trimmedAddress = orderCustomerAddress.trim();
    if (!trimmedAddress || trimmedAddress.length < 10) {
      errors.customerAddress = 'আপনার সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন (কমপক্ষে ১০ অক্ষর)';
    }

    // 5. If Advance Payment is selected, Transaction ID is mandatory
    if (effectivePaymentType === 'advance') {
      if (!orderTransactionId.trim()) {
        errors.transactionId = 'অনুগ্রহ করে অগ্রিম পেমেন্টের ট্রানজেকশন আইডি (TxID) লিখুন';
      }
    }

    if (Object.keys(errors).length > 0) {
      setOrderFormErrors(errors);
      return;
    }

    setOrderFormErrors({});
    setIsSubmittingOrder(true);

    const orderData: Omit<Order, 'id'> = {
      productId: selectedProductForOrder.id || '',
      productName: selectedProductForOrder.name,
      productPrice: orderUnitPrice,
      productUnit: selectedProductForOrder.unit,
      quantity: qty,
      subtotal: orderSubtotal,
      deliveryCharge: orderDeliveryCharge,
      weight: orderTotalWeight,
      totalPrice: orderTotalPrice,
      total: orderTotalPrice,
      customerName: trimmedName,
      customerPhone: trimmedPhone,
      customerAddress: trimmedAddress,
      customerNotes: orderNotes.trim(),
      status: 'new',
      isRead: false,
      isNotified: false,
      isSpecialOffer: !!selectedOfferForOrder,
      specialOfferId: selectedOfferForOrder?.id,
      orderType: (isAbroadCustomer || isGiftOrder) ? 'expat' : 'local',
      customerCountry: orderCountry,
      isGiftOrder,
      giftRecipientName: isGiftOrder ? giftRecipientName.trim() : undefined,
      giftRecipientPhone: isGiftOrder ? giftRecipientPhone.trim() : undefined,
      giftRecipientAddress: isGiftOrder ? giftRecipientAddress.trim() : undefined,
      paymentType: effectivePaymentType,
      paymentMethod: effectivePaymentType === 'cod' ? 'Cash on Delivery' : orderAdvanceProvider,
      paymentNumberUsed: effectivePaymentType === 'advance' ? getSelectedProviderNumber() : undefined,
      advanceAmountPaid: effectivePaymentType === 'advance' ? requiredAdvanceAmount : 0,
      dueAmount: effectivePaymentType === 'advance' ? dueAmount : orderTotalPrice,
      transactionId: effectivePaymentType === 'advance' ? orderTransactionId.trim() : undefined,
      paymentSlipUrl: orderPaymentSlipUrl || undefined,
      paymentVerificationStatus: effectivePaymentType === 'advance' ? 'pending' : undefined,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],

      // Legacy compatibility fields
      product: selectedProductForOrder.name,
      unitPrice: orderUnitPrice,
      phone: trimmedPhone,
      address: trimmedAddress,
      notes: orderNotes.trim(),
      source: orderChannel === 'messenger' ? 'messenger' : orderChannel === 'call' ? 'admin' : 'website_form',
    };

    try {
      if (onCreateOrder) {
        await onCreateOrder(orderData);
      } else {
        await addDoc(collection(db, 'orders'), orderData);
      }
    } catch (err) {
      console.warn('Could not save order directly to Firestore:', err);
    } finally {
      setIsSubmittingOrder(false);
    }

    // Build WhatsApp message
    const paymentDetailsText = effectivePaymentType === 'cod'
      ? '💵 ক্যাশ অন ডেলিভারি (Cash on Delivery)'
      : `💳 অগ্রিম পরিশোধিত: ৳${requiredAdvanceAmount} (${orderAdvanceProvider})\n🔢 TxID: ${orderTransactionId.trim()}${dueAmount > 0 ? `\n⏳ বাকি মূল্য: ৳${dueAmount}` : ''}`;

    const giftText = isGiftOrder
      ? `\n\n🎁 উপহার প্রাপকের বিবরণ:\n👤 প্রাপক: ${giftRecipientName.trim()}\n📞 মোবাইল: ${giftRecipientPhone.trim()}\n🏠 ঠিকানা: ${giftRecipientAddress.trim()}`
      : '';

    const countryLine = isAbroadCustomer ? `\n🌍 দেশ: ${orderCountry}` : '';
    const notesText = orderNotes.trim() ? `\n\n📝 নোট: ${orderNotes.trim()}` : '';

    const message = `আসসালামু আলাইকুম InfiMart BD,

🛒 পণ্য: ${selectedProductForOrder.name}
💰 দাম: ৳${orderUnitPrice} / ${selectedProductForOrder.unit}
🔢 পরিমাণ: ${qty} ${selectedProductForOrder.unit}${orderTotalWeight > 0 ? ` (${orderTotalWeight} কেজি)` : ''}
💵 সাবটোটাল: ৳${orderSubtotal}
🚚 ডেলিভারি চার্জ: ${orderDeliveryCharge === 0 ? 'ফ্রি (৳০)' : `৳${orderDeliveryCharge}`}
🏷️ মোট মূল্য: ৳${orderTotalPrice}

💳 পেমেন্ট পদ্ধতি:
${paymentDetailsText}

📍 অর্ডারকারী: ${trimmedName}${countryLine}
📞 মোবাইল: ${trimmedPhone}
🏠 ডেলিভারি ঠিকানা: ${trimmedAddress}${giftText}${notesText}

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;

    if (orderChannel === 'messenger') {
      const messengerMsg = `আসসালামু আলাইকুম InfiMart BD,

আমি এই পণ্যটি অর্ডার করতে চাই:

🛒 পণ্য: ${selectedProductForOrder.name}
💰 দাম: ৳${orderUnitPrice}/${selectedProductForOrder.unit}
🔢 পরিমাণ: ${qty} ${selectedProductForOrder.unit}
💵 মোট: ৳${orderTotalPrice}

📍 নাম: ${trimmedName}${countryLine}
📞 ফোন: ${trimmedPhone}
🏠 ঠিকানা: ${trimmedAddress}${giftText}
📝 নোট: ${orderNotes.trim() || 'নেই'}

অনুগ্রহ করে অর্ডারটি কনফার্ম করুন।`;
      const messengerLink = `https://m.me/${messengerUser}?text=${encodeURIComponent(messengerMsg)}`;
      window.open(messengerLink, '_blank', 'noopener,noreferrer');
    } else if (orderChannel === 'call') {
      window.location.href = `tel:${cleanCallPhone}`;
    } else {
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank', 'noopener,noreferrer');
    }

    setOrderSuccessToast('আপনার অর্ডারটি সফলভাবে জমা হয়েছে!');
    closeProductOrderModal();

    setTimeout(() => {
      setOrderSuccessToast(null);
    }, 5000);
  };

  const openPreBookingModal = (campaign: PreBookingCampaign) => {
    setSelectedCampaignForBooking(campaign);
    setBookingQty(1);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setTransactionId('');
    setPaymentMethod('bKash');
    setBookingSuccessMsg(false);
  };

  const handlePreBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignForBooking) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('অনুগ্রহ করে আপনার নাম ও মোবাইল নম্বর দিন');
      return;
    }

    try {
      setIsSubmittingBooking(true);
      const totalAdvance = selectedCampaignForBooking.advanceAmount * bookingQty;
      const totalFullPrice = selectedCampaignForBooking.fullPrice * bookingQty;
      const totalDue = totalFullPrice - totalAdvance;

      const orderPayload: Omit<PreBookingOrder, 'id'> = {
        campaignId: selectedCampaignForBooking.id || '',
        productId: selectedCampaignForBooking.productId,
        productName: selectedCampaignForBooking.productName,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        quantity: bookingQty,
        advanceAmountPaid: totalAdvance,
        dueAmount: totalDue,
        paymentMethod,
        transactionId: transactionId.trim() || 'Pending',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      if (onCreatePreBookingOrder) {
        await onCreatePreBookingOrder(orderPayload);
      }

      setBookingSuccessMsg(true);

      // Open WhatsApp with complete pre-booking voucher
      const waText = encodeURIComponent(
        `আসসালামু আলাইকুম, আমি প্রি-বুকিং সম্পন্ন করেছি!\n\n` +
          `• পণ্য: ${selectedCampaignForBooking.productName}\n` +
          `• পরিমাণ: ${bookingQty} পিস\n` +
          `• অগ্রিম পরিশোধ: ৳${totalAdvance} (${paymentMethod})\n` +
          `• ট্রানজেকশন আইডি (TxID): ${transactionId || 'বিকাশে পাঠানো হয়েছে'}\n` +
          `• নাম: ${customerName}\n` +
          `• ফোন: ${customerPhone}\n` +
          `• ঠিকানা: ${customerAddress}\n` +
          `• ডেলিভারি তারিখ: ${selectedCampaignForBooking.deliveryDate}`
      );
      setTimeout(() => {
        window.open(`https://wa.me/${cleanPhone}?text=${waText}`, '_blank');
      }, 1000);
    } catch (err) {
      console.error(err);
      alert('প্রি-বুকিং অর্ডার সাবমিট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const copyHotline = () => {
    navigator.clipboard.writeText(settings.whatsapp || '01821-558813');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 safe-bottom-space">
      {/* =========================================================================
          1. HERO BANNER WITH CURRENT OFFER / BRANDING
          ========================================================================= */}
      <section className="relative bg-gradient-to-br from-[#0A4A29] via-[#125834] to-[#1E8A52] text-white py-10 px-4 shadow-inner overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#FFB300]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#FFE0A8]/10 blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          {featuredOffer ? (
            <div className="inline-flex items-center gap-2 bg-[#FFB300] text-[#0A4A29] px-4 py-1.5 rounded-full text-xs sm:text-sm font-black shadow-lg animate-pulse">
              <Sparkles className="w-4 h-4 fill-[#0A4A29]" />
              <span>
                {featuredOffer.title}{' '}
                {featuredOffer.type === 'percentage'
                  ? `(${featuredOffer.discountValue}% ছাড়)`
                  : featuredOffer.type === 'fixed'
                  ? `(৳${featuredOffer.discountValue} ছাড়)`
                  : ''}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-[#FFE0A8] border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB300]" />
              <span>নির্ভরযোগ্য অনলাইন বাজার — বাজারের চেয়ে সাশ্রয়ী দামে!</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            <span className="text-white">সাশ্রয়ের ঠিকানা, </span>
            <span className="text-[#FFB300]">ভরসার বাজার</span>
          </h1>

          <p className="text-xs sm:text-base text-emerald-100/90 max-w-2xl mx-auto">
            খাঁটি ও ফ্রেশ গ্রোসারি সামগ্রী সরাসরি আপনার বাসায় পৌঁছে দিতে আমরা প্রস্তুত। পছন্দের পণ্যটি বেছে নিয়ে এক ক্লিকেই হোয়াটসঅ্যাপে অর্ডার করুন।
          </p>
        </div>
      </section>

      {/* =========================================================================
          HORIZONTAL SCROLLABLE CATEGORIES ROW AT TOP
          ========================================================================= */}
      <nav aria-label="Product Categories Bar" className="sticky top-[86px] sm:top-[74px] z-30 bg-white/95 backdrop-blur-md shadow-md border-b border-emerald-100 py-3 px-4">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Top: Horizontal Scrollable Category Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
            {/* "All" button */}
            <button
              onClick={() => {
                setSelectedCategory('সব');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer snap-start border ${
                selectedCategory === 'সব'
                  ? 'bg-[#0A4A29] text-white border-[#0A4A29] shadow-md scale-102'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-[#0A4A29] border-emerald-200'
              }`}
            >
              <span className="text-base">🧺</span>
              <span>সকল পণ্য</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedCategory === 'সব' ? 'bg-white/20 text-white' : 'bg-[#0A4A29]/10 text-[#0A4A29]'
              }`}>
                {products.length}
              </span>
            </button>

            {/* Category Pills */}
            {displayCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              const isCatActive = cat.isActive !== false;
              const pCount = products.filter((p) => p.category === cat.name).length;

              return (
                <button
                  key={cat.id || cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 shrink-0 cursor-pointer snap-start border ${
                    isSelected
                      ? isCatActive
                        ? 'bg-[#0A4A29] text-white border-[#0A4A29] shadow-md scale-102'
                        : 'bg-amber-700 text-white border-amber-800 shadow-md scale-102'
                      : isCatActive
                      ? 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#0A4A29] border-slate-200 hover:border-emerald-300'
                      : 'bg-slate-100/90 hover:bg-slate-200 text-slate-500 border-dashed border-slate-300 opacity-80'
                  }`}
                  title={!isCatActive ? `${cat.name} (Coming Soon)` : cat.name}
                >
                  <span className="text-base">{cat.icon || '🛒'}</span>
                  <span>{cat.name}</span>
                  {!isCatActive ? (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Coming Soon
                    </span>
                  ) : (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom: Search Input & Category Dropdown for quick access */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 border-t border-slate-100">
            {/* Quick Dropdown */}
            <div className="relative w-full sm:w-60 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0A4A29]">
                <Layers className="w-4 h-4 text-[#1E8A52]" />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-emerald-50 text-[#0A4A29] font-bold text-xs sm:text-sm rounded-xl border border-emerald-300/80 focus:border-[#0A4A29] focus:outline-none cursor-pointer appearance-none shadow-xs"
              >
                <option value="সব">সকল পণ্য ({products.length} টি)</option>
                {displayCategories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.icon || '🛒'} {cat.name} {cat.isActive === false ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#0A4A29]">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Real-Time Name Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-[#0A4A29]" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্যের নাম দিয়ে সার্চ করুন (যেমন: মিনিকেট চাল, সয়াবিন তেল, মসুর ডাল)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:border-[#0A4A29] focus:outline-none font-semibold text-xs sm:text-sm shadow-xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2 flex items-center pr-2 text-slate-400 hover:text-rose-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-10">
        {/* =========================================================================
            SPECIAL OFFER CORNER (স্পেশাল অফার কর্নার) - FULLY DYNAMIC FROM FIRESTORE
            Only shown when activeSpecialOffers has items. If no offers, DO NOT show.
            ========================================================================= */}
        {activeSpecialOffers.length > 0 && (
          <section id="offers-section" aria-label="স্পেশাল অফার কর্নার" className="space-y-3">
            <div className="flex items-stretch gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
              {activeSpecialOffers.map((offer) => (
                <div
                  key={offer.id || offer.title}
                  style={{
                    backgroundColor: offer.backgroundColor || '#0A4A29',
                    color: offer.textColor || '#FFFFFF',
                  }}
                  className="min-w-[290px] sm:min-w-[320px] max-w-[360px] shrink-0 snap-start p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-3.5 shadow-md transition-transform hover:scale-[1.01]"
                >
                  {/* Icon emoji on the left */}
                  {offer.icon && (
                    <div className="text-3xl sm:text-4xl shrink-0 select-none">
                      {offer.icon}
                    </div>
                  )}
                  {/* Title, Subtitle, Description */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-bold text-sm sm:text-base leading-tight">
                      {offer.title}
                    </h3>
                    {offer.subtitle && (
                      <p className="text-xs sm:text-sm font-medium opacity-90 leading-snug">
                        {offer.subtitle}
                      </p>
                    )}
                    {offer.description && (
                      <p className="text-[11px] sm:text-xs opacity-80 leading-relaxed pt-0.5">
                        {offer.description}
                      </p>
                    )}
                    {/* Delivery Badge & Direct Order Button (Rule 1) */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                          offer.deliveryChargeEnabled
                            ? 'bg-amber-400 text-slate-900'
                            : 'bg-emerald-400 text-slate-900'
                        }`}
                      >
                        {offer.deliveryChargeEnabled
                          ? `🚚 ডেলিভারি: ৳${offer.deliveryCharge || 0}`
                          : '🚚 ডেলিভারি ফ্রি'}
                      </span>
                      <button
                        type="button"
                        onClick={() => openSpecialOfferOrderModal(offer)}
                        className="text-[11px] font-bold bg-white text-[#0A4A29] hover:bg-slate-100 px-3 py-1 rounded-xl shadow-xs transition shrink-0 cursor-pointer active:scale-95"
                      >
                        অর্ডার করুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            2. 🔥 চলমান অফার (ACTIVE OFFERS) - HORIZONTAL SCROLL
            ========================================================================= */}
        {activeOffers.length > 0 && selectedCategory === 'সব' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-[#0A4A29] flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <span>চলমান অফার (Active Offers)</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {activeOffers.length} টি অফার সচল
              </span>
            </div>

            <div className="flex items-stretch gap-4 overflow-x-auto pb-3 scrollbar-none snap-x">
              {activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="min-w-[280px] sm:min-w-[340px] max-w-[360px] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white rounded-3xl p-5 shadow-lg flex flex-col justify-between shrink-0 snap-start relative overflow-hidden group hover:scale-[1.02] transition-all"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-2 relative z-10">
                    <span className="inline-block bg-white text-orange-950 font-black text-xs px-3 py-1 rounded-full shadow-sm">
                      {offer.type === 'percentage'
                        ? `${offer.discountValue}% ছাড়`
                        : offer.type === 'fixed'
                        ? `৳ ${offer.discountValue} ছাড়`
                        : offer.type === 'freeDelivery'
                        ? 'ফ্রি ডেলিভারি'
                        : 'কম্বো অফার'}
                    </span>
                    <h3 className="font-black text-xl leading-snug drop-shadow-sm">{offer.title}</h3>
                    {offer.titleEn && (
                      <p className="text-xs text-white/90 font-medium">{offer.titleEn}</p>
                    )}
                    <p className="text-xs text-white/80">
                      মেয়াদ: {offer.startDate} থেকে {offer.endDate}
                    </p>
                  </div>

                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `আসসালামু আলাইকুম, আমি "${offer.title}" অফারটি সম্পর্কে জানতে ও অর্ডার করতে চাই।`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full bg-white hover:bg-orange-50 text-[#0A4A29] py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-center shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 fill-[#0A4A29]" />
                    <span>অফারটি লুফে নিন</span>
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            3. 🛒 কম্বো প্যাকেজ (COMBO PACKAGES)
            ========================================================================= */}
        {activePackages.length > 0 && selectedCategory === 'সব' && (
          <section id="packages-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <PackagePlus className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29]">
                    কম্বো প্যাকেজ (Special Combo Packages)
                  </h2>
                  <p className="text-xs text-slate-500">একত্রে কিনুন, বেশি সাশ্রয় করুন</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
                {activePackages.length} টি প্যাকেজ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activePackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          সেভ প্যাকেজ
                        </span>
                        <h3 className="font-bold text-slate-900 text-lg leading-snug mt-1">
                          {pkg.name}
                        </h3>
                      </div>
                      {pkg.discount > 0 && (
                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-600 text-white shadow-xs shrink-0">
                          ৳ {pkg.discount} সাশ্রয়
                        </span>
                      )}
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{pkg.description}</p>
                    )}

                    {/* Products Included */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        প্যাকেজে রয়েছে:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {pkg.products?.map((it, idx) => (
                          <li key={idx} className="flex justify-between items-center">
                            <span className="truncate max-w-[200px]">• {it.productName}</span>
                            <strong className="text-slate-900">{it.quantity} পিস</strong>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-black text-[#0A4A29]">
                        ৳ {pkg.packagePrice.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ৳ {pkg.originalPrice}
                      </span>
                    </div>
                  </div>

                  {/* Order Button */}
                  <button
                    onClick={() => handlePackageWhatsAppOrder(pkg)}
                    className="w-full mt-4 bg-[#25D366] hover:bg-[#20ba5a] text-white py-3 px-4 rounded-2xl font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[48px]"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>প্যাকেজটি অর্ডার করুন</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            5. 📅 প্রি-বুকিং (PRE-BOOKING CAMPAIGNS)
            ========================================================================= */}
        {activePreBookings.length > 0 && selectedCategory === 'সব' && (
          <section id="prebooking-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-800">
                  <CalendarDays className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29]">
                    প্রি-বুকিং ক্যাম্পেইন (Pre-Booking Specials)
                  </h2>
                  <p className="text-xs text-slate-500">
                    অগ্রিম বুকিং দিয়ে নিশ্চিত করুন স্পেশাল আইটেম
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200">
                {activePreBookings.length} টি ক্যাম্পেইন
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activePreBookings.map((camp) => {
                const remainingSlots = Math.max(0, camp.totalSlots - (camp.bookedSlots || 0));
                return (
                  <div
                    key={camp.id}
                    className="bg-white rounded-3xl border-2 border-purple-200 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-1 rounded-full">
                          📅 প্রি-বুকিং চলছে
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          বাকি: {remainingSlots} টি স্লট
                        </span>
                      </div>

                      <h3 className="font-black text-slate-900 text-lg leading-snug">
                        {camp.productName}
                      </h3>

                      <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-100 space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">মূল মূল্য:</span>
                          <strong className="text-slate-900">৳ {camp.fullPrice}</strong>
                        </div>
                        <div className="flex justify-between text-purple-900 font-bold">
                          <span>প্রয়োজনীয় অগ্রিম:</span>
                          <span className="text-base text-purple-700 font-black">
                            ৳ {camp.advanceAmount}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-purple-200/60 text-[11px] text-slate-600">
                          <span>বুকিং শেষ তারিখ:</span>
                          <strong>{camp.bookingEndDate}</strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>সম্ভাব্য ডেলিভারি:</span>
                          <strong className="text-emerald-700">{camp.deliveryDate}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        disabled={remainingSlots <= 0}
                        onClick={() => openPreBookingModal(camp)}
                        className="flex-1 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[48px]"
                      >
                        <CalendarDays className="w-4 h-4 text-[#FFB300]" />
                        <span>{remainingSlots > 0 ? 'প্রি-বুক ফর্ম' : 'স্লট শেষ'}</span>
                      </button>
                      <button
                        disabled={remainingSlots <= 0}
                        onClick={() => handlePreBookingWhatsAppOrder(camp)}
                        className="bg-[#25D366] hover:bg-[#20ba5a] disabled:bg-slate-300 text-white py-3 px-3.5 rounded-2xl font-bold text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[48px]"
                        title="সরাসরি হোয়াটসঅ্যাপে প্রি-বুক করুন"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            6. 🎉 আজকের ডিল (DAILY DEALS) - WITH LIVE COUNTDOWN TIMER
            ========================================================================= */}
        {activeDailyDeals.length > 0 && selectedCategory === 'সব' && (
          <section className="bg-gradient-to-br from-orange-500 via-rose-600 to-red-700 text-white p-5 sm:p-7 rounded-3xl shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl shadow-inner shrink-0">
                  <Flame className="w-7 h-7 fill-white animate-bounce" />
                </span>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black drop-shadow-sm">
                    আজকের ডিল (Daily Flash Deals)
                  </h2>
                  <p className="text-xs sm:text-sm text-orange-100">
                    সীমিত সময়ের জন্য বিশেষ ডিসকাউন্টে সংগ্রহ করুন
                  </p>
                </div>
              </div>

              {/* Countdown Display */}
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
                <Clock className="w-4 h-4 text-[#FFB300]" />
                <span className="text-xs text-white/90 font-bold mr-1">বাকি আছে:</span>
                <div className="flex items-center gap-1 font-mono font-black text-sm sm:text-base text-[#FFB300]">
                  <span className="bg-black/40 px-2 py-0.5 rounded">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span>:</span>
                  <span className="bg-black/40 px-2 py-0.5 rounded">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span>:</span>
                  <span className="bg-black/40 px-2 py-0.5 rounded">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDailyDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white text-slate-800 rounded-3xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-full uppercase">
                        {deal.discount}% ছাড়
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {deal.startTime} - {deal.endTime}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                      {deal.productName}
                    </h3>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-black text-[#0A4A29]">
                        ৳ {deal.dealPrice}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ৳ {deal.originalPrice}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDealWhatsAppOrder(deal)}
                    className="w-full mt-4 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>ডিলে অর্ডার করুন</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* =========================================================================
            7. MAIN CATALOG OR PREMIUM "COMING SOON" PAGE
            ========================================================================= */}
        {isSelectedCategoryInactive ? (
          /* =========================================================================
             PREMIUM "COMING SOON" PAGE DESIGN
             Exact specification:
             1. At top: Large clock or sparkle emoji (🕐 or ✨), size 48-64px
             2. Line 1: "Coming Soon" (28px mobile, 36px desktop, 700 bold, dark green #0A4A29, letter-spacing 1px)
             3. Line 2: "শীঘ্রই আসছে" (20px mobile, 24px desktop, 600 weight, dark green #1E8A52, mt-8px)
             4. Line 3: "এই ক্যাটাগরিতে শীঘ্রই নতুন পণ্য যোগ করা হবে" (15px mobile, 16px desktop, 400 weight, gray #666, mt-12px)
             5. Custom message if set: italic Bengali text, color #888
             6. Estimated date if set: "📅 আনুমানিক তারিখ: [তারিখ]" (14px, #1E8A52, mt-8px)
             7. WhatsApp Button: "💬 এই ক্যাটাগরির পণ্য সম্পর্কে জানতে চান? WhatsApp-এ মেসেজ দিন" (opens WhatsApp with pre-filled message)
             8. "অন্যান্য ক্যাটাগরি দেখুন" button -> switches back to 'সব'
             9. Product request form: Phone + product name request
             10. Beautiful background styling
             ========================================================================= */
          <section className="bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 border-2 border-emerald-100 rounded-3xl p-6 sm:p-12 shadow-sm text-center max-w-2xl mx-auto my-6 space-y-6">
            {/* 1. Large clock or sparkle emoji */}
            <div className="flex items-center justify-center">
              <span className="text-5xl sm:text-6xl animate-pulse select-none inline-block">
                🕐
              </span>
            </div>

            {/* 2. Line 1: Coming Soon */}
            <h1
              className="text-[28px] sm:text-[36px] font-[700] tracking-[1px] leading-tight"
              style={{ color: '#0A4A29' }}
            >
              Coming Soon
            </h1>

            {/* 3. Line 2: শীঘ্রই আসছে */}
            <h2
              className="text-[20px] sm:text-[24px] font-[600] leading-snug -mt-2"
              style={{ color: '#1E8A52', marginTop: '8px' }}
            >
              শীঘ্রই আসছে
            </h2>

            {/* 4. Line 3: এই ক্যাটাগরিতে শীঘ্রই নতুন পণ্য যোগ করা হবে */}
            <p
              className="text-[15px] sm:text-[16px] font-[400] max-w-md mx-auto"
              style={{ color: '#666', marginTop: '12px' }}
            >
              এই ক্যাটাগরিতে শীঘ্রই নতুন পণ্য যোগ করা হবে
            </p>

            {/* 5. Custom message if set by admin */}
            {selectedCategoryObj?.comingSoonMessage && (
              <p className="italic text-sm sm:text-base max-w-md mx-auto" style={{ color: '#888' }}>
                "{selectedCategoryObj.comingSoonMessage}"
              </p>
            )}

            {/* 6. Estimated date if set */}
            {selectedCategoryObj?.estimatedDate && (
              <div
                className="text-[14px] font-bold inline-block bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200"
                style={{ color: '#1E8A52', marginTop: '8px' }}
              >
                📅 আনুমানিক তারিখ: {selectedCategoryObj.estimatedDate}
              </div>
            )}

            {/* 7. WhatsApp Contact Button */}
            <div className="pt-2">
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  `আসসালামু আলাইকুম, আমি InfiMart BD-এর "${selectedCategoryObj?.name || selectedCategory}" ক্যাটাগরির পণ্য সম্পর্কে জানতে চাই। এই ক্যাটাগরিতে কী কী পণ্য আসবে?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-md transition-all hover:shadow-lg active:scale-98 cursor-pointer w-full sm:w-auto"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>💬 এই ক্যাটাগরির পণ্য সম্পর্কে জানতে চান? WhatsApp-এ মেসেজ দিন</span>
              </a>
            </div>

            {/* 8. Browse other categories button */}
            <div>
              <button
                onClick={() => {
                  setSelectedCategory('সব');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-300 min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>অন্যান্য ক্যাটাগরি দেখুন (সকল পণ্য)</span>
              </button>
            </div>

            {/* 9. Product Request Form */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs text-left space-y-3 mt-6">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
                <HelpCircle className="w-4 h-4 text-[#1E8A52]" />
                <span>এই ক্যাটাগরিতে আপনি কি কোনো বিশেষ পণ্য চান?</span>
              </div>
              <p className="text-xs text-slate-500">
                আপনার পছন্দের পণ্যের নাম লিখে পাঠান, আমরা অতি দ্রুত সেটি স্টকে আনার ব্যবস্থা করব।
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  id="productDemandInput"
                  placeholder="যেমন: বিশেষ ব্র্যান্ডের মসলা, খাঁটি ঘি..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('productDemandInput') as HTMLInputElement | null;
                    const val = el?.value?.trim();
                    const text = encodeURIComponent(
                      `আসসালামু আলাইকুম, আমি "${selectedCategoryObj?.name}" ক্যাটাগরিতে এই পণ্যটি যোগ করার অনুরোধ জানাচ্ছি: ${val || 'বিশেষ পণ্য'}`
                    );
                    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
                  }}
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer min-h-[44px] shrink-0"
                >
                  অনুরোধ পাঠান
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* =========================================================================
             ACTIVE CATEGORY NORMAL PRODUCT GRID DISPLAY
             ========================================================================= */
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
                <span className="text-2xl">
                  {selectedCategoryObj?.icon || (selectedCategory === 'সব' ? '🛍️' : '📦')}
                </span>
                <span>
                  {selectedCategory === 'সব' ? 'সব পণ্য (All Products)' : `${selectedCategory}`}
                </span>
              </h2>
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
                মোট {filteredProducts.length} টি পণ্য
              </span>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="py-20 text-center">
                <div className="inline-block w-12 h-12 border-4 border-[#0A4A29] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-semibold">পণ্য লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
              </div>
            )}

            {/* Empty State when no products exist at all */}
            {!loading && products.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto shadow-sm my-8">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0A4A29] flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">এখনো কোনো পণ্য যোগ করা হয়নি।</h3>
                <p className="text-sm text-slate-500 mb-2 leading-relaxed">
                  শীঘ্রই নতুন পণ্য যুক্ত করা হবে। যেকোনো প্রয়োজনে সরাসরি আমাদের সাথে যোগাযোগ করুন।
                </p>
              </div>
            )}

            {/* Search Empty State */}
            {!loading && products.length > 0 && filteredProducts.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 max-w-md mx-auto shadow-sm my-8">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#0A4A29] flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">কোনো পণ্য পাওয়া যায়নি</h3>
                <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                  "{searchQuery || selectedCategory}" এর সাথে মিল রয়েছে এমন কোনো পণ্য আপাতত খুঁজে পাওয়া যায়নি।
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('সব');
                    setSearchQuery('');
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                  className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-sm cursor-pointer min-h-[44px]"
                >
                  সব পণ্য পুনরায় দেখুন
                </button>
              </div>
            )}

            {/* Products Grid (2 cols on mobile, 3 on tablet, 4-5 on desktop) */}
            {!loading && filteredProducts.length > 0 && (
              <div id="products-section" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock === 'Out of Stock';
                  const isLowStock = product.stock === 'Low Stock';
                  const discountInfo = getProductDiscountInfo(product);
                  const hasFreeDelivery = isProductEligibleForFreeDelivery(product);
                  const preBookingCampaign = getProductPreBooking(product);

                  const rawImg = product.image;
                  const productImgSrc =
                    typeof rawImg === 'string' && rawImg.trim()
                      ? rawImg
                      : FALLBACK_PRODUCT_IMAGE;

                  return (
                    <div
                      key={product.id || product.name}
                      className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-0.5"
                    >
                      {/* Image Container (1:1 Aspect Ratio) */}
                      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                        <img
                          src={productImgSrc}
                          alt={product.name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Category Badge */}
                        <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[90px] sm:max-w-none">
                          {product.category}
                        </span>

                        {/* Stock / Discount Badges (Top-Right) */}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          {isOutOfStock ? (
                            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs bg-rose-600 text-white">
                              স্টক শেষ
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs bg-amber-500 text-white">
                              সীমিত
                            </span>
                          ) : null}

                          {discountInfo.hasDiscount && (
                            <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-md shadow-sm bg-rose-600 text-white animate-pulse">
                              {discountInfo.discountText}
                            </span>
                          )}

                          {hasFreeDelivery && (
                            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs bg-emerald-600 text-white flex items-center gap-0.5">
                              <Truck className="w-2.5 h-2.5" />
                              <span className="hidden xs:inline">ফ্রি</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details Body */}
                      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Product name: 2 lines max, ellipsis */}
                          <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2 h-9 sm:h-10 mb-1 group-hover:text-[#0A4A29] transition-colors">
                            {product.name}
                          </h3>

                          {/* Star Rating & Review trigger */}
                          {(() => {
                            const ratingStats = getProductRatingStats(product.id, product.name);
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProductReviewsModal(product);
                                }}
                                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-[#0A4A29] mb-1.5 transition text-left cursor-pointer group/rate"
                                title="পণ্য রিভিউ ও রেটিং দেখুন বা লিখুন"
                              >
                                <div className="flex items-center text-[#FFB300]">
                                  <Star className="w-3.5 h-3.5 fill-[#FFB300]" />
                                </div>
                                {ratingStats.hasReviews ? (
                                  <span className="font-bold text-slate-700 flex items-center gap-1">
                                    <span>{ratingStats.average}</span>
                                    <span className="text-slate-400 font-normal">({ratingStats.count})</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 group-hover/rate:text-[#0A4A29] underline decoration-dotted">
                                    রিভিউ দিন
                                  </span>
                                )}
                              </button>
                            );
                          })()}

                          {/* Price & Unit */}
                          <div className="flex items-baseline flex-wrap gap-1 mb-2.5">
                            {discountInfo.hasDiscount ? (
                              <>
                                <span className="text-base sm:text-xl font-black text-[#0A4A29]">
                                  ৳{discountInfo.discountedPrice.toLocaleString('bn-BD')}
                                </span>
                                <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                                  ৳{discountInfo.originalPrice.toLocaleString('bn-BD')}
                                </span>
                              </>
                            ) : (
                              <span className="text-base sm:text-xl font-black text-[#0A4A29]">
                                ৳{product.price.toLocaleString('bn-BD')}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 font-medium">
                              / {product.unit}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Multiple Channel Order Buttons */}
                        {preBookingCampaign ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openPreBookingModal(preBookingCampaign)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl font-bold text-xs transition-all shadow-xs bg-[#0A4A29] hover:bg-[#1E8A52] text-white active:scale-98 min-h-[44px] cursor-pointer"
                            >
                              <CalendarDays className="w-3.5 h-3.5 text-[#FFB300]" />
                              <span>প্রি-বুক</span>
                            </button>
                            <button
                              onClick={() => handlePreBookingWhatsAppOrder(preBookingCampaign)}
                              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl font-bold text-xs transition-all shadow-xs bg-[#25D366] hover:bg-[#20ba5a] text-white active:scale-98 cursor-pointer shrink-0"
                              title="হোয়াটসঅ্যাপে প্রি-বুক করুন"
                            >
                              <WhatsAppIcon className="w-4 h-4 fill-white" />
                            </button>
                          </div>
                        ) : isOutOfStock ? (
                          <div className="w-full flex items-center justify-center py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-200 text-slate-400 cursor-not-allowed min-h-[44px]">
                            <span>স্টক শেষ</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 w-full pt-1">
                            {/* 3 Circular Icon Buttons in a single horizontal row (44x44px, gap-2) */}
                            <div className="flex items-center justify-center gap-2">
                              {isWhatsappEnabled && (
                                <a
                                  href={getProductWhatsAppUrl(
                                    product,
                                    discountInfo.hasDiscount ? discountInfo.discountedPrice : product.price
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                                  title="হোয়াটসঅ্যাপে অর্ডার"
                                  aria-label="হোয়াটসঅ্যাপে অর্ডার"
                                >
                                  <WhatsAppIcon className="w-5 h-5 fill-white" />
                                </a>
                              )}

                              {isMessengerEnabled && (
                                <a
                                  href={getProductMessengerUrl(
                                    product,
                                    discountInfo.hasDiscount ? discountInfo.discountedPrice : product.price
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#0084FF] hover:bg-[#0072db] text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                                  title="Messenger-এ অর্ডার"
                                  aria-label="Messenger-এ অর্ডার"
                                >
                                  <MessengerIcon className="w-5 h-5 fill-white" />
                                </a>
                              )}

                              {isCallEnabled && (
                                <a
                                  href={`tel:${cleanCallPhone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#FF8C00] hover:bg-[#e07b00] text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
                                  title="কল করুন"
                                  aria-label="কল করুন"
                                >
                                  <Phone className="w-4 h-4 text-white" />
                                </a>
                              )}
                            </div>

                            {/* Option to open full order modal: 📋 অর্ডার ফর্ম দিয়ে অর্ডার করুন */}
                            <button
                              type="button"
                              onClick={() => openProductOrderModal(product)}
                              className="w-full text-center text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center justify-center gap-1 transition pt-0.5"
                            >
                              <span>📋 অর্ডার ফর্ম দিয়ে অর্ডার করুন</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Order Success Toast Notification */}
      {orderSuccessToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A4A29] text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-[#FFB300] flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5 text-[#FFB300]" />
          <span className="font-bold text-sm">{orderSuccessToast}</span>
        </div>
      )}

      {/* =========================================================================
          ORDER FORM POPUP MODAL (Mobile Bottom Sheet / Desktop Centered Dialog)
          ========================================================================= */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 relative max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="bg-[#0A4A29] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b-2 border-[#FFB300]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#FFB300] shadow-inner">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                    অর্ডার ফর্ম (Order Form)
                  </h3>
                  <p className="text-xs text-emerald-200">
                    সহজে ফর্ম পূরণ করে সরাসরি হোয়াটসঅ্যাপে অর্ডার পাঠান
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProductOrderModal}
                className="text-white/80 hover:text-white hover:bg-white/15 p-2 rounded-full transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleProductOrderSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Product preview card */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 flex items-center gap-3.5">
                <img
                  src={selectedProductForOrder.image || FALLBACK_PRODUCT_IMAGE}
                  alt={selectedProductForOrder.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 border border-emerald-200 bg-white"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                    নির্বাচিত পণ্য
                  </span>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base truncate mt-0.5">
                    {selectedProductForOrder.name}
                  </h4>

                  {/* Star rating shortcut in Order Modal */}
                  {(() => {
                    const ratingStats = getProductRatingStats(selectedProductForOrder.id, selectedProductForOrder.name);
                    return (
                      <button
                        type="button"
                        onClick={() => openProductReviewsModal(selectedProductForOrder)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#0A4A29] font-bold hover:underline cursor-pointer"
                      >
                        <Star className="w-3 h-3 fill-[#FFB300] text-[#FFB300]" />
                        <span>{ratingStats.hasReviews ? `রেটিং: ${ratingStats.average} (${ratingStats.count} টি রিভিউ) - দেখুন` : 'রিভিউ দেখুন / লিখুন'}</span>
                      </button>
                    );
                  })()}

                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-500 font-semibold">দাম:</span>
                    <span className="text-base font-black text-[#0A4A29]">
                      ৳{orderUnitPrice} / {selectedProductForOrder.unit}
                    </span>
                    {orderProductDiscount?.hasDiscount && (
                      <span className="text-xs text-slate-400 line-through">
                        ৳{orderProductDiscount.originalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. Product Name (Read-only, auto-filled) */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  পণ্যের নাম (Product Name)
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedProductForOrder.name}
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-base cursor-not-allowed select-none"
                />
              </div>

              {/* 2 & 3. Quantity & Real-time Delivery / Price Calculations */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      {(() => {
                        const u = selectedProductForOrder.unit;
                        if (u === 'কেজি') return 'পরিমাণ (কেজি / kg)';
                        if (u === '১০০ গ্রাম') return 'পরিমাণ (১০০ গ্রাম প্যাকেট সংখ্যা)';
                        if (u === '২৫০ গ্রাম') return 'পরিমাণ (২৫০ গ্রাম প্যাকেট সংখ্যা)';
                        if (u === '৫০০ গ্রাম') return 'পরিমাণ (৫০০ গ্রাম প্যাকেট সংখ্যা)';
                        if (u === 'পিস') return 'পরিমাণ (পিস সংখ্যা)';
                        if (u === 'ডজন') return 'পরিমাণ (ডজন সংখ্যা)';
                        if (u === 'হালি') return 'পরিমাণ (হালি সংখ্যা)';
                        if (u === 'ভরি') return 'পরিমাণ (ভরি)';
                        if (u === 'ছটাক') return 'পরিমাণ (ছটাক)';
                        if (u === 'আঁটি') return 'পরিমাণ (আঁটি)';
                        if (u === 'প্যাকেট') return 'পরিমাণ (প্যাকেট সংখ্যা)';
                        if (u === 'বোতল') return 'পরিমাণ (বোতল সংখ্যা)';
                        if (u === 'লিটার') return 'পরিমাণ (লিটার)';
                        if (u === 'মিলি') return 'পরিমাণ (মিলি)';
                        if (u === 'গ্রাম') return 'পরিমাণ (গ্রাম)';
                        return `পরিমাণ (${u})`;
                      })()} <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      প্রতি {selectedProductForOrder.unit}: ৳{orderUnitPrice}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min={selectedProductForOrder.unit === 'গ্রাম' ? 1 : (selectedProductForOrder.unit === 'কেজি' ? 0.25 : 1)}
                      step={selectedProductForOrder.unit === 'কেজি' ? '0.25' : '1'}
                      value={orderQuantity}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        setOrderQuantity(val as number);
                        if (orderFormErrors.quantity) {
                          setOrderFormErrors((prev) => ({ ...prev, quantity: undefined }));
                        }
                      }}
                      className={`w-full min-h-[48px] px-3.5 pr-28 rounded-xl border text-base font-bold transition focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                        orderFormErrors.quantity
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900'
                          : 'border-slate-300 text-slate-900 bg-white'
                      }`}
                      placeholder="1"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 pointer-events-none">
                      {(() => {
                        const u = selectedProductForOrder.unit;
                        if (u === '১০০ গ্রাম') return '১০০ গ্রাম প্যাক';
                        if (u === '২৫০ গ্রাম') return '২৫০ গ্রাম প্যাক';
                        if (u === '৫০০ গ্রাম') return '৫০০ গ্রাম প্যাক';
                        if (u === 'কেজি') return 'কেজি';
                        if (u === 'পিস') return 'পিস';
                        if (u === 'ডজন') return 'ডজন';
                        if (u === 'হালি') return 'হালি';
                        if (u === 'ভরি') return 'ভরি';
                        if (u === 'ছটাক') return 'ছটাক';
                        if (u === 'আঁটি') return 'আঁটি';
                        if (u === 'বোতল') return 'বোতল';
                        if (u === 'প্যাকেট') return 'প্যাকেট';
                        if (u === 'লিটার') return 'লিটার';
                        if (u === 'মিলি') return 'মিলি';
                        if (u === 'গ্রাম') return 'গ্রাম';
                        return u;
                      })()}
                    </span>
                  </div>

                  {/* Quick-Preset Quantity Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-bold text-slate-500 mr-0.5">দ্রুত নির্বাচন:</span>
                    {(() => {
                      const u = selectedProductForOrder.unit;
                      let presets: { qty: number; label: string }[] = [];
                      if (u === '১০০ গ্রাম') {
                        presets = [
                          { qty: 1, label: '১ (১০০g)' },
                          { qty: 2, label: '২ (২০০g)' },
                          { qty: 3, label: '৩ (৩০০g)' },
                          { qty: 5, label: '৫ (৫০০g)' },
                          { qty: 10, label: '১০ (১ কেজি)' },
                        ];
                      } else if (u === '২৫০ গ্রাম') {
                        presets = [
                          { qty: 1, label: '১ (২৫০g)' },
                          { qty: 2, label: '২ (৫০০g)' },
                          { qty: 3, label: '৩ (৭৫০g)' },
                          { qty: 4, label: '৪ (১ কেজি)' },
                        ];
                      } else if (u === '৫০০ গ্রাম') {
                        presets = [
                          { qty: 1, label: '১ (৫০০g)' },
                          { qty: 2, label: '২ (১ কেজি)' },
                          { qty: 3, label: '৩ (১.৫ কেজি)' },
                          { qty: 4, label: '৪ (২ কেজি)' },
                        ];
                      } else if (u === 'কেজি') {
                        presets = [
                          { qty: 1, label: '১ কেজি' },
                          { qty: 2, label: '২ কেজি' },
                          { qty: 3, label: '৩ কেজি' },
                          { qty: 5, label: '৫ কেজি' },
                          { qty: 10, label: '১০ কেজি' },
                        ];
                      } else if (u === 'পিস') {
                        presets = [
                          { qty: 1, label: '১ পিস' },
                          { qty: 2, label: '২ পিস' },
                          { qty: 3, label: '৩ পিস' },
                          { qty: 5, label: '৫ পিস' },
                          { qty: 10, label: '১০ পিস' },
                        ];
                      } else if (u === 'ডজন') {
                        presets = [
                          { qty: 1, label: '১ ডজন' },
                          { qty: 2, label: '২ ডজন' },
                          { qty: 3, label: '৩ ডজন' },
                        ];
                      } else if (u === 'হালি') {
                        presets = [
                          { qty: 1, label: '১ হালি' },
                          { qty: 2, label: '২ হালি' },
                          { qty: 3, label: '৩ হালি' },
                          { qty: 4, label: '৪ হালি' },
                        ];
                      } else if (u === 'ভরি') {
                        presets = [
                          { qty: 1, label: '১ ভরি' },
                          { qty: 2, label: '২ ভরি' },
                          { qty: 5, label: '৫ ভরি' },
                        ];
                      } else {
                        presets = [
                          { qty: 1, label: '১' },
                          { qty: 2, label: '২' },
                          { qty: 3, label: '৩' },
                          { qty: 5, label: '৫' },
                        ];
                      }

                      return presets.map((p) => (
                        <button
                          key={p.qty}
                          type="button"
                          onClick={() => {
                            setOrderQuantity(p.qty);
                            if (orderFormErrors.quantity) {
                              setOrderFormErrors((prev) => ({ ...prev, quantity: undefined }));
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            orderQuantity === p.qty
                              ? 'bg-[#0A4A29] text-white border-[#0A4A29] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* Real-time Calculation Breakdown Banner (Total = Quantity × Price) */}
                  {numOrderQty > 0 && (
                    <div className="mt-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs animate-fadeIn">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Scale className="w-3.5 h-3.5 text-[#1E8A52] shrink-0" />
                        <span>
                          {(() => {
                            const u = selectedProductForOrder.unit;
                            if (u === '১০০ গ্রাম') {
                              const g = numOrderQty * 100;
                              return `${numOrderQty} টি ১০০ গ্রাম প্যাক = মোট ${g >= 1000 ? `${g / 1000} কেজি` : `${g} গ্রাম`}`;
                            }
                            if (u === '২৫০ গ্রাম') {
                              const g = numOrderQty * 250;
                              return `${numOrderQty} টি ২৫০ গ্রাম প্যাক = মোট ${g >= 1000 ? `${g / 1000} কেজি` : `${g} গ্রাম`}`;
                            }
                            if (u === '৫০০ গ্রাম') {
                              const g = numOrderQty * 500;
                              return `${numOrderQty} টি ৫০০ গ্রাম প্যাক = মোট ${g >= 1000 ? `${g / 1000} কেজি` : `${g} গ্রাম`}`;
                            }
                            if (u === 'কেজি') return `মোট ওজন: ${numOrderQty} কেজি`;
                            if (u === 'পিস') return `মোট: ${numOrderQty} পিস`;
                            if (u === 'ডজন') return `${numOrderQty} ডজন = মোট ${numOrderQty * 12} টি`;
                            if (u === 'হালি') return `${numOrderQty} হালি = মোট ${numOrderQty * 4} টি`;
                            if (u === 'ভরি') return `মোট পরিমাণ: ${numOrderQty} ভরি`;
                            if (u === 'ছটাক') return `মোট পরিমাণ: ${numOrderQty} ছটাক`;
                            return `মোট: ${numOrderQty} ${u}`;
                          })()}
                        </span>
                      </div>
                      <div className="text-[#0A4A29] font-black sm:text-right">
                        হিসাব: {numOrderQty} × ৳{orderUnitPrice} = ৳{orderSubtotal.toLocaleString('en-US')}
                      </div>
                    </div>
                  )}

                  {orderFormErrors.quantity && (
                    <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{orderFormErrors.quantity}</span>
                    </p>
                  )}
                </div>

                {/* Real-time Order Summary Box (Subtotal, Delivery, Total) */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 font-semibold">
                      পণ্যের সাবটোটাল ({numOrderQty} × ৳{orderUnitPrice}):
                    </span>
                    <span className="font-bold text-slate-900">৳ {orderSubtotal.toLocaleString('en-US')}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600 font-semibold flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#1E8A52]" />
                      <span>ডেলিভারি চার্জ:</span>
                    </span>
                    <span className="font-bold">
                      {orderDeliveryCharge === 0 ? (
                        <span className="text-emerald-700 bg-emerald-100 font-black px-2 py-0.5 rounded-md">
                          ফ্রি (৳০)
                        </span>
                      ) : (
                        <span className="text-slate-900">৳ {orderDeliveryCharge}</span>
                      )}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm sm:text-base font-black">
                    <span className="text-[#0A4A29]">সর্বমোট প্রদেয় মূল্য:</span>
                    <span className="text-xl font-black text-[#0A4A29]">
                      ৳ {orderTotalPrice.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* Free Delivery Progress Bar (Rule 2) */}
                  {!selectedOfferForOrder && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      {orderSubtotal < (settings.freeDeliveryThreshold ?? 3000) ? (
                        <>
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>৳{orderSubtotal} / ৳{settings.freeDeliveryThreshold ?? 3000}</span>
                            <span className="text-[#0A4A29]">
                              ডেলিভারি ফ্রি পেতে আর ৳{(settings.freeDeliveryThreshold ?? 3000) - orderSubtotal} প্রয়োজন
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#1E8A52] h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((orderSubtotal / (settings.freeDeliveryThreshold ?? 3000)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="bg-emerald-100 text-emerald-900 text-xs font-black p-2 rounded-xl text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                          <span>🎉</span>
                          <span>অভিনন্দন! আপনার অর্ডারে ডেলিভারি সম্পূর্ণ ফ্রি!</span>
                        </div>
                      )}

                      {freeDeliveryReason === 'weight' && (
                        <div className="bg-purple-100 text-purple-900 text-xs font-black p-2 rounded-xl text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                          <span>🎉</span>
                          <span>ওজন অনুযায়ী ডেলিভারি ফ্রি! ({orderTotalWeight} কেজি)</span>
                        </div>
                      )}

                      {orderSubtotal < (settings.minOrderAmount ?? 200) && (
                        <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>সর্বনিম্ন ৳{settings.minOrderAmount ?? 200}-এর অর্ডার করতে হবে</span>
                        </p>
                      )}
                    </div>
                  )}

                  {selectedOfferForOrder && (
                    <div className="pt-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded-xl flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FFB300]" />
                      <span>
                        স্পেশাল অফার ডেলিভারি:{' '}
                        {selectedOfferForOrder.deliveryChargeEnabled
                          ? `৳${selectedOfferForOrder.deliveryCharge || 0}`
                          : 'সম্পূর্ণ ফ্রি'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Country Selector (For Expat detection) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>আপনি কোন দেশ থেকে অর্ডার করছেন? (Country) <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <select
                    value={orderCountry}
                    onChange={(e) => {
                      const newCountry = e.target.value;
                      setOrderCountry(newCountry);
                      if (newCountry !== 'বাংলাদেশ (Bangladesh)') {
                        setOrderPaymentType('advance');
                      }
                    }}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 bg-white text-base font-bold text-slate-800 focus:ring-2 focus:ring-[#0A4A29] focus:outline-none cursor-pointer"
                  >
                    {COUNTRIES_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {isAbroadCustomer && (
                  <div className="mt-2 bg-indigo-50 border border-indigo-200 text-indigo-900 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>
                      🌍 প্রবাসী অর্ডার: আপনি প্রবাস থেকে দেশের পরিবারের কাছে সরাসরি পৌঁছে দেওয়ার জন্য অর্ডার করছেন। প্রবাসীদের ক্ষেত্রে ক্যাশ অন ডেলিভারি প্রযোজ্য নয়, শুধু অগ্রিম পেমেন্ট প্রযোজ্য।
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Gift Order Toggle */}
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGiftOrder}
                    onChange={(e) => {
                      setIsGiftOrder(e.target.checked);
                      if (e.target.checked) {
                        setOrderPaymentType('advance');
                      }
                    }}
                    className="w-5 h-5 rounded text-[#0A4A29] focus:ring-0 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="text-xs sm:text-sm font-black text-amber-900 flex items-center gap-1">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>পরিবারের জন্য উপহার অর্ডার (Gift Order)</span>
                    </span>
                    <span className="text-[11px] text-amber-700 block">
                      উপহার প্রাপকের নাম, ফোন ও ঠিকানা আলাদা থাকলে টিক দিন
                    </span>
                  </div>
                </label>

                {isGiftOrder && (
                  <div className="mt-3 pt-3 border-t border-amber-200 space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        উপহার প্রাপকের নাম (Recipient Name) *
                      </label>
                      <input
                        type="text"
                        value={giftRecipientName}
                        onChange={(e) => setGiftRecipientName(e.target.value)}
                        placeholder="যিনি ফেনীতে পণ্য গ্রহণ করবেন তার নাম"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none"
                        required={isGiftOrder}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        উপহার প্রাপকের মোবাইল নম্বর *
                      </label>
                      <input
                        type="tel"
                        value={giftRecipientPhone}
                        onChange={(e) => setGiftRecipientPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none"
                        required={isGiftOrder}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        উপহার পৌঁছানোর পূর্ণ ঠিকানা *
                      </label>
                      <textarea
                        rows={2}
                        value={giftRecipientAddress}
                        onChange={(e) => setGiftRecipientAddress(e.target.value)}
                        placeholder="গ্রাম/রোড, পোস্ট অফিস, থানা, ফেনী"
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none"
                        required={isGiftOrder}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Customer Name (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আপনার নাম (Customer Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderCustomerName}
                  onChange={(e) => {
                    setOrderCustomerName(e.target.value);
                    if (orderFormErrors.customerName) {
                      setOrderFormErrors((prev) => ({ ...prev, customerName: undefined }));
                    }
                  }}
                  placeholder="আপনার পূর্ণ নাম লিখুন"
                  className={`w-full min-h-[48px] px-3.5 rounded-xl border text-base transition focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                    orderFormErrors.customerName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                  }`}
                  required
                />
                {orderFormErrors.customerName && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{orderFormErrors.customerName}</span>
                  </p>
                )}
              </div>

              {/* 7. Customer Phone (Required) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আপনার মোবাইল / হোয়াটসঅ্যাপ নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={orderCustomerPhone}
                    onChange={(e) => {
                      setOrderCustomerPhone(e.target.value);
                      if (orderFormErrors.customerPhone) {
                        setOrderFormErrors((prev) => ({ ...prev, customerPhone: undefined }));
                      }
                    }}
                    placeholder={isAbroadCustomer ? '+966... / +971... / 01...' : '01XXXXXXXXX (১১ ডিজিট)'}
                    className={`w-full min-h-[48px] pl-10 pr-3.5 rounded-xl border text-base font-medium transition focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                      orderFormErrors.customerPhone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                    }`}
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {orderFormErrors.customerPhone && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{orderFormErrors.customerPhone}</span>
                  </p>
                )}
              </div>

              {/* 8. Delivery Address (Required if not separate gift recipient address) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isGiftOrder ? 'আপনার বর্তমান ঠিকানা' : 'ডেলিভারি ঠিকানা (Delivery Address)'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={orderCustomerAddress}
                  onChange={(e) => {
                    setOrderCustomerAddress(e.target.value);
                    if (orderFormErrors.customerAddress) {
                      setOrderFormErrors((prev) => ({ ...prev, customerAddress: undefined }));
                    }
                  }}
                  placeholder="বাসা/হোল্ডিং নম্বর, রোড, এলাকা/গ্রাম, থানা (কমপক্ষে ১০ অক্ষর)"
                  rows={2}
                  className={`w-full p-3 rounded-xl border text-base transition focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                    orderFormErrors.customerAddress ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                  }`}
                  required
                />
                {orderFormErrors.customerAddress && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{orderFormErrors.customerAddress}</span>
                  </p>
                )}
              </div>

              {/* =========================================================================
                  9. PAYMENT METHOD SELECTION (PAYMENT SYSTEM FOR ALL CUSTOMERS)
                  ========================================================================= */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700">
                  পেমেন্ট পদ্ধতি নির্বাচন করুন (Payment Method) <span className="text-rose-500">*</span>
                </label>

                {/* If Abroad Customer or Gift Order -> HIDE COD and Show Only Advance */}
                {isCodHidden ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 font-black text-indigo-900 text-sm">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                      <span>অগ্রিম পেমেন্ট (Advance Payment) প্রযোজ্য</span>
                    </div>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      🌍 প্রবাস থেকে দেওয়া অর্ডার অথবা উপহার অর্ডারে ক্যাশ অন ডেলিভারি প্রযোজ্য নয়। অনুগ্রহ করে বিকাশ, নগদ, রকেট বা ব্যাংক একাউন্টে পেমেন্ট করে ট্রানজেকশন আইডি প্রদান করুন।
                    </p>
                  </div>
                ) : (
                  /* For local regular customers: Show BOTH Cash on Delivery and Advance Payment */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* COD Option */}
                    <button
                      type="button"
                      disabled={settings.codEnabled === false}
                      onClick={() => setOrderPaymentType('cod')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center gap-3 cursor-pointer min-h-[48px] ${
                        effectivePaymentType === 'cod'
                          ? 'border-[#0A4A29] bg-emerald-50/80 text-[#0A4A29] shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      } ${settings.codEnabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        effectivePaymentType === 'cod' ? 'border-[#0A4A29] bg-[#0A4A29]' : 'border-slate-300'
                      }`}>
                        {effectivePaymentType === 'cod' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-black block">ক্যাশ অন ডেলিভারি</span>
                        <span className="text-[10px] text-slate-500">পণ্য হাতে পেয়ে মূল্য পরিশোধ</span>
                      </div>
                    </button>

                    {/* Advance Payment Option */}
                    <button
                      type="button"
                      disabled={settings.advancePaymentEnabled === false}
                      onClick={() => setOrderPaymentType('advance')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center gap-3 cursor-pointer min-h-[48px] ${
                        effectivePaymentType === 'advance'
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      } ${settings.advancePaymentEnabled === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        effectivePaymentType === 'advance' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}>
                        {effectivePaymentType === 'advance' && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-black block">অগ্রিম পেমেন্ট</span>
                        <span className="text-[10px] text-slate-500">বিকাশ / নগদ / রকেট / ব্যাংক</span>
                      </div>
                    </button>
                  </div>
                )}

                {/* ADVANCE PAYMENT DETAILS & INPUTS */}
                {effectivePaymentType === 'advance' && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                      <span className="text-slate-600 font-bold">প্রদেয় অগ্রিম মূল্য:</span>
                      <span className="text-base font-black text-indigo-900">
                        ৳ {requiredAdvanceAmount.toLocaleString('en-US')}
                        {dueAmount > 0 && (
                          <span className="text-xs text-slate-500 font-normal ml-1">
                            (বাকি ৳{dueAmount} ডেলিভারির সময়)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Provider Tabs: bKash, Nagad, Rocket, Bank */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1.5">
                        পেমেন্ট চ্যানেল বেছে নিন:
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {(['bKash', 'Nagad', 'Rocket', 'Bank'] as const).map((prov) => (
                          <button
                            key={prov}
                            type="button"
                            onClick={() => setOrderAdvanceProvider(prov)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                              orderAdvanceProvider === prov
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {prov === 'bKash' ? 'বিকাশ' : prov === 'Nagad' ? 'নগদ' : prov === 'Rocket' ? 'রকেট' : 'ব্যাংক'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Official Account Number & Copy Button */}
                    <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                          {orderAdvanceProvider} অ্যাকাউন্ট বিবরণী:
                        </span>
                        <span className="text-xs sm:text-sm font-mono font-black text-slate-800 break-words whitespace-pre-line">
                          {getSelectedProviderNumber()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPaymentNumber}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        {copiedPaymentNumber ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>কপি</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Transaction ID Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ট্রানজেকশন আইডি (Transaction ID / TxID) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={orderTransactionId}
                        onChange={(e) => {
                          setOrderTransactionId(e.target.value);
                          if (orderFormErrors.transactionId) {
                            setOrderFormErrors((prev) => ({ ...prev, transactionId: undefined }));
                          }
                        }}
                        placeholder="যেমন: 9J38A7K4PX"
                        className={`w-full min-h-[44px] px-3.5 rounded-xl border text-sm font-mono font-bold uppercase transition bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none ${
                          orderFormErrors.transactionId ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                        }`}
                        required={effectivePaymentType === 'advance'}
                      />
                      {orderFormErrors.transactionId && (
                        <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{orderFormErrors.transactionId}</span>
                        </p>
                      )}
                    </div>

                    {/* Payment Receipt / Screenshot Upload (Optional / Recommended) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        পেমেন্ট স্ক্রিনশট / রসিদ আপলোড (ঐচ্ছিক)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer transition min-h-[40px]">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isUploadingSlip ? 'আপলোড হচ্ছে...' : 'ছবি বেছে নিন'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleSlipUpload}
                            disabled={isUploadingSlip}
                            className="hidden"
                          />
                        </label>

                        {orderPaymentSlipUrl && (
                          <div className="flex items-center gap-2">
                            <img
                              src={orderPaymentSlipUrl}
                              alt="Payment Slip"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-300"
                            />
                            <button
                              type="button"
                              onClick={() => setOrderPaymentSlipUrl('')}
                              className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                            >
                              মুছুন
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 10. Optional Notes input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অতিরিক্ত নির্দেশনা (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="যেমন: বিকেলে ডেলিভারি দিলে ভালো হয়"
                  className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 bg-white text-base transition focus:ring-2 focus:ring-[#0A4A29] focus:outline-none"
                />
              </div>

              {/* 11. Order Channel Selection: কীভাবে অর্ডার করতে চান? */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>কীভাবে অর্ডার করতে চান?</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">যেকোনো মাধ্যম বেছে নিন</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {isWhatsappEnabled && (
                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      orderChannel === 'whatsapp'
                        ? 'border-[#25D366] bg-emerald-50 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="orderChannel"
                        value="whatsapp"
                        checked={orderChannel === 'whatsapp'}
                        onChange={() => setOrderChannel('whatsapp')}
                        className="text-[#25D366] focus:ring-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                          <WhatsAppIcon className="w-3 h-3 fill-white" />
                        </div>
                        <span className="text-xs font-bold truncate">হোয়াটসঅ্যাপ</span>
                      </div>
                    </label>
                  )}

                  {isMessengerEnabled && (
                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      orderChannel === 'messenger'
                        ? 'border-[#0084FF] bg-blue-50 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="orderChannel"
                        value="messenger"
                        checked={orderChannel === 'messenger'}
                        onChange={() => setOrderChannel('messenger')}
                        className="text-[#0084FF] focus:ring-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#0084FF] to-[#00C6FF] flex items-center justify-center shrink-0">
                          <MessengerIcon className="w-3 h-3 fill-white" />
                        </div>
                        <span className="text-xs font-bold truncate">Messenger</span>
                      </div>
                    </label>
                  )}

                  {isCallEnabled && (
                    <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                      orderChannel === 'call'
                        ? 'border-[#FF8C00] bg-amber-50 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="orderChannel"
                        value="call"
                        checked={orderChannel === 'call'}
                        onChange={() => setOrderChannel('call')}
                        className="text-[#FF8C00] focus:ring-0 cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-[#FF8C00] flex items-center justify-center shrink-0 text-white">
                          <Phone className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-xs font-bold truncate">কল করুন</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons: Submit based on orderChannel & Cancel */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                {orderChannel === 'messenger' ? (
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-1 min-h-[48px] bg-gradient-to-r from-[#0084FF] to-[#00C6FF] hover:opacity-95 text-white font-bold text-sm sm:text-base px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75"
                  >
                    <MessengerIcon className="w-5 h-5 fill-white" />
                    <span>{isSubmittingOrder ? 'সংরক্ষণ হচ্ছে...' : 'Messenger-এ অর্ডার পাঠান'}</span>
                  </button>
                ) : orderChannel === 'call' ? (
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-1 min-h-[48px] bg-[#FF8C00] hover:bg-[#e07b00] text-white font-bold text-sm sm:text-base px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75"
                  >
                    <Phone className="w-5 h-5" />
                    <span>{isSubmittingOrder ? 'সংরক্ষণ হচ্ছে...' : 'সরাসরি কল করুন'}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-1 min-h-[48px] bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm sm:text-base px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-white" />
                    <span>{isSubmittingOrder ? 'সংরক্ষণ হচ্ছে...' : 'হোয়াটসঅ্যাপে অর্ডার পাঠান'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeProductOrderModal}
                  className="min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm sm:text-base px-6 py-3 rounded-2xl transition-all cursor-pointer active:scale-98 flex items-center justify-center"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Booking Modal */}
      {selectedCampaignForBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 relative max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slideUp">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-purple-700">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-[#FFB300]" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight">পণ্য প্রি-বুকিং ফর্ম</h3>
                  <p className="text-xs text-purple-200">
                    {selectedCampaignForBooking.productName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCampaignForBooking(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain">
              {bookingSuccessMsg ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-black text-slate-800">
                    প্রি-বুকিং সফলভাবে সম্পন্ন হয়েছে!
                  </h4>
                  <p className="text-sm text-slate-600">
                    আপনার প্রি-বুকিং রসিদ তৈরি হয়েছে এবং হোয়াটসঅ্যাপে পাঠানো হচ্ছে।
                  </p>
                  <button
                    onClick={() => setSelectedCampaignForBooking(null)}
                    className="mt-3 bg-[#0A4A29] text-white px-6 py-2.5 rounded-xl font-bold text-sm"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePreBookingSubmit} className="space-y-4">
                  {/* Calculation summary */}
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-xs space-y-2">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>পূর্ণ মূল্য: ৳ {selectedCampaignForBooking.fullPrice} / পিস</span>
                      <span className="text-purple-700">
                        অগ্রিম: ৳ {selectedCampaignForBooking.advanceAmount} / পিস
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>সম্ভাব্য ডেলিভারি তারিখ:</span>
                      <strong>{selectedCampaignForBooking.deliveryDate}</strong>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      পরিমাণ (পিস)
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingQty(Math.max(1, bookingQty - 1))}
                        className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg hover:bg-slate-200"
                      >
                        -
                      </button>
                      <span className="text-base font-bold w-10 text-center">{bookingQty}</span>
                      <button
                        type="button"
                        onClick={() => setBookingQty(bookingQty + 1)}
                        className="w-10 h-10 rounded-xl bg-slate-100 font-bold text-lg hover:bg-slate-200"
                      >
                        +
                      </button>
                      <div className="flex-1 text-right text-xs">
                        মোট অগ্রিম:{' '}
                        <strong className="text-purple-700 text-sm font-black">
                          ৳ {selectedCampaignForBooking.advanceAmount * bookingQty}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="যেমন: তানভীর আহমেদ"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="018XXXXXXXX"
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ডেলিভারির ঠিকানা
                    </label>
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="বাড়ি/রোড, এলাকা, ফেনী..."
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  {/* Payment instruction */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      অগ্রিম পেমেন্ট মাধ্যম
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 rounded-xl font-bold transition text-xs ${
                            paymentMethod === method
                              ? 'bg-[#0A4A29] text-white'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        ট্রানজেকশন আইডি (TxID) বা প্রেরক নম্বর
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="যেমন: 9J78AK..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBooking}
                    className="w-full bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer min-h-[48px]"
                  >
                    {isSubmittingBooking ? 'প্রসেসিং হচ্ছে...' : 'প্রি-বুকিং নিশ্চিত করুন'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ⭐ PRODUCT REVIEWS & RATINGS MODAL
          ========================================================================= */}
      {selectedProductForReviews && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 relative max-h-[94vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-slideUp">
            {/* Header */}
            <div className="sticky top-0 bg-[#0A4A29] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between z-20 shrink-0 border-b border-[#FFB300]">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <img
                  src={selectedProductForReviews.image || FALLBACK_PRODUCT_IMAGE}
                  alt={selectedProductForReviews.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-white/20 bg-white shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                  }}
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFB300] bg-white/10 px-2 py-0.5 rounded">
                    পণ্য রিভিউ ও রেটিং
                  </span>
                  <h3 className="font-black text-white text-xs sm:text-base truncate mt-0.5">
                    {selectedProductForReviews.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={closeProductReviewsModal}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
                title="বন্ধ করুন"
                aria-label="বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1">
              {/* Toast Message */}
              {reviewToast && (
                <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-emerald-400 shadow-md animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-[#FFE0A8] shrink-0" />
                  <span>{reviewToast}</span>
                </div>
              )}

              {/* Rating Summary Card */}
              {(() => {
                const stats = getProductRatingStats(selectedProductForReviews.id, selectedProductForReviews.name);
                const approvedList = stats.list;
                const starCounts = [5, 4, 3, 2, 1].map((s) => ({
                  star: s,
                  count: approvedList.filter((r) => Math.round(r.rating) === s).length,
                  percent: stats.count > 0 ? Math.round((approvedList.filter((r) => Math.round(r.rating) === s).length / stats.count) * 100) : 0,
                }));

                return (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    {/* Left: Score Box */}
                    <div className="text-center sm:text-left sm:pr-4 sm:border-r sm:border-slate-200 shrink-0">
                      <div className="text-3xl sm:text-4xl font-black text-[#0A4A29] flex items-center justify-center sm:justify-start gap-1">
                        <span>{stats.hasReviews ? stats.average : '৫.০'}</span>
                        <Star className="w-6 h-6 text-[#FFB300] fill-[#FFB300]" />
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-0.5 my-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= Math.round(stats.average) ? 'text-[#FFB300] fill-[#FFB300]' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">
                        {stats.count > 0 ? `${stats.count} টি রিভিউ এর ভিত্তিতে` : 'এখনো রিভিউ জমা পড়েনি'}
                      </p>
                    </div>

                    {/* Right: Star Distribution Bars */}
                    <div className="flex-1 w-full space-y-1 text-xs">
                      {starCounts.map((item) => (
                        <div key={item.star} className="flex items-center gap-2">
                          <span className="w-7 font-bold text-slate-600 flex items-center gap-0.5 shrink-0 text-[11px]">
                            <span>{item.star}</span>
                            <span className="text-[#FFB300]">★</span>
                          </span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#1E8A52] h-full rounded-full transition-all duration-300"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="w-8 text-[11px] text-right font-medium text-slate-400 shrink-0">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tab Navigation: "রিভিউ সমূহ" vs "রিভিউ লিখুন" */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setReviewTab('list')}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    reviewTab === 'list'
                      ? 'bg-[#0A4A29] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>
                    গ্রাহকদের রিভিউ ({getProductApprovedReviews(selectedProductForReviews.id, selectedProductForReviews.name).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('write')}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    reviewTab === 'write'
                      ? 'bg-[#0A4A29] text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Star className="w-4 h-4 text-[#FFB300] fill-[#FFB300]" />
                  <span>+ একটি রিভিউ লিখুন</span>
                </button>
              </div>

              {/* TAB 1: LIST OF REVIEWS */}
              {reviewTab === 'list' && (
                <div className="space-y-3">
                  {(() => {
                    const approvedList = getProductApprovedReviews(
                      selectedProductForReviews.id,
                      selectedProductForReviews.name
                    );

                    if (approvedList.length === 0) {
                      return (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-amber-50 text-[#FFB300] flex items-center justify-center mx-auto">
                            <Star className="w-6 h-6 fill-[#FFB300]" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">এখনো কোনো রিভিউ যোগ করা হয়নি</h4>
                            <p className="text-xs text-slate-500 mt-1">
                              আপনি কি এই পণ্যটি কিনেছেন বা ব্যবহার করেছেন? আপনার মূল্যবান অভিজ্ঞতা শেয়ার করুন!
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewTab('write')}
                            className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                          >
                            <Star className="w-3.5 h-3.5 text-[#FFB300] fill-[#FFB300]" />
                            <span>প্রথম রিভিউটি লিখুন</span>
                          </button>
                        </div>
                      );
                    }

                    return approvedList.map((rev) => (
                      <div
                        key={rev.id || `${rev.customerName}-${rev.createdAt}`}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 hover:border-emerald-200 transition"
                      >
                        {/* Top: Customer & Stars */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center shrink-0">
                              {rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{rev.customerName}</span>
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5 text-emerald-700" />
                                  <span>যাচাইকৃত ক্রেতা</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {rev.createdAt ? rev.createdAt.split('T')[0] : ''}
                              </span>
                            </div>
                          </div>

                          {/* Stars */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating ? 'text-[#FFB300] fill-[#FFB300]' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Comment text */}
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pl-10">
                          "{rev.comment}"
                        </p>

                        {/* Admin Reply */}
                        {rev.adminReply && (
                          <div className="ml-10 bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-xs text-slate-700 space-y-1">
                            <span className="font-bold text-[#0A4A29] flex items-center gap-1">
                              <span>🏪 InfiMart BD (কর্তৃপক্ষ):</span>
                            </span>
                            <p className="italic text-slate-600">{rev.adminReply}</p>
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* TAB 2: WRITE REVIEW FORM */}
              {reviewTab === 'write' && (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {/* Rating Selector */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      আপনার রেটিং নির্বাচন করুন <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center justify-center gap-2 py-1">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isFilled = starVal <= (newReviewHoverRating || newReviewRating);
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onMouseEnter={() => setNewReviewHoverRating(starVal)}
                            onMouseLeave={() => setNewReviewHoverRating(0)}
                            onClick={() => setNewReviewRating(starVal)}
                            className="p-1 text-slate-300 hover:scale-125 transition-transform cursor-pointer"
                            title={`${starVal} স্টার`}
                          >
                            <Star
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                isFilled ? 'text-[#FFB300] fill-[#FFB300]' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs font-bold text-[#0A4A29]">
                      {(() => {
                        const val = newReviewHoverRating || newReviewRating;
                        if (val === 5) return '★★★★★ ৫ - অসাধারণ! (সুপার কোয়ালিটি)';
                        if (val === 4) return '★★★★ ৪ - খুব ভালো';
                        if (val === 3) return '★★★ ৩ - ভালো';
                        if (val === 2) return '★★ ২ - মোটামুটি';
                        return '★ ১ - সন্তোষজনক নয়';
                      })()}
                    </p>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আপনার নাম (Customer Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newReviewName}
                      onChange={(e) => {
                        setNewReviewName(e.target.value);
                        if (reviewFormErrors.name) setReviewFormErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder="যেমন: তানভীর আহমেদ"
                      className={`w-full min-h-[46px] px-3.5 rounded-xl border text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                        reviewFormErrors.name ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                      }`}
                      required
                    />
                    {reviewFormErrors.name && (
                      <p className="text-xs text-rose-600 mt-1 font-semibold">{reviewFormErrors.name}</p>
                    )}
                  </div>

                  {/* Customer Phone (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর (ঐচ্ছিক - যাচাইকরণের জন্য)
                    </label>
                    <input
                      type="tel"
                      value={newReviewPhone}
                      onChange={(e) => setNewReviewPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full min-h-[46px] px-3.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none"
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      আপনার মতামত ও অভিজ্ঞতা লিখুন <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={newReviewComment}
                      onChange={(e) => {
                        setNewReviewComment(e.target.value);
                        if (reviewFormErrors.comment) setReviewFormErrors((prev) => ({ ...prev, comment: undefined }));
                      }}
                      placeholder="পণ্যের মান, স্বাদ, প্যাকেজিং ও ডেলিভারি সম্পর্কে লিখুন..."
                      className={`w-full p-3 rounded-xl border text-sm focus:ring-2 focus:ring-[#0A4A29] focus:outline-none ${
                        reviewFormErrors.comment ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                      }`}
                      required
                    />
                    {reviewFormErrors.comment && (
                      <p className="text-xs text-rose-600 mt-1 font-semibold">{reviewFormErrors.comment}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full bg-[#0A4A29] hover:bg-[#1E8A52] text-white py-3.5 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer min-h-[48px] active:scale-98"
                    >
                      <Star className="w-4 h-4 text-[#FFB300] fill-[#FFB300]" />
                      <span>{isSubmittingReview ? 'রিভিউ জমা হচ্ছে...' : 'রিভিউ জমা দিন'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) with 3 Contact & Order Channels */}
      <aside aria-label="Customer Contact & Order Channels" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Expanded Options */}
        {fabOpen && (
          <div className="mb-3 flex flex-col items-end space-y-2.5 animate-fadeIn">
            {/* 1. WhatsApp Button */}
            {isWhatsappEnabled && (
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                  'আসসালামু আলাইকুম InfiMart BD,\n\nআমি পণ্য অর্ডার করতে চাই:\n\n🛒 পণ্যের নাম ও বিবরণ: \n🔢 পরিমাণ: \n\n📍 আমার নাম: \n📍 ঠিকানা: \n📞 ফোন: \n\nঅনুগ্রহ করে অর্ডারটি কনফার্ম করুন।'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-2 border-white"
                title="হোয়াটসঅ্যাপে সরাসরি অর্ডার করুন"
              >
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  🟢 WhatsApp
                </span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                </div>
              </a>
            )}

            {/* 2. Messenger Button */}
            {isMessengerEnabled && (
              <a
                href={`https://m.me/${messengerUser}?text=${encodeURIComponent(
                  'আসসালামু আলাইকুম InfiMart BD,\n\nআমি পণ্য অর্ডার করতে চাই:\n\n🛒 পণ্যের নাম ও বিবরণ: \n🔢 পরিমাণ: \n\n📍 আমার নাম: \n📍 ঠিকানা: \n📞 ফোন: \n\nঅনুগ্রহ করে অর্ডারটি কনফার্ম করুন।'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2.5 bg-gradient-to-r from-[#0084FF] to-[#00C6FF] hover:opacity-95 text-white px-4 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-2 border-white"
                title="ফেসবুক মেসেঞ্জারে সরাসরি অর্ডার করুন"
              >
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  🔵 Messenger
                </span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessengerIcon className="w-4 h-4 fill-white" />
                </div>
              </a>
            )}

            {/* 3. Call Button */}
            {isCallEnabled && (
              <a
                href={`tel:${cleanCallPhone}`}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2.5 bg-[#FF8C00] hover:bg-[#e07b00] text-white px-4 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-2 border-white"
                title={`সরাসরি কল করুন (${callPhone})`}
              >
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  📞 কল করুন ({callPhone})
                </span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
              </a>
            )}
          </div>
        )}

        {/* Trigger Button: Closed circle with chat icon 💬 / Open circle with X */}
        <button
          type="button"
          onClick={() => setFabOpen(!fabOpen)}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 border-2 border-white cursor-pointer ${
            fabOpen
              ? 'bg-slate-900 text-white rotate-90'
              : 'bg-[#0A4A29] hover:bg-[#1E8A52] text-white hover:scale-105'
          }`}
          title={fabOpen ? 'মেনু বন্ধ করুন' : 'অর্ডার ও যোগাযোগের মাধ্যম'}
          aria-label={fabOpen ? 'Close contact channels' : 'Open contact channels'}
        >
          {fabOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="text-2xl select-none" role="img" aria-label="chat">
                💬
              </span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
            </div>
          )}
        </button>
      </aside>
    </div>
  );
};
