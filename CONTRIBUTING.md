# Contributing

Thanks for contributing to DepthCorrect.

## Before opening a pull request

1. Create a branch from `main`.
2. Keep changes scoped to After Effects, Resolve, packaging, or directly related documentation.
3. Run `npm test`, `npm run check`, and `npm run package`.
4. Update the relevant plugin README and `CHANGELOG.md` when behavior or installation changes.
5. Open a pull request with a concise description, test results, and host application/version tested.

## Development

- The After Effects extension uses CEP HTML/CSS/JavaScript and ExtendScript (ES3) in `com.depthcorrect.zscale.ae/`.
- The Resolve workflow plugin uses the host-provided Electron runtime and `WorkflowIntegration.node`; the bridge binary must not be committed.
- Keep host API access in the plugin's main process. The renderer should use only the narrow preload bridge.
- Do not add dependencies unless they are needed. Keep release archives reproducible with `npm run package`.

## Code of conduct

Be respectful and constructive. Harassment or abusive behavior is not acceptable.
