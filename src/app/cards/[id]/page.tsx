import Link from "next/link";
import { requireCardUser } from "@/lib/auth";
import { api, transactionList } from "@/lib/cards-api";
import { ownedCard, localCard } from "@/lib/cards";
import { db, type ThreeDsRow } from "@/lib/db";
import { safe } from "@/lib/safe";
import { CARD_STATUS, ORDER_STATUS, TRANS_STATUS, TRANS_TYPE, maskPan, money } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { Reveal } from "@/components/Reveal";
import {
  activateCard,
  answer3ds,
  closeCard,
  refreshOrder,
  revealCard,
  setFrozen,
  setNoPinLimit,
  setPin,
  showPin,
  topUp,
  withdraw,
} from "../../actions/cards";

export const dynamic = "force-dynamic";

interface OrderRow {
  request_order_id: string;
  type: string;
  amount: string;
  status: string;
  created_at: number;
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCardUser();
  const card = await ownedCard(user.uid, id);
  const cardId = Number(id);
  const physical = card.cardType === "PHYSICAL";
  const local = localCard(id);

  const [[balance, balErr], [txs, txErr], [delivery]] = await Promise.all([
    safe(api.balance(user.uid, cardId)),
    safe(api.transactions(user.uid, cardId)),
    physical && local?.order_no ? safe(api.deliveryInfo(user.uid, local.order_no)) : Promise.resolve([null, null] as const),
  ]);

  const pending3ds = db()
    .prepare("SELECT * FROM three_ds WHERE user_bankcard_id = ? AND status = 'pending' ORDER BY created_at DESC")
    .all(id) as unknown as ThreeDsRow[];
  const orders = db()
    .prepare("SELECT * FROM balance_orders WHERE user_bankcard_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10")
    .all(id, user.id) as unknown as OrderRow[];

  const active = card.status === 3;
  const frozen = card.status === 4;
  const closed = card.status === 7 || card.status === 6;
  const awaitingActivation = physical && (card.status === 0 || card.status === 1);

