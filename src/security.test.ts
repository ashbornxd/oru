import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { contentSecurityPolicy, staticHostingHeaders } from "./security.js";

test("uses exact hashes for generated inline scripts and styles without unsafe script execution", () => {
  const script = 'import { run } from "./_oru/core.js";\\nrun("safe");';
  const style = "body{margin:0}";
  const html = "<style>" + style + "</style><script type=\"module\">" + script + "</script>";
  const policy = contentSecurityPolicy(html);
  const scriptHash = createHash("sha256").update(script).digest("base64");
  const styleHash = createHash("sha256").update(style).digest("base64");
  assert.ok(policy.includes("'sha256-" + scriptHash + "'"));
  assert.ok(policy.includes("'sha256-" + styleHash + "'"));
  assert.ok(policy.includes("script-src-attr 'none'"));
  assert.ok(policy.includes("style-src-attr 'none'"));
  assert.ok(!policy.includes("script-src 'self' 'unsafe-inline'"));
});

test("does not add hashes when a document has no inline code", () => {
  const policy = contentSecurityPolicy("<html><body>Hello</body></html>");
  assert.ok(policy.includes("script-src 'self'"));
  assert.ok(policy.includes("style-src 'self'"));
  assert.ok(!policy.includes("sha256-"));
});


test("creates route-specific Cloudflare Pages headers for root and nested pages", () => {
  const files = new Map([
    ["index.html", "<style>body{margin:0}</style><script type=\"module\">run()</script>"],
    ["docs/help/index.html", "<style>h1{color:black}</style><script type=\"module\">help()</script>"],
    ["_oru/core.js", "export const run = () => {};"]
  ]);
  const headers = staticHostingHeaders(files);
  assert.ok(headers.startsWith("/" + String.fromCharCode(10) + "  Content-Security-Policy:"));
  assert.ok(headers.includes("/docs/help" + String.fromCharCode(10) + "  Content-Security-Policy:"));
  assert.ok(headers.includes("X-Frame-Options: DENY"));
  assert.ok(headers.includes("Permissions-Policy: camera=(), microphone=(), geolocation=()"));
  assert.ok(!headers.includes("unsafe-inline"));
});
