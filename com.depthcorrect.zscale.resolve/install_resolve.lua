-- install_resolve.lua
-- DaVinci Resolve Workflow Integration Plugin installer for DepthCorrect.
--
-- Run this script from Resolve's Fusion page with Script > Run Script....
-- The script installs the folder containing this file into Resolve's platform
-- specific Workflow Integration Plugins directory.
--
-- Target directories:
--   Windows: C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Workflow Integration Plugins\
--   macOS:   ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins/
--
-- Requirements:
--   - DaVinci Resolve 18.5 or later
--   - The matching WorkflowIntegration.node supplied by the local Resolve SDK

local function fail(message)
    print("[DepthCorrect] ERROR: " .. message)
    return false
end

local function shellQuote(value, windows)
    if windows then
        return '"' .. tostring(value):gsub('"', '""') .. '"'
    end
    return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end

local platform = string.lower(tostring(Resolve.appPlatform and Resolve.appPlatform() or ""))
local isWindows = platform == "win" or platform == "windows" or platform:find("windows", 1, true) ~= nil
local isMac = platform == "mac" or platform == "macos" or platform:find("mac", 1, true) ~= nil

local baseDir
if isWindows then
    -- PROGRAMDATA is normally C:\ProgramData. Keep the documented path
    -- explicit so the installer does not accidentally use the per-user APPDATA
    -- directory.
    baseDir = (os.getenv("PROGRAMDATA") or "C:\\ProgramData") ..
        "\\Blackmagic Design\\DaVinci Resolve\\Support\\Workflow Integration Plugins"
elseif isMac then
    baseDir = (os.getenv("HOME") or "~") ..
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins"
else
    return fail("Unsupported Resolve platform: " .. platform .. ". This installer supports Windows and macOS.")
end

local pluginId = "com.depthcorrect.zscale.resolve"
local pluginDir = baseDir .. (isWindows and "\\" or "/") .. pluginId

-- Resolve does not expose a universal script-directory API. Lua's debug
-- source value gives us the absolute path when the script is run from a file.
local source = debug.getinfo(1, "S").source or ""
if source:sub(1, 1) == "@" then
    source = source:sub(2)
else
    return fail("Run install_resolve.lua as a file, not from the Lua console.")
end

local separator = isWindows and "\\" or "/"
local sourceDir = source:match("^(.+)[/\\][^/\\]+$")
if not sourceDir or sourceDir == "" then
    return fail("Could not determine the installer directory.")
end

print("[DepthCorrect] Plugin ID: " .. pluginId)
print("[DepthCorrect] Source: " .. sourceDir)
print("[DepthCorrect] Target: " .. pluginDir)

local sourceArg = shellQuote(sourceDir, isWindows)
local targetArg = shellQuote(pluginDir, isWindows)
local command

if isWindows then
    -- xcopy copies the complete plugin tree, including native platform
    -- directories and any locally supplied WorkflowIntegration.node file.
    local sourceWildcard = shellQuote(sourceDir .. separator .. "*", true)
    command = "if not exist " .. targetArg .. " mkdir " .. targetArg ..
        " && xcopy /E /I /Y /Q " .. sourceWildcard .. " " .. targetArg
else
    command = "mkdir -p " .. targetArg .. " && cp -R " .. sourceArg .. "/. " .. targetArg .. "/"
end

local result = os.execute(command)
local exitCode = type(result) == "number" and result or 0
if result == false or exitCode ~= 0 then
    return fail("Could not copy the plugin into the Workflow Integration Plugins directory.")
end

print("[DepthCorrect] Plugin installed successfully.")
print("[DepthCorrect] Restart DaVinci Resolve, then open Workspace > Workflow Integrations > DepthCorrect.")
return true