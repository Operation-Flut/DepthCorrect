# DepthCorrect for DaVinci Resolve

DepthCorrect for Resolve is a Workflow Integration plugin that applies a **live** depth-based scale correction to selected `Transform3D` nodes in the active Fusion composition. Each node's scale is driven by an expression that multiplies its original scale by `camera-to-node distance / reference distance`, so the correction updates automatically as the camera or nodes move.

## How it works

1. The plugin scans the active Fusion composition for selected `Transform3D` nodes and available `Camera3D` nodes.
2. You choose which camera drives the correction and set a reference distance.
3. On **Apply**, DepthCorrect captures each node's current scale and attaches a live Lua expression to the `Scale.X`, `Scale.Y`, and `Scale.Z` inputs.
4. The expression computes world-space distance using `Transform3DOp.Translate`, so parent hierarchies and animations are respected.
5. On **Restore original**, the expressions are cleared and the original scale values are restored.

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
4. Restart Resolve, open a Fusion composition with `Transform3D` and `Camera3D` nodes, then choose **Workspace > Workflow Integrations > DepthCorrect**.

The bridge is version- and platform-specific. Do not download an unrelated copy from another plugin or commit it to this repository.

## Use

1. In the Fusion page, select one or more `Transform3D` nodes.
2. Click **Scan composition**. The list shows each selected node and its current scale. Camera3D nodes found in the composition appear in the dropdown.
3. Select the camera that should drive the correction. If there is only one camera, it is pre-selected.
4. Set the reference distance. Nodes at this distance from the camera keep their current scale.
5. Check the nodes to correct and click **Apply correction**. A live scale expression is attached to each node.
6. Move the camera or nodes to see the correction update in real time.
7. Select corrected nodes and click **Restore original** to remove the expressions and return to the captured scale values.

## Node naming

Fusion expression references require valid identifiers (letters, numbers, and underscores). If a node name contains spaces or special characters, rename it in the Fusion node graph before applying correction.

## Troubleshooting

- **Plugin is not listed:** confirm the extracted folder is directly inside the Workflow Integration Plugins directory and restart Resolve.
- **Cannot connect to Resolve / missing native bridge:** verify that the correct platform `WorkflowIntegration.node` file is in the path above.
- **Fusion is not active:** switch to the Fusion page and open a composition before scanning.
- **No Transform3D nodes appear:** select Transform3D nodes in the node graph before scanning.
- **No Camera3D found:** add a Camera3D tool to the composition.
- **Expression error on apply:** rename any nodes with spaces or special characters in their names.

## Development

From the repository root, run `npm test`, `npm run check`, and `npm run package`. Resolve itself and its proprietary bridge are required for an in-host integration test.
