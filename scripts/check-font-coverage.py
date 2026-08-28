#!/usr/bin/env python3
"""Guard: every shipped Futura PT face must cover the Turkish alphabet (+ Cyrillic, ₺/€, №).

Background (2026-08-28): the previous cdnfonts "FuturaCyrillic" .woff cut had ASCII + Cyrillic only —
no Latin-1/Latin-Ext — so Ç ç Ğ ğ İ ı Ö ö Ş ş Ü ü fell through to the Arial fallback and rendered
visibly thinner. Run after any font swap:  python3 scripts/check-font-coverage.py   (needs fontTools)
"""
import glob, os, sys
from fontTools.ttLib import TTFont

REQUIRED = {
    'Turkish': 'ÇçĞğİıÖöŞşÜü',
    'Latin-1 extras': 'ÄäÉéÑñß',
    'Cyrillic': 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    'Currency/symbols': '₺€$№™…–—«»',
}
root = os.path.join(os.path.dirname(__file__), '..', 'public', 'fonts')
files = sorted(glob.glob(os.path.join(root, 'FuturaPT-*.woff2')))
if len(files) != 6:
    sys.exit(f'expected 6 FuturaPT-*.woff2 faces, found {len(files)}')
bad = 0
for f in files:
    cmap = TTFont(f).getBestCmap()
    missing = {k: [c for c in v if ord(c) not in cmap] for k, v in REQUIRED.items()}
    missing = {k: v for k, v in missing.items() if v}
    print(os.path.basename(f), 'OK' if not missing else f'MISSING {missing}')
    bad += bool(missing)
sys.exit(1 if bad else 0)
