#!/usr/bin/env python
"""
DepthCorrect for DaVinci Resolve Fusion 3D
Ported from After Effects CEP Extension
Dynamic Perspective & Z-Scale compensation for Fusion 3D Nodes.
"""

import sys
import os




debug = True  # Set to False to disable debug prints
def debug_print(msg):
    if debug:
        print(msg)

debug_print("Started DepthCorrect for Fusion 3D")

# Resolve executes scripts with exec(), so __file__ may not be defined.
def find_script_dir():
    candidates = []
    script_path = globals().get("__file__")
    if script_path:
        candidates.append(os.path.dirname(os.path.abspath(script_path)))

    argv_path = sys.argv[0] if sys.argv else ""
    if argv_path and os.path.isfile(argv_path):
        candidates.append(os.path.dirname(os.path.abspath(argv_path)))

    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.append(os.path.join(
            appdata,
            "Blackmagic Design",
            "DaVinci Resolve",
            "Support",
            "Fusion",
            "Scripts",
            "Utility",
        ))

    candidates.append(os.getcwd())
    for candidate in candidates:
        if os.path.isdir(os.path.join(candidate, "vendor")):
            return candidate
    return candidates[0] if candidates else os.getcwd()


script_dir = find_script_dir()
vendor_dir = os.path.join(script_dir, "vendor")
if vendor_dir not in sys.path:
    sys.path.insert(0, vendor_dir)

import sys; print(sys.executable)
import math

try:
    from PySide2 import QtCore, QtGui, QtWidgets
except ImportError:
    try:
        from PySide6 import QtCore, QtGui, QtWidgets
    except ImportError:
        try:
            from PyQt5 import QtCore, QtGui, QtWidgets
        except ImportError:
            print("Error: PySide2, PySide6, or PyQt5 required.")
            sys.exit(1)

# Check for Resolve/Fusion environment. Fusion scripts normally inject ``fu``
# (the Fusion object) and ``bmd`` (the scripting module) into globals.
resolve = globals().get("resolve")
fusion = globals().get("fusion")
if fusion is None:
    fusion = globals().get("fu")

# ``fuscript.exe`` can run Python with a built-in Fusion UI dispatcher. The
# injected Fusion object is exposed as ``fusion`` in the menu/console context;
# do not replace it by making a blocking scriptapp() call.
dvr = globals().get("DaVinciResolveScript")
bmd_api = globals().get("bmd")

if dvr is None:
    try:
        import DaVinciResolveScript as dvr
    except ImportError:
        dvr = None

if bmd_api is None:
    try:
        import bmd as bmd_api
    except ImportError:
        bmd_api = None

if resolve is None and dvr is not None:
    try:
        resolve = dvr.scriptapp("Resolve")
    except Exception:
        resolve = None

if fusion is None and resolve is not None:
    try:
        fusion = resolve.Fusion()
    except Exception:
        fusion = None

# Do not call bmd.scriptapp("Fusion") from fuscript.exe. In that host the
# Fusion object is already injected as ``fu``; calling scriptapp can block.
if fusion is None and bmd_api is not None and "fuscript" not in sys.executable.lower():
    try:
        fusion = bmd_api.scriptapp("Fusion")
    except Exception:
        fusion = None


def current_resolve_page():
    """Return Resolve's active page name, or None outside Resolve."""
    if resolve is None:
        return None
    try:
        return str(resolve.GetCurrentPage() or "").lower()
    except Exception:
        return None


def fusion_page_available():
    """Allow the tool to operate only while Resolve is on the Fusion page."""
    if resolve is not None:
        return current_resolve_page() == "fusion"

    # Resolve's built-in ``fuscript.exe`` runner does not expose the active
    # Resolve page. In that context the script was launched from Fusion's
    # script menu, so do not reject it because the page API is unavailable.
    return True

