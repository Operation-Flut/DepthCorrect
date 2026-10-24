# Changelog

Notable project changes are recorded here. Dates use ISO 8601.

## [1.0.0] - 2026-10-24

### Added

- After Effects CEP extension for dynamic 3D layer scaling.
- DaVinci Resolve Workflow Integration plugin for manually driven, static clip zoom correction.
- Plugin-specific setup guides, validation, packaging, and tag-based GitHub release automation.

### Notes

- Resolve's timeline scripting API does not expose AE-style dynamic expressions. Resolve correction requires a manually supplied depth per clip and is not animated.
- The platform-specific Resolve `WorkflowIntegration.node` bridge is not distributed with this project.
