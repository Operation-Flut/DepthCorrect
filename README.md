# DepthCorrect

DepthCorrect helps preserve apparent subject size as its relative depth changes. It includes an After Effects CEP extension and a DaVinci Resolve Workflow Integration plugin.

> **Resolve limitation:** Resolve's public timeline API does not provide AE-style per-frame expressions or a 3D composition camera. The Resolve plugin therefore applies a static zoom correction to timeline clips using a depth value entered by the editor. It does not track or animate depth automatically.

## Components

| Component | Location | Behavior |
| --- | --- | --- |
| After Effects | [`com.depthcorrect.zscale.ae/`](./com.depthcorrect.zscale.ae/README.md) | Adds a dynamic scale expression to selected or all 3D layers, driven by camera distance. |
| DaVinci Resolve | [`com.depthcorrect.zscale.resolve/`](./com.depthcorrect.zscale.resolve/README.md) | Scans video clips and applies a static zoom multiplier from a manually entered depth and reference distance. |

## Install

Download the platform-neutral plugin archives from [GitHub Releases](https://github.com/OseMine/DepthCorrect/releases). Each archive contains the plugin folder and its platform-specific installation instructions.

- [After Effects installation and use](./com.depthcorrect.zscale.ae/README.md)
- [DaVinci Resolve installation and use](./com.depthcorrect.zscale.resolve/README.md)

## Development

Requirements: Node.js 20+ and Python 3.10+.

```sh
npm test
npm run check
npm run package
```

The Resolve native bridge is supplied by DaVinci Resolve and is not included in source control or release archives. See the Resolve README for setup.

## Support

- [Report a bug or request a feature](https://github.com/OseMine/DepthCorrect/issues)
- [Security policy](./SECURITY.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## License

DepthCorrect is licensed under the [MIT License](./LICENSE). DaVinci Resolve, After Effects, and their SDKs are trademarks and products of their respective owners; this project is not affiliated with Blackmagic Design or Adobe.
