import assert from "assert"
import { META_SIGNUP_HTTPS_MESSAGE, canUseMetaSignup } from "./meta-signup"

assert.strictEqual(canUseMetaSignup("https:"), true)
assert.strictEqual(canUseMetaSignup("http:"), false)
assert.strictEqual(canUseMetaSignup(""), false)
assert(META_SIGNUP_HTTPS_MESSAGE.includes("HTTPS"))
assert(META_SIGNUP_HTTPS_MESSAGE.includes("dashboard"))

console.log("Meta signup HTTPS guard tests passed")
