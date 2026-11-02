# Security policy

## Supported versions

Security fixes are made against the active development branch. The published `0.3.x` line is maintained separately; do not assume that a development-branch fix is present in an older published version.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's **Report a vulnerability** feature on this repository. Do not open a public issue or publish exploit details before a fix is available.

Include:
- The affected ORU version or commit.
- The affected command, API, or generated-page behavior.
- A concise description of the security impact.
- Minimal reproduction steps that do not expose real user data.

Please allow maintainers reasonable time to investigate, coordinate a fix, and prepare an advisory.

## Security boundaries

ORU is a compiler and browser runtime, not a sandbox for untrusted programs. Do not execute untrusted ORU source or register untrusted host capabilities in a privileged application. Generated pages apply restrictive Content Security Policy and baseline security headers, but these controls do not replace application-level authorization, server-side validation, safe handling of secrets, or deployment-specific security review.
