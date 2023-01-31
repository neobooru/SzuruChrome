const forbiddenProtocols = [
  "chrome-extension://",
  "chrome-search://",
  "chrome://",
  "devtools://",
  "edge://",
  "https://chrome.google.com/webstore",
];

export function isForbiddenUrl(url: string): boolean {
  return forbiddenProtocols.some((protocol) => url.startsWith(protocol));
}

export const isFirefox = navigator.userAgent.includes("Firefox");
export const isChrome = navigator.userAgent.match(/chrome|chromium|crios/i);