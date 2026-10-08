import "server-only";
import { CardsApiError } from "./cards-api";
import { errorMessage } from "./labels";

export type ActionState = { ok?: string; error?: string; data?: Record<string, string> } | null;

/** Runs a server action body and turns failures into a user-facing Arabic message. */
export async function attempt(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: "تم بنجاح" };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    if (e instanceof CardsApiError) return { error: errorMessage(e.code, e.message) };
    // Let Next.js redirects/notFound propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { error: "تعذّر الاتصال بمزوّد البطاقات، حاول لاحقاً" };
  }
}

export function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function amount(form: FormData, key = "amount"): number {
  const raw = str(form, key);
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) {
    throw new UserError("أدخل مبلغاً صحيحاً (حتى خانتين عشريتين)");
  }
  return Number(raw);
}

export class UserError extends CardsApiError {
  constructor(message: string) {
    super(-1, message);
  }
}
