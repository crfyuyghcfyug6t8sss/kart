"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser, isAdmin } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { amount, attempt, str, UserError, type ActionState } from "@/lib/action";

async function requireAdmin() {
  if (!isAdmin(await currentUser())) notFound();
}

export async function simulate(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  return attempt(async () => {
    const cardId = Number(str(form, "cardId"));
    if (!cardId) throw new UserError("أدخل رقم البطاقة (userBankcardId)");
    const value = amount(form);
    const ccy = str(form, "currency") || "USD";
    if (str(form, "kind") === "3ds") await api.simulate.threeDs(cardId, value, ccy);
    else await api.simulate.auth(cardId, value, value, ccy);
    revalidatePath("/admin");
    return { ok: "تم إرسال المحاكاة، راقب سجل الإشعارات." };
  });
}
