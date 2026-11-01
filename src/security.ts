import { createHash } from "node:crypto";

/** Build a per-document CSP using hashes for ORU's generated inline script and stylesheet. */
export function contentSecurityPolicy(html: string): string {
  const script = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  const style = html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1];
  const hash = (value: string | undefined): string | undefined => value === undefined
    ? undefined
    : "'sha256-" + createHash("sha256").update(value, "utf8").digest("base64") + "'";
  const scriptHash = hash(script);
  const styleHash = hash(style);
  return [
    "default-src 'self'",
    "script-src 'self'" + (scriptHash ? " " + scriptHash : ""),
    "script-src-attr 'none'",
    "style-src 'self'" + (styleHash ? " " + styleHash : ""),
    "style-src-attr 'none'",
    "img-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
}
