// Vectors below are the published examples from the provider's
// "Signature Description v2" and "Webhook Overview" docs (public test key).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signaturePayload,
  rsaSign,
  aesDecrypt,
  aesEncrypt,
  verifyWebhook,
} from "../src/lib/signing.ts";

const DOCS_TEST_KEY = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCROf/gagyT3VVEhjelieoqvsEe4QW6KIE+hxXpIGCXYtO2w38rk5ht0VYWLX4dtmFf3vhkzIr2BzRe5cTetKbfPyfLSPhuyxnaSmJC0CVhvQpYsQWnDUQO1xp9N2BrOsW2sN5TTsmqklxZkVFiY4wn1QNo5RyrGQoE8coRvFO5tGcC7ygWuLFy/OQkZ31xOp6DdG3wBXYX/Ok+mjDBfgfZvNwV5mw5y7efoLbZQjlL9P5EYY8m6iSFw0nhZHT1a1gCZKk3lZlNhSPJ8z+KUOTAHV2qoQgygB0HvcIAuR5mFFp62jqRUE2HNRg9nWO5t/x84ShSMradNnRqgV8SiXr9AgMBAAECggEAPx8LdToCz34DIq6Hnz7LddrFS6uYdqpGSqwiPNqiwQnmZWihbIpRVWIIXclWKInt1uKt6fnxaDAHdju+DuJMKXpkzHmh6V4DlZqBDPM1XD7zMUt33nzomN6rl8Mq+FBqQRas+16iTq4gz5lW20HTWDjAq6XxiPhwH2gMYRsO9QaoilzTxpgeFqGBj1DUDDdGyJjdk+ibI3WXazeEEse20x+D7aK4IeGAMbCDHxkw3r1Bcm/3OqVrsMi9ex1V1YFfF1ElFeuHPEhUjCWMdUthWdHuZeIpMrAeNUyYbXzt60x0aDdSNFkj6DdRybhxxouJdMA9ccqU/5khzxpbhfrxTQKBgQDYT1aBWCfTD4cQt+4YqDBaqhBQBeR7Vb3xvqpkiS0rrp9qUExjHPiITI2r1GKnu0vLnw+V+eMcaJZcjVXy6DFjHC9wJEaGhnjkTKDvNw7jpnOikkE4/dT6m2K9MSUooNXtO0ViwenDQ2hjhuDuWf/JpOKqt58jBWUJ6PPAWctbiwKBgQCr368i06IASlqMTP0UZQA1WFH89ejM2gT91mKSCxOGqnFCKledBv1HuRcwFe/qpY4U8iXgT9Q5XvLnRbSuegzmBO7XNp99Qmjs5uk/hUXhhsYekSp/JjSMqoDyeer6s9B4nr/J+1qRHm3KzdAsAvgNdFaCZxaxRq4383bb28L0lwKBgQC5OMaEHy6KxkMLh9PzfSFaoUEypLkO+06YkIFrcSMiwnZzHKssO4R9gb/WIRkRM4olo+A+tilJDC2ktsmgJD8V9O6SAh3512/xXcR40haHzOI7lS0QVhpnNWMJSendrktAxn4VoKJAt5nNj5NPxfUHf48wS+eSn23zXGxMixddHQKBgAU6CzBq8S1DFZfYq4WYQLZelje0Hr1EEAzMHTlFvvVEb6dMdFehI8ivl0XuFNq06Co45u/4XYLVIVvpIcKAka3ZDo5a6eS8RUaXCxbUbbibCaFaVsmBFu4ELWGyVXQETd2tLjXtP+bT3xDgy2jbOkHmfM8AZY9Ej/3BmKa8+yPHAoGAdTn8MPdT4tOcFulIBgQ8Mljc3OAi4xkAZpa7dhgdVOJFIE/Gcj33ioe4loUO8M/EimWB1rdZUCZpxI+ZMwyWjzg5UU+uGktMVdDJ89EhHReDvyIo7mPez0JrhkumtsoUxUSGy/V0RQ9jXYvOPyCY/BUvgj7eaw1obhYU3/+rpvk=";

test("request signature matches the v2 docs example", () => {
  const headers = {
    appId: "3a9ea1263e624adf88518d4d88369aad",
    nonce: "TD4ENK2SN25HQBGPGTS5A1LSHCGZL4XR",
    timestamp: "1764252493756",
    uid: "102130",
    version: "v2",
  };
  const body = {
    productId: 100004,
    transaction: { transType: 170, merchantName: "mypal", balance: "100" },
    email: "zhangshuaishuai9527@gmail.com",
    userBankcardId: 100168,
  };
  const payload = signaturePayload(headers, body);
  assert.equal(
    payload,
    "appId=3a9ea1263e624adf88518d4d88369aad&nonce=TD4ENK2SN25HQBGPGTS5A1LSHCGZL4XR&timestamp=1764252493756&uid=102130&version=v2email=zhangshuaishuai9527@gmail.com&productId=100004&transaction={balance:100,merchantName:mypal,transType:170}&userBankcardId=100168",
  );
  assert.equal(
    rsaSign(payload, DOCS_TEST_KEY),
    "Z9M/W1aUJhtI1O21DzGKTGW1c44EPWxgeDE1t0/FbHx+ddLrGe5809NEmaDJa//vj2n+P/mx01XTEre36BDGDbgIBkufudM2tMUrxXH3xtb83pVSXa1HFvpgHK73zhBqYxgPm5qLQCFDRJMngvucMAQbEctlNzjBzlAgKq6WcC42+/F3/9JfMYPvgzArBoSnLxMsucRyay5OT1D5iJmcGa0FwfE9g8IsCCsfMHbycc6BHTSsRlOCIrxIX3CCmIHxAH5RvV4xxuKOqG5+WafDtkKn9PvvfvugkrFVlIR/xxInVCae5W4LRisuuxECpQ7ReTqUx6dCwUzO/j39d65TkQ==",
  );
});

test("empty uid header is still part of the payload", () => {
  const payload = signaturePayload({ appId: "a", nonce: "n", timestamp: "1", uid: "", version: "v2" }, {});
  assert.equal(payload, "appId=a&nonce=n&timestamp=1&uid=&version=v2");
});

test("empty body fields are skipped", () => {
  assert.equal(signaturePayload({ v: "1" }, { a: "", b: null, c: 0 }), "v=1c=0");
});

test("PIN decrypts per docs example and round-trips", () => {
  const key = "z+7ruiMj0GottZjhNVJG2ZJsDcXqR2b3iW32+Hav34c=";
  assert.equal(aesDecrypt("dsOiXZoeUUBgjw5YujQlvNzMtULGKy3vZcoLgiXgfVc=", key), "123456");
  assert.equal(aesDecrypt(aesEncrypt("4321", key), key), "4321");
});

test("webhook signature matches docs example", () => {
  const body = {
    eventType: "kycStatusChange",
    eventId: "03bb28da57c14e9ba500f25605ae341a",
    uid: 10000,
    auditState: 1,
    auditRemark: "KYC has passed",
  };
  const key = "mHy3oMMoHlifsrbU5hbXQV0i5lDspm7UZosRnM/4u80=";
  assert.equal(verifyWebhook(body, "bYcf/qzPEa8n/uwpAIbUFvRNcgBaQo0TC5H3sjRV7bM=", key), true);
  assert.equal(verifyWebhook({ ...body, uid: 10001 }, "bYcf/qzPEa8n/uwpAIbUFvRNcgBaQo0TC5H3sjRV7bM=", key), false);
});
