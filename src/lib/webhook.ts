import "server-only";
import { db } from "./db";

type Event = Record<string, unknown>;

/**
 * Parses JSON keeping numbers as their original text, so the signature is
 * computed over exactly what the provider signed (e.g. "10.50", not 10.5).
 */
export function parseRaw(text: string): Event {
  return JSON.parse(text, (_k, v, ctx?: { source?: string }) =>
    typeof v === "number" && ctx?.source ? ctx.source : v,
  ) as Event;
}

const s = (v: unknown) => (v === undefined || v === null ? null : String(v));

/** Stores the event once (webhooks are retried) and applies its side effects. Returns false for duplicates. */
export function handleEvent(e: Event): boolean {
  const eventId = s(e.eventId);
  const type = s(e.eventType) ?? "unknown";
  if (!eventId) return true;

  const inserted = db()
    .prepare(
      "INSERT OR IGNORE INTO webhook_events (event_id, event_type, user_bankcard_id, payload, received_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(eventId, type, s(e.userBankcardId), JSON.stringify(e), Date.now());
  if (inserted.changes === 0) return false;

  switch (type) {
    case "3ds":
      db()
        .prepare(
          `INSERT OR IGNORE INTO three_ds
           (event_id, user_bankcard_id, verification_type, otp, auth_id, amount, currency, merchant_name, scene, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          eventId,
          s(e.userBankcardId) ?? "",
          (s(e.verificationType) ?? "").toLowerCase(),
          s(e.otp),
          s(e.authId),
          s(e.transactionAmount),
          s(e.transactionCurrency),
          s(e.merchantName),
          s(e.scene),
          "pending",
          Date.now(),
        );
      break;
    case "cardRechargeResult":
    case "cardWithdrawResult": {
      const status = s(e.status);
      if (status === "SUCCESS" || status === "FAILURE") {
        db().prepare("UPDATE balance_orders SET status = ? WHERE request_order_id = ?").run(status, s(e.orderId));
      }
      break;
    }
  }
  return true;
}
