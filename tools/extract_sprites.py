#!/usr/bin/env python3
"""Extract BITMAP resources from original SKI.EXE (Win16 NE) into PNG sprites."""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Install pillow: pip install pillow", file=sys.stderr)
    raise

# Visual labels from contact-sheet inspection of extracted bitmaps
LABELS = {
    1: "tree_small_a",
    2: "tree_small_b",
    3: "skier_west",
    4: "skier_east",
    5: "skier_wsWest",
    6: "skier_esEast",
    7: "skier_sWest",
    8: "skier_sEast",
    9: "skier_south",
    10: "skier_south_alt",
    11: "skier_jump",
    12: "skier_ouch",
    13: "skier_sit_l",
    14: "skier_sit_r",
    15: "skier_tumble_a",
    16: "skier_tumble_b",
    17: "skier_tumble_c",
    18: "skier_tumble_d",
    19: "skier_lift_stand",
    20: "skier_lift_sit",
    21: "skier_misc_a",
    22: "skier_misc_b",
    23: "flag_red",
    24: "flag_green",
    25: "marker_green",
    26: "marker_red",
    27: "cloud",
    28: "snowboarder_se",
    29: "snowboarder_sw",
    30: "snowboarder_s",
    31: "dog_a",
    32: "dog_b",
    33: "rock_a",
    34: "rock_b",
    35: "stump_a",
    36: "stump_b",
    37: "skier_red_a",
    38: "skier_red_b",
    39: "skier_blue_a",
    40: "skier_blue_b",
    41: "skier_crash_air",
    42: "skier_crash_air2",
    43: "npc_ski_a",
    44: "npc_ski_b",
    45: "snow_bump",
    46: "snow_pile",
    47: "snow_line",
    48: "snow_bank",
    49: "tree_med",
    50: "tree_dead",
    51: "tree_tall",
    52: "rainbow_ramp",
    53: "logo",
    54: "version",
    55: "sign_numpad",
    56: "sign_fkeys",
    57: "sign_start_l",
    58: "sign_start_r",
    59: "sign_finish_l",
    60: "sign_finish_r",
    61: "sign_slalom",
    62: "sign_tree_slalom",
    63: "sign_freestyle",
    64: "lift_pole",
    65: "chair_empty",
    66: "chair_person",
    67: "chair_pair",
    68: "yeti_stand",
    69: "yeti_run1",
    70: "yeti_run2",
    71: "yeti_run3",
    72: "yeti_run4",
    73: "yeti_run5",
    74: "yeti_eat1",
    75: "yeti_eat2",
    76: "yeti_eat3",
    77: "yeti_eat4",
    78: "yeti_eat5",
    79: "yeti_eat6",
    80: "yeti_full",
    81: "yeti_wave",
    82: "ramp_small",
    83: "fire_a",
    84: "fire_b",
    85: "fire_c",
    86: "cursor",
}


def list_bitmaps(data: bytes) -> list[tuple[int, int, int]]:
    ne_off = 0x400
    restab = struct.unpack_from("<H", data, ne_off + 0x24)[0]
    rt = ne_off + restab
    align = struct.unpack_from("<H", data, rt)[0]
    p = rt + 2
    out: list[tuple[int, int, int]] = []
    while p + 2 <= len(data):
        type_id = struct.unpack_from("<H", data, p)[0]
        if type_id == 0:
            break
        count = struct.unpack_from("<H", data, p + 2)[0]
        p += 8
        is_bmp = (type_id & 0x7FFF) == 2
        for _ in range(count):
            offset, length, _flags, res_id, _h, _u = struct.unpack_from("<HHHHHH", data, p)
            if is_bmp:
                out.append((res_id & 0x7FFF, offset << align, length << align))
            p += 12
    return out


def decode_dib(blob: bytes) -> Image.Image:
    bi_size = struct.unpack_from("<I", blob, 0)[0]
    w = struct.unpack_from("<i", blob, 4)[0]
    h = struct.unpack_from("<i", blob, 8)[0]
    bpp = struct.unpack_from("<H", blob, 14)[0]
    top_down = h < 0
    h = abs(h)
    clr_used = struct.unpack_from("<I", blob, 32)[0]
    ncolors = clr_used if clr_used else (1 << bpp)
    pal_off = bi_size
    palette: list[tuple[int, int, int]] = []
    for i in range(ncolors):
        b, g, r, _ = blob[pal_off + i * 4 : pal_off + i * 4 + 4]
        palette.append((r, g, b))
    pix_off = pal_off + ncolors * 4
    row_bytes = ((w * bpp + 31) // 32) * 4
    img = Image.new("RGBA", (w, h))
    px = img.load()
    assert px is not None
    for y in range(h):
        src_y = y if top_down else (h - 1 - y)
        row = blob[pix_off + src_y * row_bytes : pix_off + (src_y + 1) * row_bytes]
        for x in range(w):
            if bpp == 4:
                byte = row[x // 2] if x // 2 < len(row) else 0
                idx = (byte >> 4) if x % 2 == 0 else (byte & 0xF)
            elif bpp == 1:
                byte = row[x // 8] if x // 8 < len(row) else 0
                idx = (byte >> (7 - x % 8)) & 1
            else:
                idx = 0
            r, g, b = palette[idx] if idx < len(palette) else (0, 0, 0)
            # Original sprites use pure white as transparent snow background
            if r >= 250 and g >= 250 and b >= 250:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (r, g, b, 255)
    return img


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    exe = root / "SKIFREE game files" / "SKIFREE" / "SKI.EXE"
    out_dir = root / "assets" / "original-sprites"
    out_dir.mkdir(parents=True, exist_ok=True)
    data = exe.read_bytes()
    bitmaps = list_bitmaps(data)
    manifest = []
    for rid, off, length in bitmaps:
        img = decode_dib(data[off : off + length])
        label = LABELS.get(rid, f"bmp_{rid}")
        fname = f"{rid:03d}_{label}.png"
        img.save(out_dir / fname)
        manifest.append({"id": rid, "label": label, "file": fname, "w": img.size[0], "h": img.size[1]})
        print(f"#{rid:3d} {label:20s} {img.size[0]:3d}x{img.size[1]:3d}")

    # Contact sheet
    cols = 10
    cell_w, cell_h = 120, 90
    rows = (len(manifest) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell_w, rows * cell_h), (30, 34, 42, 255))
    draw = ImageDraw.Draw(sheet)
    for i, m in enumerate(manifest):
        r, c = divmod(i, cols)
        im = Image.open(out_dir / m["file"])
        x0 = c * cell_w + (cell_w - im.size[0]) // 2
        y0 = r * cell_h + 16
        sheet.paste(im, (x0, y0), im)
        draw.text((c * cell_w + 2, r * cell_h + 1), f"#{m['id']} {m['label'][:14]}", fill=(220, 220, 220, 255))
    sheet.save(out_dir / "_contact_sheet.png")
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    # Vite serves these from public/
    pub = root / "public" / "original-sprites"
    pub.mkdir(parents=True, exist_ok=True)
    import shutil

    for p in out_dir.glob("*.png"):
        shutil.copy2(p, pub / p.name)
    print(f"Wrote {len(manifest)} sprites + contact sheet → {out_dir}")
    print(f"Copied PNGs → {pub}")


if __name__ == "__main__":
    main()
