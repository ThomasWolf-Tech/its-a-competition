/** Only return to app destinations, never an external origin or an auth loop. */
export function safeNext(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/u.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u0020]/u.test(decoded) || decoded.startsWith("//")) return fallback;
    const url = new URL(value, "https://competition.invalid");
    if (url.origin !== "https://competition.invalid" || !/^\/(?:account(?:\/|$)|create(?:\/|$)|bracket(?:\/|$))/.test(url.pathname)) return fallback;
    return url.pathname + url.search;
  } catch { return fallback; }
}

/** Preserve an allowed local hostname; canonicalize all other callback destinations. */
export function authOrigin(requestUrl: string, host: string | null, siteUrl: string | undefined): string {
  const configured = new URL(siteUrl || requestUrl);
  if (host === configured.host) return configured.origin;
  const loopback = (hostname: string) => hostname === "127.0.0.1" || hostname === "localhost";
  if (loopback(configured.hostname) && host) {
    try {
      const incoming = new URL(`${configured.protocol}//${host}`);
      if (loopback(incoming.hostname) && incoming.port === configured.port && incoming.host === host) return incoming.origin;
    } catch { /* Invalid Host values use the configured origin. */ }
  }
  return configured.origin;
}
