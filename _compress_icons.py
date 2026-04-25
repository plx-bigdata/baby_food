#!/usr/bin/env python3
"""压缩 emoji-icons 目录下所有 PNG 到 256 色调色板,保留透明"""
import os
import glob
from PIL import Image

DIR = os.path.join(os.path.dirname(__file__), "static/food-images/emoji-icons")

files = sorted(glob.glob(os.path.join(DIR, "*.png")))
total_before = 0
total_after = 0

for f in files:
    before = os.path.getsize(f)
    total_before += before

    im = Image.open(f).convert("RGBA")
    # 保留 alpha:用 quantize with method=2 (MEDIANCUT), 支持透明
    # 先分离 alpha,量化 RGB 到 P 模式,再重新贴 alpha
    alpha = im.split()[3]
    # 量化到 255 色 (留 1 个做全透明)
    rgb_p = im.convert("RGB").quantize(colors=255, method=2, dither=Image.NONE)
    # 把 P 模式转回 RGBA 并应用 alpha 阈值:alpha<128 的像素置完全透明
    rgb_rgba = rgb_p.convert("RGBA")
    # 用原 alpha 替换
    r, g, b, _ = rgb_rgba.split()
    out = Image.merge("RGBA", (r, g, b, alpha))
    # 转成带透明的调色板模式再保存(optimize=True)
    out_p = out.quantize(colors=256, method=2, dither=Image.NONE)
    out_p.save(f, "PNG", optimize=True)

    after = os.path.getsize(f)
    total_after += after
    print(f"{os.path.basename(f):40s} {before:>6d} -> {after:>6d}  ({100*after/before:.0f}%)")

print(f"\n总计: {total_before/1024:.0f}KB -> {total_after/1024:.0f}KB  (省 {100*(1-total_after/total_before):.0f}%)")
