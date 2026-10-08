"use client";

import { useActionState, useState } from "react";
import type { CardProduct, DeliveryRegion } from "@/lib/cards-api";
import type { ActionState } from "@/lib/action";
import { money } from "@/lib/labels";
import { Feedback } from "./Feedback";

export function NewCardForm({
  products,
  regions,
  action,
}: {
  products: CardProduct[];
  regions: DeliveryRegion[];
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [productId, setProductId] = useState<number | null>(products[0]?.id ?? null);
  const selected = products.find((p) => p.id === productId);
  const physical = selected?.bankCardNature === "PHYSICAL";

  return (
    <form action={formAction} className="stack">
      <div className="grid">
        {products.map((p) => (
          <label key={p.id} className="card" style={{ cursor: "pointer", borderColor: p.id === productId ? "var(--primary)" : undefined }}>
            <div className="row">
              <input
                type="radio"
                name="productId"
                value={p.id}
                checked={p.id === productId}
                onChange={() => setProductId(p.id)}
                style={{ width: "auto" }}
              />
              <strong>{p.title || (p.bankCardNature === "PHYSICAL" ? "بطاقة فعلية" : "بطاقة افتراضية")}</strong>
            </div>
            <div className="small muted">
              <div>النوع: {p.bankCardNature === "PHYSICAL" ? "فعلية" : "افتراضية"} · {p.cardBrand ?? ""} {p.ccy}</div>
              <div>رسوم الإصدار: {money(p.applyFee, p.ccy)}</div>
              <div>رسوم الشحن: {(Number(p.rechargeFee) * 100).toFixed(2)}٪</div>
              <div>أقل شحنة: {money(p.rechargeMinLimit, p.ccy)}</div>
            </div>
          </label>
        ))}
      </div>

      {physical && (
        <div className="card stack">
          <h2>عنوان الشحن</h2>
          <div className="fields">
            <label>
              منطقة الشحن
              <select name="countryRegionId" required defaultValue="">
                <option value="" disabled>
                  اختر…
                </option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.countryRegion} — رسوم الشحن {r.price}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الدولة
              <input name="country" required />
            </label>
            <label>
              المدينة
              <input name="city" required />
            </label>
            <label>
              اسم المستلم
              <input name="receiverName" required />
            </label>
            <label>
              هاتف المستلم
              <input name="receiverMobile" required inputMode="tel" className="ltr" />
            </label>
            <label>
              الرمز البريدي
              <input name="postCode" required className="ltr" />
            </label>
          </div>
          <label>
            العنوان التفصيلي
            <input name="receiverAddress" required />
          </label>
        </div>
      )}

      <div>
        <button type="submit" disabled={pending || !productId}>
          {pending ? "جارٍ الإصدار…" : "إصدار البطاقة"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
