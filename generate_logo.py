"""Generate the Streamora IPTV logo as a PNG file."""
from PIL import Image, ImageDraw, ImageFont
import math

def create_logo(size=512):
    """Create a modern IPTV-style logo with gradient background and play icon."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size // 2, size // 2
    r = size // 2 - 10

    # Draw gradient circle (purple -> magenta)
    for i in range(r, 0, -1):
        ratio = i / r
        # Purple (#6c3ce0) -> Magenta (#e91e63)
        red = int(108 + (233 - 108) * (1 - ratio))
        green = int(60 + (30 - 60) * (1 - ratio))
        blue = int(224 + (99 - 224) * (1 - ratio))
        draw.ellipse(
            [cx - i, cy - i, cx + i, cy + i],
            fill=(red, green, blue, 255),
        )

    # Inner dark circle for depth
    inner_r = int(r * 0.82)
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=(13, 13, 26, 255),
    )

    # Glowing ring
    ring_r = int(r * 0.78)
    for i in range(3):
        rr = ring_r + i
        draw.ellipse(
            [cx - rr, cy - rr, cx + rr, cy + rr],
            outline=(108, 60, 224, 120 - i * 30),
            width=2,
        )

    # Play triangle (slightly offset right for visual center)
    tri_size = int(r * 0.42)
    offset_x = int(tri_size * 0.12)  # offset right to visually center
    points = [
        (cx - tri_size // 2 + offset_x, cy - tri_size),
        (cx - tri_size // 2 + offset_x, cy + tri_size),
        (cx + tri_size + offset_x, cy),
    ]

    # Glow behind triangle
    for g in range(8, 0, -1):
        glow_points = []
        for px, py in points:
            dx = px - cx
            dy = py - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist > 0:
                glow_points.append((px + dx / dist * g, py + dy / dist * g))
            else:
                glow_points.append((px, py))
        alpha = int(40 - g * 4)
        draw.polygon(glow_points, fill=(108, 60, 224, max(alpha, 5)))

    # Main triangle gradient fill (draw as layered triangles)
    for j in range(tri_size * 2):
        ratio = j / (tri_size * 2)
        r_c = int(255 - ratio * 50)
        g_c = int(255 - ratio * 50)
        b_c = 255
        y_top = cy - tri_size + j
        y_bot = cy - tri_size + j + 1
        if y_top > cy + tri_size:
            break
        # Calculate x bounds for this row
        if y_top <= cy:
            progress = (y_top - (cy - tri_size)) / tri_size if tri_size else 0
        else:
            progress = 1.0
        left_x = cx - tri_size // 2 + offset_x
        right_progress = (y_top - (cy - tri_size)) / (2 * tri_size) if tri_size else 0
        right_x = left_x + (cx + tri_size + offset_x - left_x) * right_progress
        if right_x > left_x:
            draw.rectangle([left_x, y_top, right_x, y_bot], fill=(r_c, g_c, b_c, 240))

    # Clean triangle on top
    draw.polygon(points, fill=(255, 255, 255, 245))

    # Signal waves (top right, streaming indicator)
    wave_cx = cx + int(r * 0.45)
    wave_cy = cy - int(r * 0.45)
    for i, wave_r in enumerate([18, 30, 42]):
        wr = int(wave_r * size / 512)
        alpha = 200 - i * 50
        draw.arc(
            [wave_cx - wr, wave_cy - wr, wave_cx + wr, wave_cy + wr],
            start=200, end=340,
            fill=(108, 60, 224, alpha),
            width=max(3, int(4 * size / 512)),
        )

    # Small dot at wave origin
    dot_r = int(5 * size / 512)
    draw.ellipse(
        [wave_cx - dot_r, wave_cy - dot_r, wave_cx + dot_r, wave_cy + dot_r],
        fill=(233, 30, 99, 255),
    )

    return img


def create_text_logo(width=800, height=200):
    """Create the Streamora text wordmark."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Try to find a good font
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

    # Text shadow/glow
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((tx + dx, ty + dy), text, font=font, fill=(108, 60, 224, 60))

    # Gradient text effect (draw character by character with color shift)
    char_x = tx
    for i, ch in enumerate(text):
        ratio = i / max(len(text) - 1, 1)
        r = int(108 + (233 - 108) * ratio)
        g = int(60 + (30 - 60) * ratio)
        b = int(224 + (99 - 224) * ratio)
        draw.text((char_x, ty), ch, font=font, fill=(r, g, b, 255))
        cb = draw.textbbox((0, 0), ch, font=font)
        char_x += cb[2] - cb[0] + 1

    return img


if __name__ == "__main__":
    import os
    os.makedirs("streamora_library/branding", exist_ok=True)

    # Generate icon logo
    logo = create_logo(512)
    logo.save("streamora_library/branding/logo.png")
    print("Created logo.png (512x512)")

    # Generate smaller versions
    logo_64 = logo.resize((64, 64), Image.LANCZOS)
    logo_64.save("streamora_library/branding/logo_64.png")
    print("Created logo_64.png (64x64)")

    logo_128 = logo.resize((128, 128), Image.LANCZOS)
    logo_128.save("streamora_library/branding/logo_128.png")
    print("Created logo_128.png (128x128)")

    # Generate text wordmark
    wordmark = create_text_logo()
    wordmark.save("streamora_library/branding/wordmark.png")
    print("Created wordmark.png")
