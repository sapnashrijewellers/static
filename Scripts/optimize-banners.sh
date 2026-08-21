#!/usr/bin/env bash

set -uo pipefail

# Auto-detect directory
if [ -d "./img/banner" ]; then
    SRC_DIR="./img/banner"
elif [ -d "./static/img/banner" ]; then
    SRC_DIR="./static/img/banner"
elif [ -d "./public/static/img/banner" ]; then
    SRC_DIR="./public/static/img/banner"
else
    SRC_DIR="${1:-.}"
fi

OUT_DIR="${SRC_DIR}/optimized"
mkdir -p "$OUT_DIR"

echo "=========================================="
echo " Starting Banner WebP Optimization"
echo " Source: $SRC_DIR"
echo " Output: $OUT_DIR"
echo "=========================================="

if ! command -v cwebp &> /dev/null; then
    echo "❌ Error: 'cwebp' tool not found. Install with: sudo apt install webp"
    exit 1
fi

processed_count=0
skipped_count=0

# Iterate through every file in the banner directory
for file in "$SRC_DIR"/*; do
    # Skip directories
    [ -f "$file" ] || continue

    filename=$(basename "$file")
    raw_name="${filename%.*}"
    clean_name=$(printf '%s' "$raw_name" | tr -d '[:space:]\r\n\302\240')
    ext="${filename##*.}"

    # Only process PNG / JPG files
    case "$(echo "$ext" | tr '[:upper:]' '[:lower:]')" in
        png|jpg|jpeg)
            ;;
        *)
            continue
            ;;
    esac

    # Match Desktop (-d) vs Mobile (-m)
    if [[ "$clean_name" =~ -[dD]$ ]]; then
        out_file="${OUT_DIR}/${clean_name}.webp"
        echo "🖼️  Processing Desktop Banner: $filename -> ${clean_name}.webp"
        cwebp -q 82 -m 6 -sharp_yuv -mt -metadata none -resize 2400 800 "$file" -o "$out_file"
        processed_count=$((processed_count + 1))

    elif [[ "$clean_name" =~ -[mM]$ ]]; then
        out_file="${OUT_DIR}/${clean_name}.webp"
        echo "📱 Processing Mobile Banner:  $filename -> ${clean_name}.webp"
        cwebp -q 80 -m 6 -sharp_yuv -mt -metadata none -resize 1080 810 "$file" -o "$out_file"
        processed_count=$((processed_count + 1))

    else
        echo "⏭️  Skipping non-conforming file: $filename"
        skipped_count=$((skipped_count + 1))
    fi
done

echo "=========================================="
echo "✅ Banner optimization finished!"
echo "✨ Processed: $processed_count"
echo "⏭️  Skipped:   $skipped_count"
echo "=========================================="
