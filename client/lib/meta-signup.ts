/**
 * Meta Embedded Signup loads the Facebook JS SDK and calls FB.login. Meta
 * refuses to run FB.login on insecure pages, so local `http://localhost` can
 * never open the WhatsApp signup popup. Keep the check in one place so the UI
 * can explain the requirement instead of letting the SDK throw a console error.
 */
export const META_SIGNUP_HTTPS_MESSAGE =
  "Meta WhatsApp signup requires HTTPS. Open the deployed HTTPS URL or use a secure HTTPS tunnel. The rest of the WhatsApp dashboard still works over HTTP."

export function canUseMetaSignup(protocol: string): boolean {
  return protocol === "https:"
}
