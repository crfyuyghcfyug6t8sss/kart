"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCardUser } from "@/lib/auth";
import { api } from "@/lib/cards-api";
import { db } from "@/lib/db";
import { ownedCard } from "@/lib/cards";
import { amount, attempt, str, UserError, type ActionState } from "@/lib/action";
import { ORDER_STATUS } from "@/lib/labels";

export async function applyCard(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireCardUser();
  let cardId = "";
  const state = await attempt(async () => {
    const productId = Number(str(form, "productId"));
    const product = (await api.products()).find((p) => p.id === productId);
    if (!product) throw new UserError("اختر نوع البطاقة");

    let deliveryAddressId: number | undefined;
    if (product.bankCardNature === "PHYSICAL") {
      const fields = ["countryRegionId", "country", "city", "receiverName", "receiverMobile", "receiverAddress", "postCode"];
      if (fields.some((f) => !str(form, f))) throw new UserError("أكمل جميع بيانات عنوان الشحن");
      deliveryAddressId = (
        await api.addAddress(user.uid, {
          countryRegionId: Number(str(form, "countryRegionId")),
          country: str(form, "country"),
          city: str(form, "city"),
          receiverName: str(form, "receiverName"),
          receiverMobile: str(form, "receiverMobile"),
          receiverAddress: str(form, "receiverAddress"),
          postCode: str(form, "postCode"),
        })
      ).id;
    }

    const res = await api.applyCard(user.uid, productId, deliveryAddressId);
    cardId = String(res.userBankcardId);
    db()
      .prepare(
        "INSERT OR REPLACE INTO cards (user_bankcard_id, user_id, product_id, order_no, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(cardId, user.id, productId, res.orderNo ?? null, Date.now());
  });
  if (state?.error) return state;
  redirect(`/cards/${cardId}`);
}

type CardUser = Awaited<ReturnType<typeof requireCardUser>>;
type CardAction = (user: CardUser, cardId: number, form: FormData) => Promise<ActionState | void>;

/** Wraps a per-card action with auth + ownership check + revalidation. */
function cardAction(fn: CardAction) {
  return async (cardId: string, _: ActionState, form: FormData): Promise<ActionState> => {
    const user = await requireCardUser();
    const state = await attempt(async () => {
      await ownedCard(user.uid, cardId);
      return fn(user, Number(cardId), form);
    });
    revalidatePath(`/cards/${cardId}`);
    return state;
  };
}

function recordOrder(userId: number, cardId: number, type: "RECHARGE" | "WITHDRAW", value: number): string {
  const id = `${type === "RECHARGE" ? "R" : "W"}${Date.now()}${crypto.randomInt(1000, 9999)}`;
  db()
    .prepare(
      "INSERT INTO balance_orders (request_order_id, user_id, user_bankcard_id, type, amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?)",
    )
    .run(id, userId, String(cardId), type, value.toFixed(2), Date.now());
  return id;
}

export const topUp = cardAction(async (user, id, form) => {
  const value = amount(form);
  await api.topUp(user.uid, id, value, recordOrder(user.id, id, "RECHARGE", value));
  return { ok: "تم إرسال طلب الشحن، سيظهر الرصيد بعد اكتمال المعالجة." };
});

export const withdraw = cardAction(async (user, id, form) => {
  const value = amount(form);
  await api.withdraw(user.uid, id, value, recordOrder(user.id, id, "WITHDRAW", value));
  return { ok: "تم إرسال طلب السحب." };
});

export const refreshOrder = cardAction(async ({ uid, id: userId }, id, form) => {
  const order = db()
    .prepare("SELECT type FROM balance_orders WHERE request_order_id = ? AND user_id = ? AND user_bankcard_id = ?")
    .get(str(form, "orderId"), userId, String(id)) as { type: "RECHARGE" | "WITHDRAW" } | undefined;
  if (!order) throw new UserError("الطلب غير موجود");
  const orderId = str(form, "orderId");
  const r = await api.balanceOrder(uid, order.type, orderId);
  db().prepare("UPDATE balance_orders SET status = ? WHERE request_order_id = ?").run(r.status, orderId);
  return { ok: `حالة الطلب: ${ORDER_STATUS[r.status] ?? r.status}` };
});

export const setFrozen = cardAction(async ({ uid }, id, form) => {
  const freeze = str(form, "freeze") === "1";
  await api.setEnabled(uid, id, !freeze);
  return { ok: freeze ? "تم تجميد البطاقة" : "تم إلغاء تجميد البطاقة" };
});

export const closeCard = cardAction(async ({ uid }, id) => {
  await api.close(uid, id);
  return { ok: "تم إرسال طلب إلغاء البطاقة" };
});

export const revealCard = cardAction(async ({ uid }, id) => {
  const info = await api.info(uid, id);
  // Card data is passed straight to the owner's browser and never stored.
  const data: Record<string, string> =
    Number(info.infoType) === 0
      ? { url: info.cardPanUrl ?? "" }
      : { cardNumber: info.cardNumber ?? "", cvv: info.cvv ?? "", expireDate: info.expireDate ?? "" };
  return { ok: "", data };
});

export const activateCard = cardAction(async ({ uid }, id, form) => {
  const cardNo = str(form, "cardNo");
  const verifyCode = str(form, "verifyCode");
  if (!cardNo && !verifyCode) throw new UserError("أدخل رقم البطاقة أو رمز التفعيل");
  const { canActive } = await api.canActivate(uid, cardNo, verifyCode);
  if (!canActive) throw new UserError("لا يمكن تفعيل هذه البطاقة حالياً، تأكد من البيانات");
  const card = await ownedCard(uid, id);
  const required = ["mobilePrefix", "mobile", "countryCode", "address", "city", "state", "postCode"];
  if (required.some((f) => !str(form, f))) throw new UserError("أكمل جميع بيانات عنوان الفوترة");
  await api.activate(uid, {
    cardNo,
    verifyCode,
    mobilePrefix: str(form, "mobilePrefix"),
    mobile: str(form, "mobile"),
    countryCode: str(form, "countryCode"),
    address: str(form, "address"),
    address2: str(form, "address2"),
    city: str(form, "city"),
    state: str(form, "state"),
    postCode: str(form, "postCode"),
    productId: Number(card.productId),
  });
  return { ok: "تم تفعيل البطاقة. لا تنسَ تعيين الرقم السري (PIN)." };
});

export const setPin = cardAction(async ({ uid }, id, form) => {
  const pin = str(form, "pin");
  if (!/^\d{4,6}$/.test(pin)) throw new UserError("الرقم السري من 4 إلى 6 أرقام");
  if (pin !== str(form, "pin2")) throw new UserError("الرقمان غير متطابقين");
  await api.setPin(uid, id, pin);
  return { ok: "تم تعيين الرقم السري" };
});

export const showPin = cardAction(async ({ uid }, id) => {
  return { ok: "", data: { pin: await api.queryPin(uid, id) } };
});

export const setNoPinLimit = cardAction(async ({ uid }, id, form) => {
  await api.setNoPinLimit(uid, id, amount(form, "limit"));
  return { ok: "تم تحديث حد الدفع بدون رقم سري" };
});

export const answer3ds = cardAction(async ({ uid }, id, form) => {
  const eventId = str(form, "eventId");
  const approve = str(form, "decision") === "approve";
  const row = db()
    .prepare("SELECT auth_id FROM three_ds WHERE event_id = ? AND user_bankcard_id = ? AND status = 'pending'")
    .get(eventId, String(id)) as { auth_id: string | null } | undefined;
  if (!row?.auth_id) throw new UserError("طلب التحقق غير موجود أو تمت معالجته");
  await (approve ? api.approve3ds(uid, row.auth_id) : api.reject3ds(uid, row.auth_id));
  db()
    .prepare("UPDATE three_ds SET status = ? WHERE event_id = ?")
    .run(approve ? "approved" : "rejected", eventId);
  return { ok: approve ? "تمت الموافقة على العملية" : "تم رفض العملية" };
});

