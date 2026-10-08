"use client";

import { useActionState, useMemo, useState } from "react";
import type { Country } from "@/lib/cards-api";
import type { ActionState } from "@/lib/action";
import { CERT_TYPES, EXTRA_FILE_TYPES } from "@/lib/labels";
import { Feedback } from "./Feedback";

export function KycForm({
  countries,
  action,
}: {
  countries: Country[];
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [nation, setNation] = useState("");
  const [residence, setResidence] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [certType, setCertType] = useState(2);

  const byCode = useMemo(() => new Map(countries.map((c) => [c.value, c])), [countries]);
  const needsExtra = Boolean(byCode.get(nation)?.needCertificate || byCode.get(residence)?.needCertificate);
  const needsBack = CERT_TYPES.find((c) => c.value === certType)?.needsBack ?? false;

  const options = countries.map((c) => (
    <option key={c.value} value={c.value}>
      {c.enName}
    </option>
  ));

  if (state?.ok) return <Feedback state={state} />;

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="needsExtra" value={needsExtra ? "1" : "0"} />
      <h2>البيانات الشخصية</h2>
      <div className="fields">
        <label>
          الاسم الأول (بالإنجليزية)
          <input name="firstName" required pattern="[A-Za-z]+" className="ltr" />
        </label>
        <label>
          اسم العائلة (بالإنجليزية)
          <input name="lastName" required pattern="[A-Za-z]+" className="ltr" />
        </label>
        <label>
          تاريخ الميلاد
          <input name="birthday" type="date" required />
        </label>
        <label>
          الجنسية
          <select name="nationCode" required value={nation} onChange={(e) => setNation(e.target.value)}>
            <option value="">اختر…</option>
            {options}
          </select>
        </label>
        <label>
          بلد الإقامة
          <select
            name="countryCode"
            required
            value={residence}
            onChange={(e) => {
              setResidence(e.target.value);
              const code = byCode.get(e.target.value)?.telephoneCode;
              if (code) setAreaCode(code);
            }}
          >
            <option value="">اختر…</option>
            {options}
          </select>
        </label>
        <label>
          رمز الدولة للهاتف
          <input name="areaCode" required inputMode="numeric" value={areaCode} onChange={(e) => setAreaCode(e.target.value)} className="ltr" />
        </label>
        <label>
          رقم الهاتف
          <input name="phone" required inputMode="tel" className="ltr" />
        </label>
      </div>

      <h2>المستند</h2>
      <div className="fields">
        <label>
          نوع المستند
          <select name="certType" value={certType} onChange={(e) => setCertType(Number(e.target.value))}>
            {CERT_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          رقم المستند
          <input name="idNo" required className="ltr" />
        </label>
        <label>
          صورة الوجه الأمامي
          <input name="idFront" type="file" required accept=".png,.jpg,.jpeg,.pdf" />
        </label>
        {needsBack && (
          <label>
            صورة الوجه الخلفي
            <input name="idBack" type="file" required accept=".png,.jpg,.jpeg,.pdf" />
          </label>
        )}
        <label>
          صورة سيلفي (اختياري)
          <input name="selfie" type="file" accept=".png,.jpg,.jpeg" />
        </label>
      </div>

      {needsExtra && (
        <>
          <div className="alert warn">البلد المختار يتطلب مستنداً إضافياً.</div>
          <div className="fields">
            <label>
              نوع المستند الإضافي
              <select name="fileType" required defaultValue="">
                <option value="" disabled>
                  اختر…
                </option>
                {EXTRA_FILE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الملف
              <input name="extraFile" type="file" required accept=".png,.jpg,.jpeg,.pdf" />
            </label>
          </div>
        </>
      )}

      <div>
        <button type="submit" disabled={pending}>
          {pending ? "جارٍ الإرسال…" : "إرسال طلب التحقق"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
