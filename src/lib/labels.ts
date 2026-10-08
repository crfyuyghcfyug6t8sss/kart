// Arabic labels for API enums and error codes.

export const CARD_STATUS: Record<number, string> = {
  0: "حالة أولية",
  1: "بانتظار التفعيل",
  2: "قيد التفعيل",
  3: "فعّالة",
  4: "مجمّدة",
  5: "مبلّغ عن فقدانها",
  6: "قيد الإلغاء",
  7: "ملغاة",
  8: "منتهية الصلاحية",
  9: "موقوفة مؤقتاً",
};

export const KYC_STATUS: Record<string, string> = {
  uncommitted: "لم يتم التقديم",
  waiting: "بانتظار المراجعة",
  wait_audit: "قيد المراجعة",
  wait_confirm: "بانتظار تأكيدك",
  success: "تم التحقق",
  fail: "مرفوض",
};

export const TRANS_TYPE: Record<number, string> = {
  140: "إصدار بطاقة",
  150: "شحن البطاقة",
  170: "عملية شراء",
  171: "استرجاع",
  172: "رسوم",
  173: "سحب نقدي (صراف)",
  174: "حجز مسبق",
  175: "إلغاء البطاقة",
};

export const TRANS_STATUS: Record<number, string> = {
  0: "جديدة",
  1: "قيد المعالجة",
  2: "ناجحة",
  3: "فاشلة",
};

export const ORDER_STATUS: Record<string, string> = {
  PENDING: "قيد المعالجة",
  SUCCESS: "ناجحة",
  FAILURE: "فاشلة",
};

export const CERT_TYPES = [
  { value: 1, label: "بطاقة هوية (وجه وخلف)", needsBack: true },
  { value: 2, label: "جواز سفر (الصفحة الأولى)", needsBack: false },
  { value: 3, label: "رخصة قيادة (وجه وخلف)", needsBack: true },
];

export const EXTRA_FILE_TYPES: { value: number; label: string }[] = [
  { value: 7, label: "تأشيرة إلكترونية" },
  { value: 8, label: "صورة التأشيرة" },
  { value: 9, label: "بطاقة إقامة دائمة (PR)" },
  { value: 10, label: "تصريح إقامة مؤقت (TRC)" },
  { value: 11, label: "بطاقة تصريح عمل" },
  { value: 12, label: "تصريح إقامة طالب" },
  { value: 13, label: "أخرى" },
  { value: 14, label: "فاتورة كهرباء أو ماء أو غاز" },
  { value: 15, label: "رخصة قيادة / إقامة / هوية (تتضمن العنوان)" },
  { value: 16, label: "كشف حساب بنكي / بطاقة ائتمان" },
  { value: 17, label: "سند ملكية عقار" },
  { value: 18, label: "مستندات ضريبية / بريد حكومي" },
  { value: 19, label: "بطاقة ضمان اجتماعي (تتضمن العنوان)" },
  { value: 20, label: "عقد إيجار" },
];

const ERRORS: Record<number, string> = {
  403: "تم رفض الوصول",
  429: "طلبات كثيرة، حاول بعد قليل",
  500: "خطأ في نظام مزوّد البطاقات",
  1001: "بيانات غير صالحة",
  1002: "معرّف التطبيق (appId) غير صحيح",
  1004: "انتهت صلاحية التوقيع، تحقق من توقيت السيرفر",
  1005: "فشل التحقق من التوقيع",
  1007: "المستخدم غير مسجّل لدى مزوّد البطاقات",
  1009: "صيغة البريد الإلكتروني غير صحيحة",
  1010: "رقم المنتج غير صحيح",
  1011: "البريد الإلكتروني مسجّل مسبقاً",
  1012: "صيغة الملف غير مدعومة (png, jpg, jpeg, pdf)",
  1013: "لا توجد بطاقة",
  1102: "البطاقة غير موجودة",
  1104: "البطاقة غير مفعّلة، فعّلها أولاً",
  1105: "الرصيد غير كافٍ",
  1106: "فشلت العملية على البطاقة",
  1107: "يجب إكمال التحقق من الهوية (KYC) أولاً",
  1108: "البطاقة مرتبطة مسبقاً",
  1109: "لا تملك صلاحية على هذه البطاقة",
  1111: "هذه العملية غير مدعومة لهذه البطاقة",
  1120: "رصيد الدولار لدى التاجر غير كافٍ لإصدار البطاقة",
  1121: "رصيد USDT لدى التاجر غير كافٍ لإصدار البطاقة",
  1122: "مستوى التحقق من الهوية غير كافٍ",
  1123: "طلب بطاقة مكرر",
  1201: "منطقة الشحن غير موجودة",
  1202: "عنوان الشحن غير موجود",
  1203: "عنوان الشحن غير صالح",
  1303: "رصيد حساب التاجر غير كافٍ",
  1401: "تم التحقق من الهوية مسبقاً",
  1402: "يوجد طلب تحقق قائم",
  1403: "رقم الهاتف غير صالح",
  1404: "الاسم غير صالح (أحرف إنجليزية فقط)",
  1405: "المستندات مطلوبة",
};

export function errorMessage(code: number, fallback: string): string {
  return ERRORS[code] ?? `${fallback} (رمز ${code})`;
}

export function money(v: string | number | undefined | null, ccy = ""): string {
  if (v === undefined || v === null || v === "") return "—";
  const n = Number(v);
  const s = Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : String(v);
  return ccy ? `${s} ${ccy}` : s;
}

export function maskPan(pan: string): string {
  const digits = pan.replace(/\s/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
}