# ==============================================================================
# Material Design 3 Stylesheet
# ==============================================================================
DARK_STYLE = """
QWidget {
    background-color: #121513;
    color: #e4ebe5;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
}

QFrame#card {
    background-color: #1c221e;
    border: 1px solid #28312a;
    border-radius: 10px;
}

QLabel#brand_title {
    font-size: 14px;
    font-weight: bold;
    color: #e4ebe5;
}

QLabel#brand_subtitle {
    font-size: 10px;
    color: #9aa59d;
}

QPushButton#hero_btn {
    background-color: #38e586;
    color: #042911;
    font-weight: bold;
    font-size: 13px;
    border-radius: 18px;
    padding: 8px 16px;
    border: none;
}

QPushButton#hero_btn:hover {
    background-color: #4df498;
}

QPushButton#hero_btn:pressed {
    background-color: #23ce71;
}

QPushButton#hero_btn:disabled {
    background-color: #1f4a30;
    color: #5d826a;
}

QListWidget {
    background-color: #0c0e0c;
    border: 1px solid #28312a;
    border-radius: 6px;
    padding: 4px;
}

QListWidget::item {
    background-color: #161b18;
    border-radius: 4px;
    margin-bottom: 4px;
    padding: 6px;
}

QListWidget::item:hover {
    background-color: #1c221e;
    border: 1px solid #38e586;
}

QListWidget::item:selected {
    background-color: #242a26;
    border: 1px solid #38e586;
}

QCheckBox {
    font-size: 11px;
    color: #e4ebe5;
}

QSpinBox, QDoubleSpinBox {
    background-color: #0c0e0c;
    border: 1px solid #28312a;
    border-radius: 4px;
    color: #e4ebe5;
    padding: 2px 6px;
    font-weight: bold;
}

QSpinBox::focus, QDoubleSpinBox::focus {
    border: 1px solid #38e586;
}
"""

