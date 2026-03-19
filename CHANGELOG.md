# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## @jaggle-ai/overflow-browser

### [0.1.0] - 2026-03-19

- Initial release
- Automatic error capture via `window.onerror` and `unhandledrejection`
- Manual `captureException` and `captureMessage`
- Breadcrumbs, user context, and tagging
- Fetch transport with keepalive
- Configurable sampling and `beforeSend` hook

## @jaggle-ai/overflow-react

### [0.1.0] - 2026-03-19

- Initial release
- `OverflowProvider` component for initialization
- `OverflowErrorBoundary` for React error boundaries
- Re-exports all browser SDK APIs

## @jaggle-ai/overflow-nextjs

### [0.1.0] - 2026-03-19

- Initial release
- `initServer()` for server-side initialization
- `OverflowProvider` client component
- `withOverflow()` wrapper for API route handlers
- Server-side transaction and error capture
