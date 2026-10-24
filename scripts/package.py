from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
PLUGINS = ("com.depthcorrect.zscale.ae", "com.depthcorrect.zscale.resolve")
EXCLUDED_PARTS = {".git", "node_modules", "__pycache__", "tests"}
EXCLUDED_NAMES = {"WorkflowIntegration.node", ".DS_Store", "Thumbs.db"}


def package_plugin(plugin_name: str) -> Path:
    source = ROOT / plugin_name
    if not source.is_dir():
        raise FileNotFoundError(f"Plugin directory does not exist: {source}")

    archive_path = DIST / f"{plugin_name}.zip"
    with ZipFile(archive_path, "w", ZIP_DEFLATED) as archive:
        for file_path in sorted(source.rglob("*")):
            if not file_path.is_file():
                continue
            relative = file_path.relative_to(source)
            if EXCLUDED_PARTS.intersection(relative.parts) or file_path.name in EXCLUDED_NAMES:
                continue
            archive.write(file_path, Path(plugin_name) / relative)
    return archive_path


def main() -> None:
    DIST.mkdir(exist_ok=True)
    for plugin_name in PLUGINS:
        archive_path = package_plugin(plugin_name)
        print(f"Created {archive_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
