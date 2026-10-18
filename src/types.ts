export const PRODUCT_UNITS = [
  'কেজি',
  'গ্রাম',
  '১০০ গ্রাম',
  '২৫০ গ্রাম',
  '৫০০ গ্রাম',
  'লিটার',
  'মিলি',
  'পিস',
  'ডজন',
  'প্যাকেট',
  'বোতল',
  'ভরি',
  'ছটাক',
  'আঁটি',
  'হালি',
  'বস্তা',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number] | string;

export interface Product {
  id?: string;
  name: string;
  category: string;
  price: number;
  unit: ProductUnit; // e.g. "কেজি", "১০০ গ্রাম", "পিস", "ভরি"
  stock: 'In Stock' | 'Low Stock' | 'Out of Stock';
  stockQuantity?: number; // বর্তমান মজুদ সংখ্যা / পরিমাণ (Current Stock Quantity)
  lowStockThreshold?: number; // নির্দিষ্ট রিস্টক সতর্কতা থ্রেশহোল্ড (Custom Restock Alert Threshold)
  image: string; // Firebase storage URL or optimized Base64
  createdAt?: string;
}

export interface Order {
  id?: string;
  date: string;
  productId?: string;
  product?: string;
  productName?: string;
  productPrice?: number;
  unitPrice?: number;
  productUnit?: string;
  quantity: number;
  subtotal?: number;
  deliveryCharge?: number;
  weight?: number;
  total?: number;
  totalPrice?: number;
  customerName: string;
  phone: string;
  customerPhone?: string;
  address?: string;
  customerAddress?: string;
  notes?: string;
  customerNotes?: string;
  isSpecialOffer?: boolean;
  specialOfferId?: string;
  orderType?: 'local' | 'expat'; // 🇧🇩 দেশি অর্ডার vs 🌍 প্রবাসী অর্ডার
  customerCountry?: string; // Country name
  isGiftOrder?: boolean;
  giftRecipientName?: string;
  giftRecipientPhone?: string;
  giftRecipientAddress?: string;
  paymentType?: 'cod' | 'advance';
  paymentMethod?: string; // 'Cash on Delivery' | 'bKash' | 'Nagad' | 'Rocket' | 'Bank'
  paymentNumberUsed?: string;
  advanceAmountPaid?: number;
  dueAmount?: number;
  transactionId?: string;
  paymentSlipUrl?: string;
  paymentVerificationStatus?: 'pending' | 'verified' | 'failed';
  allowCodOverride?: boolean; // Admin can manually override COD for an expat order
  status: 'new' | 'confirmed' | 'delivered' | 'cancelled' | 'pending' | 'Pending' | 'Delivered' | 'Cancelled';
  isRead?: boolean;
  isNotified?: boolean;
  confirmedAt?: string;
  deliveredAt?: string;
  source?: 'website_form' | 'admin' | 'whatsapp' | string;
  createdAt?: string;
}

export interface Purchase {
  id?: string;
  date: string;
  supplier: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierEmail?: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paid: number;
  due: number;
  notes?: string;
  createdAt?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  totalPurchases?: number;
  totalAmount?: number;
  createdAt?: string;
}

export interface Transaction {
  id?: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt?: string;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  address: string;
  firstOrder: string;
  lastOrder: string;
  totalOrders: number;
  totalPurchase: number;
  giftStatus: 'Not Sent' | 'Sent';
  customerType?: 'local' | 'expat'; // 'local' (Bangladeshi) or 'expat' (Abroad)
  country?: string;
  createdAt?: string;
}

export interface GiftRecord {
  id?: string;
  customerId: string;
  customerName: string;
  phone: string;
  month: string; // e.g. "2026-09"
  year: number;
  sentAt: string;
  status: 'Sent';
  note?: string;
}

