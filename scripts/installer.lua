-- DepthCorrect for DaVinci Resolve / Fusion - Auto Installer
-- The Resolve integration is a normal Python script, not a Workflow Integration plugin.

local repo = "OseMine/DepthCorrect"
local download_url = "https://github.com/" .. repo .. "/releases/latest/download/DepthCorrect-resolve.zip"

print("=== DepthCorrect Installer ===")
print("Download the latest Resolve script archive from: " .. download_url)
print("Extract it, then run DepthCorrect/DepthCorrect.py from Resolve/Fusion's scripting environment.")
print("No WorkflowIntegration.node or Electron workflow plugin is required.")
