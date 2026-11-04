import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  Lock,
  Phone,
  Store,
  DollarSign,
  MapPin,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Truck,
  CreditCard,
  Banknote,
  Scale,
  Layers,
  MessageCircle,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import { StoreSettings } from '../../types';

interface SettingsTabProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  onSeedInitialProducts: () => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onSeedInitialProducts,
}) => {
  // Store Branding & Admin
  const [storeName, setStoreName] = useState(settings.storeName || 'InfiMart BD');
  const [slogan, setSlogan] = useState(settings.slogan || 'সাশ্রয়ের ঠিকানা, ভরসার বাজার');
  const [englishTagline, setEnglishTagline] = useState(
    settings.englishTagline || 'Your Monthly Bazar, Delivered.'
  );
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || '+880 1821-558813');
  const [password, setPassword] = useState(settings.password || 'Jj0558949360');
  const [address, setAddress] = useState(
    settings.address || 'ট্রাঙ্ক রোড, ফেনী সদর, ফেনী - ৩৯০০, বাংলাদেশ'
  );

  // Delivery Settings (Rule 2: Conditional Free Delivery & Tiered Rates)
  const [deliveryCharge, setDeliveryCharge] = useState<number>(settings.deliveryCharge ?? 50);
  const [freeDeliveryEnabled, setFreeDeliveryEnabled] = useState<boolean>(
    settings.freeDeliveryEnabled !== false
  );
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(
    settings.freeDeliveryThreshold ?? 3000
  );
  const [freeDeliveryWeight, setFreeDeliveryWeight] = useState<number>(
    settings.freeDeliveryWeight ?? 10
  );
  const [minOrderAmount, setMinOrderAmount] = useState<number>(settings.minOrderAmount ?? 200);
  const [tieredCharge200_499, setTieredCharge200_499] = useState<number>(
    settings.tieredDeliveryCharge200_499 ?? 50
  );
  const [tieredCharge500_999, setTieredCharge500_999] = useState<number>(
    settings.tieredDeliveryCharge500_999 ?? 40
  );
  const [tieredCharge1000_1999, setTieredCharge1000_1999] = useState<number>(
    settings.tieredDeliveryCharge1000_1999 ?? 30
  );
  const [tieredCharge2000_2999, setTieredCharge2000_2999] = useState<number>(
    settings.tieredDeliveryCharge2000_2999 ?? 20
  );
  const [freeDeliveryAreas, setFreeDeliveryAreas] = useState<string>(
    settings.freeDeliveryAreas || 'ফেনী সদর, ট্রাঙ্ক রোড, মাস্টারপাড়া, রামপুর'
  );

  // Global Payment Settings
  const [codEnabled, setCodEnabled] = useState<boolean>(settings.codEnabled !== false);
  const [advancePaymentEnabled, setAdvancePaymentEnabled] = useState<boolean>(
    settings.advancePaymentEnabled !== false
  );
  const [bkashNumber, setBkashNumber] = useState<string>(
    settings.bkashNumber || '01821-558813 (Personal)'
  );
  const [nagadNumber, setNagadNumber] = useState<string>(
    settings.nagadNumber || '01821-558813 (Personal)'
  );
  const [rocketNumber, setRocketNumber] = useState<string>(
    settings.rocketNumber || '01821-558813-0'
  );
  const [bankDetails, setBankDetails] = useState<string>(
    settings.bankDetails ||
      'ব্যাংক: ইসলামী ব্যাংক বাংলাদেশ লিমিটেড\nশাখা: ফেনী শাখা\nঅ্যাকাউন্ট নাম: InfiMart BD\nহিসাব নম্বর: ২০৫০১৪৫০২০০০০০০০০\nরাউটিং নম্বর: ১২৫২৬০৭৮'
  );
  const [advanceAmountType, setAdvanceAmountType] = useState<'full' | 'half' | 'fixed'>(
    settings.advanceAmountType || 'full'
  );
  const [advanceFixedAmount, setAdvanceFixedAmount] = useState<number>(
    settings.advanceFixedAmount ?? 200
  );

  // Messenger & Direct Order Channels
  const [messengerUsername, setMessengerUsername] = useState<string>(
    settings.messengerUsername || 'infimartbd'
  );
  const [messengerEnabled, setMessengerEnabled] = useState<boolean>(
    settings.messengerEnabled !== false
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(
    settings.whatsappEnabled !== false
  );
  const [callEnabled, setCallEnabled] = useState<boolean>(
    settings.callEnabled !== false
  );
  const [primaryPhone, setPrimaryPhone] = useState<string>(
    settings.primaryPhone || '01821558813'
  );
  const [messengerGreeting, setMessengerGreeting] = useState<string>(
    settings.messengerGreeting || 'স্বাগতম! InfiMart BD-তে অর্ডার করতে চাইলে পণ্যের নাম লিখুন।'
  );

  const [saving, setSaving] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp || !password) {
      alert('হোয়াটসঅ্যাপ নম্বর এবং পাসওয়ার্ড পূরণ বাধ্যতামূলক।');
      return;
    }

    try {
      setSaving(true);
      await onUpdateSettings({
        storeName,
        slogan,
        englishTagline,
        whatsapp,
        password,
        address,
        // Delivery
        deliveryCharge: Number(deliveryCharge),
        freeDeliveryEnabled,
        freeDeliveryThreshold: Number(freeDeliveryThreshold),
        freeDeliveryWeight: Number(freeDeliveryWeight),
        minOrderAmount: Number(minOrderAmount),
        tieredDeliveryCharge200_499: Number(tieredCharge200_499),
        tieredDeliveryCharge500_999: Number(tieredCharge500_999),
        tieredDeliveryCharge1000_1999: Number(tieredCharge1000_1999),
        tieredDeliveryCharge2000_2999: Number(tieredCharge2000_2999),
        freeDeliveryMinAmount: Number(freeDeliveryThreshold),
        freeDeliveryAreas,
        // Payment
        codEnabled,
        advancePaymentEnabled,
        bkashNumber,
        nagadNumber,
        rocketNumber,
        bankDetails,
        advanceAmountType,
        advanceFixedAmount: Number(advanceFixedAmount),
        // Messenger & Direct Order Channels
        messengerUsername: messengerUsername.trim(),
        messengerEnabled,
        whatsappEnabled,
        callEnabled,
        primaryPhone: primaryPhone.trim(),
        messengerGreeting: messengerGreeting.trim(),
      });

      setSuccessMessage('সকল সেটিংস ও পলিসি সফলভাবে সেভ হয়েছে!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.error(err);
      alert('সেটিংস সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    if (window.confirm('আপনি কি InfiMart BD-এর প্রিমিয়াম নমুনা গ্রোসারি পণ্যসমূহ ক্যাটালগে যুক্ত করতে চান?')) {
      try {
        setSeedLoading(true);
        await onSeedInitialProducts();
        setSuccessMessage('নমুনা পণ্য সফলভাবে যুক্ত হয়েছে!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error(err);
        alert('নমুনা পণ্য লোড করতে সমস্যা হয়েছে।');
      } finally {
        setSeedLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0A4A29] flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#1E8A52]" />
            <span>সিস্টেম ও ডেলিভারি-পেমেন্ট সেটিংস</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ডেলিভারি চার্জের শর্ত, পেমেন্ট গেটওয়ে, পাসওয়ার্ড ও স্টোর ব্র্যান্ডিং নিয়ন্ত্রণ করুন
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-8">
        {/* =========================================================================
            SECTION 1: DELIVERY SETTINGS (ডেলিভারি সেটিংস) — CONDITIONAL & TIERED
            ========================================================================= */}
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-[#0A4A29] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#1E8A52]" />
              <span>১. ডেলিভারি চার্জ সেটিংস ও শর্তাবলী (Delivery Settings)</span>
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-3 py-1 rounded-full">
              লাভজনক ও সুরক্ষিত পলিসি
            </span>
          </div>

          <p className="text-xs text-slate-500">
            নিয়মিত পণ্যে কোনো হার্ডকোডেড ফ্রি ডেলিভারি থাকবে না। নির্দিষ্ট মূল্য বা ওজন পূরণ হলেই কেবল স্বয়ংক্রিয়ভাবে ফ্রি ডেলিভারি কার্যকর হবে।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* 1. Free Delivery Threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কত টাকার উপরে ডেলিভারি ফ্রি? (৳) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(Number(e.target.value))}
                  placeholder="3000"
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-[#0A4A29] focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">ডিফল্ট: ৩০০০৳</span>
            </div>

            {/* 2. Free Delivery Weight */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#1E8A52]" />
                <span>কত কেজির উপরে ডেলিভারি ফ্রি? (কেজি) *</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={freeDeliveryWeight}
                  onChange={(e) => setFreeDeliveryWeight(Number(e.target.value))}
                  placeholder="10"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-[#0A4A29] focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">কেজি</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">ডিফল্ট: ১০ কেজি</span>
            </div>

            {/* 3. Base Delivery Charge */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#1E8A52]" />
                <span>সাধারণ ডেলিভারি চার্জ (৳) *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input
                  type="number"
                  min="0"
                  required
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  placeholder="50"
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-[#0A4A29] focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">ডিফল্ট: ৫০৳</span>
            </div>
          </div>

          {/* Tiered Delivery Charge Breakdown */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>ধাপভিত্তিক ডেলিভারি চার্জ (Tiered Delivery Charges)</span>
            </h4>
            <p className="text-[11px] text-slate-600">
              অর্ডারের পরিমাণ বৃদ্ধির সাথে সাথে ডেলিভারি চার্জ স্বয়ংক্রিয়ভাবে হ্রাস পাবে:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-emerald-200/80">
                <span className="text-[11px] font-bold text-slate-600 block">৳২০০ - ৳৪৯৯</span>
                <div className="mt-1 flex items-center gap-1 font-black text-slate-800">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={tieredCharge200_499}
                    onChange={(e) => setTieredCharge200_499(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center font-bold"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200/80">
                <span className="text-[11px] font-bold text-slate-600 block">৳৫০০ - ৳৯৯৯</span>
                <div className="mt-1 flex items-center gap-1 font-black text-slate-800">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={tieredCharge500_999}
                    onChange={(e) => setTieredCharge500_999(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center font-bold"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200/80">
                <span className="text-[11px] font-bold text-slate-600 block">৳১০০০ - ৳১৯৯৯</span>
                <div className="mt-1 flex items-center gap-1 font-black text-slate-800">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={tieredCharge1000_1999}
                    onChange={(e) => setTieredCharge1000_1999(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center font-bold"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-200/80">
                <span className="text-[11px] font-bold text-slate-600 block">৳২০০০ - ৳২৯৯৯</span>
                <div className="mt-1 flex items-center gap-1 font-black text-slate-800">
                  <span>৳</span>
                  <input
                    type="number"
                    min="0"
                    value={tieredCharge2000_2999}
                    onChange={(e) => setTieredCharge2000_2999(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/60 text-xs">
              <span className="font-bold text-[#0A4A29]">
                🎉 ৳{freeDeliveryThreshold}+ অথবা {freeDeliveryWeight} কেজি+ অর্ডারে: <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-md">সম্পূর্ণ ফ্রি</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-bold">সর্বনিম্ন অর্ডার মূল্য:</span>
                <span className="font-bold text-rose-700">৳</span>
                <input
                  type="number"
                  min="0"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: GLOBAL PAYMENT SETTINGS (পেমেন্ট সেটিংস)
            ========================================================================= */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>২. পেমেন্ট সিস্টেম ও ব্যাংক একাউন্ট (Payment System Settings)</span>
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-900 font-bold px-3 py-1 rounded-full">
              সকল কাস্টমারের জন্য প্রযোজ্য
            </span>
          </div>

          <p className="text-xs text-slate-500">
            এখানে ক্যাশ অন ডেলিভারি ও অগ্রিম পেমেন্টের বৈশ্বিক কনফিগারেশন করুন। (প্রবাসী ও গিফট অর্ডারের ক্ষেত্রে ক্যাশ অন ডেলিভারি স্বয়ংক্রিয়ভাবে হাইড থাকবে)।
          </p>

          {/* Payment Method Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* COD Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Banknote className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    ক্যাশ অন ডেলিভারি (Cash on Delivery)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    পণ্য হাতে পেয়ে মূল্য পরিশোধ (দেশি সাধারণ অর্ডারে সক্রিয়)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCodEnabled(!codEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  codEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    codEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Advance Payment Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    অগ্রিম পেমেন্ট (Advance Payment)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    বিকাশ, নগদ, রকেট বা ব্যাংক ট্রান্সফার
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdvancePaymentEnabled(!advancePaymentEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  advancePaymentEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    advancePaymentEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Advance Payment Details & Numbers */}
          {advancePaymentEnabled && (
            <div className="space-y-4 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 animate-fadeIn">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                অফিসিয়াল পেমেন্ট নম্বরসমূহ (কাস্টমারদের প্রদর্শিত হবে)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বিকাশ নম্বর (bKash) *
                  </label>
                  <input
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="01821-558813 (Personal)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নগদ নম্বর (Nagad) *
                  </label>
                  <input
                    type="text"
                    value={nagadNumber}
                    onChange={(e) => setNagadNumber(e.target.value)}
                    placeholder="01821-558813 (Personal)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রকেট নম্বর (Rocket)
                  </label>
                  <input
                    type="text"
                    value={rocketNumber}
                    onChange={(e) => setRocketNumber(e.target.value)}
                    placeholder="01821-558813-0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                  />
                </div>
              </div>

              {/* Bank Account Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যাংক অ্যাকাউন্টের বিবরণ (Bank Account Details)
                </label>
                <textarea
                  rows={3}
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="ব্যাংক: ইসলামী ব্যাংক, শাখা: ফেনী, হিসাব নং: ..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
                />
              </div>

              {/* Advance Amount Calculation Rule */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  অগ্রিম গ্রহণের পরিমাণ (Advance Amount Rule):
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="advanceAmountType"
                      value="full"
                      checked={advanceAmountType === 'full'}
                      onChange={() => setAdvanceAmountType('full')}
                      className="text-[#0A4A29] focus:ring-0 cursor-pointer"
                    />
                    <span>১০০% সম্পূর্ণ মূল্য (Full Advance)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="advanceAmountType"
                      value="half"
                      checked={advanceAmountType === 'half'}
                      onChange={() => setAdvanceAmountType('half')}
                      className="text-[#0A4A29] focus:ring-0 cursor-pointer"
                    />
                    <span>৫০% অর্ধেক মূল্য (50% Advance)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="advanceAmountType"
                      value="fixed"
                      checked={advanceAmountType === 'fixed'}
                      onChange={() => setAdvanceAmountType('fixed')}
                      className="text-[#0A4A29] focus:ring-0 cursor-pointer"
                    />
                    <span>নির্দিষ্ট পরিমাণ (Fixed BDT)</span>
                  </label>

                  {advanceAmountType === 'fixed' && (
                    <div className="flex items-center gap-1.5 animate-fadeIn">
                      <span className="text-xs font-bold text-slate-500">৳</span>
                      <input
                        type="number"
                        min="50"
                        value={advanceFixedAmount}
                        onChange={(e) => setAdvanceFixedAmount(Number(e.target.value))}
                        className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center bg-white"
                        placeholder="200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 3: WHATSAPP, PASSWORD & STORE BRANDING
            ========================================================================= */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Store className="w-5 h-5 text-[#0A4A29]" />
            <span>৩. স্টোর পরিচিতি ও অ্যাডমিন নিরাপত্তা (Store Branding & Security)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                <span>অফিসিয়াল হোয়াটসঅ্যাপ হটলাইন *</span>
              </label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+880 1821-558813"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-rose-500" />
                <span>অ্যাডমিন প্যানেল পাসওয়ার্ড *</span>
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Jj0558949360"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">দোকানের নাম</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="InfiMart BD"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বাংলা স্লোগান</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="সাশ্রয়ের ঠিকানা, ভরসার বাজার"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>স্টোর ঠিকানা (Store Address)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ট্রাঙ্ক রোড, ফেনী সদর, ফেনী - ৩৯০০, বাংলাদেশ"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E8A52]"
            />
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: MESSENGER & DIRECT ORDER CHANNELS (মেসেঞ্জার ও যোগাযোগ চ্যানেল)
            ========================================================================= */}
        <div className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#0084FF] to-[#00C6FF] flex items-center justify-center text-white shrink-0 shadow-xs">
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.517 3.736 7.21V22l3.383-1.856c.917.254 1.887.391 2.881.391 5.523 0 10-4.145 10-9.277C22 6.145 17.523 2 12 2zm1.002 12.433l-2.56-2.73-4.996 2.73 5.498-5.836 2.62 2.73 4.935-2.73-5.497 5.836z" />
                </svg>
              </div>
              <span>৪. ফেসবুক মেসেঞ্জার ও অর্ডার চ্যানেল সেটিংস (Messenger & Contact Channels)</span>
            </h3>
            <span className="text-xs font-bold text-[#0084FF] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              সরাসরি অর্ডার
            </span>
          </div>

          <p className="text-xs text-slate-500">
            গ্রাহকরা ওয়েবসাইট ছাড়াও ফেসবুক মেসেঞ্জার, হোয়াটসঅ্যাপ ও সরাসরি ফোন কলের মাধ্যমে অর্ডার করতে পারবেন। নিচে প্রতিটি অপশন সক্রিয় বা নিষ্ক্রিয় করুন:
          </p>

          {/* Three Channel Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Messenger Toggle */}
            <div className={`p-4 rounded-2xl border transition-all ${
              messengerEnabled ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#0084FF] to-[#00C6FF] flex items-center justify-center text-white shadow-xs">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.517 3.736 7.21V22l3.383-1.856c.917.254 1.887.391 2.881.391 5.523 0 10-4.145 10-9.277C22 6.145 17.523 2 12 2zm1.002 12.433l-2.56-2.73-4.996 2.73 5.498-5.836 2.62 2.73 4.935-2.73-5.497 5.836z" />
                    </svg>
                  </div>
                  <span className="font-bold text-xs text-slate-800">Messenger অর্ডার</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={messengerEnabled}
                    onChange={(e) => setMessengerEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0084FF]" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                {messengerEnabled ? '🟢 পণ্য কার্ড ও ফর্মে মেসেঞ্জার বাটন সক্রিয়' : '⚪ মেসেঞ্জার বাটন স্টোরে লুকানো'}
              </p>
            </div>

            {/* 2. WhatsApp Toggle */}
            <div className={`p-4 rounded-2xl border transition-all ${
              whatsappEnabled ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#25D366] flex items-center justify-center text-white shadow-xs">
                    <MessageCircle className="w-4 h-4 fill-white" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">WhatsApp অর্ডার</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                {whatsappEnabled ? '🟢 হোয়াটসঅ্যাপে অর্ডার বাটন সক্রিয়' : '⚪ হোয়াটসঅ্যাপ বাটন স্টোরে লুকানো'}
              </p>
            </div>

            {/* 3. Call Toggle */}
            <div className={`p-4 rounded-2xl border transition-all ${
              callEnabled ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-70'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#FF8C00] flex items-center justify-center text-white shadow-xs">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs text-slate-800">কল করুন বাটন</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={callEnabled}
                    onChange={(e) => setCallEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF8C00]" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                {callEnabled ? '🟢 সরাসরি ফোন কল বাটন সক্রিয়' : '⚪ কল বাটন স্টোরে লুকানো'}
              </p>
            </div>
          </div>

          {/* Messenger Username & Primary Phone Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0084FF]" />
                  <span>ফেসবুক পেজ ইউজারনেম (Messenger Username) *</span>
                </span>
                {messengerUsername && (
                  <a
                    href={`https://m.me/${messengerUsername.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#0084FF] hover:underline flex items-center gap-0.5"
                    title="মেসেঞ্জার লিংক পরীক্ষা করুন"
                  >
                    <span>টেস্ট লিংক</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  m.me/
                </span>
                <input
                  type="text"
                  required={messengerEnabled}
                  value={messengerUsername}
                  onChange={(e) => setMessengerUsername(e.target.value.replace(/^https?:\/\/(www\.)?(m\.me|facebook\.com)\//, '').replace(/\/$/, ''))}
                  placeholder="infimartbd"
                  className="w-full pl-16 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                যেমন: <strong>infimartbd</strong> (লিংক হবে: https://m.me/infimartbd)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#FF8C00]" />
                <span>সরাসরি কল করার প্রাইমারি ফোন নম্বর (Primary Phone) *</span>
              </label>
              <input
                type="tel"
                required={callEnabled}
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="01821558813"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF8C00]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                গ্রাহক 'কল করুন' বাটনে চাপ দিলে সরাসরি এই নম্বরে কল যাবে
              </span>
            </div>
          </div>

          {/* Optional: Messenger Auto-reply / Greeting message guidance */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <label className="text-xs font-bold text-blue-950">
                মেসেঞ্জার অটো-গ্রিটিংস মেসেজ (Messenger Greeting Reference)
              </label>
            </div>
            <textarea
              rows={2}
              value={messengerGreeting}
              onChange={(e) => setMessengerGreeting(e.target.value)}
              placeholder="স্বাগতম! InfiMart BD-তে অর্ডার করতে চাইলে পণ্যের নাম লিখুন।"
              className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
            />
            <p className="text-[11px] text-blue-800 leading-relaxed">
              💡 <strong>টিপস:</strong> এই টেক্সটটি আপনার ফেসবুক পেজের সেটিংসে (Facebook Page Settings &gt; Automated Responses &gt; Instant Reply)-এ পেস্ট করে রাখলে গ্রাহক মেসেঞ্জারে ঢুকলেই এটি দেখতে পাবেন।
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#0A4A29] hover:bg-[#1E8A52] text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px]"
          >
            <Save className="w-4 h-4 text-[#FFB300]" />
            <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস ও পলিসি সংরক্ষণ করুন'}</span>
          </button>
        </div>
      </form>

      {/* Inventory Quick Seeder Action Card */}
      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-amber-900 text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>প্রাথমিক পণ্য লোড (Seed Initial Grocery Inventory)</span>
          </h4>
          <p className="text-xs text-amber-700 mt-1 max-w-lg">
            ক্যাটালগ খালি থাকলে বা নতুন পণ্য প্রয়োজন হলে ফেনী বাজারের প্রয়োজনীয় পণ্যগুলো এক ক্লিকে লোড করুন।
          </p>
        </div>

        <button
          onClick={handleSeed}
          disabled={seedLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-sm transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 min-h-[48px]"
        >
          <RefreshCw className={`w-4 h-4 ${seedLoading ? 'animate-spin' : ''}`} />
          <span>{seedLoading ? 'লোড হচ্ছে...' : 'নমুনা পণ্য লোড করুন'}</span>
        </button>
      </div>
    </div>
  );
};
