# DepthCorrect for After Effects

DepthCorrect is a CEP panel that applies an After Effects expression to 3D layers. The expression scales each layer according to its distance from the active composition camera and preserves its apparent size at a selected reference distance.

## Requirements

- Adobe After Effects with CEP extensions enabled.
- A composition with a camera. When applying correction, the extension can create a default camera if the composition has none.

## Install

Copy the `com.depthcorrect.zscale.ae` folder to the CEP extensions directory:

- **Windows:** `%APPDATA%\Adobe\CEP\extensions\`
- **macOS:** `~/Library/Application Support/Adobe/CEP/extensions/`

On Windows, unsigned development extensions may require enabling PlayerDebugMode with the included `enable_PlayerDebugMode.reg` file. Review the registry change before running it, then restart After Effects.

Open **Window > Extensions > DepthCorrect**.

## Use

1. Open a composition and select one or more layers, or leave the selection empty to target all 3D layers.
2. Click **Apply**. With a selection, the extension converts selected layers to 3D if necessary and adds the dynamic scale expression. Without a selection, it applies to all 3D layers.
3. Use **Scan** to refresh the layer list. The panel reports layers with the DepthCorrect expression and their camera distance.
4. Use the per-layer action to remove the expression from one layer. The remove action removes scale expressions on its target layer, including non-DepthCorrect expressions; save a project copy before using it if other scale expressions matter.

When **Lock to Current Distance** is enabled, each layer's current distance becomes its reference distance. Otherwise, the custom reference distance is used. The expression also adds or updates a `Z-Reference Distance` slider effect on each target layer.

## Notes

- Camera distance is measured in composition space by the extension's host script.
- Base-scale controls set the selected layer's current scale; the dynamic expression multiplies that value.
- After Effects host scripting is not executable in CI. Test the extension in your installed After Effects version before using it on production projects.
