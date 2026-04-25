#!/usr/bin/env python3
"""修复 v2 生成的图标：去除灰色/深色背景，保留食物主体"""
from PIL import Image
import os

DIR = os.path.join(os.path.dirname(__file__), "static/food-images/emoji-icons")

# 需要修复背景的图标
FIX_LIST = [
    'food_veg_black_fungus',   # 灰色光晕
    'food_egg_egg_yolk',       # 灰色背景+蛋白
    'food_legume_tofu',        # 深色圆形背景
    'food_sea_hairtail',       # 左上角黑块
]

for fid in FIX_LIST:
    path = os.path.join(DIR, f"{fid}.png")
    if not os.path.exists(path):
        print(f"skip: {fid}")
        continue

    im = Image.open(path).convert("RGBA")
    w, h = im.size
    pixels = list(im.getdata())

    # 用四角颜色判断背景色
    corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
    # 取平均背景色
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4

    # 将接近背景色的像素设为透明（容差 40）
    tolerance = 40
    new_pixels = []
    for r, g, b, a in pixels:
        if (abs(r - bg_r) < tolerance and
            abs(g - bg_g) < tolerance and
            abs(b - bg_b) < tolerance):
            new_pixels.append((r, g, b, 0))
        else:
            new_pixels.append((r, g, b, a))

    im.putdata(new_pixels)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    # 重新居中到 120x120
    cw, ch = im.size
    s = max(cw, ch)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - cw) // 2, (s - ch) // 2), im)
    canvas = canvas.resize((120, 120), Image.LANCZOS)
    canvas.save(path, "PNG")
    print(f"fixed: {fid} (bg ~({bg_r},{bg_g},{bg_b}))")

print("done")
