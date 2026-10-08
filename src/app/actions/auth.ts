"use server";

import { redirect } from "next/navigation";
import { CardsApiError, api } from "@/lib/cards-api";
import { db, type UserRow } from "@/lib/db";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { attempt, str, type ActionState } from "@/lib/action";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Registers the email with the card provider (or looks up an existing UID) and stores it. */
async function linkProvider(user: Pick<UserRow, "id" | "email">): Promise<string> {
  let uid: number;
  try {
    uid = (await api.register(user.email)).uid;
  } catch (e) {
    if (!(e instanceof CardsApiError) || e.code !== 1011) throw e;
    uid = (await api.queryUser(user.email)).uid;
  }
  db().prepare("UPDATE users SET uid = ? WHERE id = ?").run(String(uid), user.id);
  return String(uid);
}

export async function register(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: "أدخل بريداً إلكترونياً صحيحاً" };
  if (password.length < 8) return { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };
  if (db().prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "هذا البريد مسجّل مسبقاً، سجّل الدخول بدلاً من ذلك" };
  }
  const result = db()
    .prepare("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)")
    .run(email, hashPassword(password), Date.now());
  const id = Number(result.lastInsertRowid);
  await createSession(id);
  // A provider outage shouldn't block sign-up; the dashboard offers a retry.
  await attempt(() => linkProvider({ id, email }).then(() => undefined));
  redirect("/dashboard");
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = db().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "البريد أو كلمة المرور غير صحيحة" };
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function retryLink(_: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const state = await attempt(async () => {
    await linkProvider(user);
  });
  if (state?.error) return state;
  redirect("/dashboard");
}
