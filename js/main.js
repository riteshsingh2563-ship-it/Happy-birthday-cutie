/* ============================================================
   main.js — experience flow
   Mystery → Anticipation → Surprise → Reveal → Memories → Wish

   Photos: ONLY the real photos provided by the user (Drive
   folder “Ayush Asmita”). The visitor's browser loads them
   directly; the node server (server.js) can cache the
   originals into public/photos/ on the first visit.
   No images are generated or substituted.
   ============================================================ */
'use strict';

/* ----------------------------------------------------------
   Real photo registry — the four photos from the Drive folder
   ---------------------------------------------------------- */
const FILE_IDS = {
  'IMG-20260826-WA0003.jpg': '1Zf2a22y4KC7npiDY6jGyu-C0iaUBGcZ2',
  'IMG-20260826-WA0004.jpg': '1553uuohxTPkR6J7NatXTIC2xSjOg4o0M',
  'IMG-20260826-WA0006.jpg': '1F7qoN743118KN1daBucEaer86eMVVeU0',
  'IMG-20260826-WA0007.jpg': '1H7YToDbX9VUZ9iJORm3bE5-NyE8LcBEc',
};
// Temporary signed thumbnail tokens (from the folder listing) — last-resort only.
const TOKEN_URLS = {
  'IMG-20260826-WA0003.jpg': 'https://lh3.googleusercontent.com/drive-storage/AJQWtBM4TdEMSnNOGvmUXprkdTQjyhpzRsv1-EqqUXW48uV4MP_o8Ca7MyPb7KAOLlp1KpiQFQeixMCGx1gLtaKKQ-1yk85bRufDptpJ-c8=s1600',
  'IMG-20260826-WA0004.jpg': 'https://lh3.googleusercontent.com/drive-storage/AJQWtBNthBvRGTlmX5hVCGw1PdznlwDQfZjaR7lEUAY25wiMJdFe9okHcomI6AwexROHTmhjHnkPwyByfwZ2EeueLPfCEYryyBMt7hOzeb8=s1600',
  'IMG-20260826-WA0006.jpg': 'https://lh3.googleusercontent.com/drive-storage/AJQWtBPUtFkUkAd3IEDLUi2EfWKcMcidiBpxbKw0PbtN2f6UaodnAog2q3MovEMjyk0nPjhTNH3IOWqv5g-wqXlSmI8LGEBAMSmOGwbIlJQ=s1600',
  'IMG-20260826-WA0007.jpg': 'https://lh3.googleusercontent.com/drive-storage/AJQWtBMf21NLyrx_zERoQXqHk0OUoKhh-bLt8qugxCsB74czfgR5-EbuOajoWa4Yn23frArph5cbHNpt3zTU78QNwVdPyrl1KGToO1zMW6s=s1600',
};

const PHOTOS = Object.keys(FILE_IDS).map((name) => ({
  name,
  alt: 'A photo of Asmita',
  localOk: false,
}));

const BIRTHDAY = new Date(2026, 10, 15, 0, 0, 0); // 15 November 2026, local midnight

const localSrc = (p) => `/photos/${p.name}`;
const driveSrc = (p) => `https://drive.google.com/thumbnail?id=${FILE_IDS[p.name]}&sz=w1600`;
const tokenSrc = (p) => TOKEN_URLS[p.name] || null;

/* ----------------------------------------------------------
   Small helpers
   ---------------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

function replaceWithPlaceholder(img) {
  const ph = document.createElement('div');
  ph.className = 'photo-placeholder';
  ph.innerHTML = '<span class="ph-emoji">📷</span>photo pending';
  img.replaceWith(ph);
}

/**
 * Build an <img> for a real photo with a graceful source chain:
 * local copy → Drive (canonical) → signed token URL → clean placeholder.
 * The image shown is always the user's actual photo.
 */
