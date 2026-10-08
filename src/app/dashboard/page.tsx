import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { safe } from "@/lib/safe";
import { CARD_STATUS, KYC_STATUS, maskPan } from "@/lib/labels";
import { ActionForm } from "@/components/ActionForm";
import { retryLink } from "../actions/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();

  if (!user.uid) {
    return (
      <div className="card stack" style={{ maxWidth: 560 }}>
        <h1>أهلاً بك</h1>
        <div className="alert warn">لم يكتمل ربط حسابك بمزوّد البطاقات بعد.</div>
        <ActionForm action={retryLink} submit="إعادة المحاولة" />
      </div>
    );
  }

  const [[kyc, kycErr], [cards, cardsErr]] = await Promise.all([
    safe(api.kycStatus(user.uid)),
    safe(api.userCards(user.uid)),
  ]);
  const verified = kyc?.status === "success";

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>بطاقاتي</h1>
          <p className="muted small ltr" style={{ textAlign: "right" }}>
            {user.email}
          </p>
        </div>
        {verified && (
          <Link href="/cards/new" className="btn">
            + إصدار بطاقة جديدة
          </Link>
        )}
      </div>

      <div className="card row between">
        <div>
          <strong>التحقق من الهوية: </strong>
          {kycErr ? (
            <span className="muted">{kycErr}</span>
          ) : (
            <span className={`badge ${verified ? "ok" : kyc?.status === "fail" ? "bad" : "warn"}`}>
              {KYC_STATUS[kyc!.status] ?? kyc!.status}
            </span>
          )}
          {kyc?.failedReason && <p className="small muted">السبب: {kyc.failedReason}</p>}
        </div>
        {!verified && (
          <Link href="/kyc" className="btn secondary">
            {kyc?.status === "uncommitted" || kyc?.status === "fail" ? "ابدأ التحقق" : "عرض الحالة"}
          </Link>
        )}
      </div>

      {cardsErr && <div className="alert error">{cardsErr}</div>}
      {cards && cards.length === 0 && (
        <div className="card muted">
          لا توجد بطاقات بعد. {verified ? "أصدر بطاقتك الأولى." : "أكمل التحقق من الهوية لإصدار بطاقة."}
        </div>
      )}
      {cards && cards.length > 0 && (
        <div className="grid">
          {cards.map((c) => (
            <Link key={String(c.userBankcardId)} href={`/cards/${c.userBankcardId}`} style={{ textDecoration: "none" }}>
              <div className={`plastic ${c.cardType === "PHYSICAL" ? "physical" : ""}`}>
                <div className="row between">
                  <span>{c.cardType === "PHYSICAL" ? "بطاقة فعلية" : "بطاقة افتراضية"}</span>
                  <span className="badge" style={{ color: "#fff", background: "rgb(255 255 255 / 15%)" }}>
                    {CARD_STATUS[c.status] ?? c.status}
                  </span>
                </div>
                <div className="pan">{c.cardNumber ? maskPan(c.cardNumber) : "••••"}</div>
                <div className="small">{c.currency}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
