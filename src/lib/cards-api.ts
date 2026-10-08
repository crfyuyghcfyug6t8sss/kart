import "server-only";
import { aesDecrypt, aesEncrypt, randomNonce, rsaSign, signaturePayload } from "./signing";

// Server-side client for the card issuing API. Every call is a signed POST.

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export class CardsApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown>;

function signedHeaders(uid: string | number | undefined, body: Body) {
  const headers = {
    appId: env("CARDS_APP_ID"),
    nonce: randomNonce(),
    timestamp: String(Date.now()),
    uid: uid === undefined ? "" : String(uid),
    version: "v2",
  };
  const sign = rsaSign(signaturePayload(headers, body), env("CARDS_RSA_PRIVATE_KEY"));
  const out: Record<string, string> = { ...headers, sign };
  if (!out.uid) delete out.uid;
  return out;
}

function url(path: string): string {
  return new URL(path.replace(/^\//, ""), env("CARDS_API_BASE_URL").replace(/\/?$/, "/")).toString();
}

// The docs only show the `data` part of responses; the error-code table implies
// a {code, msg, data} envelope, so unwrap it when present.
async function parse<T>(res: Response, path: string): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new CardsApiError(res.status, `Invalid response from ${path} (HTTP ${res.status})`);
  }
  if (json && typeof json === "object" && "code" in json) {
    const env = json as { code: number | string; msg?: string; message?: string; data?: unknown };
    if (Number(env.code) !== 0) {
      throw new CardsApiError(Number(env.code), env.msg ?? env.message ?? "Request failed");
    }
    return env.data as T;
  }
  if (!res.ok) throw new CardsApiError(res.status, `HTTP ${res.status} from ${path}`);
  return json as T;
}

export async function call<T = unknown>(path: string, body: Body = {}, uid?: string | number): Promise<T> {
  // Drop empty fields so the signed body and the sent body are identical.
  const clean = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const res = await fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...signedHeaders(uid, clean) },
    body: JSON.stringify(clean),
    cache: "no-store",
  });
  return parse<T>(res, path);
}

async function upload<T>(path: string, field: string, file: File, uid: string | number): Promise<T> {
  // Multipart bodies carry no signable JSON fields, so only headers are signed.
  const form = new FormData();
  form.append(field, file, file.name);
  const res = await fetch(url(path), {
    method: "POST",
    headers: signedHeaders(uid, {}),
    body: form,
    cache: "no-store",
  });
  return parse<T>(res, path);
}

export const encryptPin = (pin: string) => aesEncrypt(pin, env("CARDS_API_AES_KEY"));
export const decryptPin = (pin: string) => aesDecrypt(pin, env("CARDS_API_AES_KEY"));

// ---- Types (fields as documented) ----

export type KycStatus = "uncommitted" | "waiting" | "success" | "fail" | "wait_confirm" | "wait_audit";

export interface Country {
  name: string;
  enName: string;
  value: string; // ISO alpha-3
  profValue: string; // ISO alpha-2
  code: string;
  telephoneCode: string;
  needCertificate: boolean;
}

export interface CardProduct {
  id: number;
  title?: string;
  bankCardNature: "VIRTUAL" | "PHYSICAL";
  ccy: string;
  applyFee: string | number;
  rechargeFee: string | number;
  bankcardRegion: string;
  cardBin: string;
  activeMinLimit: string | number;
  rechargeMinLimit: string | number;
  cardBrand?: string;
  cardMode?: "NORMAL" | "SHARE";
}

export interface UserCard {
  userBankcardId: number | string;
  cardType: "VIRTUAL" | "PHYSICAL";
  productId: number | string;
  cardNumber: string;
  status: number;
  currency: string;
}

export interface CardInfo {
  infoType: 0 | 1;
  cardNumber?: string;
  cvv?: string;
  expireDate?: string;
  status?: number;
  cardStatus?: number; // the docs' example uses this name instead of `status`
  cardPanUrl?: string;
}

export interface Transaction {
  id: number;
  localCurrencyAmt: number | string;
  localCurrency: string;
  recordNo: string;
  occurTime: string;
  respCodeDesc: string;
  feeAmount: number | string;
  feeCurrency: string;
  merchantName: string;
  transType: number;
  transStatus: number;
  userBankcardId: number;
  transCurrencyAmt: number | string;
  transCurrency: string;
  transactionId: string;
  originalTransactionId?: string;
  merchantCategoryCode?: string;
}

export interface DeliveryRegion {
  id: number | string;
  countryRegion: string;
  countryRegionZh: string;
  nationalCode: string;
  price: string;
}

export interface KycApplication {
  firstName: string;
  lastName: string;
  idNo: string;
  email: string;
  nationCode: string;
  certType: number;
  idUrl: string;
  idBackUrl?: string;
  birthday: string;
  countryCode: string;
  areaCode: string;
  phone: string;
  fileType?: number;
  fileUrl?: string;
  selfieUrl?: string;
}

export interface ActivationRequest {
  cardNo?: string;
  verifyCode?: string;
  mobilePrefix: string;
  mobile: string;
  countryCode: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  postCode: string;
  productId: number;
}

export interface MailingAddress {
  countryRegionId: number;
  country: string;
  city: string;
  receiverName: string;
  receiverMobile: string;
  receiverAddress: string;
  postCode: string;
}