function makeImg(p) {
  const img = document.createElement('img');
  img.alt = p.alt;
  img.decoding = 'async';
  img.dataset.pname = p.name;
  const sources = [localSrc(p), driveSrc(p), tokenSrc(p)].filter(Boolean);
  let stage = 0;
  img.src = sources[0];
  img.addEventListener('error', () => {
    stage += 1;
    if (stage < sources.length) img.src = sources[stage];
    else replaceWithPlaceholder(img);
  });
  img.addEventListener('load', () => img.classList.add('loaded'));
  return img;
}

function refreshImgs() {
  document.querySelectorAll('img[data-pname]').forEach((img) => {
    const p = PHOTOS.find((x) => x.name === img.dataset.pname);
    if (p && p.localOk && !img.src.includes('/photos/')) {
      const wasVisible = img.classList.contains('loaded');
      img.src = localSrc(p);
      if (wasVisible) {
        img.classList.remove('loaded');
        requestAnimationFrame(() => img.classList.add('loaded'));
      }
    }
  });
}

/* ----------------------------------------------------------
   Best-effort one-time import: the visitor's browser (which can
   reach Google Drive) downloads the real originals and posts
   them to the local server, which saves them to public/photos/.
   On static hosting this quietly no-ops; display always falls
   back to the live Drive URL.
   ---------------------------------------------------------- */
async function downloadFromDrive(p) {
  const fid = FILE_IDS[p.name];
  const urls = [
    `https://drive.usercontent.google.com/download?id=${fid}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${fid}&confirm=t`,
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (r.ok) {
        const b = await r.blob();
        if (b.type && b.type.startsWith('image/') && b.size > 2048) return b;
      }
    } catch (e) { /* try next */ }
  }
  const token = tokenSrc(p);
  if (token) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = token;
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      const b = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
      if (b) return b;
    } catch (e) { /* canvas may be tainted — display still works via <img> */ }
  }
  return null;
}

async function importPhotos() {
  for (const p of PHOTOS) {
    if (p.localOk) continue;
    try {
      const head = await fetch(localSrc(p), { method: 'HEAD', cache: 'no-store' });
      if (head.ok) { p.localOk = true; continue; }
    } catch (e) { /* no server / offline — display falls back to Drive */ }
    const blob = await downloadFromDrive(p);
    if (!blob) continue;
    try {
      const pr = await fetch('/api/photos/' + p.name, {
        method: 'POST',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });
      if (pr.ok) {
        p.localOk = true;
        console.info('[photos] real photo cached locally:', p.name);
        refreshImgs();
      }
    } catch (e) { /* static host — nothing to persist */ }
  }
}

/* ----------------------------------------------------------
   Scene machine
   ---------------------------------------------------------- */
const SCENE_NAMES = ['countdown', 'preview-count', 'preview-date', 'surprise', 'reveal', 'memories', 'final'];
const sceneEls = {};
SCENE_NAMES.forEach((n) => { sceneEls[n] = document.getElementById('scene-' + n); });

let currentScene = null;

function go(name) {
  if (currentScene === name) return;
  const leaving = currentScene;
  currentScene = name;
  document.body.dataset.scene = name;
  SCENE_NAMES.forEach((n) => {
    const el = sceneEls[n];
    el.classList.toggle('active', n === name);
    el.setAttribute('aria-hidden', n === name ? 'false' : 'true');
    if (n === name) el.scrollTop = 0;
  });
  if (leaving) onSceneExit(leaving);
  onSceneEnter(name);
}

function onSceneEnter(name) {
  switch (name) {
    case 'countdown':
      tickCountdown(true);
      break;
    case 'preview-date': {
      Effects.centerBurst(90);
      later(() => Effects.centerBurst(70, { speed: 5 }), 380);
      const fill = $('#advance-fill');
      fill.classList.remove('run'); void fill.offsetWidth; fill.classList.add('run');
      later(() => go('surprise'), 2600);
      break;
    }
    case 'reveal':
      Effects.Confetti.ambientOn(5);
      break;
    case 'final':
      Effects.centerBurst(60, { speed: 4.5 });
      Effects.Confetti.ambientOn(2.5);
      break;
  }
}

