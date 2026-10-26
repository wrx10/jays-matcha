import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { DaisyFlower } from './Decorations.tsx';

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

export function PrivacyPolicyView({ onBack }: PrivacyPolicyViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 text-right"
      dir="rtl"
      id="privacy-policy-container"
    >
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-[#FFFDF9] border-2 border-[#D7E7C8] text-[#445B32] px-4 py-2 rounded-full text-xs sm:text-sm font-bold hover:bg-[#F2F7EC] transition-all shadow-2xs active:scale-98 cursor-pointer"
          id="privacy-back-btn"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>العودة إلى المتجر</span>
        </button>

        <div className="flex items-center gap-1.5 opacity-80 pointer-events-none">
          <DaisyFlower className="w-5 h-5" petalColor="#FFE6EE" centerColor="#F9E79F" />
        </div>
      </div>

      {/* Main Policy Card */}
      <div className="bg-[#FFFDF9]/95 rounded-2xl sm:rounded-3xl p-4 sm:p-10 border-2 border-[#D7E7C8] vintage-card-shadow space-y-6 sm:space-y-8 text-gray-800 leading-relaxed overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#D7E7C8]/60 pb-5 sm:pb-6">
            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-[#F1F8E9] rounded-full text-xs font-bold text-[#556F43] border border-[#D7E7C8]">
              <ShieldCheck className="w-4 h-4" />
              <span>Jay’s Matcha</span>
            </div>
            <h1 className="font-marhey text-xl sm:text-4xl font-bold text-[#445B32] tracking-tight">
              سياسة الخصوصية
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              آخر تحديث: 6 أكتوبر 2026
            </p>
          </div>

          {/* Intro */}
          <div className="space-y-3 text-sm sm:text-base text-gray-700 leading-relaxed">
            <p>
              نحن نحترم خصوصيتك ونلتزم بحماية المعلومات التي يتم جمعها عند استخدامك لموقعنا أو تطبيقنا.
            </p>
            <p>
              باستخدامك لخدمتنا، فإنك توافق على الممارسات الموضحة في سياسة الخصوصية هذه.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              1. المعلومات التي نجمعها
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              قد نجمع المعلومات التالية عند استخدامك لخدمتنا:
            </p>
            <ul className="list-disc pr-6 space-y-1.5 text-sm sm:text-base text-gray-700">
              <li>اسمك الكامل الذي تقدمه عند إنشاء حسابك.</li>
              <li>عنوان البريد الإلكتروني المرتبط بحسابك.</li>
              <li>المعلومات المقدمة عبر Google عند استخدامك لتسجيل الدخول عبر Google.</li>
              <li>المعلومات المتعلقة بطلباتك والمنتجات التي تطلبها من خلال خدمتنا.</li>
              <li>معلومات الاتصال أو عنوان التوصيل الذي تقدمه عند الحاجة لإتمام طلبك.</li>
              <li>المعلومات التقنية الأساسية اللازمة لتشغيل الخدمة وتحسينها، مثل نوع الجهاز، ومعلومات المتصفح، وبعض بيانات الاستخدام.</li>
            </ul>
            <p className="text-sm sm:text-base text-gray-700">
              نحن نطلب فقط المعلومات الضرورية لتقديم الخدمة وتشغيلها.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              2. تسجيل الدخول عبر Google
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              يمكنك تسجيل الدخول باستخدام حساب Google الخاص بك.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              عند استخدامك لتسجيل الدخول عبر Google، قد نتلقى معلومات أساسية مرتبطة بحساب Google الخاص بك، مثل عنوان بريدك الإلكتروني ومعرف الحساب، وفقاً لخدمات المصادقة المعتمدة من Google.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              قد نطلب منك إدخال اسمك الكامل بشكل منفصل عند إنشاء حسابك. وسيتم استخدام الاسم الكامل الذي تقدمه كاسم لك داخل خدمتنا.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              3. كيف نستخدم معلوماتك
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              قد نستخدم المعلومات التي نجمعها من أجل:
            </p>
            <ul className="list-disc pr-6 space-y-1.5 text-sm sm:text-base text-gray-700">
              <li>إنشاء حسابك وإدارته.</li>
              <li>معالجة طلباتك وإدارتها.</li>
              <li>عرض سجل طلباتك السابقة.</li>
              <li>التواصل معك بشأن طلباتك عند الضرورة.</li>
              <li>إرسال الإشعارات المتعلقة بطلباتك وحسابك.</li>
              <li>تحسين أداء الخدمة وتعزيز أمانها.</li>
              <li>منع الاستخدام غير المصرح به أو إساءة استخدام الخدمة.</li>
              <li>الامتثال للمتطلبات القانونية المعمول بها.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              4. مشاركة المعلومات
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              نحن لا نبيع معلوماتك الشخصية أو نؤجرها لأي أطراف أخرى.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              قد نشارك المعلومات مع مزودي الخدمة الضروريين لتشغيل الخدمة، مثل مزودي الاستضافة، وقواعد البيانات، والمصادقة، والإشعارات، وذلك فقط بالقدر اللازم لتقديم الخدمة وتشغيلها.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              قد نفصح أيضاً عن المعلومات عندما يتطلب ذلك القانون المعمول به أو من قبل سلطة مختصة.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              5. حماية معلوماتك
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              نستخدم تدابير تقنية وتنظيمية مناسبة للمساعدة في حماية معلومات المستخدمين من الوصول غير المصرح به، أو الاستخدام، أو التعديل.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              ومع ذلك، لا يمكن لأي خدمة عبر الإنترنت ضمان الأمان الكامل بنسبة 100%.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              6. الاحتفاظ بالبيانات
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              نحتفظ بالمعلومات طالما كان ذلك ضرورياً لتقديم الخدمة، أو إدارة الحسابات والطلبات، أو الامتثال للمتطلبات القانونية المعمول بها.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              عندما لا تعد المعلومات مطلوبة، قد نحذفها أو نزيل ارتباطها بالمستخدم، مع مراعاة المتطلبات والأنظمة المعمول بها.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              7. حذف الحساب والبيانات
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              يمكنك طلب حذف حسابك ومعلوماتك الشخصية عبر التواصل معنا على:{' '}
              <a
                href="mailto:abodas20111@gmail.com"
                className="text-[#445B32] font-bold underline hover:text-[#7A8E68]"
                dir="ltr"
              >
                abodas20111@gmail.com
              </a>.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              عند تقديم طلب حذف الحساب، سنعمل على حذف المعلومات الشخصية المرتبطة بالحساب، باستثناء المعلومات التي يلزمنا النظام أو القانون بالاحتفاظ بها.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              8. ملفات تعريف الارتباط والتقنيات المشابهة
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              قد يستخدم الموقع ملفات تعريف الارتباط (Cookies) أو تقنيات مشابهة للحفاظ على جلسات تسجيل الدخول، وتحسين أداء الموقع، وتوفير الوظائف الأساسية.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              يمكنك التحكم في بعض ملفات تعريف الارتباط من خلال إعدادات المتصفح الخاص بك. قد يؤثر تعطيل بعض ملفات تعريف الارتباط على أجزاء معينة من الخدمة.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              9. خدمات الطرف الثالث
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              قد تستخدم الخدمة خدمات طرف ثالث مثل خدمات المصادقة، والاستضافة، وقواعد البيانات، والإشعارات.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              المعلومات التي تتم معالجتها من خلال هذه الخدمات قد تخضع أيضاً لسياسات الخصوصية وشروط تلك الأطراف الثالثة.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              10. خصوصية الأطفال
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              الخدمة غير موجهة للأطفال غير المصرح لهم نظاماً باستخدام الخدمة بموجب القوانين والأنظمة المعمول بها.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              إذا علمنا أنه تم جمع معلومات شخصية من شخص غير مسموح له باستخدام الخدمة، فقد نتخذ الخطوات المناسبة لحذف تلك المعلومات.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              11. التغييرات على سياسة الخصوصية
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر.
            </p>
            <p className="text-sm sm:text-base text-gray-700">
              عند إجراء تغييرات مهمة، سنقوم بتحديث تاريخ "آخر تحديث" في أعلى هذه الصفحة، وقد نستخدم طرقاً إضافية لإشعار المستخدمين عند الاقتضاء.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-3 border-t border-[#D7E7C8]/60 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#445B32]">
              12. تواصل معنا
            </h2>
            <p className="text-sm sm:text-base text-gray-700">
              إذا كانت لديك أسئلة حول سياسة الخصوصية هذه أو كيفية التعامل مع معلوماتك، يمكنك التواصل معنا عبر:
            </p>
            <div className="bg-[#F1F8E9] p-4 rounded-2xl border border-[#D7E7C8]/70 text-sm space-y-1.5">
              <p>
                <strong className="text-[#445B32]">البريد الإلكتروني:</strong>{' '}
                <a href="mailto:abodas20111@gmail.com" className="hover:underline font-mono" dir="ltr">
                  abodas20111@gmail.com
                </a>
              </p>
              <p>
                <strong className="text-[#445B32]">اسم المتجر / التطبيق:</strong> Jay’s Matcha
              </p>
              <p>
                <strong className="text-[#445B32]">الدولة:</strong> المملكة العربية السعودية
              </p>
            </div>
          </section>

          {/* Bottom Back Button */}
          <div className="pt-4 text-center border-t border-[#D7E7C8]/40">
            <button
              type="button"
              onClick={onBack}
              className="py-3 px-8 rounded-full bg-[#7A8E68] hover:bg-[#687C57] text-white font-bold text-sm transition-all shadow-md active:scale-98 cursor-pointer"
            >
              العودة إلى متجر Jay’s Matcha
            </button>
          </div>
        </div>
      </motion.div>
  );
}
