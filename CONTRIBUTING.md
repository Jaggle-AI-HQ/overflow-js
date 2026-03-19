# Contributing to Overflow JS SDKs

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build all packages:

   ```bash
   npm run build
   ```

4. Start the dev watcher:

   ```bash
   npm run dev
   ```

## Project Structure

```bash
packages/
  browser/   # Core browser SDK - no framework dependencies
  react/     # React bindings (error boundaries, context)
  nextjs/    # Next.js integration (server + client)
```

The dependency chain is: `browser` <- `react` <- `nextjs`. Changes to `browser` may affect downstream packages.

## Making Changes

1. Create a branch from `main`:

   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes

3. Ensure everything builds and typechecks:

   ```bash
   npm run build
   ```

4. Commit your changes with a descriptive message:

   ```plaintext
   feat(browser): add support for custom transports
   fix(react): prevent double initialization in strict mode
   docs(nextjs): clarify server-side setup instructions
   ```

5. Push and open a pull request

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```plaintext
<type>(<scope>): <description>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Scopes:** `browser`, `react`, `nextjs`, or omit for repo-wide changes

## Pull Requests

- Keep PRs focused on a single change
- Update relevant package README if you're changing public API
- Add a clear description of what changed and why
- Link any related issues

## Reporting Bugs

Please use the [bug report template](https://github.com/Jaggle-AI-HQ/jaggle-overflow/issues/new?template=bug_report.md) and include:

- Which package and version you're using
- Steps to reproduce
- Expected vs actual behavior
- Browser/Node.js version

## Requesting Features

Open an issue using the [feature request template](https://github.com/Jaggle-AI-HQ/jaggle-overflow/issues/new?template=feature_request.md) and describe the use case.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