function onSceneExit(name) {
  switch (name) {
    case 'preview-date':
    case 'preview-count':
      Effects.Confetti.ambientOff();
      break;
    case 'reveal':
    case 'final':
      Effects.Confetti.ambientOff();
      break;
  }
}

/* ----------------------------------------------------------
   Page 1 — countdown
   ---------------------------------------------------------- */
function setUnit(id, val) {
  const el = document.getElementById('cd-' + id);
  const str = String(val).padStart(2, '0');
  if (el.textContent !== str) {
    el.textContent = str;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }
}

function tickCountdown(immediate) {
  const diff = Math.max(0, BIRTHDAY.getTime() - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  if (immediate) {
    setUnit('days', d); setUnit('hours', h); setUnit('minutes', m); setUnit('seconds', s);
  } else {
    setUnit('seconds', s);
    if (s === 0) { setUnit('minutes', m); setUnit('hours', h); setUnit('days', d); }
  }
  if (diff === 0) {
    // the real moment is here
    later(() => go('surprise'), 1200);
    return;
  }
  later(tickCountdown, 1000);
}

/* ----------------------------------------------------------
   Preview sequence: 5…4…3…2…1 → “It’s 15 November! 🎉”
   ---------------------------------------------------------- */
const tickNum = $('#tick-num');
const tickFill = $('#tick-fill');

function showTick(n) {
  tickNum.textContent = String(n);
  tickNum.classList.remove('in');
  void tickNum.offsetWidth;
  tickNum.classList.add('in');
}

function startPreview() {
  clearTimers();
  Effects.Confetti.ambientOff();
  go('preview-count');
  tickFill.classList.remove('run');
  void tickFill.offsetWidth;
  tickFill.classList.add('run');
  let n = 5;
  showTick(n);
  const step = () => {
    n -= 1;
    if (n <= 0) { finishPreview(); return; }
    showTick(n);
    later(step, 780);
  };
  later(step, 780);
}

function finishPreview() {
  go('preview-date');
}

/* ----------------------------------------------------------
   Gallery (memories)
   ---------------------------------------------------------- */
let galleryReady = false;
let galIndex = 0;
let galSwitching = false;
const mainEl = $('#gal-main');
const thumbsEl = $('#gal-thumbs');
const counterEl = $('#gal-counter');
const stageEl = $('#gal-stage');

function buildThumbs() {
  PHOTOS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gal-thumb';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', `Photo ${i + 1}`);
    const img = makeImg(p);
    img.removeAttribute('data-pname'); // thumbs use the same chain but don't need refresh
    b.appendChild(img);
    b.addEventListener('click', () => showPhoto(i));
    thumbsEl.appendChild(b);
  });
}

function updateGalleryMeta() {
  counterEl.textContent = `${galIndex + 1} / ${PHOTOS.length}`;
  [...thumbsEl.children].forEach((t, i) => {
    t.classList.toggle('active', i === galIndex);
    t.setAttribute('aria-selected', i === galIndex ? 'true' : 'false');
  });
}

function showPhoto(i) {
  if (galSwitching || i === galIndex) {
    if (i === galIndex) updateGalleryMeta();
    return;
  }
  galSwitching = true;
  galIndex = i;
  updateGalleryMeta();
  const oldImg = mainEl.querySelector('img');
  if (oldImg) {
    oldImg.classList.add('swapping');
    later(() => {
      mainEl.innerHTML = '';
      const next = makeImg(PHOTOS[galIndex]);
      next.classList.add('swapping');
      mainEl.appendChild(next);
      const reveal = () => {
        next.classList.remove('swapping');
        galSwitching = false;
      };
      if (next.complete && next.naturalWidth > 0) requestAnimationFrame(reveal);
      else {
        next.addEventListener('load', reveal, { once: true });
        later(reveal, 1400); // safety: don't stay hidden if it stalls
      }
    }, 280);
  } else {
    mainEl.innerHTML = '';
    mainEl.appendChild(makeImg(PHOTOS[galIndex]));
    galSwitching = false;
  }
}

