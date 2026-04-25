#!/usr/bin/env python3
"""
压缩 static/food-images/emoji-icons 下已在 food-library.js 注册的 PNG 图标。

用法：
  python3 compressFoodIcons.py
"""

from pathlib import Path
import re
from PIL import Image


ROOT = Path(__file__).resolve().parent
LIB_FILE = ROOT / 'data' / 'food-library.js'
ICON_DIR = ROOT / 'static' / 'food-images' / 'emoji-icons'


def get_registered_icons():
    text = LIB_FILE.read_text(encoding='utf-8')
    return sorted(set(re.findall(r"/static/food-images/emoji-icons/([^']+\.png)", text)))


def compress_png(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    image = Image.open(path).convert('RGBA')
    quantized = image.quantize(colors=96, method=Image.FASTOCTREE, dither=Image.Dither.NONE)
    quantized.save(path, optimize=True)
    after = path.stat().st_size
    return before, after


def main():
    total_before = 0
    total_after = 0

    for name in get_registered_icons():
        path = ICON_DIR / name
        if not path.exists():
            print(f'SKIP missing: {name}')
            continue
        before, after = compress_png(path)
        total_before += before
        total_after += after
        print(f'{name}: {before // 1024}KB -> {after // 1024}KB')

    saved = total_before - total_after
    print(
        f'\nTotal: {total_before / 1024 / 1024:.2f}MB -> '
        f'{total_after / 1024 / 1024:.2f}MB, '
        f'saved {saved / 1024 / 1024:.2f}MB'
    )


if __name__ == '__main__':
    main()
