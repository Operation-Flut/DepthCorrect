-- install_resolve.lua
-- DaVinci Resolve Workflow Integration Plugin installer for DepthCorrect.
--
-- Run this script from Resolve's Fusion page with Script > Run Script....
-- It copies this plugin into Resolve's Workflow Integration Plugins directory
-- and copies the SDK bridge from Resolve's installed SamplePlugin.
--
-- SDK source locations:
--   Windows:
--     C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\Developer\
--     Workflow Integrations\Examples\SamplePlugin\WorkflowIntegration.node
--   macOS:
--     /Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/
--     Workflow Integrations/Examples/SamplePlugin/WorkflowIntegration.node
--
-- Plugin target locations:
--   Windows: C:\ProgramData\Blackmagic Design\DaVinci Resolve\Support\
--             Workflow Integration Plugins\com.depthcorrect.zscale.resolve\
--   macOS:   ~/Library/Application Support/Blackmagic Design/DaVinci Resolve/
--             Workflow Integration Plugins/com.depthcorrect.zscale.resolve/

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

local function run(command)
    local result = os.execute(command)
    return result ~= false and result ~= nil and (type(result) ~= "number" or result == 0)
end

local platform = string.lower(tostring(Resolve.appPlatform and Resolve.appPlatform() or ""))
local isWindows = platform == "win" or platform == "windows" or platform:find("windows", 1, true) ~= nil
local isMac = platform == "mac" or platform == "macos" or platform:find("mac", 1, true) ~= nil

local separator
local baseDir
local sdkPath
local nativeDirName

if isWindows then
    separator = "\\"
    local programData = os.getenv("PROGRAMDATA") or "C:\\ProgramData"
    local resolveData = programData .. "\\Blackmagic Design\\DaVinci Resolve\\Support"
    baseDir = resolveData .. "\\Workflow Integration Plugins"
    sdkPath = resolveData ..
        "\\Developer\\Workflow Integrations\\Examples\\SamplePlugin\\WorkflowIntegration.node"
    nativeDirName = "windows-x64"
elseif isMac then
    separator = "/"
    local developerRoots = {
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer",
        (os.getenv("HOME") or "") ..
            "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer"
    }
    baseDir = (os.getenv("HOME") or "~") ..
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Workflow Integration Plugins"
    sdkPath = developerRoots[1] ..
        "/Workflow Integrations/Examples/SamplePlugin/WorkflowIntegration.node"
    nativeDirName = "macos-universal"
else
    return fail("Unsupported Resolve platform: " .. platform .. ". This installer supports Windows and macOS.")
end

local pluginId = "com.depthcorrect.zscale.resolve"
local pluginDir = baseDir .. separator .. pluginId
local nativeDir = pluginDir .. separator .. "native" .. separator .. nativeDirName

-- Lua's debug source gives the absolute path when this script is run from a file.
local source = debug.getinfo(1, "S").source or ""
if source:sub(1, 1) ~= "@" then
    return fail("Run install_resolve.lua as a file, not from the Lua console.")
end
source = source:sub(2)

local sourceDir = source:match("^(.+)[/\\][^/\\]+$")
if not sourceDir or sourceDir == "" then
    return fail("Could not determine the installer directory.")
end

-- On macOS, prefer the system Developer directory, but support a per-user
-- Resolve Developer directory when the system sample is not present.
if isMac then
    local systemSdk = sdkPath
    local userSdk = (os.getenv("HOME") or "") ..
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/" ..
        "Workflow Integrations/Examples/SamplePlugin/WorkflowIntegration.node"
    if run("test -f " .. shellQuote(systemSdk, false)) then
        sdkPath = systemSdk
    else
        sdkPath = userSdk
    end
end

print("[DepthCorrect] Plugin ID: " .. pluginId)
print("[DepthCorrect] Source: " .. sourceDir)
print("[DepthCorrect] Target: " .. pluginDir)
print("[DepthCorrect] Resolve SDK bridge: " .. sdkPath)

local sourceArg = shellQuote(sourceDir, isWindows)
local targetArg = shellQuote(pluginDir, isWindows)
local nativeArg = shellQuote(nativeDir, isWindows)
local sdkArg = shellQuote(sdkPath, isWindows)
local copyPluginCommand
local copySdkCommand

if isWindows then
    -- xcopy copies the plugin tree. The SDK bridge is copied separately so it
    -- is never part of the source archive or repository.
    local sourceWildcard = shellQuote(sourceDir .. separator .. "*", true)
    copyPluginCommand = "if not exist " .. targetArg .. " mkdir " .. targetArg ..
        " && xcopy /E /I /Y /Q " .. sourceWildcard .. " " .. targetArg
    copySdkCommand = "if not exist " .. sdkArg .. " exit /b 2" ..
        " && if not exist " .. nativeArg .. " mkdir " .. nativeArg ..
        " && copy /Y " .. sdkArg .. " " .. nativeArg .. separator
else
    copyPluginCommand = "mkdir -p " .. targetArg .. " && cp -R " .. sourceArg .. "/. " .. targetArg .. "/"
    copySdkCommand = "test -f " .. sdkArg ..
        " && mkdir -p " .. nativeArg ..
        " && cp -f " .. sdkArg .. " " .. nativeArg .. "/"
end

if not run(copyPluginCommand) then
    return fail("Could not copy the plugin into the Workflow Integration Plugins directory.")
end

if not run(copySdkCommand) then
    return fail("Could not find or copy Resolve's WorkflowIntegration.node from the SamplePlugin SDK path.")
end

print("[DepthCorrect] Plugin and Resolve SDK bridge installed successfully.")
print("[DepthCorrect] Restart DaVinci Resolve, then open Workspace > Workflow Integrations > DepthCorrect.")
return true