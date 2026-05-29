from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "assets" / "logo.png"
OUTPUT = ROOT / "assets" / "logo-transparent.png"
MARK_OUTPUT = ROOT / "assets" / "logo-mark.png"


logo = Image.open(SOURCE).convert("RGBA")
mask = Image.new("L", logo.size, 0)
src = logo.load()
dst_mask = mask.load()

for y in range(logo.height):
    for x in range(logo.width):
        r, g, b, a = src[x, y]
        if a > 0 and (r < 246 or g < 246 or b < 246):
            dst_mask[x, y] = 255

bbox = mask.getbbox()
if bbox:
    pad = 12
    logo = logo.crop((
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(logo.width, bbox[2] + pad),
        min(logo.height, bbox[3] + pad),
    ))

pixels = logo.load()
for y in range(logo.height):
    for x in range(logo.width):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        if r > 238 and g > 238 and b > 238:
            pixels[x, y] = (255, 255, 255, 0)
        elif r < 56 and g < 56 and b < 56:
            pixels[x, y] = (244, 252, 255, a)

logo.save(OUTPUT)
mark = logo.crop((0, 0, logo.width, int(logo.height * 0.58)))
mark_mask = mark.split()[-1]
mark_bbox = mark_mask.getbbox()
if mark_bbox:
    mark = mark.crop(mark_bbox)
mark.save(MARK_OUTPUT)
print(OUTPUT)
print(MARK_OUTPUT)
