import { redirect } from "next/navigation";
import { requireCardUser } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { safe } from "@/lib/safe";
import { NewCardForm } from "@/components/NewCardForm";
import { applyCard } from "../../actions/cards";

export const dynamic = "force-dynamic";

export default async function NewCardPage() {
  const user = await requireCardUser();
  const [kyc] = await safe(api.kycStatus(user.uid));
  if (kyc && kyc.status !== "success") redirect("/kyc");

  const [[products, pErr], [regions]] = await Promise.all([safe(api.products()), safe(api.deliveryRegions("en_US"))]);
  return (
    <div className="stack">
      <h1>إصدار بطاقة جديدة</h1>
      {pErr ? (
        <div className="alert error">{pErr}</div>
      ) : products!.length === 0 ? (
        <div className="card muted">لا توجد بطاقات متاحة حالياً.</div>
      ) : (
        <NewCardForm products={products!} regions={regions ?? []} action={applyCard} />
      )}
    </div>
  );
}
