# 🎵 TikTok Live Bar — Sàn nhảy 3D tương tác cho TikTok LIVE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![Unity](https://img.shields.io/badge/Unity-6000.2.10f1-black.svg)](https://unity.com/)

**TikTok Live Bar** biến phiên TikTok LIVE thành một quán bar 3D: người xem vào live là có mặt trên sàn nhảy với avatar TikTok thật, chat, like, follow, gift kích hoạt hiệu ứng đèn, laser, pháo hoa, camera zoom và bảng xếp hạng Top 3 ngay trước bàn DJ. Dancer người thật (sprite tách nền bằng AI) nhảy lẫn với nhân vật meme để sàn luôn đông vui.

## 🎬 Demo

▶️ **[Xem clip demo TikTok Live Bar (25 giây, MP4)](Documentation/demo-tiktok-live-bar.mp4)** — ghi màn hình game khung dọc 540 x 960 khi đang live: sàn disco 3D theo nhịp, dancer người thật xen lẫn nhân vật meme, người xem vào live được camera chào, khách nền giữ sàn luôn đông.

Bấm vào link, GitHub sẽ phát video ngay trên trình duyệt.

---

## ✨ Tính năng

- 🕺 **Sàn disco 3D** — 99 ô sàn LED chạy theo nhịp 128 BPM, vòng truss 20 moving head, 24 tia laser, strobe, quả cầu gương, LED wall, màn hình video DJ, loa.
- 👋 **Vào live là lên sàn** — người xem vừa vào đã xuất hiện trên sàn và được camera chào 2.5 giây. Nhiều người vào cùng lúc thì xếp hàng rồi chuyển sang góc toàn cảnh.
- 💃 **Dancer người thật** — thả clip MP4/GIF vào một thư mục, một lệnh tách nền bằng AI, cắt khung, làm mượt vòng lặp, game tự nhận nhân vật mới.
- 👥 **Khách nền** — đặt số người tối thiểu trên sàn từ Control Panel, không ngắt live. Khách thật vào thì khách nền nhường chỗ.
- 🎁 **Gift → hiệu ứng** — mỗi gift kích hoạt hiệu ứng riêng: zoom camera, đổi nhân vật, cánh VIP, phóng to, Top DJ, pháo hoa.
- 🏆 **Top 3 gifter** đứng trên bục trước bàn DJ với cánh và huy hiệu.
- ⚙️ **Master Rules** — tùy chỉnh gift nào ra hiệu ứng gì ngay trên giao diện web, không cần sửa code.
- 🧪 **Test Lab** — demo mode với người xem giả, bắn sự kiện thủ công để canh khung hình trước khi live.
- 🎨 **Chroma Key** — F2 bật nền xanh để ghép vào OBS hoặc TikTok LIVE Studio.
- 🔌 **Kết nối TikTok trực tiếp** hoặc qua TikFinity Desktop, tự nối lại khi rớt mạng.

---

## 📋 Yêu cầu

| Phần mềm | Phiên bản |
|-----------|-----------|
| Windows | 10 / 11 (64-bit) |
| Node.js | ≥ 20 |
| Unity | 6000.2.10f1, chỉ cần khi build game từ source |
| ffmpeg | bất kỳ, chỉ cần khi thêm dancer từ clip |
| Python | 3.10+, chỉ cần khi tách nền AI cho clip dancer |
| TikTok LIVE Studio hoặc OBS | để phát live |

---

## 🚀 Chạy nhanh

```bash
git clone https://github.com/tieumyai07/tiktok-live-bar.git
cd tiktok-live-bar
```

1. Build game một lần (cần Unity 6000.2.10f1): chạy `build.bat`, kết quả là `Build\TikTokLiveBar.exe`.
2. Nhấp đúp `run.bat`. Launcher tự cài thư viện Node, mở Bridge, Game và Control Panel.
3. Control Panel: http://127.0.0.1:3000/control.html

