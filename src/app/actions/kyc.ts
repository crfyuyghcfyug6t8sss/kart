"use server";

import { revalidatePath } from "next/cache";
import { requireCardUser } from "@/lib/auth";
import { api, type KycApplication } from "@/lib/cards-api";
import { attempt, str, UserError, type ActionState } from "@/lib/action";

const MAX_FILE = 5 * 1024 * 1024;
const FILE_RE = /\.(png|jpe?g|pdf)$/i;

function fileField(form: FormData, key: string, required: boolean): File | null {
  const f = form.get(key);
  if (!(f instanceof File) || f.size === 0) {
    if (required) throw new UserError("يرجى إرفاق جميع المستندات المطلوبة");
    return null;
  }
  if (!FILE_RE.test(f.name)) throw new UserError("الملفات المسموحة: png, jpg, jpeg, pdf");
  if (f.size > MAX_FILE) throw new UserError("حجم كل ملف يجب ألا يتجاوز 5 ميغابايت");
  return f;
}

export async function submitKyc(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireCardUser();
  return attempt(async () => {
    const firstName = str(form, "firstName");
    const lastName = str(form, "lastName");
    if (!/^[A-Za-z]+$/.test(firstName) || !/^[A-Za-z]+$/.test(lastName)) {
      throw new UserError("الاسم الأول والأخير بالأحرف الإنجليزية فقط وبدون مسافات");
    }
    const certType = Number(str(form, "certType"));
    if (![1, 2, 3].includes(certType)) throw new UserError("اختر نوع المستند");
    const birthday = str(form, "birthday");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new UserError("أدخل تاريخ الميلاد");
    const phone = str(form, "phone").replace(/\D/g, "");
    const areaCode = str(form, "areaCode").replace(/\D/g, "");
    if (!phone || !areaCode) throw new UserError("أدخل رقم الهاتف ورمز الدولة");
    const needsExtra = str(form, "needsExtra") === "1";

    const front = fileField(form, "idFront", true)!;
    const back = fileField(form, "idBack", certType !== 2);
    const selfie = fileField(form, "selfie", false);
    const extra = fileField(form, "extraFile", needsExtra);
    const fileType = needsExtra ? Number(str(form, "fileType")) : undefined;
    if (needsExtra && !(fileType! >= 7 && fileType! <= 20)) throw new UserError("اختر نوع المستند الإضافي");

    const up = async (f: File | null) => (f ? (await api.uploadFile(user.uid, f)).fileUrl : undefined);
    const [idUrl, idBackUrl, selfieUrl, fileUrl] = await Promise.all([up(front), up(back), up(selfie), up(extra)]);

    const data: KycApplication = {
      firstName,
      lastName,
      idNo: str(form, "idNo"),
      email: user.email,
      nationCode: str(form, "nationCode"),
      countryCode: str(form, "countryCode"),
      certType,
      idUrl: idUrl!,
      idBackUrl,
      birthday,
      areaCode,
      phone,
      selfieUrl,
      fileType,
      fileUrl,
    };
    if (!data.idNo || !data.nationCode || !data.countryCode) throw new UserError("أكمل جميع الحقول المطلوبة");
    await api.submitKyc(user.uid, data);
    revalidatePath("/kyc");
    revalidatePath("/dashboard");
    return { ok: "تم إرسال طلب التحقق، سنُعلمك بالنتيجة." };
  });
}
