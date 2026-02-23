/**
 * Frame Grabber — in-browser demo for Fliqer landing.
 * Local only: file picker + drag-drop, frame step, scrub, play/pause, capture, speed.
 * Hotkeys: ← → step, Space play/pause, C capture.
 */

const DEFAULT_FPS = 30;

const videoDropArea = document.getElementById('fg-video-drop-area');
const fileInput = document.getElementById('fg-file-input');
const dropPlaceholder = document.getElementById('fg-drop-placeholder');
const playerWrap = document.getElementById('fg-player-wrap');
const loadVideoBtn = document.getElementById('fg-load-video');
const video = document.getElementById('fg-video');
const canvas = document.getElementById('fg-canvas');
const timeline = document.getElementById('fg-timeline');
const currentTimeEl = document.getElementById('fg-current-time');
const durationEl = document.getElementById('fg-duration');
const frameStepSelect = document.getElementById('fg-frame-step');
const speedSelect = document.getElementById('fg-speed');
const skipBackBtn = document.getElementById('fg-skip-back');
const skipFwdBtn = document.getElementById('fg-skip-fwd');
const playPauseBtn = document.getElementById('fg-play-pause');
const playIcon = document.getElementById('fg-play-icon');
const captureBtn = document.getElementById('fg-capture');
const formatSelect = document.getElementById('fg-format');

let videoFPS = DEFAULT_FPS;
let currentVideoFileName = '';

// --- File selection & drag-drop ---
function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) return;
    currentVideoFileName = file.name || '';
    const url = URL.createObjectURL(file);
    video.src = url;
    dropPlaceholder.classList.add('fg-hidden');
    videoDropArea.classList.add('has-video');
    video.load();
}

videoDropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    handleFile(file);
});

videoDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoDropArea.classList.add('fg-dragover');
});
videoDropArea.addEventListener('dragleave', () => videoDropArea.classList.remove('fg-dragover'));
videoDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    videoDropArea.classList.remove('fg-dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

if (loadVideoBtn) loadVideoBtn.addEventListener('click', () => fileInput.click());

// --- Helpers ---
function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getFrameStepSeconds() {
    const step = parseInt(frameStepSelect.value, 10) || 1;
    return (1 / Math.max(1, videoFPS)) * step;
}

function getDuration() {
    return video.duration && Number.isFinite(video.duration) ? video.duration : 0;
}

function seekTo(seconds) {
    const d = getDuration();
    const t = Math.max(0, Math.min(seconds, d));
    video.currentTime = t;
    updateTimeUI();
}

function updateTimeUI() {
    const cur = video.currentTime;
    const dur = getDuration();
    currentTimeEl.textContent = formatTime(cur);
    durationEl.textContent = formatTime(dur);
    if (dur > 0) {
        const pct = (cur / dur) * 100;
        timeline.value = pct;
    }
}

// --- Scrub by frame step ---
function skipBackward() {
    const delta = -getFrameStepSeconds();
    seekTo(video.currentTime + delta);
}

function skipForward() {
    const delta = getFrameStepSeconds();
    seekTo(video.currentTime + delta);
}

// --- Play / Pause ---
function togglePlayPause() {
    if (video.paused) {
    video.play();
    playIcon.classList.remove('ph-play');
    playIcon.classList.add('ph-pause');
  } else {
    video.pause();
    playIcon.classList.remove('ph-pause');
    playIcon.classList.add('ph-play');
  }
}

// --- Video metadata for export ---
function getVideoMetadata() {
    const dur = getDuration();
    const meta = {
        source: currentVideoFileName || undefined,
        captureTime: video.currentTime,
        duration: dur,
        fps: videoFPS,
        width: video.videoWidth,
        height: video.videoHeight,
        exportedAt: new Date().toISOString(),
    };
    return meta;
}

// --- PNG: add tEXt chunks (keyword + text) and return new buffer ---
function crc32(data) {
    const U = new Uint8Array(data);
    let c = 0xffffffff;
    const T = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let t = n;
        for (let k = 0; k < 8; k++) t = (t & 1) ? 0xedb88320 ^ (t >>> 1) : t >>> 1;
        T[n] = t >>> 0;
    }
    for (let i = 0; i < U.length; i++) c = T[(c ^ U[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function addPngTextChunks(pngArrayBuffer, textEntries) {
    const view = new DataView(pngArrayBuffer);
    const chunks = [];
    let offset = 8;
    while (offset < view.byteLength) {
        const length = view.getUint32(offset, false);
        const type = String.fromCharCode(
            view.getUint8(offset + 4), view.getUint8(offset + 5),
            view.getUint8(offset + 6), view.getUint8(offset + 7)
        );
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        const data = pngArrayBuffer.slice(dataStart, dataEnd);
        const crcOffset = dataEnd;
        const origCrc = view.getUint32(crcOffset, false);
        chunks.push({ type, length, data, crc: origCrc });
        if (type === 'IEND') break;
        offset = crcOffset + 4;
    }
    const result = [];
    result.push(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (c.type === 'IEND' && textEntries.length > 0) {
            for (const { key, value } of textEntries) {
                const keyBytes = new TextEncoder().encode(key.slice(0, 79));
                const valueBytes = new TextEncoder().encode(value);
                const data = new Uint8Array(keyBytes.length + 1 + valueBytes.length);
                data.set(keyBytes, 0);
                data.set(valueBytes, keyBytes.length + 1);
                const typeAndData = new Uint8Array(4 + data.length);
                typeAndData.set([0x74, 0x45, 0x58, 0x74], 0);
                typeAndData.set(data, 4);
                const lenBuf = new ArrayBuffer(4);
                new DataView(lenBuf).setUint32(0, data.length, false);
                result.push(new Uint8Array(lenBuf));
                result.push(typeAndData);
                const crcBuf = new ArrayBuffer(4);
                new DataView(crcBuf).setUint32(0, crc32(typeAndData), false);
                result.push(new Uint8Array(crcBuf));
            }
        }
        const lenBuf = new ArrayBuffer(4);
        new DataView(lenBuf).setUint32(0, c.length, false);
        result.push(new Uint8Array(lenBuf));
        result.push(new Uint8Array([c.type.charCodeAt(0), c.type.charCodeAt(1), c.type.charCodeAt(2), c.type.charCodeAt(3)]));
        result.push(new Uint8Array(c.data));
        const crcBuf = new ArrayBuffer(4);
        new DataView(crcBuf).setUint32(0, c.crc, false);
        result.push(new Uint8Array(crcBuf));
    }
    const totalLen = result.reduce((s, u) => s + u.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const u of result) {
        out.set(u, pos);
        pos += u.length;
    }
    return out.buffer;
}

// --- Capture frame to PNG/JPEG (local download) with video metadata ---
function captureFrame() {
    if (video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const fmt = formatSelect.value || 'png';
    const isJpeg = fmt === 'jpeg';
    const mime = isJpeg ? 'image/jpeg' : 'image/png';
    const ext = isJpeg ? 'jpg' : 'png';
    const quality = isJpeg ? 0.92 : undefined;
    const meta = getVideoMetadata();

    canvas.toBlob((blob) => {
        if (!blob) return;
        const name = `fliqer_frame_${formatTime(video.currentTime).replace(':', '')}.${ext}`;

        if (isJpeg && typeof piexif !== 'undefined') {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            try {
                const zeroth = {};
                zeroth[piexif.ImageIFD.ImageDescription] = `Frame at ${formatTime(meta.captureTime)} from video${meta.source ? `: ${meta.source}` : ''}. Duration: ${formatTime(meta.duration)}. Exported by Fliqer.`;
                zeroth[piexif.ImageIFD.Software] = 'Fliqer Frame Grabber';
                const exif = {};
                exif[piexif.ExifIFD.UserComment] = JSON.stringify(meta);
                const exifObj = { '0th': zeroth, Exif: exif, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
                const exifBytes = piexif.dump(exifObj);
                const newDataUrl = piexif.insert(exifBytes, dataUrl);
                const bin = atob(newDataUrl.split(',')[1]);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                const outBlob = new Blob([arr], { type: mime });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(outBlob);
                a.download = name;
                a.click();
                URL.revokeObjectURL(a.href);
                return;
            } catch (e) {
                console.warn('EXIF metadata failed, saving without metadata', e);
            }
        }

        if (!isJpeg) {
            blob.arrayBuffer().then((ab) => {
                const textEntries = [
                    { key: 'Source', value: meta.source || '(unknown)' },
                    { key: 'CaptureTime', value: String(meta.captureTime) },
                    { key: 'Duration', value: String(meta.duration) },
                    { key: 'FPS', value: String(meta.fps) },
                    { key: 'Dimensions', value: `${meta.width}x${meta.height}` },
                    { key: 'ExportedAt', value: meta.exportedAt },
                    { key: 'VideoMetadata', value: JSON.stringify(meta) },
                ];
                try {
                    const newAb = addPngTextChunks(ab, textEntries);
                    const outBlob = new Blob([newAb], { type: mime });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(outBlob);
                    a.download = name;
                    a.click();
                    URL.revokeObjectURL(a.href);
                } catch (e) {
                    console.warn('PNG metadata failed, saving without metadata', e);
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = name;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }
            });
            return;
        }

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    }, mime, quality);
}

// --- Playback speed ---
function applySpeed() {
    const rate = parseFloat(speedSelect.value) || 1;
    video.playbackRate = rate;
}

// --- Timeline ---
function onTimelineInput() {
    const pct = parseFloat(timeline.value) || 0;
    const dur = getDuration();
    if (dur > 0) seekTo((pct / 100) * dur);
}

// --- Video events ---
video.addEventListener('loadedmetadata', () => {
    updateTimeUI();
    applySpeed();
});
video.addEventListener('timeupdate', updateTimeUI);
video.addEventListener('ended', () => {
    playIcon.classList.remove('ph-pause');
    playIcon.classList.add('ph-play');
});
video.addEventListener('loadeddata', () => {
    // Optional: try to read FPS from video (not always available in browser)
    // For now keep DEFAULT_FPS
});

// --- Button bindings ---
skipBackBtn.addEventListener('click', skipBackward);
skipFwdBtn.addEventListener('click', skipForward);
playPauseBtn.addEventListener('click', togglePlayPause);
captureBtn.addEventListener('click', captureFrame);
frameStepSelect.addEventListener('change', () => {});
speedSelect.addEventListener('change', applySpeed);
timeline.addEventListener('input', onTimelineInput);

// --- Hotkeys ---
document.addEventListener('keydown', (e) => {
    if (!video.src) return;
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    switch (e.code) {
        case 'ArrowLeft':
            e.preventDefault();
            skipBackward();
            break;
        case 'ArrowRight':
            e.preventDefault();
            skipForward();
            break;
        case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'KeyC':
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                captureFrame();
            }
            break;
    }
});
