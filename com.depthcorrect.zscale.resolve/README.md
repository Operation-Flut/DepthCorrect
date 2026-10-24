# DepthCorrect for DaVinci Resolve

DepthCorrect for Resolve is a Workflow Integration plugin that applies a **static** zoom correction to video clips on the current timeline. Enter each clip's relative depth and a reference distance; the plugin applies the same `distance / reference distance` multiplier to the clip's horizontal and vertical zoom.

## Important difference from After Effects

Resolve's public timeline API does not expose AE-style expressions, 3D composition layers, or an active composition camera. This plugin cannot automatically measure or animate camera-to-subject distance. Enter depth values manually; the result is a static timeline clip zoom adjustment. It only changes video clip `ZoomX` and `ZoomY` properties.

## Requirements

- DaVinci Resolve 18.5 or later with Workflow Integration Plugins enabled.
- The matching `WorkflowIntegration.node` binary from the local Resolve installation. This project does not redistribute that proprietary, platform-specific SDK binary.

## Install

1. Download and extract `com.depthcorrect.zscale.resolve.zip` from [GitHub Releases](https://github.com/OseMine/DepthCorrect/releases).
2. Copy the extracted `com.depthcorrect.zscale.resolve` folder into Resolve's Workflow Integration Plugins directory:
   - **Windows:** `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
   - **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/`
3. Copy the `WorkflowIntegration.node` file from your Resolve installation's Workflow Integration SDK into the plugin folder:
   - **Windows:** `com.depthcorrect.zscale.resolve\native\windows-x64\WorkflowIntegration.node`
   - **macOS (Apple Silicon or universal):** `com.depthcorrect.zscale.resolve/native/macos-universal/WorkflowIntegration.node`
   Create the `native` and platform subfolders if they are not present in the extracted archive.
4. Restart Resolve, open a project and timeline, then choose **Workspace > Workflow Integrations > DepthCorrect**.

The bridge is version- and platform-specific. Do not download an unrelated copy from another plugin or commit it to this repository.

## Use

1. Open a timeline and click **Scan timeline**. The list includes video clips from all video tracks.
2. Set a reference distance in the panel. The depth value represents the clip's relative distance from the viewer/camera; it is not inferred from Resolve.
3. Enter a depth for each clip and select the clips to change.
4. Click **Apply correction**. The plugin multiplies the original X/Y zoom by `depth / reference distance`.
5. Select corrected clips and click **Restore original zoom** to return to the captured X/Y zoom.

Original zoom values are stored in the plugin's local application data so they can be restored after Resolve is restarted. The restore record is associated with the project, timeline, track, clip name, and clip timing; changing those identifiers can prevent a record from matching.

## Troubleshooting

- **Plugin is not listed:** confirm the extracted folder is directly inside the Workflow Integration Plugins directory and restart Resolve.
- **Cannot connect to Resolve / missing native bridge:** verify that the correct platform `WorkflowIntegration.node` file is in the path above.
- **No clips appear:** open a timeline containing video clips, then scan again.
- **Unexpected zoom:** check the entered distance and reference values. A clip at the reference distance retains its current zoom; a clip farther away receives a larger zoom multiplier.

## Development

From the repository root, run `npm test`, `npm run check`, and `npm run package`. Resolve itself and its proprietary bridge are required for an in-host integration test.
