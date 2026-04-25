#!/usr/bin/env python3
"""用即梦 Seedream 5.0 生成食物图标"""
import os, sys, urllib.request
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

load_dotenv()

from volcenginesdkarkruntime import Ark

API_KEY = os.getenv('ARK_API_KEY')
OUT_DIR = Path(__file__).parent / 'static' / 'food-images' / 'emoji-icons'

FOODS = [
    {
        'id': 'food_egg_duck_egg',
        'name': '鸭蛋黄',
        'prompt': 'a single cooked duck egg yolk only, just the round orange-golden yolk ball with a rich creamy texture, no egg white, no shell, NOT a whole egg, NOT a cross-section showing white part, only the yolk itself presented alone (or two yolks), the yolk round and plump filling most of the square frame, realistic detailed illustration, isolated on pure white background, fill the frame, clean minimal food icon, no shadow',
    },
    {
        'id': 'food_nut_tahini',
        'name': '葵花籽泥',
        'prompt': 'a small white ceramic bowl filled with smooth creamy sunflower seed butter paste (kuihuazini, 葵花籽泥), top-down view, the paste has a pale grayish-green to light beige color with a glossy smooth surface swirl on top, raw shelled sunflower seeds (gray-striped pointed oval seeds) scattered around the bowl, NOT sesame paste, NOT brown tahini jar, NOT a tall jar, only a simple wide bowl with light greenish paste plus the characteristic striped sunflower seeds as accent, realistic detailed illustration, isolated on pure white background, fill the frame, clean minimal food icon, no shadow',
    },
    {
        'id': 'food_grain_coix',
        'name': '薏米粥',
        'prompt': 'a bowl of Chinese coix seed porridge (yimizhou, 薏米粥), top-down view of a white ceramic bowl filled with creamy off-white porridge, visible whole coix seeds (Job\'s tears, small oval pearl-white grains with a groove down one side) suspended in the thick milky porridge, steam rising, NOT dry raw grains, NOT a pile of seeds, MUST be cooked liquid porridge in a bowl, the bowl takes up the square frame, realistic detailed illustration, isolated on pure white background, fill the frame, clean minimal food icon, no shadow',
    },
    {
        'id': 'food_legume_mung_bean',
        'name': '绿豆泥',
        'prompt': 'a small bowl of smooth mung bean paste puree for babies (lvdouni, 绿豆泥), top-down view, the bowl filled with creamy thick pale-green mung bean puree with a smooth glossy swirled surface, a few whole cooked mung beans scattered on top as garnish only, NOT raw whole beans in bowl, NOT pea pods, NOT peas in pod, MUST be pureed mashed smooth paste as the main content, realistic detailed illustration, isolated on pure white background, fill the frame, clean minimal food icon, no shadow',
    },
    {
        'id': 'food_veg_water_chestnut',
        'name': '荸荠',
        'prompt': 'three fresh Chinese water chestnuts (biqi, 荸荠, Eleocharis dulcis), small round flattened bulbs with dark chestnut-brown to maroon-purple skin showing horizontal ring segments and small pointed apical stem on top, one whole water chestnut next to one cut in half showing the crisp snow-white flesh inside, NOT onion, NOT garlic, NOT large white bulb, the characteristic small dark disc-shaped corms filling the frame, realistic detailed illustration, isolated on pure white background, fill the frame, clean minimal food icon, no shadow',
    },
]


def make_transparent_icon(img_data: bytes, out_path: str):
    """去白色背景 + 裁切居中 + 压缩"""
    im = Image.open(BytesIO(img_data)).convert("RGBA")
    w, h = im.size
    pixels = list(im.getdata())

    corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4
    print(f"  bg=({bg_r},{bg_g},{bg_b})")

    if bg_r > 220 and bg_g > 220 and bg_b > 220:
        nd = [(r,g,b,0) if (r >= 235 and g >= 235 and b >= 235) else (r,g,b,a)
              for (r,g,b,a) in pixels]
    else:
        tol = 45
        nd = [(r,g,b,0) if (abs(r-bg_r)<tol and abs(g-bg_g)<tol and abs(b-bg_b)<tol)
              else (r,g,b,a) for (r,g,b,a) in pixels]

    im.putdata(nd)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    cw, ch = im.size
    s = max(cw, ch)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s-cw)//2, (s-ch)//2), im)
    canvas = canvas.resize((120, 120), Image.LANCZOS)
    q = canvas.quantize(colors=128, method=2)
    q.save(out_path, "PNG", optimize=True)


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

            # 下载图片
            req = urllib.request.Request(img_url)
            img_data = urllib.request.urlopen(req, timeout=30).read()

            # 去背景 + 压缩
            make_transparent_icon(img_data, out_path)
            ok += 1
            print("done")

        except Exception as e:
            fail += 1
            print(f"FAIL: {e}")

    print(f"\n完成: {ok} 成功, {fail} 失败")


if __name__ == '__main__':
    main()
