#!/usr/bin/env python
"""
DepthCorrect for DaVinci Resolve Fusion 3D
Ported from After Effects CEP Extension
Dynamic Perspective & Z-Scale compensation for Fusion 3D Nodes.
"""

import sys
import os

# Fügt den lokalen 'vendor'-Ordner (relativ zum Skript) zum Suchpfad hinzu
script_dir = os.path.dirname(os.path.abspath(__file__))
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

# Check for Resolve/Fusion environment
try:
    import DaVinciResolveScript as dvr
    resolve = dvr.scriptapp("Resolve")
    fusion = resolve.Fusion()
except Exception:
    # Standalone Fusion or internal environment fallback
    if 'fusion' not in globals():
        try:
            import bmd
            fusion = bmd.scriptapp("Fusion")
        except Exception:
            fusion = None

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
    @staticmethod
    def get_comp():
        if fusion:
            return fusion.CurrentComp
        return None

    @staticmethod
    def find_camera(comp):
        if not comp:
            return None
        # Find active or first Camera3D node
        for tool in comp.GetToolList(False).values():
            if tool.GetAttrs("SOLO_ID") == "Camera3D" or "Camera3D" in tool.ID:
                return tool
        return None

    @staticmethod
    def get_distance_to_camera(node, cam_node):
        if not cam_node or not node:
            return 1.0
        try:
            # Get 3D translation values
            c_x = cam_node.Transform3D.Translate.X[1]
            c_y = cam_node.Transform3D.Translate.Y[1]
            c_z = cam_node.Transform3D.Translate.Z[1]

            n_x = node.Transform3D.Translate.X[1]
            n_y = node.Transform3D.Translate.Y[1]
            n_z = node.Transform3D.Translate.Z[1]

            dx, dy, dz = n_x - c_x, n_y - c_y, n_z - c_z
            dist = math.sqrt(dx*dx + dy*dy + dz*dz)
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
                dist = cls.get_distance_to_camera(tool, cam)

                # Check if expression exists on Scale
                has_expr = False
                try:
                    expr = tool.Transform3D.Scale.X.GetExpression()
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
            ref_dist = cls.get_distance_to_camera(tool, cam) if lock_current else custom_ref

            # LUA Expression for Fusion 3D Scale
            # Formula calculates distance dynamically relative to Camera3D position
            lua_expr = f"""-- DepthCorrect Dynamic Scale
(function()
    local cam = {cam.Name}
    local cx, cy, cz = cam.Transform3D.Translate.X, cam.Transform3D.Translate.Y, cam.Transform3D.Translate.Z
    local sx, sy, sz = Transform3D.Translate.X, Transform3D.Translate.Y, Transform3D.Translate.Z
    local dx, dy, dz = sx - cx, sy - cy, sz - cz
    local d = math.sqrt(dx*dx + dy*dy + dz*dz)
    return d / math.max(0.001, {ref_dist})
end)()"""

            try:
                # Apply to Scale X, Y, Z
                tool.Transform3D.Scale.X.SetExpression(lua_expr)
                tool.Transform3D.Scale.Y.SetExpression(lua_expr)
                tool.Transform3D.Scale.Z.SetExpression(lua_expr)
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
                tool.Transform3D.Scale.X.SetExpression(None)
                tool.Transform3D.Scale.Y.SetExpression(None)
                tool.Transform3D.Scale.Z.SetExpression(None)
                removed += 1
            except Exception:
                pass

        comp.EndUndo(True)
        return True, f"Removed from {removed} node(s)"

# ==============================================================================
# PySide GUI Implementation
# ==============================================================================
class DepthCorrectUI(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super(DepthCorrectUI, self).__init__(parent)
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
    app = QtWidgets.QApplication.instance()
    if not app:
        app = QtWidgets.QApplication(sys.argv)
    dialog = DepthCorrectUI()
    dialog.show()
    return dialog

if __name__ == "__main__":
    dialog = run()