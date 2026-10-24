# build_native.ps1 — Build the DepthCorrect Resolve native bridge.
#
# Requires: CMake >= 3.16, a C++17 compiler, and Node.js headers.
#   npm install -g node-gyp
#
# Usage:
#   .\scripts\build_native.ps1 -Config Release
#   .\scripts\build_native.ps1 -Config Release -Platform x64

[CmdletBinding()]
param(
    [ValidateSet('Release', 'Debug')]
    [string]$Config = 'Release',
    [ValidateSet('x64', 'arm64')]
    [string]$Platform = 'x64'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$nativeDir = Join-Path $root 'com.depthcorrect.zscale.resolve\native'
$buildDir = Join-Path $nativeDir "build-$Config-$Platform"

Write-Host "Building native bridge ($Config/$Platform)..." -ForegroundColor Cyan

if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) {
    throw "CMake is required. Install it and ensure it is on PATH."
}

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

if ($IsWindows -or $env:OS -eq 'Windows_NT') {
    $arch = if ($Platform -eq 'x64') { 'x64' } else { 'ARM64' }
    cmake -S $nativeDir -B $buildDir -G "Visual Studio 17 2022" -A $arch -DCMAKE_BUILD_TYPE=$Config
    if ($LASTEXITCODE -ne 0) { throw "CMake configure failed." }
    cmake --build $buildDir --config $Config
    if ($LASTEXITCODE -ne 0) { throw "CMake build failed." }
} else {
    cmake -S $nativeDir -B $buildDir -DCMAKE_BUILD_TYPE=$Config
    if ($LASTEXITCODE -ne 0) { throw "CMake configure failed." }
    cmake --build $buildDir
    if ($LASTEXITCODE -ne 0) { throw "CMake build failed." }
}

# Copy the built .node file to the platform directory.
$platDir = if ($IsWindows -or $env:OS -eq 'Windows_NT') {
    Join-Path $nativeDir 'windows-x64'
} elseif ($IsMacOS) {
    Join-Path $nativeDir 'macos-universal'
} else {
    Join-Path $nativeDir 'linux-x64'
}

New-Item -ItemType Directory -Force -Path $platDir | Out-Null
Copy-Item -Force (Join-Path $buildDir "Release\WorkflowIntegration.node") (Join-Path $platDir 'WorkflowIntegration.node')
Write-Host "Built: $(Join-Path $platDir 'WorkflowIntegration.node')" -ForegroundColor Green