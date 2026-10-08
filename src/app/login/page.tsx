import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { login } from "../actions/auth";

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1>تسجيل الدخول</h1>
      <AuthForm action={login} submit="دخول" />
      <p className="small muted">
        ليس لديك حساب؟ <Link href="/register">أنشئ حساباً</Link>
      </p>
    </div>
  );
}
