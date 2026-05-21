"""Generate PWA icons for SpeakMate SA."""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = r"C:\Users\Luca\speakmate-sa-web\public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

BG_COLOR = (59, 130, 246)
FG_COLOR = (255, 255, 255)
ACCENT_COLOR = (251, 191, 36)


def find_font(size):
    candidates = [
        r"C:\Windows\Fonts\seguiemj.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_icon(size, output_path):
    img = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    radius = size // 5
    draw.rounded_rectangle([(0, 0), (size, size)], radius=radius, fill=BG_COLOR)

    mic_w = size * 0.28
    mic_h = size * 0.42
    cx = size / 2
    cy = size * 0.42
    mic_left = cx - mic_w / 2
    mic_right = cx + mic_w / 2
    mic_top = cy - mic_h / 2
    mic_bottom = cy + mic_h / 2

    draw.rounded_rectangle(
        [(mic_left, mic_top), (mic_right, mic_bottom)],
        radius=int(mic_w / 2),
        fill=FG_COLOR,
    )

    stand_top = mic_bottom + size * 0.04
    stand_bottom = stand_top + size * 0.14
    arc_thickness = max(int(size * 0.025), 2)
    draw.arc(
        [
            (mic_left - size * 0.06, mic_top + size * 0.1),
            (mic_right + size * 0.06, stand_top + size * 0.04),
        ],
        start=20,
        end=160,
        fill=FG_COLOR,
        width=arc_thickness,
    )

    stem_w = max(int(size * 0.025), 2)
    draw.rectangle(
        [(cx - stem_w / 2, stand_top), (cx + stem_w / 2, stand_bottom)],
        fill=FG_COLOR,
    )

    base_w = size * 0.18
    base_h = size * 0.035
    draw.rounded_rectangle(
        [
            (cx - base_w / 2, stand_bottom),
            (cx + base_w / 2, stand_bottom + base_h),
        ],
        radius=int(base_h / 2),
        fill=FG_COLOR,
    )

    label = "SA"
    font_size = int(size * 0.18)
    font = find_font(font_size)
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = cx - text_w / 2 - bbox[0]
    text_y = size * 0.78 - text_h / 2 - bbox[1]
    draw.text((text_x, text_y), label, fill=ACCENT_COLOR, font=font)

    img.save(output_path, "PNG")
    print(f"Created {output_path}")


def make_favicon_svg(output_path):
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="#3b82f6"/>
  <rect x="24" y="14" width="16" height="26" rx="8" fill="#fff"/>
  <path d="M18 28 Q32 42 46 28" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <rect x="31" y="42" width="2" height="8" fill="#fff"/>
  <rect x="26" y="49" width="12" height="2.5" rx="1.25" fill="#fff"/>
  <text x="32" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="9" fill="#fbbf24">SA</text>
</svg>
'''
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Created {output_path}")


if __name__ == "__main__":
    make_icon(192, os.path.join(OUTPUT_DIR, "icon-192.png"))
    make_icon(512, os.path.join(OUTPUT_DIR, "icon-512.png"))
    make_icon(180, os.path.join(OUTPUT_DIR, "apple-touch-icon.png"))
    make_favicon_svg(os.path.join(OUTPUT_DIR, "favicon.svg"))
    print("All icons generated.")
