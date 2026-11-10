"""Tách nền AI cho chuỗi khung hình PNG của một nhân vật.

Dùng bởi import-dancer-clips.js khi chạy với --matte ai.
Cách dùng: python remove-background.py <thư mục khung> <chiều cao đích> [model]

- Tách nền từng khung bằng rembg (mặc định model u2net_human_seg, chuyên phân đoạn người).
- Tính khung bao chung của người qua toàn bộ chuỗi rồi cắt mọi khung theo cùng một khung bao,
  để nhân vật không bị "nhảy" vị trí giữa các khung.
- Thu về chiều cao đích, ghi đè lên file PNG gốc (RGBA).
"""

import glob
import os
import sys

from PIL import Image
from rembg import new_session, remove


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: remove-background.py <frames-dir> <target-height> [model]", file=sys.stderr)
        return 2
    folder = sys.argv[1]
    target_height = int(sys.argv[2])
    model = sys.argv[3] if len(sys.argv) > 3 else "u2net_human_seg"

    files = sorted(glob.glob(os.path.join(folder, "[0-9][0-9][0-9].png")))
    if not files:
        print("no frames found in", folder, file=sys.stderr)
        return 1

    session = new_session(model)
    frames = []
    union = None
    for index, path in enumerate(files, 1):
        image = Image.open(path).convert("RGBA")
        cut = remove(image, session=session, post_process_mask=True)
        alpha = cut.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is not None:
            union = bbox if union is None else (
                min(union[0], bbox[0]), min(union[1], bbox[1]),
                max(union[2], bbox[2]), max(union[3], bbox[3]))
        frames.append((path, cut))
        print(f"  matte {index}/{len(files)}", flush=True)

    if union is None:
        print("no foreground detected", file=sys.stderr)
        return 1

    # Nới khung bao một chút để không cắt cụt tóc/tay
    pad = 12
    width, height = frames[0][1].size
    box = (max(0, union[0] - pad), max(0, union[1] - pad),
           min(width, union[2] + pad), min(height, union[3] + pad))
    crop_w, crop_h = box[2] - box[0], box[3] - box[1]
    scale = target_height / float(crop_h)
    out_w = max(1, int(round(crop_w * scale)))
    for path, cut in frames:
        cropped = cut.crop(box).resize((out_w, target_height), Image.LANCZOS)
        cropped.save(path, "PNG", optimize=True)
    print(f"  cropped to {crop_w}x{crop_h}, saved {len(frames)} frames at {out_w}x{target_height}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
