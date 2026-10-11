(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const cv = $('#fx'), ctx = cv.getContext('2d');
const cake = $('#cake'), overlay = $('#overlay'), wish = $('#wish');
const blowBtn = $('#blowBtn'), surpriseBtn = $('#surpriseBtn');
const closeBtn = $('#closeBtn'), moreBtn = $('#moreBtn'), musicBtn = $('#musicBtn');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);

/* ================= Candles ================= */
const xs = [164, 182, 200, 218, 236];
$('#candles').innerHTML = xs.map((x, i) => `
<g style="--i:${i}">
  <rect x="${x - 3.5}" y="64" width="7" height="38" rx="2" fill="url(#candleG)"/>
  <rect x="${x - 3.5}" y="74" width="7" height="4" fill="#2f5bd6" opacity=".85"/>
  <rect x="${x - 3.5}" y="86" width="7" height="4" fill="#2f5bd6" opacity=".85"/>
  <path d="M${x} 64 v-5" stroke="#3a2a14" stroke-width="1.4" stroke-linecap="round"/>
  <g class="fl" transform="translate(${x} 59)">
    <circle class="glow" cy="-13" r="22" fill="url(#glowG)"/>
    <g class="flame" style="--d:${(-i * 0.07).toFixed(2)}s">
      <path d="M0 0 C7 -6 7 -17 0 -28 C-7 -17 -7 -6 0 0Z" fill="url(#flameG)"/>
      <path d="M0 -1 C3 -4 3 -9 0 -15 C-3 -9 -3 -4 0 -1Z" fill="#fffbe6" opacity=".9"/>
    </g>
  </g>
  <circle class="smoke" cx="${x}" cy="54" r="4"/>
</g>`).join('');

