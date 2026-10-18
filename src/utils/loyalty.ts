import { Customer, Order } from '../types';

export type LoyaltyTierKey = 'platinum' | 'gold' | 'silver' | 'bronze' | 'starter';

export interface LoyaltyTierConfig {
  key: LoyaltyTierKey;
  labelBn: string;
  labelEn: string;
  badgeEmoji: string;
  minPurchase: number;
  bgClass: string;
  textClass: string;
  borderClass: string;
  gradientClass: string;
}

export const LOYALTY_TIERS: Record<LoyaltyTierKey, LoyaltyTierConfig> = {
  platinum: {
    key: 'platinum',
    labelBn: 'প্ল্যাটিনাম ভিআইপি',
    labelEn: 'Platinum VIP',
    badgeEmoji: '👑',
    minPurchase: 20000,
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800',
    borderClass: 'border-purple-300',
    gradientClass: 'from-purple-600 to-indigo-600',
  },
  gold: {
    key: 'gold',
    labelBn: 'গোল্ড মেম্বার',
    labelEn: 'Gold Member',
    badgeEmoji: '🥇',
    minPurchase: 10000,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    gradientClass: 'from-amber-500 to-yellow-500',
  },
  silver: {
    key: 'silver',
    labelBn: 'সিলভার মেম্বার',
    labelEn: 'Silver Member',
    badgeEmoji: '🥈',
    minPurchase: 5000,
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-800',
    borderClass: 'border-slate-300',
    gradientClass: 'from-slate-500 to-zinc-600',
  },
  bronze: {
    key: 'bronze',
    labelBn: 'ব্রোঞ্জ মেম্বার',
    labelEn: 'Bronze Member',
    badgeEmoji: '🥉',
    minPurchase: 1500,
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    gradientClass: 'from-orange-500 to-amber-600',
  },
  starter: {
    key: 'starter',
    labelBn: 'সাধারণ গ্রাহক',
    labelEn: 'Starter',
    badgeEmoji: '🌱',
    minPurchase: 0,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    gradientClass: 'from-emerald-500 to-teal-600',
  },
};

export const toBanglaDigits = (num: number | string): string => {
  return (num ?? '').toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
};

/**
 * Calculates the loyalty score for a customer based on their total purchase volume in BDT (৳)
 * and order frequency.
 *
 * Scoring Formula:
 * - Base points: 1 point for every ৳100 in total purchase volume
 * - Milestone bonuses based on volume tiers:
 *   - ৳25,000+: +50 bonus points
 *   - ৳15,000+: +30 bonus points
 *   - ৳7,500+:  +15 bonus points
 *   - ৳2,500+:  +5 bonus points
 * - Order frequency bonus: +2 points per order
 */
export function calculateLoyaltyScore(totalPurchaseVolume: number, totalOrders: number = 1): number {
  const volume = Math.max(0, Number(totalPurchaseVolume || 0));
  const orders = Math.max(0, Number(totalOrders || 0));

  // 1 point per ৳100 spent
  const basePoints = Math.floor(volume / 100);

  // Milestone volume bonuses
  let milestoneBonus = 0;
  if (volume >= 25000) {
    milestoneBonus = 50;
  } else if (volume >= 15000) {
    milestoneBonus = 30;
  } else if (volume >= 7500) {
    milestoneBonus = 15;
  } else if (volume >= 2500) {
    milestoneBonus = 5;
  }

  // Order consistency bonus
  const orderBonus = orders * 2;

  return basePoints + milestoneBonus + orderBonus;
}

/**
 * Determines the loyalty tier and progress towards the next tier based on total purchase volume.
 */
