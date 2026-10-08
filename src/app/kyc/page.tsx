import Link from "next/link";
import { requireCardUser } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { safe } from "@/lib/safe";
import { KYC_STATUS } from "@/lib/labels";
import { KycForm } from "@/components/KycForm";
import { submitKyc } from "../actions/kyc";

export const dynamic = "force-dynamic";

export default async function KycPage() {
  const user = await requireCardUser();
  const [kyc, err] = await safe(api.kycStatus(user.uid));
  if (err || !kyc) return <div className="alert error">{err}</div>;

  const canSubmit = kyc.status === "uncommitted" || kyc.status === "fail";
  if (!canSubmit) {
    return (
      <div className="card stack" style={{ maxWidth: 560 }}>
        <h1>التحقق من الهوية</h1>
        <p>
          الحالة: <span className={`badge ${kyc.status === "success" ? "ok" : "warn"}`}>{KYC_STATUS[kyc.status]}</span>
        </p>
        {kyc.status === "success" ? (
          <Link href="/cards/new" className="btn">
            أصدر بطاقتك الآن
          </Link>
        ) : (
          <p className="muted">طلبك قيد المعالجة. ستتغير الحالة تلقائياً عند انتهاء المراجعة.</p>
        )}
      </div>
    );
  }

  const [countries, cErr] = await safe(api.kycCountries());
  return (
    <div className="card stack">
      <h1>التحقق من الهوية</h1>
      {kyc.status === "fail" && (
        <div className="alert error">تم رفض الطلب السابق{kyc.failedReason ? `: ${kyc.failedReason}` : ""}. يمكنك التقديم مجدداً.</div>
      )}
      {cErr ? <div className="alert error">{cErr}</div> : <KycForm countries={countries!} action={submitKyc} />}
    </div>
  );
}
