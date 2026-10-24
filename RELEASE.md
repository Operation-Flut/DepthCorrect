# Release checklist

Releases are published from version tags by `.github/workflows/release.yml`.

## Prepare a release

1. Update `version` in `package.json`, the Resolve plugin `package.json`, and the AE CEP `CSXS/manifest.xml`.
2. Update `CHANGELOG.md` and the Resolve/AE documentation for user-visible changes.
3. Confirm `npm test`, `npm run check`, and `npm run package` pass.
4. Review the contents of `dist/` and ensure no Resolve SDK binaries, secrets, or local test files are present.
5. Merge the release changes to `main`.
6. Create and push an annotated tag matching the package version, for example:

   ```sh
   git tag -a v1.0.0 -m "DepthCorrect v1.0.0"
   git push origin v1.0.0
   ```

The workflow creates a GitHub Release with the AE and Resolve ZIP archives, project README, and license. For Resolve, users must copy the compatible `WorkflowIntegration.node` file from their Resolve installation into the plugin's platform folder; see its README.

Do not publish a release until the plugin has been tested in the target host applications. CI validates structure, JavaScript syntax, the scale calculation, and packaging, but cannot launch either host application.
