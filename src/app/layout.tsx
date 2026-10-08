import type { Metadata } from "next";
import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/auth";
import { logout } from "./actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "كارت — بطاقات افتراضية وفعلية",
  description: "أصدر بطاقتك الافتراضية أو الفعلية واشحنها وأدرها من مكان واحد",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <header className="top">
          <div className="container">
            <Link href="/" className="brand">
              كارت
            </Link>
            <nav>
              {user ? (
                <>
                  <Link href="/dashboard">بطاقاتي</Link>
                  <Link href="/kyc">التحقق من الهوية</Link>
                  {isAdmin(user) && <Link href="/admin">الإدارة</Link>}
                  <form action={logout}>
                    <button className="link" type="submit">
                      تسجيل الخروج
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">تسجيل الدخول</Link>
                  <Link href="/register" className="btn">
                    إنشاء حساب
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  );
}