type Uid = string | number;

// ---- Endpoints ----

export const api = {
  register: (email: string) => call<{ uid: number }>("/user/register", { email }),
  queryUser: (email: string) => call<{ uid: number }>("/user/uid", { email }),

  kycCountries: (name?: string) => call<Country[]>("/user/kyc/country/list", { name }),
  uploadFile: (uid: Uid, file: File) => upload<{ fileUrl: string }>("/upload/file", "idCard", file, uid),
  submitKyc: (uid: Uid, data: KycApplication) => call("/user/kyc/apply", { ...data }, uid),
  kycStatus: (uid: Uid) => call<{ status: KycStatus; failedReason?: string }>("/user/kyc/status", {}, uid),

  products: () => call<CardProduct[]>("/bankcard/merchant/template/list"),
  userCards: (uid: Uid) => call<UserCard[]>("/bankcard/user/card/list", {}, uid),
  applyCard: (uid: Uid, productId: number, deliveryAddressId?: number) =>
    call<{ userBankcardId: number; orderNo: string }>("/bankcard/apply", { productId, deliveryAddressId }, uid),
  canActivate: (uid: Uid, cardNo?: string, verifyCode?: string) =>
    call<{ canActive: boolean }>("/bankcard/canActive", { cardNo, verifyCode }, uid),
  activate: (uid: Uid, data: ActivationRequest) =>
    call<{ userBankcardId: number | string }>("/bankcard/active", { ...data }, uid),
  setPin: (uid: Uid, userBankcardId: number, pin: string) =>
    call("/bankcard/setPin", { userBankcardId, pin: encryptPin(pin) }, uid),
  queryPin: async (uid: Uid, userBankcardId: number) => {
    const r = await call<{ pin: string }>("/bankcard/queryPin", { userBankcardId }, uid);
    return decryptPin(r.pin);
  },
  setNoPinLimit: (uid: Uid, userBankcardId: number, noPinLimit: number) =>
    call("/bankcard/setNoPinLimit", { userBankcardId, noPinLimit }, uid),
  topUp: (uid: Uid, userBankcardId: number, amount: number, requestOrderId: string) =>
    call("/bankcard/recharge", { userBankcardId, amount, requestOrderId }, uid),
  withdraw: (uid: Uid, userBankcardId: number, amount: number, requestOrderId: string) =>
    call("/bankcard/withdraw", { userBankcardId, amount, requestOrderId }, uid),
  balanceOrder: (uid: Uid, type: "RECHARGE" | "WITHDRAW", requestOrderId: string) =>
    call<{ requestOrderId: string; status: "PENDING" | "SUCCESS" | "FAILURE" }>(
      "/bankcard/balance/change/order",
      { type, requestOrderId },
      uid,
    ),
  balance: (uid: Uid, userBankcardId: number) =>
    call<{ balance: string; currency: string; symbol: string; cardLimit?: string }>(
      "/bankcard/balance",
      { userBankcardId },
      uid,
    ),
  setEnabled: (uid: Uid, userBankcardId: number, enable: boolean) =>
    call("/bankcard/update/status", { userBankcardId, enable }, uid),
  close: (uid: Uid, userBankcardId: number) => call("/bankcard/close", { userBankcardId }, uid),
  info: (uid: Uid, userBankcardId: number) => call<CardInfo>("/bankcard/info", { userBankcardId }, uid),
  updateEmail: (uid: Uid, userBankcardId: number, email: string) =>
    call("/bankcard/update/email", { userBankcardId, email }, uid),

  transactions: (uid: Uid, userBankcardId: number, pageNum = 1, pageSize = 20) =>
    call<Transaction[] | { list?: Transaction[]; records?: Transaction[] }>(
      "/bankcard/trade/details",
      { userBankcardId, pageNum, pageSize },
      uid,
    ),
  approve3ds: (uid: Uid, authId: string) => call("/bankcard/3ds/approve", { authId }, uid),
  reject3ds: (uid: Uid, authId: string) => call("/bankcard/3ds/reject", { authId }, uid),

  deliveryRegions: (local = "en_US") => call<DeliveryRegion[]>("/delivery/region", { local }),
  addAddress: (uid: Uid, data: MailingAddress) => call<{ id: number }>("/delivery/address/add", { ...data }, uid),
  deliveryInfo: (uid: Uid, orderNo: string) =>
    call<{ deliveryStatus: "NOT_DELIVERY" | "DELIVERY"; deliveryNo?: string }>("/delivery/info", { orderNo }, uid),

  merchantBalance: () =>
    call<{ accountId: string; accountType: string; currency: string; availableAmount: string; frozenAmount: string }[]>(
      "/merchant/balance",
    ),

  simulate: {
    threeDs: (bankCardId: number, transactionAmount: number, transactionCurrency = "USD") =>
      call("/bankcard/simulate/3ds", { bankCardId, transactionAmount, transactionCurrency }),
    auth: (bankCardId: number, transactionAmount: number, billAmount: number, transactionCurrency = "USD") =>
      call("/bankcard/simulate/auth", { bankCardId, transactionAmount, transactionCurrency, billAmount }),
  },
};

export function transactionList(r: Awaited<ReturnType<typeof api.transactions>>): Transaction[] {
  if (Array.isArray(r)) return r;
  return r?.list ?? r?.records ?? [];
}
