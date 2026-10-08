import Link from "next/link";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  const user = await currentUser();
  return (
    <div className="stack">
      <section className="hero">
        <h1>بطاقتك الرقمية جاهزة خلال دقائق</h1>
        <p className="muted">
          سجّل، تحقّق من هويتك، واحصل على بطاقة افتراضية للشراء عبر الإنترنت أو بطاقة فعلية تصلك إلى باب بيتك.
        </p>
        <div className="row">
          <Link href={user ? "/dashboard" : "/register"} className="btn">
            {user ? "اذهب إلى بطاقاتي" : "ابدأ الآن"}
          </Link>
        </div>
      </section>
      <div className="grid">
        <div className="card">
          <h2>١. أنشئ حسابك</h2>
          <p className="muted">ببريدك الإلكتروني وكلمة مرور.</p>
        </div>
        <div className="card">
          <h2>٢. تحقّق من هويتك</h2>
          <p className="muted">ارفع صورة الهوية أو جواز السفر وأكمل بياناتك.</p>
        </div>
        <div className="card">
          <h2>٣. أصدر بطاقتك</h2>
          <p className="muted">اختر بطاقة افتراضية أو فعلية، اشحنها وابدأ الاستخدام.</p>
        </div>
      </div>
    </div>
  );
}
