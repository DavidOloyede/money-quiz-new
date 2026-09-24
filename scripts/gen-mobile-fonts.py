#!/usr/bin/env python3
"""
Regenerates apps/mobile/assets/fonts/*.ttf from the web's variable font
sources in public/fonts/. Native iOS/Android render a variable font at its
default instance only (Fraunces defaults to wght=900), and browsers' automatic
optical sizing doesn't exist there either — so mobile ships static instances
cut at the exact weights/opsz the design uses, one fontFamily name per weight
(the reliable React Native pattern).

Run after changing the font files or adding a weight:
    python3 -m venv .venv && .venv/bin/pip install fonttools brotli
    .venv/bin/python scripts/gen-mobile-fonts.py
"""

import os

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

# (source variable font, axis pins, output instance name)
JOBS = [
    ("public/fonts/inter-latin-wght-normal.woff2", {"wght": 400}, "Inter-Regular"),
    ("public/fonts/inter-latin-wght-normal.woff2", {"wght": 500}, "Inter-Medium"),
    ("public/fonts/inter-latin-wght-normal.woff2", {"wght": 600}, "Inter-SemiBold"),
    ("public/fonts/inter-latin-wght-normal.woff2", {"wght": 700}, "Inter-Bold"),
    # opsz pinned by role: 30 suits heading/hero sizes, 14 suits body-size verse text.
    # SOFT 0 keeps today's shapes; cut a SOFT 100 instance when mobile adopts it.
    ("public/fonts/fraunces-latin-soft-normal.woff2", {"wght": 600, "opsz": 30, "SOFT": 0}, "Fraunces-SemiBold"),
    ("public/fonts/fraunces-latin-soft-italic.woff2", {"wght": 400, "opsz": 14, "SOFT": 0}, "Fraunces-Italic"),
    # Nunito, the coach (docs/DESIGN.md): titles and buttons. It looks best bold.
    ("public/fonts/nunito-latin-wght-normal.woff2", {"wght": 600}, "Nunito-SemiBold"),
    ("public/fonts/nunito-latin-wght-normal.woff2", {"wght": 700}, "Nunito-Bold"),
    ("public/fonts/nunito-latin-wght-normal.woff2", {"wght": 800}, "Nunito-ExtraBold"),
]

OUT_DIR = "apps/mobile/assets/fonts"


def main() -> None:
    os.chdir(os.path.join(os.path.dirname(__file__), ".."))
    os.makedirs(OUT_DIR, exist_ok=True)
    for src, axes, out in JOBS:
        font = TTFont(src)
        instantiateVariableFont(font, axes, inplace=True)
        font.flavor = None  # woff2 -> plain ttf
        dst = os.path.join(OUT_DIR, f"{out}.ttf")
        font.save(dst)
        print(f"{dst} ({os.path.getsize(dst) // 1024} KB)")


if __name__ == "__main__":
    main()
