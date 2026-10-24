# Changelog

Notable project changes are recorded here. Dates use ISO 8601.

## [1.0.0] - 2026-10-24

### Added

- After Effects CEP extension for dynamic 3D layer scaling.
- DaVinci Resolve Workflow Integration plugin for live depth-based scale correction on Fusion `Transform3D` nodes, driven by `Camera3D` distance.
- Plugin-specific setup guides, validation, packaging, and tag-based GitHub release automation.

### Notes

- The Resolve plugin operates in the Fusion page on 3D node graphs, not on timeline clips. It uses Fusion's native expression system to keep correction live as the camera or nodes move.
- The platform-specific Resolve `WorkflowIntegration.node` bridge is not distributed with this project.
