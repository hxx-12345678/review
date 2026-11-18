import assert from "assert";
import crypto from "crypto";
import { parseSignedRequest } from "./meta-compliance";

const SECRET = "test-app-secret";

function base64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeSignedRequest(payload: Record<string, unknown>, secret = SECRET): string {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  return `${base64Url(signature)}.${encodedPayload}`;
}

const payload = { algorithm: "HMAC-SHA256", user_id: "1234567890", issued_at: 1700000000 };
const signed = makeSignedRequest(payload);

assert.deepStrictEqual(parseSignedRequest(signed, SECRET), payload, "Valid signed_request should parse");
assert.strictEqual(parseSignedRequest(signed, "wrong-secret"), null, "Wrong secret must fail");
assert.strictEqual(parseSignedRequest(signed.replace(/.$/, "x"), SECRET), null, "Tampered payload must fail");
assert.strictEqual(parseSignedRequest(undefined, SECRET), null, "Missing signed_request must fail");
assert.strictEqual(parseSignedRequest("not-a-signed-request", SECRET), null, "Malformed input must fail");
assert.strictEqual(parseSignedRequest(signed, ""), null, "Missing app secret must fail");

console.log("meta-compliance tests passed");
