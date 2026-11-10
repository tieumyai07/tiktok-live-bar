#!/usr/bin/env node
// Chuyển clip dancer (GIF / MP4 / MOV / WEBM) trong LiveAssets/DANCER_CLIPS
// thành chuỗi khung hình PNG trong UnityProject/Assets/Resources/Characters/<tên>/
// và cập nhật Resources/Characters/manifest.txt để game tự nhận nhân vật mới.
//
// Cách dùng:
//   node scripts/import-dancer-clips.js                 # chuyển mọi clip trong DANCER_CLIPS
//   node scripts/import-dancer-clips.js --only co_gai_1.mp4
//   node scripts/import-dancer-clips.js --chroma 0x00ff00   # ép key nền xanh lá cho mọi clip
//
// Tuỳ chọn:
//   --fps 12            số khung/giây xuất ra (mặc định 12)
//   --max-frames 96     giới hạn số khung (mặc định 96, ~8 giây)
//   --height 372        chiều cao khung PNG (mặc định 372, rộng tự theo tỉ lệ)
//   --start 0           bắt đầu cắt từ giây thứ mấy
//   --seconds 0         chỉ lấy N giây (0 = tới hết hoặc tới max-frames)
//   --chroma auto       auto | none | 0xRRGGBB. auto: tên file chứa "green"/"xanh" -> 0x00ff00, "blue" -> 0x0000ff
//   --similarity 0.28   độ nhạy key nền (0.1 chặt, 0.4 lỏng)
//   --blend 0.06        độ mềm viền key nền
//   --weight 1          tần suất xuất hiện so với nhân vật khác (ghi vào manifest)
//   --height-scale 1    hệ số cao hơn/thấp hơn nhân vật thường (1.2 = cao hơn 20%)
//   --matte none        none | ai. ai: tách nền bằng AI (rembg) cho clip quay nền thường,
//                       tự cắt khung sát người. Cần: python -m pip install rembg onnxruntime pillow
//   --matte-model u2net_human_seg   model rembg dùng khi --matte ai
//   --loop auto         auto | pingpong | none. auto: tự tìm đoạn lặp mượt nhất và pha trộn chéo
//                       chỗ nối để không bị giật khi quay vòng. pingpong: phát xuôi rồi ngược.
//   --crossfade 4       số khung pha trộn ở chỗ nối khi --loop auto
//   --min-loop-seconds 2.5   độ dài tối thiểu của đoạn lặp khi --loop auto
//
// Yêu cầu: ffmpeg có trong PATH (https://ffmpeg.org/).

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const clipsDir = path.join(repoRoot, 'LiveAssets', 'DANCER_CLIPS');
const charactersDir = path.join(repoRoot, 'UnityProject', 'Assets', 'Resources', 'Characters');
const manifestPath = path.join(charactersDir, 'manifest.txt');
const clipExtensions = new Set(['.gif', '.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v']);

function parseArgs(argv) {
    const options = {
        fps: 12,
        maxFrames: 96,
        height: 372,
        start: 0,
        seconds: 0,
        chroma: 'auto',
        similarity: 0.28,
        blend: 0.06,
        weight: 1,
        heightScale: 1,
        matte: 'none',
        matteModel: 'u2net_human_seg',
        loop: 'auto',
        crossfade: 4,
        minLoopSeconds: 2.5,
        only: null
    };
    for (let index = 0; index < argv.length; index++) {
        const key = argv[index];
        const value = argv[index + 1];
        const takeNumber = () => { index++; return Number(value); };
        switch (key) {
            case '--fps': options.fps = takeNumber(); break;
            case '--max-frames': options.maxFrames = takeNumber(); break;
            case '--height': options.height = takeNumber(); break;
            case '--start': options.start = takeNumber(); break;
            case '--seconds': options.seconds = takeNumber(); break;
            case '--similarity': options.similarity = takeNumber(); break;
            case '--blend': options.blend = takeNumber(); break;
            case '--weight': options.weight = takeNumber(); break;
            case '--height-scale': options.heightScale = takeNumber(); break;
            case '--chroma': options.chroma = String(value); index++; break;
            case '--matte': options.matte = String(value); index++; break;
            case '--matte-model': options.matteModel = String(value); index++; break;
            case '--loop': options.loop = String(value); index++; break;
            case '--crossfade': options.crossfade = takeNumber(); break;
            case '--min-loop-seconds': options.minLoopSeconds = takeNumber(); break;
            case '--only': options.only = String(value); index++; break;
            case '--help':
            case '-h':
                console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(line => line.startsWith('//')).map(line => line.slice(3)).join('\n'));
                process.exit(0);
                break;
            default:
                console.error(`Tuỳ chọn không hợp lệ: ${key}`);
                process.exit(1);
        }
    }
    for (const [name, number] of Object.entries(options)) {
        if (typeof number === 'number' && !Number.isFinite(number)) {
            console.error(`Giá trị của --${name} không hợp lệ.`);
            process.exit(1);
        }
    }
    return options;
}

