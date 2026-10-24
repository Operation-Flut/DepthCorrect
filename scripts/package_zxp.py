#!/usr/bin/env python3
"""package_zxp.py — Build an Adobe ZXP package for the DepthCorrect AE panel.

ZXP is the Adobe CEP extension package format. This script bundles the AE
extension into a signed-style .zxp archive using the standard folder layout
expected by Adobe's Extension Builder / zxp-cli.

Usage:
    python scripts/package_zxp.py [--output dist/DepthCorrect-ae.zxp]
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AE_DIR = ROOT / "com.depthcorrect.zscale.ae"
CSXS_DIR = AE_DIR / "CSXS"


def build_zxp(output: Path) -> Path:
    if not CSXS_DIR.is_dir():
        raise FileNotFoundError(f"AE CSXS directory not found: {CSXS_DIR}")

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        output.unlink()

    # ZXP is a ZIP with a specific top-level structure: the manifest and all
    # resources live at the archive root.
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(CSXS_DIR.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(AE_DIR)
            archive.write(path, str(rel))

        # Bundle the remaining AE assets (icons, js, jsx, css, index.html).
        for subdir in ("icons", "js", "jsx", "css"):
            src = AE_DIR / subdir
            if not src.is_dir():
                continue
            for path in sorted(src.rglob("*")):
                if not path.is_file():
                    continue
                rel = path.relative_to(AE_DIR)
                archive.write(path, str(rel))

        index_html = AE_DIR / "index.html"
        if index_html.is_file():
            archive.write(index_html, "index.html")

    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the After Effects ZXP package.")
    parser.add_argument("--output", default="dist/DepthCorrect-ae.zxp",
                        help="Output .zxp path relative to the project root.")
    args = parser.parse_args()

    output = (ROOT / args.output).resolve()
    built = build_zxp(output)
    print(f"Created {built.relative_to(ROOT)} ({built.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())