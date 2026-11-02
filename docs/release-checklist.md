# ORU 0.9.0 release and follow-up checklist

ORU 0.9.0 is an early public release of the new language and browser runtime. It is intentionally pre-1.0: users should expect changes while we gather feedback and improve compatibility.

## Verified before release

- [x] Node.js 20, 22, and 24 unit tests and TypeScript build.
- [x] Dependency audit at the configured high-severity threshold.
- [x] npm package dry-run.
- [x] Playwright tests in Chromium, Firefox, and WebKit.
- [x] Async runtime, module import, form, CSP, and keyboard-focus regression coverage.
- [x] Physical Android phone testing by the maintainer.
- [ ] Re-run the complete workflow against the exact release commit.

The CI workflow is required on every commit before merging this release preparation.

## Public beta feedback

- [ ] Collect user reports for installation, project creation, development server, and production builds.
- [ ] Test representative small and larger real-world projects.
- [ ] Track regressions, crashes, confusing diagnostics, and documentation gaps.
- [ ] Prioritize and fix release-blocking issues; publish patch releases as needed.

## Follow-up quality work

These are important goals for a stable 1.0 release, not claims that 0.9.0 has already passed them.

- [ ] Complete a WCAG 2.2 AA review of generated pages and controls.
- [ ] Test keyboard-only workflows and desktop/mobile screen readers.
- [ ] Obtain an independent security review of parser/interpreter boundaries, host capabilities, module and asset paths, generated HTML, CSP, and CLI filesystem behavior.
- [ ] Review deployment headers and the threat model in a representative production deployment.
- [ ] Measure render time, interaction latency, memory use, and generated asset size on low-end hardware.
- [ ] Expand device/browser testing beyond the maintainer's Android phone, including supported desktop and iOS environments.

## Package and release hygiene

- [ ] Verify package contents, CLI entry point, exports, Node.js engine range, and version.
- [ ] Verify installation from npm and run a clean starter project using the published package.
- [ ] Keep the changelog current for every release.

## Stable 1.0.0 exit criteria

- [ ] No known release-blocking correctness, security, or data-loss issues.
- [ ] Core syntax and runtime behavior documented and sufficiently stable.
- [ ] Accessibility, security, and performance follow-up reviewed and documented.
- [ ] Automated tests pass on the exact release commit.
- [ ] Package installation and clean starter-project smoke test pass.

