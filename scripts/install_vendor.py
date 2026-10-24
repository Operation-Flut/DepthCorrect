import os
import subprocess
import sys

def setup_vendor():
    # Ermittelt den Ordner, in dem dieses Skript liegt (scripts/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Geht eine Ebene höher ins Projekt-Rootverzeichnis und von dort in DepthCorrect/vendor
    root_dir = os.path.dirname(script_dir)
    vendor_dir = os.path.join(root_dir, "DepthCorrect", "vendor")
    
    # Ordner erstellen, falls er nicht existiert
    os.makedirs(vendor_dir, exist_ok=True)
    
    print(f"Installiere PySide6 direkt in: {vendor_dir}")
    
    # Pip-Installation direkt in den Vendor-Pfad
    subprocess.check_call([
        sys.executable, "-m", "pip", "install",
        "PySide6",
        "--target", vendor_dir,
        "--no-warn-script-location"
    ])
    
    print("\nErfolgreich installiert! Der vendor-Ordner ist bereit für DaVinci Resolve.")

if __name__ == "__main__":
    setup_vendor()