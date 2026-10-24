-- install_resolve.lua
-- DaVinci Resolve plugin installer for DepthCorrect.
--
-- Run this script from the Resolve Fusion page (Script > Run Script...).
-- It copies the plugin files into the Resolve extensions directory and
-- prints instructions for launching the plugin.
--
-- Requirements:
--   - DaVinci Resolve 18.6 or later
--   - The plugin must be built first (npm run package)
--
-- Usage:
--   1. Open DaVinci Resolve
--   2. Switch to the Fusion page
--   3. Script > Run Script... > select install_resolve.lua
--   4. Follow the on-screen instructions

local app = Resolve.appPath()
if not app then
    print("[DepthCorrect] ERROR: Could not determine Resolve application path.")
    return false
end

-- Determine the Resolve extensions directory.
-- macOS:   ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Extensions/
-- Windows:  %APPDATA%\Blackmagic Design\DaVinci Resolve\Support\Extensions\
-- Linux:    ~/.local/share/Blackmagic Design/DaVinci Resolve/Extensions/

local extDir
if Resolve.appPlatform() == "mac" then
    extDir = os.getenv("HOME") ..
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Extensions/"
elseif Resolve.appPlatform() == "win" then
    extDir = os.getenv("APPDATA") ..
        "\\Blackmagic Design\\DaVinci Resolve\\Extensions\\"
else
    extDir = os.getenv("HOME") ..
        "/.local/share/Blackmagic Design/DaVinci Resolve/Extensions/"
end

local pluginId = "com.depthcorrect.zscale.resolve"
local pluginDir = extDir .. pluginId

print("[DepthCorrect] Plugin ID: " .. pluginId)
print("[DepthCorrect] Target directory: " .. pluginDir)

-- Check if the plugin source exists.
local sourceDir = fusion:GetProjectPath() or ""
if sourceDir == "" then
    print("[DepthCorrect] ERROR: Could not determine project path. Please run this script from a Fusion composition.")
    return false
end

-- Create the target directory if it doesn't exist.
local ok, err = os.execute("mkdir -p \"" .. pluginDir .. "\"")
if not ok then
    print("[DepthCorrect] ERROR: Could not create plugin directory: " .. pluginDir)
    return false
end

-- Copy plugin files.
local files = {
    "main.js",
    "preload.js",
    "manifest.xml",
    "package.json",
    "index.html",
    "README.md",
}

-- Copy directories.
local dirs = {
    "css",
    "js",
    "native",
}

for _, dir in ipairs(dirs) do
    local src = sourceDir .. "/" .. dir
    local dst = pluginDir .. "/" .. dir
    os.execute("mkdir -p \"" .. dst .. "\"")
    -- Copy files within the directory.
    local handle = io.popen("ls -1 \"" .. src .. "\" 2>/dev/null")
    if handle then
        for file in handle:lines() do
            if file ~= "" then
                os.execute("cp -r \"" .. src .. "/" .. file .. "\" \"" .. dst .. "/\" 2>/dev/null")
            end
        end
        handle:close()
    end
end

for _, file in ipairs(files) do
    local src = sourceDir .. "/" .. file
    local dst = pluginDir .. "/" .. file
    os.execute("cp \"" .. src .. "\" \"" .. dst .. "\" 2>/dev/null")
end

print("[DepthCorrect] Plugin installed successfully!")
print("[DepthCorrect] To use the plugin:")
print("  1. Restart DaVinci Resolve")
print("  2. Go to the Deliver page")
print("  3. Find the DepthCorrect panel in the Extensions section")
print("  4. Or search for 'DepthCorrect' in the Resolve UI")

return true