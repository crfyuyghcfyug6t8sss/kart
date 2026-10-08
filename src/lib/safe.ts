import "server-only";
import { CardsApiError } from "./cards-api";
import { errorMessage } from "./labels";

/** For page loads: returns [data, null] or [null, message] instead of throwing. */
export async function safe<T>(p: Promise<T>): Promise<[T, null] | [null, string]> {
  try {
    return [await p, null];
  } catch (e) {
    if (e instanceof CardsApiError) return [null, errorMessage(e.code, e.message)];
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return [null, "تعذّر الاتصال بمزوّد البطاقات"];
  }
}
