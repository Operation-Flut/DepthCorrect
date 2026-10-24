# DepthCorrect v1.0.0 — Release Notes

## What's New

- After Effects CEP extension (`com.depthcorrect.zscale`) with dynamic Z-Scale expressions
- DaVinci Resolve Workflow Integration plugin (`com.depthcorrect.zscale.resolve`)
- Material Design 3 UI for both platforms
- GitHub Actions CI + release automation
- MIT licensed, ready for public release

## Installation

See README.md for AE and Resolve install paths.

## Known Issues

- Resolve plugin relies on `WorkflowIntegration.node`; only available in Resolve Studio 18.5+
- AE expressions require 3D layer + active camera for accurate distance calculation