export interface StoreSettings {
  whatsapp: string;
  password?: string;
  storeName: string;
  slogan: string;
  englishTagline: string;
  deliveryCharge: number;
  address?: string;
  // Delivery settings
  freeDeliveryEnabled?: boolean;
  freeDeliveryThreshold?: number; // কত টাকার উপরে ডেলিভারি ফ্রি? (default 3000)
  freeDeliveryWeight?: number; // কত কেজির উপরে ডেলিভারি ফ্রি? (default 10)
  minOrderAmount?: number; // সর্বনিম্ন অর্ডার মূল্য (default 200)
  tieredDeliveryCharge200_499?: number; // default 50
  tieredDeliveryCharge500_999?: number; // default 40
  tieredDeliveryCharge1000_1999?: number; // default 30
  tieredDeliveryCharge2000_2999?: number; // default 20
  freeDeliveryMinAmount?: number; // legacy alias
  freeDeliveryAreas?: string; // e.g. "ফেনী সদর, ট্রাঙ্ক রোড"
  freeDeliveryProductIds?: string[];
  // Global Payment Settings
  codEnabled?: boolean; // default true: Enable/Disable COD globally
  advancePaymentEnabled?: boolean; // default true: Enable/Disable Advance Payment globally
  bkashNumber?: string; // e.g. 01821558813 (Personal/Merchant)
  nagadNumber?: string; // e.g. 01821558813
  rocketNumber?: string;
  bankDetails?: string; // e.g. Bank name, Account No, Branch, Routing
  advanceAmountType?: 'full' | 'half' | 'fixed'; // 'full' = 100%, 'half' = 50%, 'fixed' = fixed amount
  advanceFixedAmount?: number; // e.g. 200
  // Direct Order Channels & Messenger Settings
  messengerUsername?: string; // e.g. "fenimartbd"
  messengerEnabled?: boolean; // default true: Enable/Disable Messenger ordering
  whatsappEnabled?: boolean; // default true: Enable/Disable WhatsApp ordering
  callEnabled?: boolean; // default true: Enable/Disable Call button
  primaryPhone?: string; // e.g. "01821558813"
  messengerGreeting?: string; // e.g. "স্বাগতম! Feni Mart-এ অর্ডার করতে চাইলে পণ্যের নাম লিখুন।"
  defaultLowStockThreshold?: number; // ডিফল্ট রিস্টক থ্রেশহোল্ড (default: 5)
}

export interface Category {
  id?: string;
  name: string; // Bengali Name (যেমন: চাল ও ডাল)
  nameEn?: string; // English Name (Rice & Lentils)
  icon?: string; // Emoji or text icon (🍚)
  order?: number; // Sequence number
  isActive?: boolean; // Default true, toggle active/inactive
  comingSoonMessage?: string; // Bengali custom message for inactive categories
  estimatedDate?: string; // Estimated date when products will be added
  createdAt?: string;
}

export interface Offer {
  id?: string;
  title: string;
  titleEn?: string;
  type: 'percentage' | 'fixed' | 'combo' | 'freeDelivery';
  discountValue: number; // percentage or fixed amount
  applicableProducts: string[]; // array of product IDs or names
  startDate: string;
  endDate: string;
  bannerImage?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface ComboPackageProduct {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ComboPackage {
  id?: string;
  name: string;
  nameEn?: string;
  description?: string;
  products: ComboPackageProduct[];
  originalPrice: number;
  packagePrice: number;
  discount: number;
  image?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PreBookingCampaign {
  id?: string;
  productId: string;
  productName: string;
  productImage?: string;
  advanceAmount: number;
  fullPrice: number;
  bookingEndDate: string;
  deliveryDate: string;
  isActive: boolean;
  totalSlots: number;
  bookedSlots: number;
  createdAt?: string;
}

export interface PreBookingOrder {
  id?: string;
  campaignId: string;
  productId: string;
  productName: string;
  customerName: string;
  phone: string;
  address: string;
  quantity: number;
  advanceAmountPaid: number;
  dueAmount: number;
  paymentMethod: string;
  transactionId?: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  createdAt?: string;
}

export interface DailyDeal {
  id?: string;
  productId: string;
  productName: string;
  productImage?: string;
  originalPrice: number;
  discount: number; // percentage or fixed amount
  dealPrice: number;
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "23:59"
  date: string; // e.g. "2026-09-26"
  isActive: boolean;
  createdAt?: string;
}

export interface SpecialOffer {
  id?: string;
  title: string; // Bengali text (required)
  subtitle?: string; // Bengali text (optional)
  description?: string; // Bengali text (optional)
  icon?: string; // emoji e.g. 🚚 or 🎉
  backgroundColor?: string; // color picker e.g. #0A4A29
  textColor?: string; // color picker e.g. #FFFFFF
  startDate?: string; // optional
  endDate?: string; // optional
  isActive: boolean; // default true
  order: number; // display order
  deliveryChargeEnabled?: boolean; // default false (If OFF -> Delivery is FREE for this offer. If ON -> Admin sets delivery charge)
  deliveryCharge?: number; // default 0
  createdAt?: string;
}

export interface ProductReview {
  id?: string;
  productId: string;
  productName: string;
  productImage?: string;
  customerName: string;
  customerPhone?: string;
  rating: number; // 1 to 5
  comment: string;
  status: 'approved' | 'hidden'; // Admin toggle to approve or hide
  createdAt: string;
  adminReply?: string;
}


