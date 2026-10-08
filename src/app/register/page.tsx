import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { register } from "../actions/auth";

export default async function RegisterPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>إنشاء حساب</h1>
      <p className="muted small">سيُستخدم بريدك أيضاً لتسجيلك لدى مزوّد البطاقات.</p>
      <AuthForm action={register} submit="إنشاء الحساب" newPassword />
      <p className="small muted">
        لديك حساب؟ <Link href="/login">سجّل الدخول</Link>
      </p>
    </div>
  );
}