/* ================= Canvas particles ================= */
let W = 0, H = 0, small = false;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight; small = W < 600;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function sprite(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}
function heartPath(g, s, x, y) {
  g.beginPath();
  g.moveTo(x, y + s * .35);
  g.bezierCurveTo(x - s * .6, y - s * .05, x - s * .35, y - s * .55, x, y - s * .2);
  g.bezierCurveTo(x + s * .35, y - s * .55, x + s * .6, y - s * .05, x, y + s * .35);
  g.closePath();
}
const heartSprite = (fill, rgb) => sprite(64, (g, s) => {
  const c = s / 2, r = g.createRadialGradient(c, c, 0, c, c, c);
  r.addColorStop(0, `rgba(${rgb},.5)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  g.fillStyle = fill; heartPath(g, s * .5, c, c); g.fill();
});
const S = {
  dust: sprite(32, (g, s) => {
    const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    r.addColorStop(0, 'rgba(255,241,184,1)'); r.addColorStop(.35, 'rgba(244,210,122,.55)'); r.addColorStop(1, 'rgba(244,210,122,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
  }),
  star: sprite(48, (g, s) => {
    const c = s / 2, r = g.createRadialGradient(c, c, 0, c, c, c);
    r.addColorStop(0, 'rgba(255,250,225,.9)'); r.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = r; g.fillRect(0, 0, s, s);
    g.fillStyle = '#fffbe8'; g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, rad = i % 2 ? c * .14 : c * .62;
      g.lineTo(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
    }
    g.closePath(); g.fill();
  }),
  heartR: heartSprite('#ff6f91', '255,111,145'),
  heartG: heartSprite('#f7d98a', '244,210,122'),
};

const P = [];
const COLORS = ['#f4d27a', '#fff1b8', '#2f5bd6', '#fff6e5', '#c9a13b', '#ff6f91', '#7aa2ff'];
let celebrating = false, rain = 0;

function ambient(init) {
  const t = Math.random(), k = t < .5 ? 'dust' : t < .75 ? 'star' : 'heart';
  return {
    k: 'spr', amb: true, x: rnd(0, W), y: init ? rnd(0, H) : H + 30,
    vx: rnd(-6, 6), vy: -rnd(10, 32), ph: rnd(0, 6.28), sp: rnd(1, 3), a: rnd(.4, .9),
    s: k === 'dust' ? rnd(6, 16) : k === 'star' ? rnd(10, 22) : rnd(14, 26),
    img: k === 'heart' ? (Math.random() < .5 ? S.heartR : S.heartG) : S[k],
  };
}
function seedAmbient() {
  const n = reduce ? 10 : small ? 34 : 70;
  for (let i = 0; i < n; i++) P.push(ambient(true));
}
seedAmbient();

function confetti(x, y, n, spread = Math.PI * 2, dir = -Math.PI / 2) {
  if (reduce) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = dir + rnd(-spread / 2, spread / 2), v = rnd(260, 720);
    P.push({ k: 'conf', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: rnd(6, 11), h: rnd(3, 6),
      r: rnd(0, 6.28), vr: rnd(-9, 9), c: COLORS[i % COLORS.length], life: rnd(2.8, 4.4), t: 0 });
  }
}
function sparks(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, 6.28), v = rnd(40, 200);
    P.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, s: rnd(10, 22), life: rnd(.9, 1.6), t: 0,
      img: Math.random() < .6 ? S.star : S.dust });
  }
}
function risingHearts(n) {
  for (let i = 0; i < n; i++) {
    P.push({ k: 'rise', x: rnd(10, W - 10), y: H + 30, vy: -rnd(90, 220), sw: rnd(10, 30), ph: rnd(0, 6.28),
      s: rnd(22, 46), life: 99, t: 0, img: Math.random() < .6 ? S.heartR : S.heartG });
  }
}

let last = 0, running = true;
function frame(ts) {
  if (!running) return;
  const dt = Math.min((ts - last) / 1000 || 0, .05); last = ts;
  const T = ts / 1000;
  ctx.clearRect(0, 0, W, H);

  if (celebrating && !reduce) {
    rain += dt;
    if (rain > (small ? .3 : .18)) { rain = 0; risingHearts(1); }
  }
  if (P.length > 520) P.splice(0, P.length - 520 > 0 ? 40 : 0);

  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    if (p.k === 'spr') {
      p.x += (p.vx + Math.sin(T * .6 + p.ph) * 8) * dt; p.y += p.vy * dt;
      if (p.y < -30) { P[i] = ambient(false); continue; }
      ctx.globalAlpha = p.a * (.55 + .45 * Math.sin(T * p.sp + p.ph));
      ctx.drawImage(p.img, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    } else if (p.k === 'rise') {
      p.t += dt; p.y += p.vy * dt;
      if (p.y < -60) { P[i] = P[P.length - 1]; P.pop(); continue; }
      ctx.globalAlpha = Math.min(1, p.t * 2) * .95;
      ctx.drawImage(p.img, p.x + Math.sin(T * 1.6 + p.ph) * p.sw - p.s, p.y - p.s, p.s * 2, p.s * 2);
    } else if (p.k === 'spark') {
      p.t += dt;
      if (p.t > p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.vx *= 1 - 1.5 * dt; p.vy *= 1 - 1.5 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = 1 - p.t / p.life;
      ctx.drawImage(p.img, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
    } else {
      p.t += dt;
      if (p.t > p.life || p.y > H + 30) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.vx *= 1 - 1.9 * dt; p.vy += (420 - p.vy * 1.9) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      ctx.globalAlpha = Math.min(1, (p.life - p.t) * 1.5);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 1.7));
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ================= Candle blowing ================= */
let lit = true;
function candlePoint() {
  const r = cake.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height * .16];
}
function blow() {
  if (!lit) return;
  lit = false;
  cake.classList.add('out');
  blowBtn.textContent = '🕯️ Relight the Candles';
  wish.classList.add('show');
  const [x, y] = candlePoint();
  sparks(x, y, small ? 24 : 40);
  confetti(x, y, small ? 30 : 50, Math.PI * .9);
  clearTimeout(blow.t);
  blow.t = setTimeout(() => wish.classList.remove('show'), 3200);
}
function relight() {
  lit = true;
  cake.classList.remove('out');
  wish.classList.remove('show');
  blowBtn.textContent = '💨 Blow the Candles';
}
const toggleCandles = () => (lit ? blow() : relight());
blowBtn.addEventListener('click', toggleCandles);
cake.addEventListener('click', toggleCandles);

/* ================= Surprise ================= */
const msg = $('#msg');
msg.innerHTML = msg.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');

function celebrate() {
  const n = small ? 60 : 110;
  confetti(0, H * .8, n, Math.PI * .5, -Math.PI * .3);
  confetti(W, H * .8, n, Math.PI * .5, -Math.PI * .7);
  confetti(W / 2, H * .55, n, Math.PI * 1.6);
  risingHearts(small ? 10 : 18);
  sparks(W / 2, H * .4, 40);
}
function openSurprise() {
  startMusic();
  const wasLit = lit;
  if (wasLit) blow();
  setTimeout(() => {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    celebrating = true;
    celebrate();
    setTimeout(() => celebrating && confetti(W / 2, H * .5, small ? 50 : 90, Math.PI * 2), 1400);
    closeBtn.focus({ preventScroll: true });
  }, wasLit ? 900 : 150);
}
function closeSurprise() {
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  celebrating = false;
  surpriseBtn.focus({ preventScroll: true });
}
surpriseBtn.addEventListener('click', openSurprise);
moreBtn.addEventListener('click', celebrate);
closeBtn.addEventListener('click', closeSurprise);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('show')) closeSurprise(); });

/* ================= Music (synthesized, no files needed) ================= */
let ac = null, master = null, bus = null, musicOn = false, timer = 0, voices = [];
const BEAT = .66;
const TUNE = [
  [392, .75], [392, .25], [440, 1], [392, 1], [523.25, 1], [493.88, 2],
  [392, .75], [392, .25], [440, 1], [392, 1], [587.33, 1], [523.25, 2],
  [392, .75], [392, .25], [783.99, 1], [659.25, 1], [523.25, 1], [493.88, 1], [440, 1],
  [698.46, .75], [698.46, .25], [659.25, 1], [523.25, 1], [587.33, 1], [523.25, 2],
];

function initAudio() {
  if (ac) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  bus = ac.createGain(); bus.connect(master);
  const delay = ac.createDelay(); delay.delayTime.value = .32;
  const fb = ac.createGain(); fb.gain.value = .32;
  const wet = ac.createGain(); wet.gain.value = .45;
  bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  return true;
}
function note(f, t, d) {
  [[f, 'sine', .22], [f * 2, 'sine', .05], [f / 2, 'triangle', .07]].forEach(([fr, type, v]) => {
    const o = ac.createOscillator(), g = ac.createGain(), end = t + d * 1.6 + .5;
    o.type = type; o.frequency.value = fr;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, end);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(end + .1);
    voices.push(o);
    o.onended = () => { const i = voices.indexOf(o); if (i > -1) voices.splice(i, 1); };
  });
}
function playLoop() {
  if (!musicOn) return;
  let t = ac.currentTime + .1;
  TUNE.forEach(([f, b]) => { note(f, t, b * BEAT); t += b * BEAT; });
  timer = setTimeout(playLoop, (t - ac.currentTime + 1.5) * 1000);
}
function paintMusic() {
  musicBtn.classList.toggle('on', musicOn);
  musicBtn.setAttribute('aria-pressed', String(musicOn));
  musicBtn.querySelector('.lbl').textContent = musicOn ? 'Music On' : 'Music Off';
}
function startMusic() {
  if (musicOn || !initAudio()) return;
  musicOn = true;
  ac.resume();
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(.6, ac.currentTime, .3);
  playLoop();
  paintMusic();
}
function stopMusic() {
  if (!musicOn) return;
  musicOn = false;
  clearTimeout(timer);
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setTargetAtTime(0, ac.currentTime, .08);
  const old = voices.splice(0);
  setTimeout(() => old.forEach((o) => { try { o.stop(); } catch (e) {} }), 400);
  paintMusic();
}
musicBtn.addEventListener('click', () => (musicOn ? stopMusic() : startMusic()));

// Music begins only after the person first touches or clicks the page.
let touched = false;
addEventListener('pointerdown', (e) => {
  if (touched) return;
  touched = true;
  if (!e.target.closest('#musicBtn')) startMusic();
}, { passive: true });

/* ================= Pause when tab is hidden ================= */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    if (ac && musicOn) ac.suspend();
  } else {
    running = true; last = performance.now(); requestAnimationFrame(frame);
    if (ac && musicOn) ac.resume();
  }
});
})();
