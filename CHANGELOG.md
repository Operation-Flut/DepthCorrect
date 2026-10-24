# Changelog

Notable project changes are recorded here. Dates use ISO 8601.

## [1.0.0] - 2026-10-24

### Added

- After Effects CEP extension for dynamic 3D layer scaling.
- Standalone Python/PySide panel for DaVinci Resolve and Fusion 3D compositions.
- Separate After Effects and Resolve release archives.
- Repository validation, tests, packaging, and tag-based GitHub release automation.

### Notes

- The Resolve tool runs as a normal Fusion Python script through `DaVinciResolveScript` or the `bmd` scripting API.
- It does not use DaVinci Resolve Workflow Integration, Electron, or a native `.node` bridge.
- Qt bindings are intentionally excluded from release archives; use the bundled Resolve Python environment or `scripts/install_vendor.py` for local setup.
