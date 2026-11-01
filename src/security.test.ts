import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { contentSecurityPolicy } from "./security.js";

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
  assert.ok(policy.includes("style-src-attr 'unsafe-inline'"));
  assert.ok(!policy.includes("script-src 'self' 'unsafe-inline'"));
});

test("does not add hashes when a document has no inline code", () => {
  const policy = contentSecurityPolicy("<html><body>Hello</body></html>");
  assert.ok(policy.includes("script-src 'self'"));
  assert.ok(policy.includes("style-src 'self'"));
  assert.ok(!policy.includes("sha256-"));
});
