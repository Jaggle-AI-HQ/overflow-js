# Security Policy

## Supported Versions

| Package                     | Supported |
| --------------------------- | --------- |
| @jaggle-ai/overflow-browser | Latest    |
| @jaggle-ai/overflow-react   | Latest    |
| @jaggle-ai/overflow-nextjs  | Latest    |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.**

Instead, email **<tashi.dakpa@jaggle.tech>** with:

- Description of the vulnerability
- Steps to reproduce
- Affected package(s) and version(s)
- Any potential impact

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Scope

The Overflow SDKs run in end-user browsers and Node.js servers. Security concerns include but are not limited to:

- DSN or API key exposure beyond intended scope
- Cross-site scripting (XSS) via captured error data
- Sensitive data leaking into error payloads
- Denial of service through SDK behavior
