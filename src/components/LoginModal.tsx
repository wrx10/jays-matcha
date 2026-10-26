import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Check, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { loginWithGoogle, getUserProfile, saveUserProfile, logoutUser, isStoreOwner } from '../firebase.ts';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (profile: UserProfile) => void;
  onLogout: () => void;
  initialShowFullName?: boolean;
  pendingUid?: string | null;
  pendingEmail?: string | null;
  onOpenDashboard?: () => void;
}

export function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  initialShowFullName = false,
  pendingUid = null,
  pendingEmail = null,
  onOpenDashboard,
}: LoginModalProps) {
  const [showFullNameScreen, setShowFullNameScreen] = useState(initialShowFullName);
  const [pendingUser, setPendingUser] = useState<{ uid: string; email: string } | null>(
    pendingUid ? { uid: pendingUid, email: pendingEmail || '' } : null
  );
  const [fullNameInput, setFullNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state if initialShowFullName changes
  useEffect(() => {
    if (initialShowFullName && pendingUid) {
      setShowFullNameScreen(true);
      setPendingUser({ uid: pendingUid, email: pendingEmail || '' });
    }
  }, [initialShowFullName, pendingUid, pendingEmail]);

  // Reset transient error when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccessMsg('');
      if (!pendingUser) {
        setShowFullNameScreen(false);
      }
    }
  }, [isOpen, pendingUser]);

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      const profile = await getUserProfile(user.uid);

      if (profile && profile.fullName && profile.fullName.trim().length > 0) {
        // Returning user with already saved full name: Do NOT ask for it again
        onLoginSuccess(profile);
        setSuccessMsg(`أهلاً بك مجدداً، ${profile.fullName}`);
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
        }, 1200);
      } else {
        // First account setup or missing full name in database:
        // Show required "Full name" screen.
        // CRITICAL: Do NOT automatically use Google display name!
        setPendingUser({
          uid: user.uid,
          email: user.email || '',
        });
        setFullNameInput(''); // Must be entered manually
        setShowFullNameScreen(true);
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (errorObj?.code === 'auth/cancelled-popup-request') {
        // Ignore duplicate popup
      } else {
        console.error('Google Sign-In Error:', err);
        setError('تعذر تسجيل الدخول عبر Google. يرجى التأكد من الاتصال والمحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;

    const trimmed = fullNameInput.trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);

    // Require full three-part name
    if (parts.length < 3) {
      setError('يرجى إدخال الاسم الثلاثي كاملاً (ثلاثة أسماء على الأقل: الاسم، اسم الأب، واسم العائلة).');
      return;
    }

    if (trimmed.length < 3 || trimmed.length > 100) {
      setError('يرجى التأكد من طول الاسم الثلاثي (بين 3 و 100 حرف).');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      // Save manually entered full name in Firestore under the user's Firebase UID (role: 'customer')
      const savedProfile = await saveUserProfile(pendingUser.uid, trimmed, pendingUser.email);

      onLoginSuccess(savedProfile);
      setShowFullNameScreen(false);
      setPendingUser(null);
      setSuccessMsg(`تم حفظ الاسم بنجاح! أهلاً بك، ${trimmed}`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Save Profile Error:', err);
      setError('حدث خطأ أثناء حفظ الاسم في قاعدة البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      onLogout();
      setShowFullNameScreen(false);
      setPendingUser(null);
      setFullNameInput('');
      onClose();
    } catch (err) {
      console.error('Logout Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" id="login-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              // If required full name is pending, do not silently dismiss without warning
              if (!showFullNameScreen) {
                onClose();
              } else {
                onClose();
              }
            }}
            className="fixed inset-0 bg-[#334628]/30 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-[#FDFDFD] rounded-3xl sm:rounded-[40px] p-5 sm:p-8 shadow-2xl border-4 border-[#D7E7C8] max-h-[90vh] overflow-y-auto z-10"
            id="login-modal-card"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 p-2 text-[#7A8E68] hover:text-[#5D6D4E] hover:bg-[#F1F8E9] rounded-full transition-colors cursor-pointer"
              aria-label="إغلاق"
              id="login-close-btn"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-5 sm:mb-6 pt-1 sm:pt-2">
              <h3 className="font-marhey text-xl sm:text-2xl font-bold text-[#7A8E68] mb-1">
                {showFullNameScreen
                  ? 'إكمال إعداد الحساب'
                  : currentUser
                  ? 'حسابك'
                  : 'تسجيل الدخول'}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {showFullNameScreen
                  ? 'يرجى إدخال اسمك الثلاثي للمتابعة'
                  : currentUser
                  ? `أهلاً بك، ${currentUser.fullName}`
                  : 'مرحباً بك في متجر Jay’s Matcha'}
              </p>
            </div>

            {/* Success Notification */}
            {successMsg ? (
              <div className="py-6 sm:py-8 text-center text-[#7A8E68] flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#F1F8E9] flex items-center justify-center text-[#7A8E68]">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-bold text-base">{successMsg}</p>
              </div>
            ) : showFullNameScreen ? (
              /* Required Full Name Screen for First Time Account Setup */
              <form onSubmit={handleSaveFullName} className="space-y-4" id="fullname-setup-form">
                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl text-center border border-rose-200">
                    {error}
                  </p>
                )}

                <div className="p-3.5 bg-[#F1F8E9] rounded-2xl border border-[#D7E7C8]/50 text-right">
                  <p className="text-xs text-[#5D6D4E] leading-relaxed">
                    تم التحقق من حساب Google بنجاح. لإكمال الإعداد، يرجى كتابة اسمك الثلاثي يدوياً ليتم حفظه في ملفك الشخصي.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5D6D4E] mb-1.5 text-right">
                    الاسم الثلاثي <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={(e) => {
                        setFullNameInput(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="مثال: عبد الله محمد الشهري"
                      className="w-full py-3 px-3.5 pr-10 text-base sm:text-sm bg-white border-2 border-[#D7E7C8] rounded-xl focus:outline-none focus:border-[#7A8E68] text-[#5D6D4E] transition-all"
                      required
                      autoFocus
                      id="input-full-name"
                    />
                    <UserIcon className="w-4 h-4 text-[#7A8E68] absolute top-3.5 right-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 text-right">
                    يجب إدخال الاسم كاملاً (الاسم، اسم الأب، واسم العائلة).
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isLoading || !fullNameInput.trim()}
                    className="w-full py-3.5 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-full font-bold transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
                    id="submit-full-name-btn"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <span>حفظ ومتابعة</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await logoutUser();
                      setShowFullNameScreen(false);
                      setPendingUser(null);
                      setFullNameInput('');
                      setError('');
                    }}
                    className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer min-h-[36px]"
                    id="cancel-fullname-btn"
                  >
                    إلغاء والعودة
                  </button>
                </div>
              </form>
            ) : currentUser ? (
              /* Logged In View */
              <div className="space-y-4">
                <div className="p-4 bg-[#F1F8E9] rounded-2xl border border-[#D7E7C8]/40 text-center space-y-2">
                  <div>
                    <p className="text-xs text-[#7A8E68] mb-0.5">الاسم الثلاثي</p>
                    <p className="font-bold text-base text-[#5D6D4E]">{currentUser.fullName}</p>
                  </div>
                  {currentUser.email && (
                    <div className="pt-2 border-t border-[#D7E7C8]/40">
                      <p className="text-xs text-[#7A8E68] mb-0.5">البريد الإلكتروني</p>
                      <p className="text-xs text-gray-600 font-medium" dir="ltr">{currentUser.email}</p>
                    </div>
                  )}
                </div>

                {isStoreOwner(currentUser) && onOpenDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDashboard();
                    }}
                    className="w-full py-3.5 px-4 bg-[#7A8E68] hover:bg-[#687C57] text-white rounded-full font-bold transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    id="modal-open-dashboard-btn"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>لوحة تحكم المتجر (Store Dashboard)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#F8BBD0] text-white hover:bg-[#F06292] rounded-full font-bold transition-colors shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  id="logout-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تسجيل الخروج...</span>
                    </>
                  ) : (
                    <span>تسجيل الخروج</span>
                  )}
                </button>
              </div>
            ) : (
              /* Login View with Google Sign-In Only */
              <div className="space-y-3">
                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl text-center border border-rose-200">
                    {error}
                  </p>
                )}

                {/* Google Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-3.5 px-5 bg-white hover:bg-[#F1F8E9] text-[#5D6D4E] border-2 border-[#D7E7C8] rounded-2xl font-medium flex items-center justify-center gap-3 transition-all hover:shadow-xs active:scale-98 cursor-pointer disabled:opacity-50"
                  id="login-google-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#7A8E68]" />
                      <span>جاري الاتصال بـ Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>تسجيل الدخول باستخدام Google</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