Dấu hiệu thành công: cửa sổ **TikTok Bridge** hiện `http://127.0.0.1:3000`, game **TikTok Live Bar** mở và báo `NODE ONLINE`, Control Panel hiện logo TikTok Live Bar.

### Chạy thủ công

```bash
cd TikTokBridge
copy .env.example .env
npm ci
npm start
```

Rồi mở `Build\TikTokLiveBar.exe`.

---

## 📡 Kết nối TikTok LIVE

Bridge hỗ trợ hai cách, chọn trong `TikTokBridge\.env`:

```env
# Kết nối thẳng TikTok bằng tiktok-live-connector, không cần phần mềm trung gian
LIVE_PROVIDER=tiktok

# Hoặc qua TikFinity Desktop (ổn định hơn nếu TikTok chặn kết nối trực tiếp)
# LIVE_PROVIDER=tikfinity
# TIKFINITY_WS_URL=ws://127.0.0.1:21213/

# Tùy chọn: khóa ký từ eulerstream.com nếu kết nối trực tiếp bị từ chối
# EULER_API_KEY=...
```

Các bước live:

1. Bật LIVE trên TikTok (LIVE Studio hoặc điện thoại).
2. Control Panel → tab **Live** → nhập username đang live (không có `@`) → **Kết nối**.
3. Trong LIVE Studio hoặc OBS, thêm **Game Capture** cửa sổ `TikTok Live Bar`. Game chạy 540 x 960, đúng khung dọc 9:16.
4. Muốn ghép game lên camera: bấm **F2** trong game và bật Chroma Key màu xanh.

> Đừng bấm các nút **Demo** khi đang live: demo mode sẽ ngắt kết nối TikTok. Dùng thẻ **Khách nền** nếu muốn sàn đông hơn trong lúc live.

---

## 💃 Thêm dancer người thật

1. Thả clip vào `LiveAssets/DANCER_CLIPS/` (MP4, MOV, WEBM, GIF). Tên file thành tên nhân vật, ví dụ `co_gai_vu_truong_01.mp4`.
2. Cài một lần: `python -m pip install rembg onnxruntime pillow numpy` và ffmpeg trong PATH.
3. Trong `TikTokBridge` chạy:

```bash
node scripts/import-dancer-clips.js --matte ai --fps 24 --max-frames 192 --height-scale 1.45 --weight 3
```

4. Chạy `build.bat`. Dancer mới xuất hiện xen lẫn nhân vật meme.

Script làm gì: tách khung bằng ffmpeg, tách nền người bằng AI (`rembg`, model `u2net_human_seg`), cắt khung sát người, thu về 372 px, tự tìm đoạn lặp mượt nhất và pha trộn chéo chỗ nối để không giật khi quay vòng. Kết quả ghi vào `UnityProject/Assets/Resources/Characters/<tên>/` và cập nhật `manifest.txt`.

Tùy chọn hay dùng:

| Tùy chọn | Ý nghĩa |
|----------|---------|
| `--only <file>` | chỉ xử lý một clip |
| `--start 2 --seconds 5` | chỉ lấy đoạn từ giây 2, dài 5 giây (bỏ đoạn hỏng) |
| `--chroma 0x00ff00` | key nền xanh thay vì AI (clip quay phông xanh) |
| `--weight 3` | xuất hiện gấp 3 nhân vật thường |
| `--height-scale 1.45` | cao hơn nhân vật thường 45% |
| `--loop pingpong` | phát xuôi rồi ngược thay vì tìm điểm lặp |

Chỉnh tay sau khi import: sửa `Resources/Characters/manifest.txt`, mỗi dòng `<thư mục> <tần suất> <hệ số cao> <fps>`, rồi build lại.

---

## 👥 Khách nền

