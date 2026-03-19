# Overflow JS SDKs

Monorepo for [Jaggle Overflow](https://overflow.jaggle.ai).

## Packages

| Package                                         | Description                           |
| ----------------------------------------------- | ------------------------------------- |
| [@jaggle-ai/overflow-browser](packages/browser) | Browser SDK                           |
| [@jaggle-ai/overflow-react](packages/react)     | React SDK (error boundaries, context) |
| [@jaggle-ai/overflow-nextjs](packages/nextjs)   | Next.js SDK (server + client)         |

## Development

```bash
npm install       # installs dependencies for all packages
npm run build     # builds all packages (browser -> react -> nextjs)
npm run dev       # watches all packages
npm run clean     # removes all dist folders
```

## Publishing

Packages are published independently via the **Publish Package** workflow in GitHub Actions.

### Steps

1. Push your changes to `main`
2. Go to **Actions** > **Publish Package** > **Run workflow**
3. Select the **package** and **bump type**, then run

The workflow automatically bumps the version in `package.json`, builds, publishes to npm, and commits the version bump back with a git tag.

### Version bumps

| Bump         | When to use                        | Example               |
| ------------ | ---------------------------------- | --------------------- |
| `patch`      | Bug fixes                          | 0.1.0 -> 0.1.1        |
| `minor`      | New features, backwards compatible | 0.1.0 -> 0.2.0        |
| `major`      | Breaking changes                   | 0.1.0 -> 1.0.0        |
| `prerelease` | Testing before a stable release    | 0.1.0 -> 0.1.1-beta.0 |

### Beta releases

1. Select `prerelease` as bump type (default preid: `beta`)
2. Each subsequent run increments: `0.1.1-beta.0` -> `0.1.1-beta.1`
3. Users install with `npm install @jaggle-ai/overflow-browser@beta`
4. When ready for stable: run the workflow with `patch`, `minor`, or `major`

### Cross-package updates

The dependency chain is: `browser` <- `react` <- `nextjs`

If a change in `browser` affects downstream packages:

1. Publish `browser` first
2. Update the `peerDependencies` range in `react`/`nextjs` if the minimum version changed
3. Publish `react`, then `nextjs`

## Changelog

See [GitHub Releases](https://github.com/Jaggle-AI-HQ/overflow-js/releases) for release notes.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, commit conventions, and pull request guidelines.

## Security

Found a vulnerability? Please report it responsibly — see [SECURITY.md](SECURITY.md).

## License

MIT - see [LICENSE](LICENSE)
