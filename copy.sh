#!/bin/bash
# Build script to copy all sentinel files to the project directory
TARGET="/Users/parthlodaya/sentinel"

# Copy all files from this directory structure
find "$(dirname "$0")/sentinel" -type f | while read src; do
  dest="$TARGET/${src#*/sentinel/}"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
done

echo "All files copied to $TARGET"
