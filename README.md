# DepthCorrect

**Dynamic Z-Scale Perspective Correction** — After Effects CEP Extension + DaVinci Resolve Workflow Integration Plugin.

Adjust layer scale dynamically based on camera distance to maintain consistent visual size across depth. Works in After Effects via the CEP panel and in DaVinci Resolve via the Workflow Integration plugin.

---

## What's Included

| Component | Path | Description |
|-----------|------|-------------|
| **AE Extension** | `com.depthcorrect.zscale/` | CEP panel + ExtendScript host (expressions, layer scanning, apply/remove) |
| **Resolve Plugin** | `com.depthcorrect.zscale.resolve/` | Workflow Integration plugin (HTML + JS API bridge) |
| **License** | `LICENSE` | MIT |

---

## After Effects (CEP)

Install by copying `com.depthcorrect.zscale/` to your CEP extensions folder:

- **Windows**: `%APPDATA%\Adobe\CEP\extensions\`
- **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/`

Then enable in AE: `Window > Extensions > DepthCorrect`.

The extension scans 3D layers, calculates camera distances, applies a `DepthCorrect` dynamic scale expression with an optional `Z-Reference Distance` slider, and removes expressions on demand.

---

## DaVinci Resolve (Workflow Integration)

Install by copying `com.depthcorrect.zscale.resolve/` to the Workflow Integration Plugins directory:

- **Windows**: `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
- **macOS**: `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/`

Load from Resolve: `Workspace > Workflow Integrations > DepthCorrect`.

The plugin provides the same layer-scanning UI and applies scale logic via Resolve's scriptable JavaScript API (`WorkflowIntegration.node`).

---

## Key Features

- Dynamic Z-Scale expression based on camera-to-layer distance
- Lock-to-current-distance or custom reference distance
- Per-layer base scale override (uniform or uncoupled X/Y/Z)
- One-click apply / remove
- Timeline / layer list with active-state chips
- Material Design 3 UI (dark theme, adaptive)

---

## Releases

See [Releases](https://github.com/depthcorrect/depthcorrect/releases) for versioned downloads with packaged `.zxp` / plugin bundles.

---

## License

MIT License — see [LICENSE](LICENSE) for details.
