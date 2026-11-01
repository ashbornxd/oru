# ORU 1.0 release verification checklist

This checklist is intentionally separate from automated CI. A green build does not certify accessibility, security, performance, or real-device behavior.

## Automated checks

- [x] Node.js 20, 22, and 24 unit tests and TypeScript build.
- [x] Dependency audit at the configured high-severity threshold.
- [x] npm package dry-run.
- [x] Playwright tests in Chromium, Firefox, and WebKit.
- [x] Async runtime, module import, form, CSP, and keyboard-focus regression coverage.

Re-run the complete workflow against the exact final release commit before publishing.

## Accessibility review

- [ ] Complete a WCAG 2.2 AA review of generated pages and controls.
- [ ] Test keyboard-only operation, including logical focus order, visible focus, forms, validation, and error recovery.
- [ ] Test with at least one desktop screen reader and one mobile screen reader.
- [ ] Verify headings, landmarks, names/roles/values, announcements, zoom/reflow, and contrast.
- [ ] Record findings and close every release-blocking issue.

## Security review

- [ ] Obtain an independent review of parser/interpreter boundaries, host capabilities, module and asset path handling, generated HTML, CSP, and CLI filesystem behavior.
- [ ] Review dependency vulnerabilities and package contents at the release commit.
- [ ] Verify the deployment headers and threat model in a representative production deployment.
- [ ] Record findings and close every release-blocking issue.

## Performance review

- [ ] Measure representative small and large projects.
- [ ] Measure initial render, interaction latency, memory use, and resize behavior on low-end hardware.
- [ ] Check generated asset size and runtime startup cost.
- [ ] Record budgets and results.

## Device and browser review

- [ ] Test a physical Android phone and tablet.
- [ ] Test a physical iPhone/iPad if supported by the release target.
- [ ] Test desktop Chrome, Firefox, Safari, and Edge on supported operating systems.
- [ ] Check touch, keyboard, viewport resizing, orientation, file inputs, and form behavior.

## Final release

- [ ] Review README, language and page-file docs, examples, license, and security policy.
- [ ] Confirm package name, exports, CLI entry point, files allowlist, Node engine range, and version.
- [ ] Create and review the final changelog.
- [ ] Run `npm pack --dry-run` and inspect the actual tarball contents.
- [ ] Tag `v1.0.0` and publish only after all release gates are signed off.
- [ ] Verify installation from npm and build/run a clean starter project from the published package.

**Release rule:** keep the 1.0 pull request unmerged and do not publish stable 1.0.0 while any required checkbox above is open.
