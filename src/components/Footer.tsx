import React from 'react';
import { MessageCircle, Phone, MapPin, Truck, ShieldCheck, Clock } from 'lucide-react';
import { StoreSettings } from '../types';

interface FooterProps {
  settings: StoreSettings;
  onAdminClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onAdminClick }) => {
  const cleanPhone = (settings.whatsapp || '+8801821558813').replace(/[^0-9]/g, '');

  return (
    <footer className="bg-[#0A4A29] text-white border-t-4 border-[#FFB300] mt-16">
      {/* Features Bar */}
      <div className="bg-[#06331C] py-6 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1E8A52] rounded-xl text-[#FFB300]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#FFE0A8]">দ্রুত ডেলিভারি</h4>
              <p className="text-xs text-white/80">দ্রুততম সময়ে নির্ভরযোগ্য হোম ডেলিভারি</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1E8A52] rounded-xl text-[#FFB300]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#FFE0A8]">১০০% খাঁটি ও তাজা</h4>
              <p className="text-xs text-white/80">সেরা মান ও সাশ্রয়ী দামের নিশ্চয়তা</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1E8A52] rounded-xl text-[#FFB300]">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#FFE0A8]">সহজ অর্ডার</h4>
              <p className="text-xs text-white/80">শুধুমাত্র হোয়াটসঅ্যাপেই অর্ডার কনফার্ম</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1E8A52] rounded-xl text-[#FFB300]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[#FFE0A8]">সকাল ৮টা - রাত ১০টা</h4>
              <p className="text-xs text-white/80">সপ্তাহের প্রতিদিন কাস্টমার সেবা</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Info */}
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="text-2xl font-black tracking-wider leading-none mb-2">
            <span className="text-white">InfiMart </span>
            <span className="text-[#FFB300]">BD</span>
          </div>
          <p className="text-[#FFE0A8] font-medium mb-3">
            {settings.slogan || 'সাশ্রয়ের ঠিকানা, ভরসার বাজার'}
          </p>
          <p className="text-white/70 text-xs leading-relaxed mb-4">
            দৈনন্দিন গ্রোসারি ও মাসিক বাজার সহজ ও নিশ্চিন্ত করতে আমরা প্রতিশ্রুতিবদ্ধ — নির্ভরযোগ্য অনলাইন বাজার, বাজারের চেয়ে সাশ্রয়ী দামে! কোনো ঝামেলা ছাড়াই সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন।
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#FFB300] mb-3 flex items-center gap-2">
            <span>যোগাযোগের ঠিকানা</span>
          </h3>
          <ul className="space-y-2.5 text-xs text-white/80">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FFB300] shrink-0 mt-0.5" />
              <span>{settings.address || 'ট্রাঙ্ক রোড, ফেনী সদর, ফেনী - ৩৯০০, বাংলাদেশ'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#FFB300] shrink-0" />
              <span>হটলাইন: {settings.whatsapp}</span>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-white font-medium"
              >
                হোয়াটসঅ্যাপ: {settings.whatsapp}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold text-[#FFB300] mb-3">সহজ অর্ডার নিয়ম</h3>
          <ol className="list-decimal list-inside text-xs text-white/80 space-y-1.5 leading-relaxed">
            <li>পণ্যটি পছন্দ করুন</li>
            <li>সবুজ "হোয়াটসঅ্যাপে অর্ডার" বাটনে চাপ দিন</li>
            <li>স্বয়ংক্রিয় মেসেজটি পাঠিয়ে অর্ডারটি কনফার্ম করুন</li>
            <li>পণ্য হাতে পেয়ে মূল্য পরিশোধ (ক্যাশ অন ডেলিভারি) করুন</li>
          </ol>

          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>ইনফিমার্ট বিডি — সাশ্রয়ের ঠিকানা, ভরসার বাজার</span>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60 bg-[#06331C]">
        <p>© {new Date().getFullYear()} InfiMart BD. সর্বস্বত্ব সংরক্ষিত। Your Monthly Bazar, Delivered.</p>
      </div>
    </footer>
  );
};
