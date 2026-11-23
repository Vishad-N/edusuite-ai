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

  ALREADY_EXISTS: { hi: "यह पहले से किसी और के नाम दर्ज है।", en: "This is already used by someone else." },
  ROLE_NOT_ALLOWED: { hi: "आप यह भूमिका नहीं दे सकते।", en: "You can't give this role." },
  CANNOT_CHANGE_SELF: {
    hi: "आप अपने खाते की भूमिका या स्थिति खुद नहीं बदल सकते।",
    en: "You can't change your own role or status.",
  },
  LAST_SUPERADMIN: {
    hi: "संस्थान में कम से कम एक सक्रिय सुपर एडमिन होना ज़रूरी है।",
    en: "The institute must keep at least one active super admin.",
  },
  DOCUMENT_CHANGED: {
    hi: "किसी और ने इसी बीच यह दस्तावेज़ बदल दिया है। नया संस्करण खोलकर फिर से बदलाव करें।",
    en: "Someone else changed this document in the meantime. Open the latest version and make your change again.",
  },
  DOCUMENT_TOO_LARGE: { hi: "यह दस्तावेज़ सेव करने के लिए बहुत बड़ा है।", en: "This document is too large to save." },
  FILE_NOT_UPLOADED: { hi: "फ़ाइल अभी अपलोड नहीं हुई है।", en: "The file hasn't been uploaded yet." },
  FILE_SIZE_MISMATCH: {
    hi: "अपलोड पूरा नहीं हुआ (फ़ाइल का आकार मेल नहीं खाता)। फिर से अपलोड करें।",
    en: "The upload didn't finish (the size doesn't match). Please upload again.",
  },
  FILE_TYPE_MISMATCH: {
    hi: "यह फ़ाइल वैसी नहीं है जैसी बताई गई। केवल PNG, JPG, WebP या PDF अपलोड करें।",
    en: "This file isn't the type it claims to be. Upload only PNG, JPG, WebP or PDF.",
  },

  CREDITS_EXHAUSTED: {
    hi: "आपके संस्थान के AI क्रेडिट कम हैं। और क्रेडिट के लिए EduSuite से संपर्क करें।",
    en: "Your institute doesn't have enough AI credits. Contact EduSuite for more.",
  },
  CREDITS_ADJUST_TOO_LARGE: {
    hi: "इतने क्रेडिट नहीं घटाए जा सकते; बैलेंस शून्य से कम हो जाएगा।",
    en: "You can't take away that many credits; the balance would go below zero.",
  },

  AI_REFUSED: {
    hi: "AI ने यह अनुरोध पूरा नहीं किया। विषय या शब्द बदलकर फिर से कोशिश करें। क्रेडिट वापस कर दिए गए हैं।",
    en: "The AI declined this request. Try different wording. Your credits were returned.",
  },
  AI_BAD_OUTPUT: {
    hi: "AI का उत्तर सही रूप में नहीं आया। फिर से कोशिश करें; क्रेडिट वापस कर दिए गए हैं।",
    en: "The AI's answer wasn't in the right format. Please try again; your credits were returned.",
  },
  AI_UNAVAILABLE: {
    hi: "AI सेवा अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें; क्रेडिट वापस कर दिए गए हैं।",
    en: "The AI service isn't available right now. Try again later; your credits were returned.",
  },
  AI_JOB_TYPE_UNAVAILABLE: {
    hi: "यह AI सुविधा अभी उपलब्ध नहीं है।",
    en: "This AI feature isn't available yet.",
  },

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
