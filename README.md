# DepthCorrect

DepthCorrect helps preserve apparent subject size as its relative depth changes. It includes an After Effects CEP extension and a standalone Python tool for DaVinci Resolve/Fusion.

## Components

| Component | Location | Behavior |
| --- | --- | --- |
| After Effects | [`com.depthcorrect.zscale.ae/`](./com.depthcorrect.zscale.ae/README.md) | Adds a dynamic scale expression to selected or all 3D layers, driven by camera distance. |
| DaVinci Resolve / Fusion | [`DepthCorrect/DepthCorrect.py`](./DepthCorrect/DepthCorrect.py) | Opens a PySide panel, scans the active Fusion composition for 3D nodes, and applies live scale expressions based on camera distance. |

## Install

### After Effects

Copy the `com.depthcorrect.zscale.ae` folder to the CEP extensions directory:

- **Windows:** `%APPDATA%\Adobe\CEP\extensions\`
- **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/`

On Windows, unsigned development extensions may require the included `enable_PlayerDebugMode.reg` file. Review the registry change before running it, then restart After Effects.

### DaVinci Resolve / Fusion

1. Install DaVinci Resolve with Fusion and enable its scripting/Python support.
2. Install a Qt binding into the bundled tool directory if Resolve does not already provide one:

   ```sh
   python scripts/install_vendor.py
   ```

3. Run `DepthCorrect/DepthCorrect.py` from Resolve/Fusion's scripting environment.

The script uses `DaVinciResolveScript` when available and falls back to Fusion's `bmd` scripting API. It does not require a Workflow Integration plugin or native bridge.

## Use

1. Open a Fusion composition containing a `Camera3D` and one or more supported 3D nodes.
2. Run the Python script and click **Scan**.
3. Select nodes in Fusion and click **Apply to Selected**, or apply to all detected nodes when nothing is selected.
4. Keep **Lock to Current Camera Distance** enabled to preserve the node's current apparent size, or disable it and enter a custom reference distance.

## Development

Requirements: Node.js 20+, Python 3.10+, and a Python Qt binding only when running the Fusion panel.

```sh
npm run check
npm test
npm run package
```

The package command creates separate archives:

- `dist/DepthCorrect-after-effects.zip`
- `dist/DepthCorrect-resolve.zip`

The Resolve archive contains the `DepthCorrect` script directory and excludes local vendor dependencies.

The former Workflow Integration sources are no longer part of the project; remove any stale `com.depthcorrect.zscale.resolve` folder from an existing checkout before packaging.

## Support

- [Report a bug or request a feature](https://github.com/OseMine/DepthCorrect/issues)
- [Changelog](./CHANGELOG.md)

## License

DepthCorrect is licensed under the [MIT License](./LICENSE). DaVinci Resolve, Fusion, After Effects, and their SDKs are trademarks and products of their respective owners; this project is not affiliated with Blackmagic Design or Adobe.
