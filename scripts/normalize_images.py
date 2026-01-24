#!/usr/bin/env python3
"""
normalize_images.py

Normalizes an image dataset for ML training:

- Converts all images to JPEG
- Resizes to 224x224
- Center-crops while preserving aspect ratio
- Strips EXIF
- Renames deterministically: class_00001.jpg, class_00002.jpg, ...
- Skips corrupt images safely

Usage:
  python3 scripts/normalize_images.py /home/bjorn/projects/adblocker/images_to_train_on
"""

import sys
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    print("Error: Pillow library not found. Please install it with: pip install Pillow")
    sys.exit(1)

TARGET_SIZE = 224
VALID_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}


def process_class_folder(class_dir: Path):
    # Skip 'normalized' folders to avoid recursive processing
    if class_dir.name == "normalized":
        return

    images = sorted([p for p in class_dir.iterdir() if p.suffix.lower() in VALID_EXTS])

    if not images:
        print(f"[WARN] No images found in {class_dir}")
        return

    out_dir = class_dir / "normalized"
    out_dir.mkdir(exist_ok=True)

    print(f"\nProcessing class: {class_dir.name}")
    count = 0

    for idx, img_path in enumerate(images, start=1):
        try:
            with Image.open(img_path) as img:
                # Convert to RGB (strips alpha channel and EXIF)
                img = img.convert("RGB")

                # Calculate scaling to fit the shortest side to TARGET_SIZE
                w, h = img.size
                scale = TARGET_SIZE / min(w, h)
                new_w = int(w * scale)
                new_h = int(h * scale)
                
                # Use Resampling.BICUBIC for better quality if available, else BICUBIC
                resample_method = getattr(Image, "Resampling", Image).BICUBIC
                img = img.resize((new_w, new_h), resample_method)

                # Center crop
                left = (new_w - TARGET_SIZE) // 2
                top = (new_h - TARGET_SIZE) // 2
                img = img.crop((left, top, left + TARGET_SIZE, top + TARGET_SIZE))

                out_name = f"{class_dir.name}_{idx:05d}.jpg"
                out_path = out_dir / out_name

                img.save(out_path, "JPEG", quality=92, subsampling=0)

                count += 1

        except Exception as e:
            print(f"[SKIP] {img_path.name}: {e}")

    print(f"  -> {count} images written to {out_dir}")


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/normalize_images.py /path/to/dataset")
        print("\nNote: Your dataset should be organized into folders by class name, e.g.:")
        print("  dataset/trump/")
        print("  dataset/safe/")
        sys.exit(1)

    root = Path(sys.argv[1])

    if not root.exists():
        print(f"Dataset path does not exist: {root}")
        sys.exit(1)

    # Process each directory in the root as a separate class
    class_dirs = sorted([p for p in root.iterdir() if p.is_dir()])
    
    if not class_dirs:
        # If no subdirectories, maybe the user pointed directly to a class folder?
        # Let's check if the root itself contains images.
        root_images = [p for p in root.iterdir() if p.suffix.lower() in VALID_EXTS]
        if root_images:
            print(f"Found images in root. Processing '{root.name}' as a class.")
            process_class_folder(root)
        else:
            print("No class directories or images found in the specified path.")
            sys.exit(1)
    else:
        for class_dir in class_dirs:
            process_class_folder(class_dir)


if __name__ == "__main__":
    main()
