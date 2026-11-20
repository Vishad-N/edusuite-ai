import { HttpException } from "@nestjs/common";
import type { Language } from "@edusuite/shared";

/**
 * Every error code the API can return, with its Hindi and English message
 * (plan §07: one error shape, language chosen by Accept-Language).
 */
export const ERROR_MESSAGES = {
  BAD_REQUEST: { hi: "अनुरोध सही नहीं है।", en: "The request is not valid." },
  VALIDATION_FAILED: { hi: "कुछ जानकारी सही नहीं है। कृपया जाँचें।", en: "Some details are not valid. Please check them." },
  UNAUTHORIZED: { hi: "कृपया दोबारा लॉगिन करें।", en: "Please log in again." },
  FORBIDDEN: { hi: "आपको यह करने की अनुमति नहीं है।", en: "You don't have permission to do this." },
  NOT_FOUND: { hi: "यह चीज़ नहीं मिली।", en: "Not found." },
  CONFLICT: { hi: "यह पहले से मौजूद है या बदल चुका है।", en: "This already exists or has changed." },
  TOO_MANY_REQUESTS: { hi: "बहुत ज़्यादा प्रयास। थोड़ी देर बाद कोशिश करें।", en: "Too many attempts. Try again shortly." },
  SERVICE_UNAVAILABLE: { hi: "सर्वर अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें।", en: "The server is not available right now. Try again shortly." },
  INTERNAL: { hi: "सर्वर में समस्या आई। कृपया फिर से कोशिश करें।", en: "Something went wrong on the server. Please try again." },

  AUTH_INVALID: { hi: "ID या पासवर्ड गलत है।", en: "The ID or password is incorrect." },
  AUTH_LOCKED: {
    hi: "कई गलत प्रयासों के कारण खाता 15 मिनट के लिए रोका गया है।",
    en: "Too many wrong attempts. The account is locked for 15 minutes.",
  },
  AUTH_BLOCKED: { hi: "यह खाता ब्लॉक है। अपने एडमिन से संपर्क करें।", en: "This account is blocked. Contact your admin." },
  AUTH_BRANCH_NOT_ALLOWED: { hi: "आप इस ब्रांच में काम नहीं कर सकते।", en: "You can't work at this branch." },
  AUTH_SESSION_EXPIRED: { hi: "आज का सत्र समाप्त हो गया। कृपया फिर से लॉगिन करें।", en: "Today's session has ended. Please log in again." },
  AUTH_SESSION_REVOKED: {
    hi: "सुरक्षा कारणों से सत्र बंद किया गया। कृपया फिर से लॉगिन करें।",
    en: "The session was ended for security reasons. Please log in again.",
  },
} as const satisfies Record<string, Record<Language, string>>;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

/** Throw this to return a specific error code; the exception filter adds the translated message. */
export class ApiHttpException extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
    readonly details?: unknown,
  ) {
    super({ code, details }, status);
  }
}