Control Panel → **Test Lab** → thẻ **Khách nền**: chọn 20 / 40 / 80 / 150 hoặc tự nhập rồi **Áp dụng**. Sàn luôn có ít nhất chừng đó người; khách thật vào sẽ thay dần khách nền. Giá trị lưu trong `TikTokBridge/config/game.json` (`npcCrowdTarget`).

---

## ⌨️ Phím tắt trong game

| Phím | Chức năng |
|------|-----------|
| `F1` | Ẩn / hiện bảng điều khiển |
| `F2` | Bật / tắt nền xanh Chroma Key |
| `F11` | Toàn màn hình |

## 💬 Lệnh chat người xem

| Lệnh | Hiệu ứng |
|-------|-----------|
| `nhảy` / `dance` | Nhân vật nhảy |
| `đi vòng` / `walk` | Nhân vật đi bước tại chỗ |
| `đổi nv` | Đổi nhân vật ngẫu nhiên |

## 🎁 Hệ thống gift

| Mức gift | Kim cương | Hiệu ứng |
|----------|-----------|-----------|
| Gift nhỏ | 1–9 💎 | Nhân vật nhảy, zoom camera |
| Gift trung | 10–99 💎 | Cánh VIP, đổi nhân vật, đi vòng |
| Gift VIP | 100+ 💎 | Phóng to, Top DJ, pháo hoa |

Tùy chỉnh trong Control Panel → tab **Master Rules**.

---

## 🎵 Nhạc và video nền

- Nhạc DJ: thả `.mp3`, `.wav`, `.ogg` vào `Build/DJ_MUSIC/`.
- Video màn hình DJ: thả `.mp4`, `.mov`, `.webm` hoặc ảnh `.png`, `.jpg` vào `Build/DJ_VIDEO/`.
- Chỉ dùng nhạc và video bạn có quyền phát trên TikTok.

---

## 📁 Cấu trúc thư mục

```
├── TikTokBridge/            # Node.js: cầu nối TikTok ↔ game, Control Panel
│   ├── server.js            # Server chính, WebSocket cổng 3000
│   ├── config/              # game.json, gifts.json, master.json
│   ├── public/              # Control Panel (HTML/JS/CSS)
│   ├── scripts/
│   │   ├── import-dancer-clips.js   # Clip → khung PNG nhân vật
│   │   ├── remove-background.py     # Tách nền AI
│   │   └── smooth-loop.py           # Làm mượt vòng lặp
│   └── test/
│
├── UnityProject/            # Unity 6: game 3D
│   ├── Assets/Scripts/      # ClubSceneBuilder (dựng sàn), PlayerManager, camera...
│   └── Assets/Resources/Characters/   # Khung hình nhân vật + manifest.txt
│
├── LiveAssets/DANCER_CLIPS/ # Thả clip dancer vào đây
├── DJ_MUSIC/, DJ_VIDEO/     # Nhạc, video nền (bản phát triển)
├── Build/                   # Game đã build (không commit)
├── build.bat                # Build Unity → Build\TikTokLiveBar.exe
└── run.bat                  # Chạy Bridge + Game + Control Panel
```

---

## 🔧 Cấu hình nâng cao

`TikTokBridge/.env`:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
LIVE_PROVIDER=tiktok
ALLOW_LAN=0
```

Game kết nối cố định cổng 3000. Muốn đổi `PORT` phải build lại Unity client.

Trong `UnityProject/Assets/Scripts/ClubSceneBuilder.cs`, đặt `UseAmPhuBackdrop = true` để quay về giao diện "Quán Bar Âm Phủ" với phông nền ảnh thay cho sàn disco 3D.

---

## 📜 Giấy phép

Nhân vật meme trong `Resources/Characters` lấy từ bộ "mushroom head" công khai, dancer người thật là clip do người dùng cung cấp. Hãy đảm bảo bạn có quyền sử dụng mọi hình ảnh, nhạc và video đưa vào live.

Mã nguồn TikTok Live Bar phát hành theo [MIT License](LICENSE).
