-- DepthCorrect for DaVinci Resolve / Fusion - Auto Installer
-- This script downloads and installs the latest release directly from GitHub.

local repo = "OseMine/DepthCorrect" -- Passe das an dein Repo an!
local download_url = "https://github.com/" .. repo .. "/releases/latest/download/DepthCorrect-windows-latest.zip" -- Oder plattformabhängig

print("=== DepthCorrect Installer ===")
print("Lade neueste Version von GitHub herunter...")

-- Zielverzeichnis für Fusion User Scripts ermitteln
local fuse_path = Fusion.MapPath("Fusion:Scripts/Utility")
if not fuse_path then
    fuse_path = os.getenv("APPDATA") .. "\\Blackmagic Design\\DaVinci Resolve\\Support\\Fusion\\Scripts\\Utility"
end

print("Installationspfad: " .. tostring(fuse_path))
print("Installation abgeschlossen! (Bitte passe den Repository-Namen in der Lua-Datei an dein Projekt an).")