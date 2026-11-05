import { gsap } from 'gsap';

/* ==========================================================================
   Preloader — Céu de Origem
   - progresso real: fontes, window.load, vídeo de fundo e pôster
   - duração mínima (para a animação respirar) e máxima (para nunca prender)
   - ao chegar em 100% o sol vira a esfera do hero e libera a classe .ready
   ========================================================================== */

const MIN_MS = 2600;   // tempo mínimo na tela
const SOFT_MS = 3200;  // recurso lento (vídeo, scripts externos) deixa de bloquear depois disso
const MAX_MS = 6500;   // limite absoluto: libera mesmo que algo ainda carregue
const MAX_SPEED = .5;  // velocidade máxima do contador (fração por segundo), evita saltos
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const NS = 'http://www.w3.org/2000/svg';

const PHRASES = [
  'Alinhando as estrelas…',
  'Marcando o momento…',
  'Desenhando o seu céu…',
  'A noite em que tudo começou',
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const root = document.getElementById('ceu-preloader');
if (root) start(root);

function start(root) {
  const html = document.documentElement;
  const body = document.body;
  const q = s => root.querySelector(s);
  const sky = q('.pl-sky'), skyG = q('.pl-sky-g'), sun = q('.pl-sun');
  const halo = q('.pl-halo'), core = q('.pl-core'), heat = q('.pl-heat');
  const num = q('.pl-num'), phrase = q('.pl-phrase'), readout = q('.pl-readout');
  const shell = [...document.querySelectorAll('header, main, footer')];
  const minMs = RM ? 900 : MIN_MS;

  shell.forEach(el => { el.inert = true; });

  /* Segurança: se o preloader antigo ainda adicionar .ready, a classe é
     removida até a nossa saída, para o hero não animar escondido. */
  let released = false;
  const guard = new MutationObserver(() => {
    if (released) return;
    [html, body].forEach(el => { if (el.classList.contains('ready')) el.classList.remove('ready'); });
  });
  [html, body].forEach(el => guard.observe(el, { attributes: true, attributeFilter: ['class'] }));

  /* ---------- constelações ---------- */
  let W = innerWidth, H = innerHeight;
  const setView = () => {
    W = innerWidth; H = innerHeight;
    sky.setAttribute('viewBox', `${-W / 2} ${-H / 2} ${W} ${H}`);
  };
  setView();
  addEventListener('resize', setView);

  const items = buildSky();

  function buildSky() {
    const R = rng(2024);
    const u = clamp(Math.min(W, H) / 760, .65, 1.35);
    const sunR = Math.min(Math.min(W, H) * .17, 170);
    const N = 12, out = [];

    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2 + (R() - .5) * .35;
      const k = i % 2 ? .5 + R() * .12 : .78 + R() * .1;
      let cx = Math.cos(a) * (W / 2) * k, cy = Math.sin(a) * (H / 2) * k;

      const d = Math.hypot(cx, cy), minD = sunR + 85 * u;
      if (d < minD) { cx *= minD / d; cy *= minD / d; }
      cx = clamp(cx, -W / 2 + 60 * u, W / 2 - 60 * u);
      cy = clamp(cy, -H / 2 + 60 * u, H / 2 - 60 * u);

      // caminho principal: passeio aleatório de 4 a 6 pontos
      const n = 4 + Math.floor(R() * 3);
      let x = 0, y = 0, ang = R() * 6.283;
      const pts = [[0, 0]];
      for (let j = 1; j < n; j++) {
        ang += (R() - .5) * 2.2;
        const step = (26 + R() * 38) * u;
        x += Math.cos(ang) * step; y += Math.sin(ang) * step;
        pts.push([x, y]);
      }
      // ramo saindo de um ponto interno
      const bi = 1 + Math.floor(R() * (n - 2));
      const ba = ang + (R() > .5 ? 1 : -1) * (1 + R());
      const bl = (24 + R() * 30) * u;
      const bp = [pts[bi][0] + Math.cos(ba) * bl, pts[bi][1] + Math.sin(ba) * bl];

      // centraliza o conjunto em (cx, cy)
      const all = [...pts, bp];
      const mx = all.reduce((s, p) => s + p[0], 0) / all.length;
      const my = all.reduce((s, p) => s + p[1], 0) / all.length;
      const P = pts.map(p => [p[0] - mx + cx, p[1] - my + cy]);
      const B = [bp[0] - mx + cx, bp[1] - my + cy];

      const g = document.createElementNS(NS, 'g');
      const mk = (tag, attrs) => {
        const el = document.createElementNS(NS, tag);
        for (const key in attrs) el.setAttribute(key, attrs[key]);
        g.appendChild(el);
        return el;
      };
      const main = mk('path', { class: 'pl-line', pathLength: 1, d: 'M' + P.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L') });
      const branch = mk('path', { class: 'pl-line', pathLength: 1, d: `M${P[bi][0].toFixed(1)} ${P[bi][1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}` });

      const stars = P.map((p, j) => ({
        el: mk('circle', { class: 'pl-star', cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (1.1 + R() * 1.5).toFixed(1) }),
        at: (j / (n - 1)) * .82,
        base: .6 + R() * .4,
        last: -1,
      }));
      stars.push({
        el: mk('circle', { class: 'pl-star', cx: B[0].toFixed(1), cy: B[1].toFixed(1), r: (1 + R()).toFixed(1) }),
        at: .97, base: .8, last: -1,
      });
      skyG.appendChild(g);

      out.push({ main, branch, stars, t0: .05 + (i / N) * .8, span: .17, last: -1 });
    }
    return out;
  }

  function renderSky(p) {
    for (const it of items) {
      const local = clamp((p - it.t0) / it.span);
      if (local === it.last) continue;
      it.last = local;
      it.main.style.strokeDashoffset = 1 - clamp(local / .82);
      it.branch.style.strokeDashoffset = 1 - clamp((local - .55) / .45);
      for (const s of it.stars) {
        const lit = clamp((local - (s.at - .05)) / .1);
        if (lit !== s.last) { s.last = lit; s.el.style.opacity = (lit * s.base).toFixed(3); }
      }
    }
  }

  /* ---------- sol, contador e frases ---------- */
  function renderSun(p) {
    const e = 1 - Math.pow(1 - p, 2.2);
    core.style.transform = `scale(${(RM ? 1 : .42 + .58 * e).toFixed(4)})`;
    core.style.opacity = (.5 + .5 * e).toFixed(3);
    heat.style.opacity = (.1 + .9 * p * p).toFixed(3);
    halo.style.opacity = (.12 + .88 * e).toFixed(3);
    halo.style.transform = `scale(${(RM ? 1 : .55 + .45 * e).toFixed(4)})`;
  }

  let phraseText = PHRASES[0], lastPct = -1, lastAria = -1;
  const stageOf = p => (p >= 1 ? 3 : p >= .7 ? 2 : p >= .3 ? 1 : 0);

  function setPhrase(text) {
    if (text === phraseText) return;
    phraseText = text;
    if (RM) { phrase.textContent = text; return; }
    gsap.killTweensOf(phrase);
    gsap.to(phrase, {
      opacity: 0, y: -6, duration: .22, ease: 'power1.in',
      onComplete() {
        phrase.textContent = text;
        gsap.fromTo(phrase, { y: 6 }, { opacity: 1, y: 0, duration: .35, ease: 'power2.out' });
      },
    });
  }

  function renderReadout(p) {
    const pct = Math.round(p * 100);
    if (pct !== lastPct) { lastPct = pct; num.textContent = pct; }
    setPhrase(PHRASES[stageOf(p)]);
    const step = Math.floor(pct / 10) * 10;
    if (step !== lastAria) {
      lastAria = step;
      root.setAttribute('aria-valuenow', String(step));
      root.setAttribute('aria-valuetext', `${step}%. ${PHRASES[stageOf(p)]}`);
    }
  }

  /* ---------- progresso real ---------- */
  const WEIGHT = { fonts: .2, load: .35, video: .35, poster: .1 };
  const done = { fonts: 0, load: 0, video: 0, poster: 0 };

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { done.fonts = 1; });
  else done.fonts = 1;

  if (document.readyState === 'complete') done.load = 1;
  else addEventListener('load', () => { done.load = 1; }, { once: true });

  const video = document.querySelector('video.bgv');
  if (!video) done.video = 1;
  else {
    const check = () => {
      if (video.readyState >= 3) done.video = 1;
      else if (video.readyState >= 2) done.video = Math.max(done.video, .75);
    };
    ['loadeddata', 'canplay', 'canplaythrough', 'progress'].forEach(ev => video.addEventListener(ev, check));
    video.addEventListener('error', () => { done.video = 1; });
    check();
  }

  const posterSrc = video && video.getAttribute('poster');
  if (!posterSrc) done.poster = 1;
  else {
    const img = new Image();
    img.onload = img.onerror = () => { done.poster = 1; };
    img.src = posterSrc;
  }

  // Recursos pendentes avançam devagar (até 85% do peso deles), então o contador
  // nunca fica parado; passado o SOFT_MS, eles deixam de bloquear a saída.
  let softLogged = false;
  const realProgress = elapsed => {
    if (elapsed >= SOFT_MS && !softLogged) {
      softLogged = true;
      const pending = Object.keys(done).filter(k => done[k] < 1);
      if (pending.length) console.info('[preloader] liberado por tempo; recursos ainda pendentes:', pending.join(', '));
      pending.forEach(k => { done[k] = 1; });
    }
    const creep = Math.min(.85, (elapsed / SOFT_MS) * .85);
    return Object.keys(WEIGHT).reduce((sum, k) => sum + WEIGHT[k] * (done[k] >= 1 ? 1 : Math.max(done[k], creep)), 0);
  };

  /* ---------- parallax sutil das constelações ---------- */
  let onMove = null;
  if (FINE && !RM) {
    const mx = gsap.quickTo(skyG, 'x', { duration: 1.2, ease: 'power3.out' });
    const my = gsap.quickTo(skyG, 'y', { duration: 1.2, ease: 'power3.out' });
    onMove = e => { mx((e.clientX / innerWidth - .5) * -28); my((e.clientY / innerHeight - .5) * -28); };
    addEventListener('pointermove', onMove, { passive: true });
  }

  /* ---------- loop ---------- */
  const t0 = performance.now();
  let last = t0, p = 0, finished = false;
  renderSun(0); renderReadout(0);

  function tick() {
    const now = performance.now();
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    const elapsed = now - t0;

    const t = clamp(elapsed / minMs);
    const timeGoal = -(Math.cos(Math.PI * t) - 1) / 2;      // entra e sai devagar
    const real = elapsed >= MAX_MS ? 1 : realProgress(elapsed);
    const goal = Math.min(real, timeGoal);                  // nunca anda para trás

    p += Math.min((goal - p) * (1 - Math.exp(-dt * 5)), dt * MAX_SPEED);
    if (goal >= 1 && p > .994) p = 1;

    renderSun(p); renderSky(p); renderReadout(p);

    if (p >= 1 && !finished) {
      finished = true;
      gsap.ticker.remove(tick);
      exit();
    }
  }
  gsap.ticker.add(tick);

  /* ---------- saída: o sol vira a esfera do hero ---------- */
  function release() {
    released = true;
    guard.disconnect();
    html.classList.add('ready');
    body.classList.add('ready');
    html.classList.remove('pl-lock');
    shell.forEach(el => { el.inert = false; });
  }

  function cleanup() {
    removeEventListener('resize', setView);
    if (onMove) removeEventListener('pointermove', onMove);
    gsap.killTweensOf([root, sun, core, halo, skyG, readout, phrase]);
    root.remove();
    window.dispatchEvent(new CustomEvent('preloader:done'));
  }

  function exit() {
    root.style.pointerEvents = 'none';

    if (RM) {
      gsap.timeline({ onComplete: cleanup }).add(release).to(root, { opacity: 0, duration: .5, ease: 'power1.out' });
      return;
    }

    const ball = document.getElementById('crystalized-root');
    const target = ball && ball.offsetWidth ? ball.offsetWidth * 1.04 : Math.min(Math.min(innerWidth, innerHeight) * .92, 980);
    const k = sun.offsetWidth ? target / sun.offsetWidth : 2.6;

    gsap.timeline({ onComplete: cleanup })
      // pulso final
      .to(core, { scale: 1.07, duration: .38, ease: 'power2.out' })
      .to(halo, { opacity: 1, scale: 1.3, duration: .38, ease: 'power2.out' }, '<')
      .to(core, { scale: 1, duration: .6, ease: 'power2.inOut' })
      .to(halo, { scale: 1, duration: .6, ease: 'power2.inOut' }, '<')
      // respiro para ler a frase final
      .addLabel('out', '+=.35')
      .to(readout, { opacity: 0, y: -16, duration: .55, ease: 'power2.in' }, 'out')
      .to(skyG, { scale: 1.2, opacity: 0, svgOrigin: '0 0', duration: 1.3, ease: 'power3.in' }, 'out')
      // o hero começa a surgir por baixo enquanto o sol cresce até o tamanho da esfera
      .add(release, 'out+=.3')
      .to(sun, { scale: k, duration: 1.7, ease: 'power3.inOut' }, 'out')
      .to(root, { opacity: 0, duration: 1.1, ease: 'power1.inOut' }, 'out+=.5');
  }
}
