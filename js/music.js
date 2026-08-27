/* ============================================================
   music.js — birthday music
   Primary: the user-provided file at /music/happy-birthday-pop.mp3
   Fallback: a soft, gentle in-browser melody (WebAudio, the
   public-domain "Happy Birthday" tune) if the file is missing,
   so the experience never breaks without it.
   ============================================================ */
'use strict';

const Music = (() => {
  const FILE_SRC = '/music/happy-birthday-pop.mp3';
  const BASE_VOLUME = 0.55;

  let mode = 'file';          // 'file' | 'synth'
  let fileOk = true;          // has the file loaded?
  let playing = false;
  let muted = false;

  const audio = new Audio(FILE_SRC);
  audio.preload = 'auto';
  audio.loop = true;

  audio.addEventListener('canplaythrough', () => { fileOk = true; });
  audio.addEventListener('error', () => {
    fileOk = false;
    if (mode === 'file') {
      mode = 'synth';
      if (playing) startSynth();
    }
    console.info('[music] MP3 unavailable — using the soft built-in melody instead.');
  });

  /* ----------------------------------------------------------
     WebAudio fallback — music-box style, public-domain tune
     ---------------------------------------------------------- */
  let actx = null;
  let master = null;
  let padGain = null;
  let schedTimer = null;
  let nextNoteTime = 0;
  let stepIndex = 0;

  // [note, beats] — "Happy Birthday" in C, "dear Asmita" sung by name
  const BEAT = 60 / 104;
  const SEQ = [
    ['G4', 1.5], ['G4', 0.5], ['A4', 1.5], ['G4', 0.5], ['C5', 2], ['B4', 2],
    ['G4', 1.5], ['G4', 0.5], ['A4', 1.5], ['G4', 0.5], ['D5', 2], ['C5', 2],
    ['G4', 1.5], ['G4', 0.5], ['G5', 1.5], ['E5', 0.5], ['C5', 1.25], ['B4', 0.75], ['A4', 2],
    ['F5', 1.5], ['F5', 0.5], ['E5', 1.5], ['C5', 0.5], ['D5', 2], ['C5', 2.6],
  ];
  const REST = 1.4; // beats of silence between loops

  const NOTE_HZ = {
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  };

  function ensureCtx() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { mode = 'silent'; return; }
    actx = new AC();
    master = actx.createGain();
    master.gain.value = muted ? 0 : BASE_VOLUME;
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(actx.destination);

    padGain = actx.createGain();
    padGain.gain.value = 0.16;
    const padFilter = actx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padGain.connect(padFilter);
    padFilter.connect(master);
  }

  function pluck(freq, t, dur) {
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.9, dur * 1.6));

    const o1 = actx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = freq;
    const o2 = actx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2;
    const g2 = actx.createGain();
    g2.gain.value = 0.28;

    o1.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(master);
    o1.start(t); o2.start(t);
    o1.stop(t + dur * 1.8 + 0.4);
    o2.stop(t + dur * 1.8 + 0.4);
  }

  function padChord(t, dur, freqs) {
    for (const f of freqs) {
      const o = actx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = actx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.6);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(padGain);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  // SEQ is four phrases: 6 + 6 + 7 + 6 notes
  const LINE_STARTS = [0, 6, 12, 19];
  const LINE_PADS = [
    [261.63, 329.63, 392.0],   // C
    [261.63, 329.63, 392.0],   // C
    [261.63, 329.63, 392.0],   // C
    [174.61, 220.0, 261.63],   // F
  ];

  function scheduleAhead() {
    while (nextNoteTime < actx.currentTime + 0.9) {
      const line = LINE_STARTS.indexOf(stepIndex);
      if (line !== -1) {
        // soft warm pad under each phrase
        padChord(nextNoteTime, 8 * BEAT, LINE_PADS[line]);
      }
      if (stepIndex < SEQ.length) {
        const [note, beats] = SEQ[stepIndex];
        pluck(NOTE_HZ[note], nextNoteTime, beats * BEAT);
        nextNoteTime += beats * BEAT;
        stepIndex++;
      } else {
        nextNoteTime += REST * BEAT;
        stepIndex = 0;
      }
    }
  }

  function startSynth() {
    ensureCtx();
    if (!actx || mode === 'silent') return;
    if (actx.state === 'suspended') actx.resume();
    stopScheduler();
    stepIndex = 0;
    nextNoteTime = actx.currentTime + 0.15;
    scheduleAhead();
    schedTimer = setInterval(scheduleAhead, 200);
  }

  function stopScheduler() {
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  }

  function stopSynth() {
    stopScheduler();
    if (actx && actx.state === 'running') actx.suspend();
  }

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  async function start() {
    if (playing) return;
    playing = true;
    updateUI();
    if (mode === 'file' && fileOk) {
      try {
        await audio.play();
        if (muted) audio.muted = true;
        return;
      } catch (e) {
        // file failed at playback time — fall back
        fileOk = false;
        mode = 'synth';
        console.info('[music] playback of MP3 failed — using the built-in melody.');
      }
    }
    if (mode === 'synth') startSynth();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    updateUI();
    if (mode === 'file' && fileOk) audio.pause();
    else stopSynth();
  }

  function toggle() {
    if (playing) pause();
    else start();
  }

  function setMuted(m) {
    muted = m;
    if (mode === 'file' && fileOk) {
      audio.muted = muted;
    } else if (master) {
      master.gain.setTargetAtTime(muted ? 0 : BASE_VOLUME, actx.currentTime, 0.08);
    }
    updateUI();
  }

  function isMuted() { return muted; }
  function isPlaying() { return playing; }

  function updateUI() {
    const toggleBtn = document.getElementById('mc-toggle');
    const muteBtn = document.getElementById('mc-mute');
    if (!toggleBtn) return;
    const icPlay = toggleBtn.querySelector('.ic-play');
    const icPause = toggleBtn.querySelector('.ic-pause');
    icPlay.style.display = playing ? 'none' : 'block';
    icPause.style.display = playing ? 'block' : 'none';
    toggleBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');

    const icSound = muteBtn.querySelector('.ic-sound');
    const icMute = muteBtn.querySelector('.ic-mute');
    icSound.style.display = muted ? 'none' : 'block';
    icMute.style.display = muted ? 'block' : 'none';
    muteBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
  }

  // wire controls once the DOM is ready (main.js ensures order)
  document.getElementById('mc-toggle').addEventListener('click', toggle);
  document.getElementById('mc-mute').addEventListener('click', () => setMuted(!muted));

  return { start, pause, toggle, setMuted, isMuted, isPlaying, updateUI };
})();
