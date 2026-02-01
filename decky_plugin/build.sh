#!/bin/bash
rm -rf dist
npm run build
if [ $? -ne 0 ]; then
    echo "Build failed"
    exit 1
fi
echo "Copying backend files..."
cp main.py dist/main.py
cp plugin.json dist/plugin.json
cp README.md dist/README.md
if [ -d "assets" ]; then
    cp -r assets dist/assets
fi
echo "Build complete in dist/"
