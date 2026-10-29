#!/usr/bin/env python3
"""Gera prototipo/index.html (a prévia de um arquivo só) a partir da pasta site/.

O site de verdade é a pasta site/. A prévia junta página, estilo e código num arquivo,
com as mesmas imagens em midia/, para ser publicada como uma página só.
Uso: python3 scripts/build-preview.py
"""
import pathlib, re

raiz = pathlib.Path(__file__).resolve().parent.parent
site = raiz / "site"
html = (site / "index.html").read_text(encoding="utf-8")
css = (site / "css" / "style.css").read_text(encoding="utf-8")
config = (site / "js" / "config.js").read_text(encoding="utf-8")
app = (site / "js" / "app.js").read_text(encoding="utf-8")

fontes = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', html).group(1)
corpo = html[html.index("<body>") + len("<body>"):html.index('<script src="https://cdnjs')].strip()

saida = f"""<title>Helena &amp; Italo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fontes}">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
{css}
</style>

{corpo}

<script>
{config}
</script>
<script>
{app}
</script>
"""
(raiz / "prototipo" / "index.html").write_text(saida, encoding="utf-8")
print("prototipo/index.html gerado a partir de site/")
