export { detectLocale } from "./detect";
export type { LocaleDetector } from "./detect";

export { documentCookieDetector, initDocumentCookieDetector } from "./browser/document-cookie";
export { htmlLangAttributeDetector } from "./browser/html-lang-attribute";
export { initLocalStorageDetector, localStorageDetector } from "./browser/local-storage";
export { navigatorDetector } from "./browser/navigator";
export { initQueryStringDetector, queryStringDetector } from "./browser/query-string";
export { initSessionStorageDetector, sessionStorageDetector } from "./browser/session-storage";

export { initAcceptLanguageHeaderDetector } from "./server/accept-language-header";
export type { RequestWithHeaders } from "./server/accept-language-header";
export { initRequestCookiesDetector } from "./server/request-cookies";
export type { RequestWithCookies } from "./server/request-cookies";
export { initRequestHostnameDetector } from "./server/request-hostname";
export type { RequestWithHostname } from "./server/request-hostname";
export { initRequestParametersDetector } from "./server/request-parameters";
export type { RequestWithParams } from "./server/request-parameters";
