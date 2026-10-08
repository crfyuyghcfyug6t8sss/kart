import { notFound } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { db } from "@/lib/db";
import { safe } from "@/lib/safe";
import { money } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { simulate } from "../actions/admin";

export const dynamic = "force-dynamic";

interface EventRow {
  event_id: string;
  event_type: string;
  user_bankcard_id: string | null;
  payload: string;
  received_at: number;
}

export default async function AdminPage() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();

  const [[accounts, accErr], [products, pErr]] = await Promise.all([safe(api.merchantBalance()), safe(api.products())]);
  const users = db().prepare("SELECT COUNT(*) AS n, COUNT(uid) AS linked FROM users").get() as { n: number; linked: number };
  const events = db()
    .prepare("SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT 30")
    .all() as unknown as EventRow[];

  return (
    <div className="stack">
      <h1>الإدارة</h1>
      <div className="grid">
        <div className="card">
          <h2>أرصدة التاجر</h2>
          {accErr ? (
            <div className="alert error">{accErr}</div>
          ) : (
            <table>
              <tbody>
                {accounts!.map((a) => (
                  <tr key={`${a.accountId}-${a.currency}`}>
                    <td>{a.accountType === "MAIN" ? "رئيسي" : "فرعي"} · {a.currency}</td>
                    <td className="ltr">{money(a.availableAmount)}</td>
                    <td className="small muted">مجمّد: {money(a.frozenAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2>المستخدمون</h2>
          <p>
            {users.n} مستخدم · {users.linked} مرتبط بمزوّد البطاقات
          </p>
        </div>
        <div className="card">
          <h2>المنتجات المتاحة</h2>
          {pErr ? (
            <div className="alert error">{pErr}</div>
          ) : (
            <ul className="small">
              {products!.map((p) => (
                <li key={p.id}>
                  {p.id} — {p.title ?? p.bankCardNature} ({p.bankCardNature}, BIN {p.cardBin})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card">
        <h2>محاكاة عملية (بيئة الاختبار فقط)</h2>
        <ActionForm action={simulate} submit="تشغيل المحاكاة">
          <div className="fields">
            <label>
              النوع
              <select name="kind">
                <option value="auth">عملية شراء</option>
                <option value="3ds">تحقق 3DS</option>
              </select>
            </label>
            <label>
              رقم البطاقة (userBankcardId)
              <input name="cardId" required inputMode="numeric" className="ltr" />
            </label>
            <label>
              المبلغ
              <input name="amount" required inputMode="decimal" className="ltr" />
            </label>
            <label>
              العملة
              <input name="currency" defaultValue="USD" className="ltr" />
            </label>
          </div>
        </ActionForm>
      </div>

      <div className="card">
        <h2>آخر الإشعارات (Webhooks)</h2>
        {events.length === 0 ? (
          <p className="muted">لم يصل أي إشعار بعد. تأكد من ضبط رابط الإشعارات في لوحة التاجر.</p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {events.map((e) => (
              <details key={e.event_id}>
                <summary>
                  <span className="ltr">{e.event_type}</span> · {new Date(e.received_at).toLocaleString("ar")}
                  {e.user_bankcard_id && <span className="muted small"> · بطاقة {e.user_bankcard_id}</span>}
                </summary>
                <pre className="ltr small" style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
                  {JSON.stringify(JSON.parse(e.payload), null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