export function getLoyaltyTier(totalPurchaseVolume: number): {
  tier: LoyaltyTierConfig;
  nextTier: LoyaltyTierConfig | null;
  amountToNextTier: number;
  progressPercent: number;
} {
  const volume = Math.max(0, Number(totalPurchaseVolume || 0));

  if (volume >= LOYALTY_TIERS.platinum.minPurchase) {
    return {
      tier: LOYALTY_TIERS.platinum,
      nextTier: null,
      amountToNextTier: 0,
      progressPercent: 100,
    };
  }

  if (volume >= LOYALTY_TIERS.gold.minPurchase) {
    const range = LOYALTY_TIERS.platinum.minPurchase - LOYALTY_TIERS.gold.minPurchase;
    const current = volume - LOYALTY_TIERS.gold.minPurchase;
    const progressPercent = Math.min(100, Math.round((current / range) * 100));
    return {
      tier: LOYALTY_TIERS.gold,
      nextTier: LOYALTY_TIERS.platinum,
      amountToNextTier: LOYALTY_TIERS.platinum.minPurchase - volume,
      progressPercent,
    };
  }

  if (volume >= LOYALTY_TIERS.silver.minPurchase) {
    const range = LOYALTY_TIERS.gold.minPurchase - LOYALTY_TIERS.silver.minPurchase;
    const current = volume - LOYALTY_TIERS.silver.minPurchase;
    const progressPercent = Math.min(100, Math.round((current / range) * 100));
    return {
      tier: LOYALTY_TIERS.silver,
      nextTier: LOYALTY_TIERS.gold,
      amountToNextTier: LOYALTY_TIERS.gold.minPurchase - volume,
      progressPercent,
    };
  }

  if (volume >= LOYALTY_TIERS.bronze.minPurchase) {
    const range = LOYALTY_TIERS.silver.minPurchase - LOYALTY_TIERS.bronze.minPurchase;
    const current = volume - LOYALTY_TIERS.bronze.minPurchase;
    const progressPercent = Math.min(100, Math.round((current / range) * 100));
    return {
      tier: LOYALTY_TIERS.bronze,
      nextTier: LOYALTY_TIERS.silver,
      amountToNextTier: LOYALTY_TIERS.silver.minPurchase - volume,
      progressPercent,
    };
  }

  // Starter
  const range = LOYALTY_TIERS.bronze.minPurchase;
  const progressPercent = Math.min(100, Math.round((volume / range) * 100));
  return {
    tier: LOYALTY_TIERS.starter,
    nextTier: LOYALTY_TIERS.bronze,
    amountToNextTier: LOYALTY_TIERS.bronze.minPurchase - volume,
    progressPercent,
  };
}

export interface CustomerLoyaltyRankInfo {
  customerId?: string;
  phone: string;
  cleanPhone: string;
  name: string;
  rank: number; // 1-indexed leaderboard rank
  rankDisplayBangla: string; // e.g. "#১"
  score: number;
  scoreDisplayBangla: string; // e.g. "৩৩৫"
  totalPurchase: number;
  totalOrders: number;
  tier: LoyaltyTierConfig;
  nextTier: LoyaltyTierConfig | null;
  amountToNextTier: number;
  progressPercent: number;
}

/**
 * Computes loyalty score, rank, and tier metrics for all customers.
 * Sorts by total purchase volume (descending), then score (descending), then orders (descending).
 */
