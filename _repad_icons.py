#!/usr/bin/env python3
"""把 59 张新图标重新内缩到 ~78% 画布,匹配 emoji 视觉尺寸"""
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "_preview_icons_flat")
DST = os.path.join(os.path.dirname(__file__), "static/food-images/emoji-icons")
TARGET = 120          # 最终画布
CONTENT = 94          # 食物可占用的最大边长 (94/120 ≈ 0.78)

FILES = [
    "food_grain_rice_cereal", "food_grain_oat_cereal", "food_grain_wheat_cereal", "food_grain_corn_porridge",
    "food_veg_carrot", "food_veg_pumpkin", "food_veg_sweet_potato", "food_veg_potato", "food_veg_broccoli",
    "food_veg_spinach", "food_veg_pea", "food_veg_corn", "food_veg_tomato", "food_veg_eggplant",
    "food_veg_cauliflower", "food_veg_cucumber", "food_veg_chinese_cabbage", "food_veg_yam", "food_veg_mushroom",
    "food_fruit_apple", "food_fruit_pear", "food_fruit_banana", "food_fruit_avocado", "food_fruit_watermelon",
    "food_fruit_blueberry", "food_fruit_mango", "food_fruit_strawberry", "food_fruit_grape", "food_fruit_peach",
    "food_fruit_kiwi", "food_fruit_orange", "food_fruit_cherry", "food_fruit_papaya",
    "food_meat_pork_lean", "food_meat_beef", "food_meat_chicken", "food_meat_lamb", "food_meat_duck",
    "food_sea_white_fish", "food_sea_salmon", "food_sea_crucian", "food_sea_tilapia", "food_sea_shrimp",
    "food_sea_crab", "food_sea_oyster", "food_sea_clam", "food_sea_grass_carp",
    "food_egg_whole_egg", "food_egg_quail_egg",
    "food_legume_edamame",
    "food_dairy_formula", "food_dairy_yogurt", "food_dairy_cheese", "food_dairy_cows_milk", "food_dairy_butter",
    "food_nut_peanut_paste",
    "food_oil_olive_oil", "food_oil_coconut_oil", "food_oil_rapeseed_oil",
]

done = 0
for fid in FILES:
    src_path = os.path.join(SRC, f"{fid}.png")
    dst_path = os.path.join(DST, f"{fid}.png")
    if not os.path.exists(src_path):
        print(f"skip (no source): {fid}")
        continue

    im = Image.open(src_path).convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    ratio = min(CONTENT / w, CONTENT / h)
    nw, nh = int(round(w * ratio)), int(round(h * ratio))
    im = im.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGBA", (TARGET, TARGET), (0, 0, 0, 0))
    canvas.paste(im, ((TARGET - nw) // 2, (TARGET - nh) // 2), im)
    canvas.save(dst_path, "PNG")
    done += 1

print(f"repadded {done}/{len(FILES)} icons -> {DST}")
