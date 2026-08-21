#!/usr/bin/env bash

# Exit immediately on errors
set -euo pipefail

# Target folder: pass as 1st argument or default to current directory
TARGET_DIR="img/"

echo "=========================================="
echo " Starting Bulk WebP Conversion"
echo " Directory: $TARGET_DIR"
echo "=========================================="

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "❌ Error: 'cwebp' tool not found. Install it with: sudo apt install webp"
    exit 1
fi

count=0

# Enable case-insensitive globbing to catch .JPG, .PNG, etc.
shopt -s nullglob nocaseglob
files=("$TARGET_DIR"/*.png "$TARGET_DIR"/*.jpg "$TARGET_DIR"/*.jpeg "$TARGET_DIR"/*.tiff "$TARGET_DIR"/*.tif)
shopt -u nullglob nocaseglob

if [ ${#files[@]} -eq 0 ]; then
    echo "⚠️ No supported images found in '$TARGET_DIR'."
    exit 0
fi

for file in "${files[@]}"; do
    # Skip directories
    [ -f "$file" ] || continue

    dir_name=$(dirname "$file")
    base_name=$(basename "$file")
    filename_no_ext="${base_name%.*}"

    output_file="${dir_name}/${filename_no_ext}.webp"

    echo "🖼️  Converting: $base_name -> ${filename_no_ext}.webp"

    # -q 82: optimal quality/size balance
    # -m 6: best compression efficiency
    # -sharp_yuv: crisp RGB-YUV edge detail
    # -mt: multi-threaded processing
    # -metadata none: strip excess metadata for minimal file size
    cwebp -q 82 -m 6 -sharp_yuv -mt -metadata none "$file" -o "$output_file"

    count=$((count + 1))
done

echo "=========================================="
echo "✅ Done! Successfully converted $count images."
echo "=========================================="