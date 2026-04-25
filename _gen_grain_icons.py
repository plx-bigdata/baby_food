#!/usr/bin/env python3
"""Seedream 生成谷物图标 v2:强化 prompt 白底 + 更激进去背景 + 不 quantize"""
import os, sys, urllib.request
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

load_dotenv()

from volcenginesdkarkruntime import Ark

API_KEY = os.getenv('ARK_API_KEY')
OUT_DIR = Path(__file__).parent / '_preview_gen_grain'
OUT_DIR.mkdir(exist_ok=True)

# 统一 prompt 后缀:强调纯白底,禁止 vignette / gradient / shadow
WHITE_BG = ('pure seamless #FFFFFF white background, no vignette, no gradient, '
            'no shadow, no reflection, no backdrop, no scene, no table surface, '
            'completely isolated subject')

FOODS = [
    {
        'id': 'food_grain_rice_cereal',
        'name': '米粉',
        'prompt': (f'a small white ceramic bowl filled with smooth creamy baby rice cereal '
                   f'(mifen, 米粉), top-down view, the rice cereal has a clean ivory-white color '
                   f'with a glossy silky surface, MUST be smooth pureed liquid paste not grains, '
                   f'bowl takes up most of the frame, realistic detailed illustration, {WHITE_BG}, '
                   f'clean minimal food icon, centered'),
    },
    {
        'id': 'food_grain_oat_cereal',
        'name': '燕麦糊',
        'prompt': (f'a small white ceramic bowl filled with creamy oatmeal porridge '
                   f'(yanmaihu, 燕麦糊), top-down view, warm beige-tan porridge with visible '
                   f'soft oat flakes, glossy smooth surface, NOT dry oats, MUST be cooked '
                   f'creamy porridge, bowl takes up most of the frame, realistic detailed '
                   f'illustration, {WHITE_BG}, clean minimal food icon, centered'),
    },
    {
        'id': 'food_grain_coix',
        'name': '薏米粥',
        'prompt': (f'a white ceramic bowl of cooked Chinese coix seed porridge '
                   f"(yimizhou, 薏米粥, Job's tears porridge), top-down view, creamy off-white "
                   f'milky porridge with visible plump whole coix seeds (small oval pearl-white '
                   f'grains with a groove) suspended in the thick broth, NOT dry grains, MUST be '
                   f'wet cooked porridge, bowl takes up most of the frame, realistic detailed '
                   f'illustration, {WHITE_BG}, clean minimal food icon, centered'),
    },
]


def make_transparent_icon(img_data: bytes, out_path: str):
    """更激进的白底去除 + 不 quantize 保留画质"""
    im = Image.open(BytesIO(img_data)).convert("RGBA")
    w, h = im.size
    pixels = list(im.getdata())

    # 采样 4 角像素估计背景色
    corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4
    print(f"  bg=({bg_r},{bg_g},{bg_b})")

    # 统一用 tolerance 模式,阈值=60,并对接近 bg 色的像素做 alpha 渐变(羽化过渡)
    tol = 60
    nd = []
    for (r, g, b, a) in pixels:
        d = max(abs(r - bg_r), abs(g - bg_g), abs(b - bg_b))
        if d <= tol:
            # 距离越近完全透明,接近阈值时半透明
            if d <= tol * 0.6:
                nd.append((r, g, b, 0))
            else:
                ratio = (d - tol * 0.6) / (tol * 0.4)
                nd.append((r, g, b, int(a * ratio)))
        else:
            nd.append((r, g, b, a))

    im.putdata(nd)

    # 裁切到主体
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    cw, ch = im.size
    s = max(cw, ch)

    # 居中到方形画布
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - cw) // 2, (s - ch) // 2), im)

    # 缩放到 240x240 保留细节(以前是 120,偏小)
    canvas = canvas.resize((240, 240), Image.LANCZOS)
    # 不 quantize,直接保存,避免色带
    canvas.save(out_path, "PNG", optimize=True)


def main():
    if not API_KEY:
        print("缺少 ARK_API_KEY"); sys.exit(1)

    client = Ark(
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        api_key=API_KEY,
    )

    ok, fail = 0, 0
    for food in FOODS:
        out_path = str(OUT_DIR / f"{food['id']}.png")
        print(f"[{ok+fail+1}/{len(FOODS)}] {food['name']}...", end=' ', flush=True)

        try:
            resp = client.images.generate(
                model="doubao-seedream-5-0-260128",
                prompt=food['prompt'],
                sequential_image_generation="disabled",
                response_format="url",
                size="2048x2048",
                stream=False,
                watermark=False,
            )

            img_url = resp.data[0].url
            print(f"url ok,", end=' ', flush=True)

            req = urllib.request.Request(img_url)
            img_data = urllib.request.urlopen(req, timeout=30).read()

            make_transparent_icon(img_data, out_path)
            ok += 1
            print("done")

        except Exception as e:
            fail += 1
            print(f"FAIL: {e}")

    print(f"\n完成: {ok} 成功, {fail} 失败")
    print(f"输出目录: {OUT_DIR}")


if __name__ == '__main__':
    main()
