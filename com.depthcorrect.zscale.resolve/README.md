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
- The Resolve Developer package installed under `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer` (Windows) or the corresponding Resolve `Developer` directory on macOS. It contains the matching `WorkflowIntegration.node` bridge and API documentation. The installer copies this local proprietary binary; this project does not redistribute it.

## Install

1. Download and extract `com.depthcorrect.zscale.resolve.zip` from [GitHub Releases](https://github.com/OseMine/DepthCorrect/releases).
2. Copy the extracted `com.depthcorrect.zscale.resolve` folder into Resolve's Workflow Integration Plugins directory:
   - **Windows:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\`
   - **macOS:** `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/`
3. Alternatively, run `install_resolve.lua` from Resolve's Fusion page. It copies the plugin into the correct platform-specific directory and automatically copies `WorkflowIntegration.node` from Resolve's local SamplePlugin SDK:
   - **Windows source:** `C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\Workflow Integrations\Examples\SamplePlugin\WorkflowIntegration.node`
   - **macOS source:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Workflow Integrations/Examples/SamplePlugin/WorkflowIntegration.node`
4. For manual installation, copy that same `WorkflowIntegration.node` into:
   - **Windows:** `com.depthcorrect.zscale.resolve\native\windows-x64\WorkflowIntegration.node`
   - **macOS:** `com.depthcorrect.zscale.resolve/native/macos-universal/WorkflowIntegration.node`
5. Restart Resolve, open a Fusion composition with `Transform3D` and `Camera3D` nodes, then choose **Workspace > Workflow Integrations > DepthCorrect**.

The bridge is version- and platform-specific. The installer uses the copy shipped with the installed Resolve version. Do not commit `WorkflowIntegration.node` to this repository or use an unrelated copy from another plugin.

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
- **Cannot connect to Resolve / missing native bridge:** verify that the Resolve Developer SamplePlugin exists and contains `WorkflowIntegration.node`, then rerun `install_resolve.lua`. The expected source path is shown in the installation steps.
- **Fusion is not active:** switch to the Fusion page and open a composition before scanning. On Resolve versions whose bridge does not expose `Fusion.GetCurrentComp()`, select the Fusion clip or Fusion composition's timeline item; DepthCorrect resolves its composition through `Project.GetCurrentTimeline()` and `Timeline.GetCurrentVideoItem()`.
- **No Transform3D nodes appear:** select Transform3D nodes in the node graph before scanning.
- **No Camera3D found:** add a Camera3D tool to the composition.
- **Expression error on apply:** rename any nodes with spaces or special characters in their names.

## Development

From the repository root, run `npm test`, `npm run check`, and `npm run package`. Resolve itself and its proprietary bridge are required for an in-host integration test.
