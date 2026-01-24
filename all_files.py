#!/usr/bin/env python3
"""
all_files.py

Creates a deterministic, source-focused dump of the adblocker project.

Includes:
- Filtered project tree
- File contents for text / source files
- Skips binaries and large artifacts

Excludes:
- node_modules/
- dist/
- coverage/
- .git/
- .gemini/
- .DS_Store
- *.log
- tokenizer.json in siglip model folder
- Any file larger than 0.5 MB

Output:
  project_dump.txt (project root)
"""

from pathlib import Path
import fnmatch

# --------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------

PROJECT_ROOT = Path("/home/bjorn/projects/adblocker")
OUTPUT_FILE = PROJECT_ROOT / "project_dump.txt"

EXCLUDE_DIRS = {
    "node_modules",
    "dist",
    "coverage",
    ".git",
    ".gemini",
}

EXCLUDE_FILES = {
    ".DS_Store",
}

EXCLUDE_PATTERNS = [
    "*.log",
]

# Explicit file to exclude
EXPLICIT_EXCLUDES = {
    PROJECT_ROOT / "src/assets/models/siglip-base-patch16-224/tokenizer.json"
}

# Allowed text extensions
ALLOWED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".md", ".txt", ".yml", ".yaml",
    ".html", ".css", ".scss",
    ".sh", ".bash",
    ".env",
}

MAX_FILE_SIZE = 512 * 1024  # 0.5 MB

# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------

def is_excluded(path: Path) -> bool:
    # Explicit path exclusion
    try:
        if path.resolve() in EXPLICIT_EXCLUDES:
            return True
    except Exception:
        pass

    parts = set(path.parts)

    # Excluded directories
    if any(part in EXCLUDE_DIRS for part in parts):
        return True

    # Excluded filenames
    if path.name in EXCLUDE_FILES:
        return True

    # Excluded patterns
    for pattern in EXCLUDE_PATTERNS:
        if fnmatch.fnmatch(path.name, pattern):
            return True

    return False


def is_allowed_file(path: Path) -> bool:
    if not path.is_file():
        return False

    # Extension filter
    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        return False

    # Size filter (hard limit 0.5 MB)
    try:
        if path.stat().st_size > MAX_FILE_SIZE:
            return False
    except OSError:
        return False

    return True


def collect_tree(root: Path):
    files = []
    for path in sorted(root.rglob("*")):
        if is_excluded(path):
            continue
        files.append(path)
    return files


# --------------------------------------------------------------------------------------
# Main dump logic
# --------------------------------------------------------------------------------------

def main():
    entries = collect_tree(PROJECT_ROOT)

    with OUTPUT_FILE.open("w", encoding="utf-8", errors="replace") as out:
        out.write(f"PROJECT ROOT: {PROJECT_ROOT}\n")
        out.write("=" * 100 + "\n\n")

        # ---------------- Tree Section ----------------
        out.write("FILE TREE\n")
        out.write("-" * 100 + "\n")
        for path in entries:
            rel = path.relative_to(PROJECT_ROOT)
            out.write(str(rel) + ("\n" if path.is_file() else "/\n"))

        out.write("\n\n")

        # ---------------- File Contents Section ----------------
        out.write("FILE CONTENTS\n")
        out.write("-" * 100 + "\n")

        for path in entries:
            if not is_allowed_file(path):
                continue

            rel = path.relative_to(PROJECT_ROOT)

            out.write("\n" + "=" * 100 + "\n")
            out.write(f"FILE: {rel}\n")
            out.write("=" * 100 + "\n\n")

            try:
                with path.open("r", encoding="utf-8", errors="replace") as f:
                    out.write(f.read())
            except Exception as e:
                out.write(f"[ERROR READING FILE: {e}]\n")

    print(f"Project dump written to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()

