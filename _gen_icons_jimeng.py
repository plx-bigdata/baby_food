#!/usr/bin/env python3
"""用即梦(火山引擎视觉智能API)生成食物图标"""
import os, sys, base64, json
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image
from io import BytesIO

load_dotenv()

# 即梦 API 配置
AK = os.getenv('VOLC_ACCESS_KEY')
SK = os.getenv('VOLC_SECRET_KEY')

OUT_DIR = Path(__file__).parent / 'static' / 'food-images' / 'emoji-icons'
OUT_DIR.mkdir(parents=True, exist_ok=True)

FOODS = [
    {
        'id': 'food_veg_celery',
        'name': '芹菜',
        'prompt': 'celery stalks, flat vector illustration style, several long pale green celery stalks with small leaves on top, the stalks are ribbed and crisp looking, isolated on pure white background, clean minimal food icon',
    },
    {
        'id': 'food_meat_pig_liver',
        'name': '猪肝',
        'prompt': 'sliced cooked pork liver on a small white plate, flat vector illustration style, several thin slices of dark reddish-brown pork liver neatly arranged on a plate, top down view, isolated on pure white background, clean minimal food icon',
    },
]

def make_transparent_icon(raw_data: bytes, out_path: str):
    """去除背景 + 裁切 + 压缩"""
    im = Image.open(BytesIO(raw_data)).convert("RGBA")
    w, h = im.size
    pixels = list(im.getdata())

    # 角落取背景色
    corners = [pixels[0], pixels[w-1], pixels[(h-1)*w], pixels[h*w-1]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4
    print(f"  bg=({bg_r},{bg_g},{bg_b})")

    if bg_r > 220 and bg_g > 220 and bg_b > 220:
        nd = [(r,g,b,0) if (r>=235 and g>=235 and b>=235) else (r,g,b,a) for (r,g,b,a) in pixels]
    else:
        tol = 45
        nd = [(r,g,b,0) if (abs(r-bg_r)<tol and abs(g-bg_g)<tol and abs(b-bg_b)<tol) else (r,g,b,a) for (r,g,b,a) in pixels]

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


def generate_with_jimeng():
    from volcengine.visual.VisualService import VisualService

    visual_service = VisualService()
    visual_service.set_ak(AK)
    visual_service.set_sk(SK)

    ok, fail = 0, 0
    for food in FOODS:
        out_path = str(OUT_DIR / f"{food['id']}.png")
        print(f"[{ok+fail+1}/{len(FOODS)}] {food['name']}...", end=' ', flush=True)

        try:
            form = {
                "req_key": "high_aes_general_v21",
                "prompt": food['prompt'],
                "model_version": "general_v2.1",
                "width": 512,
                "height": 512,
                "seed": -1,
                "scale": 3.5,
                "ddim_steps": 25,
                "use_sr": False,
                "return_url": False,
            }
            resp = visual_service.high_aes_smart_drawing(form)

            if resp.get('code') == 10000 and resp.get('data', {}).get('binary_data_base64'):
                img_b64 = resp['data']['binary_data_base64'][0]
                img_data = base64.b64decode(img_b64)
                make_transparent_icon(img_data, out_path)
                ok += 1
                print('OK')
            else:
                raise Exception(f"API 返回: code={resp.get('code')}, message={resp.get('message', 'unknown')}")

        except Exception as e:
            fail += 1
            print(f'FAIL: {e}')

    print(f"\n完成: {ok} 成功, {fail} 失败")


if __name__ == '__main__':
    if not AK or not SK:
        print("缺少 VOLC_ACCESS_KEY / VOLC_SECRET_KEY")
        sys.exit(1)
    generate_with_jimeng()
