from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
EXCLUDED_PARTS = {".git", "node_modules", "__pycache__", "tests", "vendor"}
EXCLUDED_NAMES = {".DS_Store", "Thumbs.db"}


PLUGIN_FILES = (
    ("com.depthcorrect.zscale.ae", "DepthCorrect-after-effects.zip"),
    ("DepthCorrect", "DepthCorrect-resolve.zip"),
)


def package_plugin(source_name: str, archive_name: str) -> Path:
    source = ROOT / source_name
    if not source.is_dir():
        raise FileNotFoundError(f"Plugin directory does not exist: {source}")

    archive_path = DIST / archive_name
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for file_path in sorted(source.rglob("*")):
            if not file_path.is_file():
                continue
            relative = file_path.relative_to(source)
            if EXCLUDED_PARTS.intersection(relative.parts) or file_path.name in EXCLUDED_NAMES:
                continue
            archive.write(file_path, Path(source_name) / relative)
    return archive_path


def main() -> None:
    DIST.mkdir(exist_ok=True)
    for archive_path in DIST.glob("*.zip"):
        archive_path.unlink()
    for source_name, archive_name in PLUGIN_FILES:
        archive_path = package_plugin(source_name, archive_name)
        print(f"Created {archive_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
