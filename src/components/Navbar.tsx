import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import { DaisyFlower } from './Decorations.tsx';
import { UserProfile } from '../types.ts';
import { isStoreOwner } from '../firebase.ts';

interface NavbarProps {
  onOpenLogin: () => void;
  userEmail?: string | null;
  currentUser?: UserProfile | null;
  onOpenDashboard?: () => void;
}

export function Navbar({ onOpenLogin, userEmail, currentUser, onOpenDashboard }: NavbarProps) {
  const label = currentUser?.fullName || (userEmail ? 'حسابي' : 'تسجيل الدخول');

  return (
    <header className="sticky top-0 z-30 w-full bg-[#FFFDF9]/90 backdrop-blur-md border-b-2 border-[#D7E7C8] px-3 sm:px-10 py-2.5 sm:py-4 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Right side in RTL (top-right of the site): تسجيل الدخول & Dashboard button for store owner */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 sm:gap-2 bg-white/90 border-2 border-[#D7E7C8] text-[#445B32] px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-[#F2F7EC] transition-all shadow-2xs active:scale-98 cursor-pointer max-w-[130px] sm:max-w-[200px]"
            id="nav-login-btn"
          >
            <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#F1F8E9] flex items-center justify-center text-[#7A8E68] shrink-0">
              <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </span>
            <span className="truncate">{label}</span>
          </button>

          {/* Protected Store Owner Dashboard Button - ONLY visible to verified store owner */}
          {isStoreOwner(currentUser) && onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="flex items-center gap-1 sm:gap-1.5 bg-[#7A8E68] text-white border-2 border-[#5F734E] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-[#687C57] transition-all shadow-xs active:scale-98 cursor-pointer shrink-0"
              id="nav-dashboard-btn"
              title="لوحة تحكم المتجر"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">لوحة التحكم</span>
              <span className="sm:hidden">الإدارة</span>
            </button>
          )}
        </div>

        {/* Center / Brand Logo: Jay’s Matcha */}
        <div className="flex items-center gap-1.5 sm:gap-2 group cursor-pointer shrink-0" id="nav-brand-title">
          <span className="font-marhey text-lg sm:text-2xl font-bold text-[#445B32] tracking-tight">
            Jay’s Matcha
          </span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#D7E7C8] rounded-full flex items-center justify-center shadow-2xs">
            <span className="text-white text-[10px] sm:text-xs select-none">✿</span>
          </div>
        </div>

        {/* Left balance spacer */}
        <div className="w-6 sm:w-24 flex justify-end opacity-60 pointer-events-none shrink-0">
          <DaisyFlower className="w-4 h-4 sm:w-5 sm:h-5" petalColor="#FFE6EE" centerColor="#F9E79F" />
        </div>
      </div>
    </header>
  );
}
