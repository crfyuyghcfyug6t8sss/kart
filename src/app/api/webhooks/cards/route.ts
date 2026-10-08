import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/signing";
import { handleEvent, parseRaw } from "@/lib/webhook";

export const dynamic = "force-dynamic";

// The provider expects {"code":0} for success; anything else is retried
// (1, 2, 4, 8, 15, 30, 60 minutes).
const reply = (code: number, msg: string, status = 200) => NextResponse.json({ code, msg }, { status });

export async function POST(req: Request) {
  const key = process.env.CARDS_WEBHOOK_KEY;
  if (!key) return reply(1000, "webhook key not configured", 500);

  const text = await req.text();
  let body: Record<string, unknown>;
  try {
    body = parseRaw(text);
  } catch {
    return reply(1000, "invalid json", 400);
  }

  const sign = req.headers.get("sign") ?? "";
  if (!sign || !verifyWebhook(body, sign, key)) {
    console.warn("Rejected webhook with invalid signature", body.eventType, body.eventId);
    return reply(1000, "invalid signature", 401);
  }

  handleEvent(body);
  return reply(0, "Received successfully");
}
