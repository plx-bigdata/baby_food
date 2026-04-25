from PIL import Image, ImageDraw
import os

SIZE = 128
OUT_DIR = os.path.join(os.path.dirname(__file__), 'static', 'icons')


def img():
    return Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))


def save(image, name):
    os.makedirs(OUT_DIR, exist_ok=True)
    image.save(os.path.join(OUT_DIR, name), 'PNG')


def leaf(draw, points, fill, outline=None, width=4):
    draw.polygon(points, fill=fill, outline=outline)
    if outline:
      draw.line([points[0], points[2]], fill=outline, width=width)


def grain_rice():
    image = img()
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 58, 110, 96), radius=20, fill=(244, 147, 94, 255), outline=(193, 96, 53, 255), width=5)
    draw.arc((16, 46, 112, 96), 0, 180, fill=(193, 96, 53, 255), width=5)
    grains = [
        (34, 40, 50, 56), (46, 32, 62, 48), (58, 36, 74, 52),
        (70, 30, 86, 46), (82, 38, 98, 54), (58, 48, 74, 64)
    ]
    for g in grains:
        draw.ellipse(g, fill=(255, 250, 236, 255), outline=(232, 216, 186, 255), width=3)
    return image


def grain_oat():
    image = img()
    draw = ImageDraw.Draw(image)
    stem = (149, 124, 91, 255)
    oat = (223, 192, 108, 255)
    draw.line((40, 104, 62, 34), fill=stem, width=6)
    draw.line((64, 106, 74, 26), fill=stem, width=6)
    draw.line((88, 106, 86, 34), fill=stem, width=6)
    seeds = [
        (48, 44, 62, 58), (54, 58, 68, 72), (60, 72, 74, 86),
        (66, 36, 80, 50), (72, 52, 86, 66), (78, 68, 92, 82),
        (78, 42, 92, 56), (84, 58, 98, 72)
    ]
    for s in seeds:
        draw.ellipse(s, fill=oat, outline=stem, width=3)
    return image


def grain_millet():
    image = img()
    draw = ImageDraw.Draw(image)
    stem = (128, 168, 88, 255)
    seed = (233, 202, 83, 255)
    draw.line((46, 108, 60, 26), fill=stem, width=6)
    draw.line((62, 108, 70, 20), fill=stem, width=6)
    clusters = [
        (68, 24, 82, 38), (76, 32, 90, 46), (82, 44, 96, 58),
        (84, 58, 98, 72), (80, 72, 94, 86), (70, 82, 84, 96),
        (56, 36, 70, 50), (58, 52, 72, 66), (56, 68, 70, 82)
    ]
    for c in clusters:
        draw.ellipse(c, fill=seed, outline=(183, 145, 54, 255), width=3)
    return image


def grain_wheat():
    image = img()
    draw = ImageDraw.Draw(image)
    stem = (174, 134, 53, 255)
    grain = (241, 202, 96, 255)
    draw.line((62, 108, 66, 22), fill=stem, width=6)
    grains = [
        ((68, 30, 84, 44), (66, 38, 90, 20)),
        ((48, 38, 64, 52), (64, 46, 38, 28)),
        ((70, 48, 86, 62), (68, 56, 92, 38)),
        ((46, 54, 62, 68), (62, 62, 36, 44)),
        ((68, 66, 84, 80), (66, 74, 90, 56)),
        ((44, 72, 60, 86), (60, 80, 34, 62)),
    ]
    for ellipse_box, awn in grains:
        draw.ellipse(ellipse_box, fill=grain, outline=stem, width=3)
        draw.line(awn, fill=stem, width=3)
    return image


def grain_cornmeal():
    image = img()
    draw = ImageDraw.Draw(image)
    husk = (84, 161, 84, 255)
    cob = (252, 205, 58, 255)
    draw.ellipse((32, 24, 92, 108), fill=cob, outline=(212, 165, 38, 255), width=4)
    for row in range(5):
        for col in range(3):
            x = 42 + col * 16 + (row % 2) * 4
            y = 34 + row * 14
            draw.rounded_rectangle((x, y, x + 10, y + 10), radius=3, fill=(255, 229, 108, 255))
    draw.polygon([(28, 104), (18, 58), (44, 72)], fill=husk, outline=(56, 120, 56, 255))
    draw.polygon([(96, 104), (108, 58), (80, 72)], fill=husk, outline=(56, 120, 56, 255))
    return image