  return (
    <div className="stack">
      <Link href="/dashboard" className="small">
        → العودة إلى بطاقاتي
      </Link>

      <div className="grid">
        <div className={`plastic ${physical ? "physical" : ""}`}>
          <div className="row between">
            <span>{physical ? "بطاقة فعلية" : "بطاقة افتراضية"}</span>
            <span>{CARD_STATUS[card.status] ?? card.status}</span>
          </div>
          <div className="pan">{card.cardNumber ? maskPan(card.cardNumber) : "••••"}</div>
          <div className="row between">
            <span className="small">الرصيد</span>
            <strong className="ltr">{balErr ? "—" : money(balance!.balance, balance!.currency)}</strong>
          </div>
        </div>

        <div className="card stack">
          <h2>بيانات البطاقة</h2>
          <p className="small muted">تُعرض البيانات لك فقط ولا تُحفظ على خوادمنا.</p>
          <Reveal
            action={revealCard.bind(null, id)}
            label="إظهار رقم البطاقة و CVV"
            fields={{ cardNumber: "رقم البطاقة", expireDate: "تاريخ الانتهاء", cvv: "CVV" }}
          />
          {balance?.cardLimit && <p className="small muted">حد البطاقة: {money(balance.cardLimit, balance.currency)}</p>}
        </div>
      </div>

      {pending3ds.length > 0 && (
        <div className="card stack">
          <h2>طلبات تحقق بانتظارك (3DS)</h2>
          {pending3ds.map((r) => (
            <div key={r.event_id} className="stack" style={{ gap: 8 }}>
              <div>
                {r.merchant_name} — <strong className="ltr">{money(r.amount, r.currency ?? "")}</strong>
              </div>
              {r.verification_type === "otp" ? (
                <div className="alert warn">
                  رمز التحقق: <strong className="ltr">{r.otp}</strong> — أدخله في صفحة الدفع.
                </div>
              ) : (
                <div className="row">
                  <ActionForm action={answer3ds.bind(null, id)} submit="موافقة" className="row">
                    <input type="hidden" name="eventId" value={r.event_id} />
                    <input type="hidden" name="decision" value="approve" />
                  </ActionForm>
                  <ActionForm action={answer3ds.bind(null, id)} submit="رفض" variant="danger" className="row">
                    <input type="hidden" name="eventId" value={r.event_id} />
                    <input type="hidden" name="decision" value="reject" />
                  </ActionForm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {awaitingActivation && (
        <div className="card stack">
          <h2>تفعيل البطاقة</h2>
          {delivery && (
            <p className="small">
              حالة الشحن: {delivery.deliveryStatus === "DELIVERY" ? "تم الإرسال" : "بانتظار الإرسال"}
              {delivery.deliveryNo && <> — رقم التتبع: <span className="ltr">{delivery.deliveryNo}</span></>}
            </p>
          )}
          <p className="muted small">عند استلام البطاقة أدخل رقمها أو رمز التفعيل المرفق، مع عنوان الفوترة.</p>
          <ActionForm action={activateCard.bind(null, id)} submit="تفعيل">
            <div className="fields">
              <label>رقم البطاقة<input name="cardNo" inputMode="numeric" className="ltr" /></label>
              <label>أو رمز التفعيل<input name="verifyCode" className="ltr" /></label>
              <label>رمز الدولة للهاتف<input name="mobilePrefix" required inputMode="numeric" className="ltr" /></label>
              <label>رقم الهاتف<input name="mobile" required inputMode="tel" className="ltr" /></label>
              <label>رمز الدولة (ISO-3 مثل SAU)<input name="countryCode" required maxLength={3} className="ltr" /></label>
              <label>المنطقة / الولاية<input name="state" required /></label>
              <label>المدينة<input name="city" required /></label>
              <label>الرمز البريدي<input name="postCode" required className="ltr" /></label>
            </div>
            <label>العنوان<input name="address" required /></label>
            <label>العنوان 2 (اختياري)<input name="address2" /></label>
          </ActionForm>
        </div>
      )}

      {!closed && (
        <div className="grid">
          <div className="card">
            <h2>شحن الرصيد</h2>
            <ActionForm action={topUp.bind(null, id)} submit="شحن">
              <label>
                المبلغ ({card.currency})
                <input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" className="ltr" />
              </label>
            </ActionForm>
          </div>
          <div className="card">
            <h2>سحب الرصيد</h2>
            <p className="small muted">يُحوَّل المبلغ من البطاقة إلى محفظة الحساب.</p>
            <ActionForm action={withdraw.bind(null, id)} submit="سحب" variant="secondary">
              <label>
                المبلغ ({card.currency})
                <input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" className="ltr" />
              </label>
            </ActionForm>
          </div>
          <div className="card stack">
            <h2>التحكم</h2>
            {(active || frozen) && (
              <ActionForm action={setFrozen.bind(null, id)} submit={frozen ? "إلغاء التجميد" : "تجميد البطاقة"} variant="secondary">
                <input type="hidden" name="freeze" value={frozen ? "0" : "1"} />
              </ActionForm>
            )}
            <ActionForm
              action={closeCard.bind(null, id)}
              submit="إلغاء البطاقة نهائياً"
              variant="danger"
              confirm="هل أنت متأكد؟ لا يمكن التراجع عن إلغاء البطاقة."
            />
          </div>
          {physical && active && (
            <div className="card stack">
              <h2>الرقم السري (PIN)</h2>
              <ActionForm action={setPin.bind(null, id)} submit="تعيين الرقم السري">
                <div className="fields">
                  <label>الرقم السري<input name="pin" type="password" required inputMode="numeric" pattern="\d{4,6}" className="ltr" /></label>
                  <label>تأكيده<input name="pin2" type="password" required inputMode="numeric" pattern="\d{4,6}" className="ltr" /></label>
                </div>
              </ActionForm>
              <Reveal action={showPin.bind(null, id)} label="إظهار الرقم السري" fields={{ pin: "الرقم السري" }} />
              <hr />
              <ActionForm action={setNoPinLimit.bind(null, id)} submit="حفظ">
                <label>
                  حد الدفع بدون رقم سري
                  <input name="limit" required inputMode="decimal" className="ltr" />
                </label>
              </ActionForm>
            </div>
          )}
        </div>
      )}

      {orders.length > 0 && (
        <div className="card">
          <h2>طلبات الشحن والسحب</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>النوع</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th><th></th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.request_order_id}>
                    <td>{o.type === "RECHARGE" ? "شحن" : "سحب"}</td>
                    <td className="ltr">{money(o.amount)}</td>
                    <td>{ORDER_STATUS[o.status] ?? o.status}</td>
                    <td className="small">{new Date(o.created_at).toLocaleString("ar")}</td>
                    <td>
                      {o.status === "PENDING" && (
                        <ActionForm action={refreshOrder.bind(null, id)} submit="تحديث" variant="secondary" className="row">
                          <input type="hidden" name="orderId" value={o.request_order_id} />
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h2>العمليات</h2>
        {txErr ? (
          <div className="alert error">{txErr}</div>
        ) : transactionList(txs!).length === 0 ? (
          <p className="muted">لا توجد عمليات بعد.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>التاريخ</th><th>التاجر</th><th>النوع</th><th>المبلغ</th><th>الرسوم</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {transactionList(txs!).map((t) => (
                  <tr key={t.id}>
                    <td className="small ltr">{t.occurTime}</td>
                    <td>{t.merchantName}</td>
                    <td>{TRANS_TYPE[t.transType] ?? t.transType}</td>
                    <td className="ltr">{money(t.localCurrencyAmt, t.localCurrency)}</td>
                    <td className="ltr">{money(t.feeAmount, t.feeCurrency)}</td>
                    <td>{TRANS_STATUS[t.transStatus] ?? t.transStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