function ensureFfmpeg() {
    const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
    if (probe.error || probe.status !== 0) {
        console.error('[LOI] Không tìm thấy ffmpeg trong PATH. Cài từ https://ffmpeg.org/ rồi chạy lại.');
        process.exit(1);
    }
}

function characterNameFor(file) {
    const base = path.basename(file, path.extname(file))
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return base || 'dancer';
}

function chromaColorFor(file, option) {
    if (option === 'none') return null;
    if (option !== 'auto') return option;
    const lower = file.toLowerCase();
    if (/(green|xanh_la|xanhla|greenscreen)/.test(lower)) return '0x00ff00';
    if (/(blue|xanh_duong|bluescreen)/.test(lower)) return '0x0000ff';
    return null;
}

function buildFilter(options, chromaColor) {
    const filters = [];
    if (chromaColor) {
        filters.push(`chromakey=${chromaColor}:${options.similarity}:${options.blend}`);
        filters.push(`despill=type=${chromaColor.toLowerCase() === '0x0000ff' ? 'blue' : 'green'}`);
    }
    filters.push(`fps=${options.fps}`);
    // Khi tách nền AI, giữ độ phân giải cao (tối đa 1024) để mô hình nhìn rõ viền; Python sẽ cắt và thu nhỏ sau.
    filters.push(options.matte === 'ai' ? "scale=-2:'min(ih,1024)':flags=lanczos" : `scale=-2:${options.height}:flags=lanczos`);
    filters.push('format=rgba');
    return filters.join(',');
}

function runSmoothLoop(outputDir, options) {
    const script = path.join(__dirname, 'smooth-loop.py');
    const args = [script, outputDir, '--mode', options.loop, '--crossfade', String(options.crossfade), '--min-seconds', String(options.minLoopSeconds), '--fps', String(options.fps)];
    const result = spawnSync('python', args, { encoding: 'utf8', stdio: 'inherit' });
    if (result.error || result.status !== 0) {
        console.error('[LOI] Làm mượt vòng lặp thất bại. Cần Python 3 và: python -m pip install numpy pillow');
        return false;
    }
    return true;
}

function runAiMatte(outputDir, options) {
    const script = path.join(__dirname, 'remove-background.py');
    const result = spawnSync('python', [script, outputDir, String(options.height), options.matteModel], { encoding: 'utf8', stdio: 'inherit' });
    if (result.error || result.status !== 0) {
        console.error('[LOI] Tách nền AI thất bại. Cần Python 3 và: python -m pip install rembg onnxruntime pillow');
        return false;
    }
    return true;
}

function clearPngFrames(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory)) {
        if (/^\d{3}\.png(\.meta)?$/.test(entry)) fs.unlinkSync(path.join(directory, entry));
    }
}

