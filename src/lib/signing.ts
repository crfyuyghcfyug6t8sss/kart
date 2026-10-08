import crypto from "node:crypto";

// Pure crypto helpers for the cards API. Kept free of app imports so they can
// be unit-tested directly against the examples in the provider's docs.

type Fields = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "";
}

// Nested objects are rendered as {k1:v1,k2:v2} with keys sorted by ASCII.
function renderValue(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Fields;
    return (
      "{" +
      Object.keys(obj)
        .sort()
        .map((k) => `${k}:${String(obj[k])}`)
        .join(",") +
      "}"
    );
  }
  if (Array.isArray(v)) return JSON.stringify(v);
  return String(v);
}

/**
 * key1=value1&key2=value2 with keys sorted by ASCII, `sign` and empty values
 * skipped, and every double quote stripped (matches the reference Java code).
 */
export function sortedString(fields: Fields, { keepEmpty = false } = {}): string {
  return Object.keys(fields)
    .filter((k) => k !== "sign" && (keepEmpty || !isEmpty(fields[k])))
    .sort()
    .map((k) => `${k}=${isEmpty(fields[k]) ? "" : renderValue(fields[k])}`)
    .join("&")
    .replaceAll('"', "");
}

/**
 * Signature v2 payload: sorted headers (uid kept even when empty) immediately
 * followed by the sorted body - the docs' example has no "&" between the two.
 */
export function signaturePayload(headers: Fields, body: Fields): string {
  return sortedString(headers, { keepEmpty: true }) + sortedString(body);
}

export function rsaSign(data: string, privateKeyBase64: string): string {
  const key = crypto.createPrivateKey({
    key: Buffer.from(privateKeyBase64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return crypto.sign("sha1", Buffer.from(data, "utf8"), key).toString("base64");
}

/** AES-256-CBC, random IV prepended to the ciphertext, Base64 output. */
export function aesEncrypt(plaintext: string, keyBase64: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(keyBase64, "base64"), iv);
  return Buffer.concat([iv, cipher.update(plaintext, "utf8"), cipher.final()]).toString("base64");
}

export function aesDecrypt(encryptedBase64: string, keyBase64: string): string {
  const combined = Buffer.from(encryptedBase64, "base64");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(keyBase64, "base64"),
    combined.subarray(0, 16),
  );
  return Buffer.concat([decipher.update(combined.subarray(16)), decipher.final()]).toString("utf8");
}

/**
 * Webhook signature: HMAC-SHA256 over the sorted body. The key is used as its
 * UTF-8 text, NOT Base64-decoded (verified against the docs' example).
 */
export function webhookSignature(body: Fields, key: string): string {
  return crypto.createHmac("sha256", Buffer.from(key, "utf8")).update(sortedString(body)).digest("base64");
}

export function verifyWebhook(body: Fields, sign: string, key: string): boolean {
  const expected = Buffer.from(webhookSignature(body, key));
  const given = Buffer.from(sign);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function randomNonce(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