def grain_purple_sweet_potato():
    image = img()
    draw = ImageDraw.Draw(image)
    body = (132, 74, 166, 255)
    outline = (96, 49, 129, 255)
    draw.ellipse((26, 42, 102, 92), fill=body, outline=outline, width=5)
    draw.polygon([(80, 48), (110, 34), (98, 62)], fill=body, outline=outline)
    draw.line((28, 62, 18, 54), fill=outline, width=4)
    draw.line((64, 48, 74, 30), fill=(94, 149, 86, 255), width=5)
    draw.line((74, 30, 58, 20), fill=(94, 149, 86, 255), width=4)
    return image


def veg_white_radish():
    image = img()
    draw = ImageDraw.Draw(image)
    outline = (103, 138, 83, 255)
    draw.polygon([(66, 18), (80, 36), (66, 34)], fill=(91, 171, 88, 255), outline=outline)
    draw.polygon([(66, 18), (52, 36), (66, 34)], fill=(118, 191, 101, 255), outline=outline)
    draw.line((66, 30, 66, 40), fill=outline, width=4)
    draw.ellipse((34, 38, 98, 102), fill=(245, 247, 238, 255), outline=(201, 205, 189, 255), width=5)
    draw.polygon([(56, 96), (66, 116), (76, 96)], fill=(241, 243, 232, 255), outline=(201, 205, 189, 255))
    return image


def veg_lettuce():
    image = img()
    draw = ImageDraw.Draw(image)
    colors = [
        ((30, 56, 72, 108), (127, 198, 95, 255)),
        ((56, 38, 104, 106), (92, 182, 84, 255)),
        ((18, 32, 62, 88), (145, 212, 107, 255)),
    ]
    for box, color in colors:
        draw.ellipse(box, fill=color, outline=(61, 128, 65, 255), width=4)
    draw.rectangle((54, 88, 74, 110), fill=(237, 244, 208, 255), outline=(176, 190, 130, 255), width=3)
    return image


def veg_green_bean():
    image = img()
    draw = ImageDraw.Draw(image)
    green = (96, 176, 92, 255)
    dark = (54, 120, 61, 255)
    draw.line((28, 78, 92, 46), fill=dark, width=18)
    draw.line((28, 78, 92, 46), fill=green, width=12)
    draw.line((38, 46, 100, 82), fill=dark, width=18)
    draw.line((38, 46, 100, 82), fill=(118, 194, 102, 255), width=12)
    draw.ellipse((20, 70, 36, 86), fill=green, outline=dark, width=3)
    draw.ellipse((92, 38, 108, 54), fill=green, outline=dark, width=3)
    return image


def fruit_tangerine():
    image = img()
    draw = ImageDraw.Draw(image)
    orange = (248, 149, 46, 255)
    dark = (214, 108, 33, 255)
    draw.ellipse((24, 28, 104, 108), fill=orange, outline=dark, width=5)
    for offset in [40, 64, 88]:
        draw.arc((offset - 18, 44, offset + 18, 92), 250, 110, fill=(255, 196, 108, 180), width=4)
    draw.line((64, 26, 64, 16), fill=(112, 81, 40, 255), width=5)
    draw.polygon([(66, 14), (90, 18), (76, 34)], fill=(93, 166, 83, 255), outline=(58, 122, 65, 255))
    return image


def fruit_pomelo():
    image = img()
    draw = ImageDraw.Draw(image)
    body = (242, 225, 120, 255)
    dark = (206, 184, 72, 255)
    draw.ellipse((26, 22, 102, 110), fill=body, outline=dark, width=5)
    draw.line((64, 22, 64, 12), fill=(112, 81, 40, 255), width=5)
    draw.polygon([(66, 10), (92, 18), (74, 34)], fill=(102, 176, 89, 255), outline=(58, 122, 65, 255))
    draw.arc((44, 48, 88, 92), 210, 330, fill=(255, 242, 182, 255), width=6)
    return image


ICONS = {
    'food-grain-rice.png': grain_rice,
    'food-grain-oat.png': grain_oat,
    'food-grain-millet.png': grain_millet,
    'food-grain-wheat.png': grain_wheat,
    'food-grain-cornmeal.png': grain_cornmeal,
    'food-grain-purple-sweet-potato.png': grain_purple_sweet_potato,
    'food-veg-white-radish.png': veg_white_radish,
    'food-veg-lettuce.png': veg_lettuce,
    'food-veg-green-bean.png': veg_green_bean,
    'food-fruit-tangerine.png': fruit_tangerine,
    'food-fruit-pomelo.png': fruit_pomelo,
}


def main():
    for name, fn in ICONS.items():
        save(fn(), name)
        print(f'generated {name}')


if __name__ == '__main__':
    main()