function convertClip(file, options) {
    const name = characterNameFor(file);
    const outputDir = path.join(charactersDir, name);
    const chromaColor = chromaColorFor(file, options.chroma);
    fs.mkdirSync(outputDir, { recursive: true });
    clearPngFrames(outputDir);

    const args = ['-y', '-hide_banner', '-loglevel', 'error'];
    if (options.start > 0) args.push('-ss', String(options.start));
    args.push('-i', file);
    if (options.seconds > 0) args.push('-t', String(options.seconds));
    args.push('-vf', buildFilter(options, chromaColor));
    args.push('-frames:v', String(options.maxFrames));
    args.push(path.join(outputDir, '%03d.png'));

    const modeLabel = options.matte === 'ai' ? '(tách nền AI)' : chromaColor ? `(key nền ${chromaColor})` : '(giữ alpha gốc)';
    console.log(`→ ${path.basename(file)} → Characters/${name}/ ${modeLabel}`);
    const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
    if (result.status !== 0) {
        console.error(`[LOI] ffmpeg thất bại với ${path.basename(file)}:\n${result.stderr}`);
        return null;
    }

    // ffmpeg đánh số từ 001; đổi về 000.. để khớp các nhân vật có sẵn.
    const frames = fs.readdirSync(outputDir).filter(entry => /^\d{3}\.png$/.test(entry)).sort();
    frames.forEach((frame, index) => {
        const target = path.join(outputDir, `${String(index).padStart(3, '0')}.png`);
        const source = path.join(outputDir, frame);
        if (source !== target) fs.renameSync(source, target);
    });
    if (frames.length === 0) {
        console.error(`[LOI] Không xuất được khung hình nào từ ${path.basename(file)}.`);
        return null;
    }
    if (options.matte === 'ai') {
        console.log(`   tách nền AI (${options.matteModel}) cho ${frames.length} khung...`);
        if (!runAiMatte(outputDir, options)) return null;
    }
    if (options.loop === 'auto' || options.loop === 'pingpong') {
        if (!runSmoothLoop(outputDir, options)) return null;
    }
    const finalCount = fs.readdirSync(outputDir).filter(entry => /^\d{3}\.png$/.test(entry)).length;
    console.log(`   ${finalCount} khung @ ${options.fps} fps`);
    return { name, frames: finalCount };
}

function readManifest() {
    const entries = new Map();
    if (!fs.existsSync(manifestPath)) return entries;
    for (const rawLine of fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const [name, weight = '1', heightScale = '1', fps = '12'] = line.split(/\s+/);
        entries.set(name, { weight: Number(weight) || 1, heightScale: Number(heightScale) || 1, fps: Number(fps) || 12 });
    }
    return entries;
}

function writeManifest(entries) {
    const lines = [
        '# Danh sách nhân vật trên sàn nhảy. Mỗi dòng: <thư mục> <tần suất> <hệ số cao> <fps>',
        '# Tần suất 2 = xuất hiện gấp đôi nhân vật tần suất 1. Hệ số cao 1.2 = cao hơn 20%.',
        '# File này do scripts/import-dancer-clips.js tạo, có thể sửa tay rồi build lại game.'
    ];
    for (const [name, entry] of [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        lines.push(`${name} ${entry.weight} ${entry.heightScale} ${entry.fps}`);
    }
    fs.writeFileSync(manifestPath, lines.join('\n') + '\n', 'utf8');
}

function characterFolders() {
    if (!fs.existsSync(charactersDir)) return [];
    return fs.readdirSync(charactersDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => fs.readdirSync(path.join(charactersDir, name)).some(file => /^\d{3}\.png$/.test(file)));
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    ensureFfmpeg();
    fs.mkdirSync(clipsDir, { recursive: true });

    let clips = fs.readdirSync(clipsDir)
        .filter(file => clipExtensions.has(path.extname(file).toLowerCase()))
        .map(file => path.join(clipsDir, file));
    if (options.only) clips = clips.filter(file => path.basename(file) === options.only);

    const imported = [];
    for (const clip of clips) {
        const result = convertClip(clip, options);
        if (result) imported.push(result);
    }

    const manifest = readManifest();
    for (const { name } of imported) {
        const existing = manifest.get(name);
        manifest.set(name, {
            weight: existing ? existing.weight : options.weight,
            heightScale: existing ? existing.heightScale : options.heightScale,
            fps: options.fps
        });
    }
    const folders = new Set(characterFolders());
    for (const name of folders) if (!manifest.has(name)) manifest.set(name, { weight: 1, heightScale: 1, fps: name === 'hanhan_video_dance' ? 15 : 12 });
    for (const name of [...manifest.keys()]) if (!folders.has(name)) manifest.delete(name);
    writeManifest(manifest);

    if (clips.length === 0) console.log(`Không có clip nào trong ${clipsDir}. Thả GIF/MP4 vào đó rồi chạy lại.`);
    console.log(`Manifest: ${manifest.size} nhân vật → ${path.relative(repoRoot, manifestPath)}`);
    console.log('Build lại game (build.bat) để Unity nạp nhân vật mới.');
}

main();
