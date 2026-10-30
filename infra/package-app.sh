#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo 'Usage: infra/package-app.sh /absolute/path/to/new-app.zip' >&2
  exit 1
fi

archive="$1"
if [ -e "$archive" ]; then
  echo "Refusing to overwrite existing archive: $archive" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/source" "$work/stage"

tar -C "$(dirname "$0")/.." \
  --exclude='./.git' --exclude='./.next' --exclude='./node_modules' \
  --exclude='./.env*' --exclude='./.copilot-azure' --exclude='./deploy.zip' \
  -cf - . | tar -C "$work/source" -xf -

docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$work/source:/workspace" -w /workspace node:22-bookworm npm ci
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$work/source:/workspace" -w /workspace node:22-bookworm npm run build

cp -R "$work/source/.next/standalone/." "$work/stage/"
mkdir -p "$work/stage/.next"
cp -R "$work/source/.next/static" "$work/stage/.next/static"
if [ -d "$work/source/public" ]; then
  cp -R "$work/source/public" "$work/stage/public"
fi
find "$work/stage" -name '.env*' -type f -delete

(cd "$work/stage" && zip -qr "$archive" .)
echo "Packaged standalone app: $archive"