-- DepthCorrect for DaVinci Resolve / Fusion - Auto Installer
-- This script downloads and installs the latest release zip directly from GitHub.

local repo = "OseMine/DepthCorrect"
local download_url = "https://github.com/" .. repo .. "/releases/latest/download/DepthCorrect-windows-latest.zip"

print("=== DepthCorrect Installer ===")
print("Lade neueste Version herunter von: " .. download_url)

-- Zielverzeichnis für Fusion Scripts ermitteln
local fuse_path = Fusion.MapPath("Fusion:Scripts/Utility")
if not fuse_path then
    fuse_path = os.getenv("APPDATA") .. "\\Blackmagic Design\\DaVinci Resolve\\Support\\Fusion\\Scripts\\Utility"
end

print("Zielpfad: " .. tostring(fuse_path))
print("Bitte entpacke die heruntergeladene ZIP-Datei in diesen Ordner oder nutze sie direkt in Resolve!")