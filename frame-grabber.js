/**
 * Frame Grabber — in-browser demo for Fliqer landing.
 * Local only: file picker + drag-drop, frame step, scrub, play/pause, capture, speed.
 * Hotkeys: ← → step, Space play/pause, C capture.
 */

const DEFAULT_FPS = 30;

const dropZone = document.getElementById('fg-drop-zone');
const fileInput = document.getElementById('fg-file-input');
const dropContent = document.getElementById('fg-drop-content');
const playerWrap = document.getElementById('fg-player-wrap');
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

let videoFPS = DEFAULT_FPS;

// --- File selection & drag-drop ---
function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    video.src = url;
    dropZone.classList.add('fg-hidden');
    playerWrap.hidden = false;
    video.load();
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    handleFile(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('fg-dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('fg-dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('fg-dragover');
    const file = e.dataTransfer.files[0];
    handleFile(file);
});

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

// --- Capture frame to PNG (local download) ---
function captureFrame() {
    if (video.readyState < 2) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const name = `fliqer_frame_${formatTime(video.currentTime).replace(':', '')}.png`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
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
    if (playerWrap.hidden) return;
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
