"""Generate the Streamora IPTV logo as a PNG file."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math


def create_logo(size=512):
    """Create a clean, professional IPTV-style logo."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    r = size // 2 - 12

    # Outer glow ring
    for g in range(6, 0, -1):
        gr = r + g * 2
        alpha = int(15 * g)
        draw.ellipse(
            [cx - gr, cy - gr, cx + gr, cy + gr],
            fill=(124, 58, 237, alpha),
        )

    # Main circle — clean gradient (purple -> magenta)
    for i in range(r, 0, -1):
        ratio = 1 - (i / r)
        red = int(124 + (233 - 124) * ratio)
        green = int(58 + (30 - 58) * ratio)
        blue = int(237 + (99 - 237) * ratio)
        draw.ellipse(
            [cx - i, cy - i, cx + i, cy + i],
            fill=(red, green, blue, 255),
        )

    # Inner dark circle
    inner_r = int(r * 0.78)
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=(10, 10, 20, 255),
    )

    # Subtle inner ring highlight
    ring_r = int(r * 0.79)
    draw.ellipse(
        [cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
        outline=(124, 58, 237, 100),
        width=2,
    )

    # Play triangle — clean, centered
    tri_h = int(inner_r * 0.9)
    tri_w = int(tri_h * 0.9)
    # Offset slightly right for optical centering
    off_x = int(tri_w * 0.08)
    # Equilateral-ish play triangle
    p1 = (cx - tri_w // 2 + off_x, cy - tri_h // 2)
    p2 = (cx - tri_w // 2 + off_x, cy + tri_h // 2)
    p3 = (cx + tri_w // 2 + off_x, cy)
    points = [p1, p2, p3]

    # Triangle glow
    for g in range(12, 0, -2):
        glow_pts = []
        for px, py in points:
            dx, dy = px - cx, py - cy
            dist = math.sqrt(dx * dx + dy * dy) or 1
            glow_pts.append((px + dx / dist * g, py + dy / dist * g))
        alpha = max(5, 30 - g * 3)
        draw.polygon(glow_pts, fill=(124, 58, 237, alpha))

    # Clean white triangle
    draw.polygon(points, fill=(255, 255, 255, 250))

    # Subtle triangle inner shadow (gives depth)
    shadow_pts = [
        (p1[0] + 6, p1[1] + 8),
        (p2[0] + 6, p2[1] - 8),
        (p3[0] - 6, p3[1]),
    ]
    draw.polygon(shadow_pts, fill=(240, 240, 255, 200))

    return img


def create_text_logo(width=800, height=200):
    """Create the Streamora text wordmark with gradient."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-Bold.ttf",
    ]
    font = None
    for fp in font_paths:
        try:
            font = ImageFont.truetype(fp, 72)
            break
        except (OSError, IOError):
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "STREAMORA"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (width - tw) // 2
    ty = (height - th) // 2 - bbox[1]

    # Text glow
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((tx + dx, ty + dy), text, font=font, fill=(124, 58, 237, 40))

    # Gradient text (purple -> magenta -> purple)
    char_x = tx
    for i, ch in enumerate(text):
        ratio = i / max(len(text) - 1, 1)
        # Purple -> Magenta -> back
        t = math.sin(ratio * math.pi)
        red = int(124 + (233 - 124) * t)
        green = int(58 + (30 - 58) * t)
        blue = int(237 + (99 - 237) * t)
        draw.text((char_x, ty), ch, font=font, fill=(red, green, blue, 255))
        cb = draw.textbbox((0, 0), ch, font=font)
        char_x += cb[2] - cb[0] + 1

    return img


if __name__ == "__main__":
    import os
    os.makedirs("streamora_library/branding", exist_ok=True)

    logo = create_logo(512)
    logo.save("streamora_library/branding/logo.png")
    print("Created logo.png (512x512)")

    logo_64 = logo.resize((64, 64), Image.LANCZOS)
    logo_64.save("streamora_library/branding/logo_64.png")
    print("Created logo_64.png (64x64)")

    logo_128 = logo.resize((128, 128), Image.LANCZOS)
    logo_128.save("streamora_library/branding/logo_128.png")
    print("Created logo_128.png (128x128)")

    wordmark = create_text_logo()
    wordmark.save("streamora_library/branding/wordmark.png")
    print("Created wordmark.png")
