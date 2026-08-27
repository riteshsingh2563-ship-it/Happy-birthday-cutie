/* ============================================================
   effects.js — ambient particles + tasteful confetti
   Hand-rolled canvas, zero dependencies.
   ============================================================ */
'use strict';

const Effects = (() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     Ambient particles — soft floating bokeh dust + star twinkles
     ---------------------------------------------------------- */
  const Particles = (() => {
    const canvas = document.getElementById('fx-particles');
    if (!canvas) return { start() {}, stop() {} };
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    let motes = [];
    let rafId = null;
    let t = 0;
    let running = false;

    const PALETTE = [
      [249, 232, 200], // champagne
      [243, 210, 127], // gold
      [143, 183, 232], // soft blue
      [246, 243, 234], // warm white
      [159, 216, 207], // soft teal
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      const count = Math.round(Math.min(70, (W * H) / 26000));
      motes = [];
      for (let i = 0; i < count; i++) {
        const star = Math.random() < 0.14;
        const [r, g, b] = PALETTE[(Math.random() * PALETTE.length) | 0];
        motes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: star ? 0.8 + Math.random() * 1.4 : 0.7 + Math.random() * 2.3,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -(0.02 + Math.random() * 0.09),
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.9,
          base: 0.05 + Math.random() * 0.13,
          color: [r, g, b],
          star,
        });
      }
    }

    function frame() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      for (const m of motes) {
        m.x += m.vx + Math.sin(t * m.speed + m.phase) * 0.05;
        m.y += m.vy;
        if (m.y < -8) { m.y = H + 8; m.x = Math.random() * W; }
        if (m.x < -8) m.x = W + 8;
        if (m.x > W + 8) m.x = -8;

        const tw = 0.55 + 0.45 * Math.sin(t * m.speed * 1.6 + m.phase);
        const a = m.base * tw;
        const [r, g, b] = m.color;

        if (m.star) {
          // 4-point twinkle
          ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, a * 2.2)})`;
          ctx.lineWidth = 0.8;
          const s = m.r * 3.2 * tw;
          ctx.beginPath();
          ctx.moveTo(m.x - s, m.y); ctx.lineTo(m.x + s, m.y);
          ctx.moveTo(m.x, m.y - s); ctx.lineTo(m.x, m.y + s);
          ctx.stroke();
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a * 2.6)})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      if (running || reducedMotion) return;
      running = true;
      resize();
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    window.addEventListener('resize', () => { if (running) resize(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!reducedMotion) start();
    });

    return { start, stop };
  })();

  /* ----------------------------------------------------------
     Confetti — bursts + gentle ambient drift
     ---------------------------------------------------------- */
  const Confetti = (() => {
    const canvas = document.getElementById('fx-confetti');
    if (!canvas) return { burst() {}, ambientOn() {}, ambientOff() {} };
    const ctx = canvas.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    let pieces = [];
    let rafId = null;
    let ambient = 0; // pieces per second target
    let ambientAcc = 0;
    let last = 0;

    const COLORS = [
      '#f3d27f', '#e8b64c', '#f9e8c8', '#fff7ea',
      '#a8c8f0', '#9fd8cf', '#f0c39a', '#e6d3ff',
    ];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makePiece(x, y, opts = {}) {
      const angle = opts.angle !== undefined ? opts.angle : -Math.PI / 2 + (Math.random() - 0.5) * (opts.spread || 1.1);
      const speed = opts.speed !== undefined ? opts.speed : (4 + Math.random() * 7);
      return {
        x, y,
        vx: Math.cos(angle) * speed * (0.5 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed * (0.6 + Math.random() * 0.9) - (opts.upBias || 2),
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        flutter: Math.random() * Math.PI * 2,
        flutterSpeed: 2 + Math.random() * 3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: Math.random() < 0.72 ? 0 : 1, // 0 = rect, 1 = dot
        life: 0,
        ttl: opts.ttl || (2.2 + Math.random() * 1.6),
        gravity: 5.2 + Math.random() * 2.2,
        drag: 0.985,
      };
    }

    function burst(x, y, count = 130, opts = {}) {
      if (reducedMotion) count = Math.min(count, 40);
      for (let i = 0; i < count; i++) {
        pieces.push(makePiece(x, y, opts));
      }
      ensureRunning();
    }

    function ambientOn(rate = 6) {
      ambient = reducedMotion ? 0 : rate;
      ensureRunning();
    }
    function ambientOff() {
      ambient = 0;
    }

    function drawPiece(p) {
      const fade = p.ttl - p.life;
      const a = Math.max(0, Math.min(1, fade / 0.6));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + Math.sin(p.flutter) * 0.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 0) {
        const squash = 0.35 + 0.65 * Math.abs(Math.sin(p.flutter));
        ctx.fillRect((-p.w / 2), (-p.h / 2) * squash, p.w, p.h * squash);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      if (ambient > 0) {
        ambientAcc += ambient * dt;
        while (ambientAcc >= 1) {
          ambientAcc -= 1;
          pieces.push(makePiece(Math.random() * W, -12, {
            angle: Math.PI / 2,
            speed: 0.6 + Math.random() * 1.2,
            upBias: 0,
            ttl: 5 + Math.random() * 3,
            gravity: 1.4,
          }));
        }
      }

      ctx.clearRect(0, 0, W, H);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.life += dt;
        p.vy += p.gravity * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.rot += p.vr;
        p.flutter += p.flutterSpeed * dt;
        if (p.life >= p.ttl || p.y > H + 30) {
          pieces.splice(i, 1);
          continue;
        }
        drawPiece(p);
      }

      if (pieces.length > 0) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = null;
      }
    }

    function ensureRunning() {
      if (!rafId) {
        resize();
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    }

    window.addEventListener('resize', resize);

    return { burst, ambientOn, ambientOff };
  })();

  /* ----------------------------------------------------------
     Flash — soft golden light bloom between scenes
     ---------------------------------------------------------- */
  let flashEl = null;
  function flash() {
    if (reducedMotion) return;
    flashEl = document.getElementById('fx-flash');
    if (!flashEl) return;
    flashEl.classList.remove('go');
    void flashEl.offsetWidth; // restart animation
    flashEl.classList.add('go');
  }

  function centerBurst(count, opts) {
    Confetti.burst(window.innerWidth / 2, window.innerHeight * 0.42, count, opts);
  }

  return { Particles, Confetti, flash, centerBurst };
})();