function initGallery() {
  if (galleryReady) return;
  galleryReady = true;
  buildThumbs();
  mainEl.appendChild(makeImg(PHOTOS[0]));
  updateGalleryMeta();
}

let galleryBound = false;
function bindGallery() {
  if (galleryBound) return;
  galleryBound = true;

  $('#gal-next').addEventListener('click', () => showPhoto((galIndex + 1) % PHOTOS.length));
  $('#gal-prev').addEventListener('click', () => showPhoto((galIndex - 1 + PHOTOS.length) % PHOTOS.length));

  // touch / pointer swipe
  let dragX = null;
  const img = () => mainEl.querySelector('img');
  stageEl.style.touchAction = 'pan-y';
  stageEl.addEventListener('pointerdown', (e) => {
    dragX = e.clientX;
    const im = img();
    if (im) { im.style.transition = 'none'; }
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (dragX === null) return;
    const d = Math.max(-70, Math.min(70, (e.clientX - dragX) * 0.18));
    const im = img();
    if (im) im.style.transform = `translateX(${d}px)`;
  });
  const endDrag = (e) => {
    if (dragX === null) return;
    const d = e.clientX - dragX;
    dragX = null;
    const im = img();
    if (im) { im.style.transition = ''; im.style.transform = ''; }
    if (d < -48) showPhoto((galIndex + 1) % PHOTOS.length);
    else if (d > 48) showPhoto((galIndex - 1 + PHOTOS.length) % PHOTOS.length);
  };
  stageEl.addEventListener('pointerup', endDrag);
  stageEl.addEventListener('pointercancel', endDrag);

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (currentScene !== 'memories') return;
    if (e.key === 'ArrowRight') showPhoto((galIndex + 1) % PHOTOS.length);
    if (e.key === 'ArrowLeft') showPhoto((galIndex - 1 + PHOTOS.length) % PHOTOS.length);
  });
}

function resetGallery() {
  galleryReady = false;
  galIndex = 0;
  galSwitching = false;
  mainEl.innerHTML = '';
  thumbsEl.innerHTML = '';
  counterEl.textContent = '1 / ' + PHOTOS.length;
}

/* ----------------------------------------------------------
   Wire up
   ---------------------------------------------------------- */
function boot() {
  console.log('%c🎂 Happy Birthday, Asmita! %c— made with care by an old friend',
    'font-size:16px;font-weight:bold;color:#e8b64c;', 'color:#999;');

  // reveal photo (the first real photo, shown prominently)
  const revealShell = $('#reveal-photo-shell');
  revealShell.appendChild(makeImg(PHOTOS[0]));

  Effects.Particles.start();
  bindGallery();

  $('#btn-preview').addEventListener('click', startPreview);

  $('#btn-open').addEventListener('click', () => {
    Music.start();
    const mc = $('#music-control');
    mc.hidden = false;
    Music.updateUI();
    Effects.flash();
    Effects.centerBurst(150, { speed: 6.5 });
    later(() => Effects.centerBurst(80, { speed: 5 }), 420);
    later(() => go('reveal'), 560);
  });

  $('#btn-memories').addEventListener('click', () => {
    initGallery();
    go('memories');
  });

  $('#btn-final').addEventListener('click', () => go('final'));

  $('#btn-replay').addEventListener('click', () => {
    clearTimers();
    Effects.Confetti.ambientOff();
    resetGallery();
    go(Date.now() >= BIRTHDAY.getTime() ? 'surprise' : 'countdown');
  });

  // opening state
  const params = new URLSearchParams(location.search);
  if (params.has('preview')) {
    startPreview(); // enter the preview experience immediately
  } else if (Date.now() >= BIRTHDAY.getTime()) {
    go('surprise'); // the real birthday is here
  } else {
    go('countdown');
  }

  // quiet, best-effort caching of the real photos (server hosting only)
  later(importPhotos, 1500);
}

document.addEventListener('DOMContentLoaded', boot);