# ==============================================================================
# Core DepthCorrect Logic for Fusion
# ==============================================================================
class DepthCorrectFusion:
    # Fusion 3D tools expose their transform controls under these exact input
    # IDs. ``tool.Transform3D`` is not a valid path for ImagePlane3D and
    # Transform3D nodes; it evaluates to None in Resolve 21.x.
    TRANSLATE_INPUTS = (
        "Transform3DOp.Translate.X",
        "Transform3DOp.Translate.Y",
        "Transform3DOp.Translate.Z",
    )
    SCALE_INPUTS = (
        "Transform3DOp.Scale.X",
        "Transform3DOp.Scale.Y",
        "Transform3DOp.Scale.Z",
    )

    @staticmethod
    def get_comp():
        if not fusion_page_available() or fusion is None:
            return None
        try:
            return fusion.CurrentComp
        except Exception:
            return None

    @staticmethod
    def _input_entries(tool):
        """Return ``(key, handle)`` pairs from Fusion's table-like input list."""
        try:
            inputs = tool.GetInputList()
        except Exception:
            return []
        if inputs is None:
            return []

        try:
            if hasattr(inputs, "items"):
                return list(inputs.items())
            if hasattr(inputs, "values"):
                return [(None, item) for item in inputs.values()]
            return [(None, item) for item in inputs]
        except (AttributeError, TypeError):
            return []

    @classmethod
    def get_input_handle(cls, tool, input_id):
        """Resolve an input handle by its Fusion INPS_ID."""
        # GetInputList() is the reliable API for controls whose names contain
        # dots. Depending on the Python bridge it returns either a dict keyed by
        # ID or a sequence of input handles, so inspect both the key and attrs.
        for key, input_handle in cls._input_entries(tool):
            if key == input_id:
                return input_handle
            try:
                attrs = input_handle.GetAttrs() or {}
                actual_id = None
                if hasattr(attrs, "get"):
                    actual_id = attrs.get("INPS_ID")
                else:
                    try:
                        actual_id = attrs["INPS_ID"]
                    except Exception:
                        pass
                handle_id = getattr(input_handle, "ID", None)
                if actual_id == input_id or handle_id == input_id:
                    return input_handle
            except Exception:
                continue

        # Resolve's dynamic dotted access is also supported on current builds
        # and is useful when GetInputList() omits hidden 3D controls.
        current = tool
        try:
            for part in input_id.split("."):
                current = getattr(current, part)
                if current is None:
                    break
            if current is not None and hasattr(current, "SetExpression"):
                return current
        except Exception:
            pass
        return None

    @classmethod
    def set_input_expression(cls, tool, input_id, expression):
        """Set an expression using an input handle or the operator fallback."""
        input_handle = cls.get_input_handle(tool, input_id)
        if input_handle is not None:
            input_handle.SetExpression(expression)
            return

        # Some Fusion Python builds expose Operator.SetExpression(id, expr)
        # while returning no usable handle for hidden Transform3DOp controls.
        setter = getattr(tool, "SetExpression", None)
        if setter is not None:
            setter(input_id, expression)
            return
        raise AttributeError(f"Fusion input not found: {input_id}")

    @classmethod
    def get_input_expression(cls, tool, input_id):
        input_handle = cls.get_input_handle(tool, input_id)
        if input_handle is not None:
            return input_handle.GetExpression()
        getter = getattr(tool, "GetExpression", None)
        if getter is not None:
            return getter(input_id)
        return None

    @classmethod
    def get_input_value(cls, tool, input_id, comp=None):
        """Read a scalar input without confusing its value with its handle."""
        time = None
        if comp is not None:
            try:
                time = comp.CurrentTime
            except Exception:
                pass
        try:
            if time is not None:
                return tool.GetInput(input_id, time)
            return tool.GetInput(input_id)
        except Exception:
            input_handle = cls.get_input_handle(tool, input_id)
            if input_handle is None:
                raise AttributeError(f"Fusion input not found: {input_id}")
            if time is not None:
                return input_handle[time]
            return input_handle[0]

    @classmethod
    def get_transform_values(cls, tool, comp=None):
        return tuple(
            float(cls.get_input_value(tool, input_id, comp) or 0.0)
            for input_id in cls.TRANSLATE_INPUTS
        )

    @staticmethod
    def find_camera(comp):
        if not comp:
            return None
        # Find active or first Camera3D node
        for tool in comp.GetToolList(False).values():
            if tool.GetAttrs("SOLO_ID") == "Camera3D" or "Camera3D" in tool.ID:
                return tool
        return None

    @classmethod
    def get_distance_to_camera(cls, node, cam_node, comp=None):
        if not cam_node or not node:
            return 1.0
        try:
            c_x, c_y, c_z = cls.get_transform_values(cam_node, comp)
            n_x, n_y, n_z = cls.get_transform_values(node, comp)
            dx, dy, dz = n_x - c_x, n_y - c_y, n_z - c_z
            dist = math.sqrt(dx * dx + dy * dy + dz * dz)
            return dist if dist > 0 else 1.0
        except Exception:
            return 1.0

    @classmethod
    def scan_3d_nodes(cls):
        comp = cls.get_comp()
        if not comp:
            return False, "No active Fusion composition found", []

        cam = cls.find_camera(comp)
        cam_name = cam.Name if cam else None

        selected_tools = comp.GetToolList(True)
        all_tools = comp.GetToolList(False)

        valid_types = ["ImagePlane3D", "Transform3D", "Shape3D", "Text3D"]
        nodes = []

        for tool_id, tool in all_tools.items():
            tool_type = tool.ID
            if any(vt in tool_type for vt in valid_types):
                is_selected = tool in selected_tools.values()
                dist = cls.get_distance_to_camera(tool, cam, comp)

                # Check if an expression exists on the actual Fusion Scale.X
                # input, whose ID is Transform3DOp.Scale.X.
                has_expr = False
                try:
                    expr = cls.get_input_expression(tool, cls.SCALE_INPUTS[0])
                    if expr and "DepthCorrect" in expr:
                        has_expr = True
                except Exception:
                    pass

                nodes.append({
                    "name": tool.Name,
                    "tool": tool,
                    "type": tool_type,
                    "distance": round(dist, 3),
                    "has_expression": has_expr,
                    "selected": is_selected
                })

        return True, cam_name, nodes

    @classmethod
    def apply_expression(cls, target_node_name=None, lock_current=True, custom_ref=1.0):
        comp = cls.get_comp()
        if not comp:
            return False, "No active comp"

        cam = cls.find_camera(comp)
        if not cam:
            return False, "No Camera3D found in composition"

        _, _, nodes = cls.scan_3d_nodes()
        
        # Filter target nodes
        targets = []
        if target_node_name:
            targets = [n for n in nodes if n["name"] == target_node_name]
        else:
            targets = [n for n in nodes if n["selected"]]
            if not targets:
                targets = nodes

        if not targets:
            return False, "No valid 3D nodes selected or found"

        applied = 0
        comp.StartUndo("Apply DepthCorrect Dynamic Scale")

        for n in targets:
            tool = n["tool"]
            ref_dist = cls.get_distance_to_camera(tool, cam, comp) if lock_current else custom_ref

            # Fusion simple expressions address 3D controls by their input IDs,
            # not through a Transform3D object. Use GetValue so this works for
            # ImagePlane3D, Transform3D, Shape3D, and Text3D alike.
            camera_name = str(cam.Name)
            if not camera_name.isidentifier():
                raise ValueError(
                    f"Camera name '{camera_name}' is not a valid Fusion expression identifier"
                )
            camera_ref = camera_name
            # ``self`` is the tool whose Scale input owns this expression. It
            # avoids a second tool-name lookup and works even when a node name
            # collides with a built-in input name.
            lua_expr = (
                f'(math.sqrt('
                f'({camera_ref}:GetValue("{cls.TRANSLATE_INPUTS[0]}", time) - '
                f'self:GetValue("{cls.TRANSLATE_INPUTS[0]}", time))^2 + '
                f'({camera_ref}:GetValue("{cls.TRANSLATE_INPUTS[1]}", time) - '
                f'self:GetValue("{cls.TRANSLATE_INPUTS[1]}", time))^2 + '
                f'({camera_ref}:GetValue("{cls.TRANSLATE_INPUTS[2]}", time) - '
                f'self:GetValue("{cls.TRANSLATE_INPUTS[2]}", time))^2)'
                f' / math.max(0.001, {max(0.001, float(ref_dist))})'
                f') + 0 * string.len("DepthCorrect"))'
            )

            try:
                for scale_input_id in cls.SCALE_INPUTS:
                    cls.set_input_expression(tool, scale_input_id, lua_expr)
                applied += 1
            except Exception as e:
                print(f"Error applying to {tool.Name}: {e}")

        comp.EndUndo(True)
        return True, f"Applied to {applied} node(s)"

    @classmethod
    def remove_expression(cls, target_node_name=None):
        comp = cls.get_comp()
        if not comp:
            return False, "No active comp"

        _, _, nodes = cls.scan_3d_nodes()
        targets = [n for n in nodes if n["name"] == target_node_name] if target_node_name else nodes

        removed = 0
        comp.StartUndo("Remove DepthCorrect Expression")

        for n in targets:
            tool = n["tool"]
            try:
                removed_this = False
                for scale_input_id in cls.SCALE_INPUTS:
                    cls.set_input_expression(tool, scale_input_id, None)
                    removed_this = True
                if removed_this:
                    removed += 1
            except Exception as error:
                print(f"Error removing from {tool.Name}: {error}")

        comp.EndUndo(True)
        return True, f"Removed from {removed} node(s)"