export function calculateAllCustomerLoyalties(
  customers: Customer[],
  orders?: Order[]
): {
  rankedList: CustomerLoyaltyRankInfo[];
  rankMapByPhone: Map<string, CustomerLoyaltyRankInfo>;
  rankMapById: Map<string, CustomerLoyaltyRankInfo>;
  summary: {
    totalCustomers: number;
    vipCount: number; // Platinum + Gold
    totalPurchaseVolume: number;
    averageScore: number;
    topCustomer: CustomerLoyaltyRankInfo | null;
    tierCounts: Record<LoyaltyTierKey, number>;
  };
} {
  // 1. Calculate purchase volume and order counts.
  // If orders are provided, we can verify or supplement purchase volume.
  const orderVolumeByPhone = new Map<string, { volume: number; count: number }>();
  if (orders && orders.length > 0) {
    orders.forEach((o) => {
      const rawPhone = o.customerPhone || o.phone || '';
      const clean = rawPhone.replace(/[^0-9]/g, '');
      if (!clean) return;
      const total = Number(o.totalPrice ?? o.total ?? 0);
      const cur = orderVolumeByPhone.get(clean) || { volume: 0, count: 0 };
      cur.volume += total;
      cur.count += 1;
      orderVolumeByPhone.set(clean, cur);
    });
  }

  // 2. Prepare customer loyalty items
  const items: Array<{
    customer: Customer;
    cleanPhone: string;
    effectivePurchase: number;
    effectiveOrders: number;
    score: number;
  }> = customers.map((c) => {
    const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
    const orderData = cleanPhone ? orderVolumeByPhone.get(cleanPhone) : undefined;
    
    // Purchase volume: prioritize c.totalPurchase, fallback to orders if higher
    const declaredPurchase = Number(c.totalPurchase || 0);
    const calculatedPurchase = orderData ? orderData.volume : 0;
    const effectivePurchase = Math.max(declaredPurchase, calculatedPurchase);

    const declaredOrders = Number(c.totalOrders || 0);
    const calculatedOrders = orderData ? orderData.count : 0;
    const effectiveOrders = Math.max(declaredOrders, calculatedOrders, 1);

    const score = calculateLoyaltyScore(effectivePurchase, effectiveOrders);

    return {
      customer: c,
      cleanPhone,
      effectivePurchase,
      effectiveOrders,
      score,
    };
  });

  // 3. Sort descending by purchase volume, then score, then orders
  items.sort((a, b) => {
    if (b.effectivePurchase !== a.effectivePurchase) {
      return b.effectivePurchase - a.effectivePurchase;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.effectiveOrders - a.effectiveOrders;
  });

  // 4. Assign ranks (1, 2, 3...)
  const rankMapByPhone = new Map<string, CustomerLoyaltyRankInfo>();
  const rankMapById = new Map<string, CustomerLoyaltyRankInfo>();
  const tierCounts: Record<LoyaltyTierKey, number> = {
    platinum: 0,
    gold: 0,
    silver: 0,
    bronze: 0,
    starter: 0,
  };

  let totalVolume = 0;
  let totalScoreSum = 0;

  const rankedList: CustomerLoyaltyRankInfo[] = items.map((item, index) => {
    const rank = index + 1;
    const tierInfo = getLoyaltyTier(item.effectivePurchase);
    tierCounts[tierInfo.tier.key] = (tierCounts[tierInfo.tier.key] || 0) + 1;
    totalVolume += item.effectivePurchase;
    totalScoreSum += item.score;

    const rankInfo: CustomerLoyaltyRankInfo = {
      customerId: item.customer.id,
      phone: item.customer.phone,
      cleanPhone: item.cleanPhone,
      name: item.customer.name,
      rank,
      rankDisplayBangla: `#${toBanglaDigits(rank)}`,
      score: item.score,
      scoreDisplayBangla: toBanglaDigits(item.score),
      totalPurchase: item.effectivePurchase,
      totalOrders: item.effectiveOrders,
      tier: tierInfo.tier,
      nextTier: tierInfo.nextTier,
      amountToNextTier: tierInfo.amountToNextTier,
      progressPercent: tierInfo.progressPercent,
    };

    if (item.cleanPhone) {
      rankMapByPhone.set(item.cleanPhone, rankInfo);
    }
    if (item.customer.id) {
      rankMapById.set(item.customer.id, rankInfo);
    }

    return rankInfo;
  });

  const totalCustomers = customers.length;
  const vipCount = tierCounts.platinum + tierCounts.gold;
  const averageScore = totalCustomers > 0 ? Math.round(totalScoreSum / totalCustomers) : 0;
  const topCustomer = rankedList[0] || null;

  return {
    rankedList,
    rankMapByPhone,
    rankMapById,
    summary: {
      totalCustomers,
      vipCount,
      totalPurchaseVolume: totalVolume,
      averageScore,
      topCustomer,
      tierCounts,
    },
  };
}
