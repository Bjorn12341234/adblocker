#!/usr/bin/env python3
"""
deduplicate_images.py

Scans image folders and removes byte-for-byte duplicates using SHA256 hashing.
"""

import sys
import hashlib
from pathlib import Path

def get_hash(file_path):
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def deduplicate_folder(folder_path):
    folder = Path(folder_path)
    if not folder.exists():
        print(f"Folder not found: {folder}")
        return

    print(f"Deduplicating: {folder}")
    hashes = {}
    duplicates = 0
    total = 0

    # Include common image extensions
    exts = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}
    
    for file_path in folder.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in exts:
            total += 1
            file_hash = get_hash(file_path)
            if file_hash in hashes:
                print(f"  [DUP] Removing {file_path.name} (Duplicate of {hashes[file_hash]})")
                file_path.unlink()
                duplicates += 1
            else:
                hashes[file_hash] = file_path.name

    print(f"  Done. Checked {total} files. Removed {duplicates} duplicates.")

def main():
    root = Path('images_to_train_on')
    if not root.exists():
        print("Root directory images_to_train_on not found.")
        return

    for class_dir in root.iterdir():
        if class_dir.is_dir() and class_dir.name != 'normalized':
            deduplicate_folder(class_dir)

if __name__ == "__main__":
    main()
