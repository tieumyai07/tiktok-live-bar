"""Làm mượt vòng lặp cho chuỗi khung hình PNG của một nhân vật.

Dùng bởi import-dancer-clips.js (tùy chọn --loop).
Cách dùng: python smooth-loop.py <thư mục khung> [--mode auto|pingpong] [--crossfade 4] [--min-seconds 2.5] [--fps 12]

- auto: quét mọi đoạn con đủ dài, chọn đoạn mà khung ngay sau khung cuối giống khung đầu nhất
  (tức là chuyển động nối tiếp tự nhiên khi quay vòng), rồi pha trộn chéo vài khung ở chỗ nối.
- pingpong: phát xuôi rồi phát ngược, không có chỗ nối nhưng động tác bị đảo chiều.
Ghi đè lại các file 000.png, 001.png... trong thư mục.
"""

import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

# Console Windows mặc định cp1252 không in được tiếng Việt có dấu
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

THUMB_SIZE = (40, 72)


def load_frames(folder):
    files = sorted(glob.glob(os.path.join(folder, "[0-9][0-9][0-9].png")))
    frames = [np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) for path in files]
    return files, frames


def thumbnail(frame):
    """Ảnh thu nhỏ RGBA đã nhân alpha, để vùng trong suốt không làm sai lệch so sánh."""
    image = Image.fromarray(frame.astype(np.uint8)).resize(THUMB_SIZE, Image.BILINEAR)
    data = np.asarray(image, dtype=np.float32) / 255.0
    alpha = data[..., 3:4]
    return np.concatenate([data[..., :3] * alpha, alpha], axis=-1)


def frame_distance(a, b):
    return float(np.abs(a - b).mean())


def best_segment(thumbs, min_len):
    """Trả về (i, j, cost): đoạn frames[i..j] có chỗ nối j -> i mượt nhất."""
    count = len(thumbs)
    candidates = []
    for start in range(0, count - min_len):
        for end in range(start + min_len - 1, count - 1):
            # Khung sau khung cuối phải giống khung đầu; khung cuối phải giống khung trước khung đầu.
            cost = frame_distance(thumbs[end + 1], thumbs[start])
            if start > 0:
                cost = 0.6 * cost + 0.4 * frame_distance(thumbs[end], thumbs[start - 1])
            candidates.append((cost, end - start + 1, start, end))
    if not candidates:
        return 0, count - 1, None
    min_cost = min(candidate[0] for candidate in candidates)
    tolerant = [candidate for candidate in candidates if candidate[0] <= min_cost * 1.12 + 1e-6]
    cost, _, start, end = max(tolerant, key=lambda candidate: candidate[1])
    return start, end, cost


def to_premultiplied(frame):
    alpha = frame[..., 3:4] / 255.0
    return np.concatenate([frame[..., :3] * alpha, frame[..., 3:4]], axis=-1)


def from_premultiplied(frame):
    alpha = frame[..., 3:4] / 255.0
    rgb = np.where(alpha > 1e-4, frame[..., :3] / np.maximum(alpha, 1e-4), 0.0)
    return np.clip(np.concatenate([rgb, frame[..., 3:4]], axis=-1), 0, 255)


def crossfade_loop(segment, fade):
    """Thay K khung đầu bằng pha trộn (K khung cuối -> K khung đầu); bỏ K khung cuối."""
    length = len(segment)
    fade = max(0, min(fade, length // 4))
    if fade == 0:
        return segment
    premultiplied = [to_premultiplied(frame) for frame in segment]
    output = []
    for index in range(fade):
        weight = (index + 1) / (fade + 1)
        blended = premultiplied[length - fade + index] * (1 - weight) + premultiplied[index] * weight
        output.append(from_premultiplied(blended))
    output.extend(segment[fade:length - fade])
    return output


def pingpong(segment):
    if len(segment) < 3:
        return segment
    return segment + segment[-2:0:-1]


def write_frames(folder, files, frames):
    for path in files:
        os.remove(path)
    for index, frame in enumerate(frames):
        Image.fromarray(frame.astype(np.uint8), "RGBA").save(
            os.path.join(folder, f"{index:03d}.png"), "PNG", optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--mode", choices=["auto", "pingpong"], default="auto")
    parser.add_argument("--crossfade", type=int, default=4)
    parser.add_argument("--min-seconds", type=float, default=2.5)
    parser.add_argument("--fps", type=float, default=12)
    args = parser.parse_args()

    files, frames = load_frames(args.folder)
    if len(frames) < 4:
        print("  loop: quá ít khung, giữ nguyên")
        return 0

    if args.mode == "pingpong":
        output = pingpong(frames)
        print(f"  loop pingpong: {len(frames)} -> {len(output)} khung")
    else:
        min_len = max(4, int(round(args.min_seconds * args.fps)))
        min_len = min(min_len, len(frames) - 2)
        thumbs = [thumbnail(frame) for frame in frames]
        whole_cost = frame_distance(thumbs[0], thumbs[-1])
        start, end, cost = best_segment(thumbs, min_len)
        segment = frames[start:end + 1]
        output = crossfade_loop(segment, args.crossfade)
        print(f"  loop auto: chọn khung {start}..{end} ({len(segment)} khung), "
              f"lệch chỗ nối {cost:.4f} so với lặp thô {whole_cost:.4f}; "
              f"pha trộn {min(args.crossfade, len(segment) // 4)} khung -> {len(output)} khung")

    write_frames(args.folder, files, output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