# ==============================================================================
# PySide GUI Implementation
# ==============================================================================
class DepthCorrectUI(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super(DepthCorrectUI, self).__init__(parent)
        if not fusion_page_available():
            raise RuntimeError("DepthCorrect is available only on the Fusion page.")
        self.setWindowTitle("DepthCorrect 3D")
        self.resize(340, 500)
        self.setStyleSheet(DARK_STYLE)
        
        self.nodes_data = []
        self.init_ui()
        self.scan_nodes()

    def init_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # 1. Header
        header = QtWidgets.QHBoxLayout()
        title_box = QtWidgets.QVBoxLayout()
        
        t_label = QtWidgets.QLabel("DepthCorrect 3D")
        t_label.setObjectName("brand_title")
        sub_label = QtWidgets.QLabel("Fusion Dynamic Z-Scale")
        sub_label.setObjectName("brand_subtitle")
        
        title_box.addWidget(t_label)
        title_box.addWidget(sub_label)
        header.addLayout(title_box)
        header.addStretch()

        self.scan_btn = QtWidgets.QPushButton("↻ Scan")
        self.scan_btn.setFixedSize(60, 28)
        self.scan_btn.clicked.connect(self.scan_nodes)
        header.addWidget(self.scan_btn)

        layout.addLayout(header)

        # 2. Main Hero Action Button
        self.apply_btn = QtWidgets.QPushButton("Apply to Selected Nodes")
        self.apply_btn.setObjectName("hero_btn")
        self.apply_btn.clicked.connect(lambda: self.on_apply())
        layout.addWidget(self.apply_btn)

        # 3. Node List Card
        card = QtWidgets.QFrame()
        card.setObjectName("card")
        card_layout = QtWidgets.QVBoxLayout(card)
        card_layout.setContentsMargins(8, 8, 8, 8)

        list_header = QtWidgets.QHBoxLayout()
        list_title = QtWidgets.QLabel("3D NODES IN FLOW")
        list_title.setStyleSheet("font-size: 10px; font-weight: bold; color: #9aa59d;")
        self.badge_label = QtWidgets.QLabel("0 total")
        self.badge_label.setStyleSheet("color: #38e586; font-size: 10px; font-weight: bold;")
        
        list_header.addWidget(list_title)
        list_header.addStretch()
        list_header.addWidget(self.badge_label)
        card_layout.addLayout(list_header)

        self.node_list = QtWidgets.QListWidget()
        card_layout.addWidget(self.node_list)

        layout.addWidget(card)

        # 4. Settings Section
        self.lock_dist_cb = QtWidgets.QCheckBox("Lock to Current Camera Distance")
        self.lock_dist_cb.setChecked(True)
        self.lock_dist_cb.toggled.connect(self.toggle_custom_dist)
        layout.addWidget(self.lock_dist_cb)

        self.custom_dist_box = QtWidgets.QHBoxLayout()
        cd_label = QtWidgets.QLabel("Custom Ref Distance:")
        self.ref_dist_spin = QtWidgets.QDoubleSpinBox()
        self.ref_dist_spin.setRange(0.001, 10000.0)
        self.ref_dist_spin.setValue(1.0)
        self.ref_dist_spin.setSingleStep(0.1)

        self.custom_dist_box.addWidget(cd_label)
        self.custom_dist_box.addWidget(self.ref_dist_spin)
        
        # Hide custom distance controls by default
        self.custom_dist_widget = QtWidgets.QWidget()
        self.custom_dist_widget.setLayout(self.custom_dist_box)
        self.custom_dist_widget.setVisible(False)
        layout.addWidget(self.custom_dist_widget)

        # Status Bar / Toast
        self.status_label = QtWidgets.QLabel("")
        self.status_label.setAlignment(QtCore.Qt.AlignCenter)
        self.status_label.setStyleSheet("color: #38e586; font-size: 11px;")
        layout.addWidget(self.status_label)

    def show_toast(self, msg):
        self.status_label.setText(msg)
        QtCore.QTimer.singleShot(2500, lambda: self.status_label.setText(""))

    def toggle_custom_dist(self, checked):
        self.custom_dist_widget.setVisible(not checked)

    def scan_nodes(self):
        success, cam_name, nodes = DepthCorrectFusion.scan_3d_nodes()
        self.nodes_data = nodes
        self.node_list.clear()

        if not success:
            self.show_toast(cam_name)
            return

        selected_count = sum(1 for n in nodes if n["selected"])
        active_expr_count = sum(1 for n in nodes if n["has_expression"])

        self.badge_label.setText(f"{active_expr_count} active / {len(nodes)} total")

        if selected_count > 0:
            self.apply_btn.setText(f"Apply to Selected ({selected_count})")
        else:
            self.apply_btn.setText("Apply to All 3D Nodes")

        for n in nodes:
            item = QtWidgets.QListWidgetItem()
            status_str = " [Dynamic]" if n["has_expression"] else ""
            item.setText(f"{n['name']} ({n['type']})\nDist: {n['distance']}u{status_str}")
            
            if n["selected"]:
                item.setSelected(True)
            self.node_list.addItem(item)

    def on_apply(self, node_name=None):
        lock_cur = self.lock_dist_cb.isChecked()
        ref_dist = self.ref_dist_spin.value()

        success, msg = DepthCorrectFusion.apply_expression(
            target_node_name=node_name,
            lock_current=lock_cur,
            custom_ref=ref_dist
        )
        self.show_toast(msg)
        self.scan_nodes()

# Run Application
def run():
    if not fusion_page_available():
        print("DepthCorrect is available only on the Fusion page.")
        return None

    if "fuscript" in sys.executable.lower():
        return run_fusion_ui()

    app = QtWidgets.QApplication.instance()
    if app is None:
        app = QtWidgets.QApplication(sys.argv)

    dialog = DepthCorrectUI()
    dialog.setWindowFlags(QtCore.Qt.Window | QtCore.Qt.WindowStaysOnTopHint)
    dialog.setAttribute(QtCore.Qt.WA_DeleteOnClose, True)
    dialog.show()
    dialog.raise_()
    dialog.activateWindow()
    app.processEvents()

    event_loop = QtCore.QEventLoop()
    dialog.finished.connect(event_loop.quit)
    event_loop.exec()
    return dialog


def run_fusion_ui():
    """Run the complete panel through Fusion's native UI dispatcher."""
    if fusion is None or bmd_api is None:
        print("Fusion UI is unavailable in this script context.")
        return None

    ui = fusion.UIManager
    dispatcher = bmd_api.UIDispatcher(ui)
    window = dispatcher.AddWindow(
        {
            "ID": "DepthCorrect",
            "WindowTitle": "DepthCorrect 3D",
            "Geometry": [100, 100, 520, 520],
        },
        ui.VGroup(
            {"Spacing": 8},
            [
                ui.Label({
                    "Text": "DepthCorrect 3D | Fusion Dynamic Z-Scale",
                    "Weight": 0,
                }),
                ui.HGroup(
                    {"Spacing": 6, "Weight": 0},
                    [
                        ui.Button({"ID": "Scan", "Text": "Scan"}),
                        ui.Button({"ID": "Apply", "Text": "Apply to Selected / All"}),
                        ui.Button({"ID": "Remove", "Text": "Remove Expressions"}),
                    ],
                ),
                ui.CheckBox({
                    "ID": "LockDistance",
                    "Text": "Lock to current camera distance",
                    "Checked": True,
                    "Weight": 0,
                }),
                ui.HGroup(
                    {"Spacing": 6, "Weight": 0},
                    [
                        ui.Label({"Text": "Custom reference distance:"}),
                        ui.DoubleSpinBox({
                            "ID": "ReferenceDistance",
                            "Min": 0.001,
                            "Max": 10000.0,
                            "Value": 1.0,
                        }),
                    ],
                ),
                ui.Label({
                    "ID": "Status",
                    "Text": "Scanning Fusion composition...",
                }),
                ui.TextEdit({
                    "ID": "Nodes",
                    "ReadOnly": True,
                    "Text": "",
                }),
                ui.Button({"ID": "Close", "Text": "Close", "Weight": 0}),
            ],
        ),
    )
    items = window.GetItems()

    def update_scan(event=None):
        try:
            success, camera_name, nodes = DepthCorrectFusion.scan_3d_nodes()
            if not success:
                items["Status"].Text = str(camera_name)
                items["Nodes"].Text = ""
                return

            selected = sum(1 for node in nodes if node["selected"])
            active = sum(1 for node in nodes if node["has_expression"])
            items["Status"].Text = (
                f"Camera: {camera_name or 'none'} | "
                f"{active} active / {len(nodes)} total | {selected} selected"
            )
            if not nodes:
                items["Nodes"].Text = "No supported 3D nodes found."
                return

            lines = []
            for node in nodes:
                marker = "*" if node["selected"] else " "
                dynamic = " [DepthCorrect]" if node["has_expression"] else ""
                lines.append(
                    f"{marker} {node['name']} ({node['type']}) - "
                    f"distance: {node['distance']}u{dynamic}"
                )
            items["Nodes"].Text = "\\n".join(lines)
        except Exception as error:
            items["Status"].Text = f"Scan error: {error}"
            items["Nodes"].Text = ""

    def apply_nodes(event=None):
        try:
            success, message = DepthCorrectFusion.apply_expression(
                lock_current=bool(items["LockDistance"].Checked),
                custom_ref=float(items["ReferenceDistance"].Value),
            )
            items["Status"].Text = str(message)
            update_scan()
        except Exception as error:
            items["Status"].Text = f"Apply error: {error}"

    def remove_nodes(event=None):
        try:
            success, message = DepthCorrectFusion.remove_expression()
            items["Status"].Text = str(message)
            update_scan()
        except Exception as error:
            items["Status"].Text = f"Remove error: {error}"

    def close_window(event=None):
        dispatcher.ExitLoop()

    window.On.DepthCorrect.Close = close_window
    window.On.Scan.Clicked = update_scan
    window.On.Apply.Clicked = apply_nodes
    window.On.Remove.Clicked = remove_nodes
    window.On.Close.Clicked = close_window
    window.Show()
    update_scan()
    dispatcher.RunLoop()
    window.Hide()
    return window

if __name__ == "__main__":
    dialog = run()