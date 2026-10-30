#!/usr/bin/env bash
# Gera dist/public_html.zip para subir na public_html da Hostinger.
# Troca o ?v=dev de css e js por um carimbo da hora: o navegador guarda esses arquivos
# por 7 dias, e o carimbo novo obriga a buscar a versão nova a cada publicação.
set -euo pipefail
raiz="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
cp -r "$raiz/site/." "$tmp/"
sed -i "s/?v=dev/?v=$(date +%Y%m%d%H%M)/g" "$tmp/index.html"
mkdir -p "$raiz/dist"
rm -f "$raiz/dist/public_html.zip"
(cd "$tmp" && zip -qr "$raiz/dist/public_html.zip" .)
rm -rf "$tmp"
echo "dist/public_html.zip"
