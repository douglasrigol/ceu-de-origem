import React, { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { gsap } from 'gsap';
import './ElectricMoonLoader.css';

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform float uReduced;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;
  float t = uTime * (1.0 - uReduced * .85);
  float progress = smoothstep(0.0, 1.0, uProgress);
  vec2 moon = p * 1.18;
  float outer = length(moon - vec2(-.08, 0.0));
  float cut = length(moon - vec2(.22, -.12));
  float crescent = smoothstep(.58, .53, outer) * smoothstep(.46, .51, cut);
  float edge = exp(-abs(outer - .57) * 38.0) * crescent;
  float grain = noise(moon * 5.0 + vec2(t * .16, -t * .11));
  float electric = noise(moon * 9.0 + vec2(-t * .8, t * .55));
  float glow = exp(-max(outer - .42, 0.0) * 7.0) * crescent;
  vec3 gold = vec3(.89, .67, .28);
  vec3 ivory = vec3(1.0, .93, .75);
  float arrivalGlow = smoothstep(.35, 1.0, progress);
  vec3 color = mix(gold, ivory, edge + grain * .12) * (crescent * (.58 + electric * .48 + arrivalGlow * .34) + edge * (2.0 + arrivalGlow * 1.2) + glow * (.22 + arrivalGlow * .24));
  float stars = 0.0;
  for (int i = 0; i < 22; i++) {
    float fi = float(i);
    vec2 cell = vec2(mod(fi * 7.13, 13.0) - 6.5, mod(fi * 4.71, 9.0) - 4.5);
    vec2 star = cell * .22 + vec2(sin(fi * 12.7) * .1, cos(fi * 5.3) * .08);
    float radius = .018 + fract(fi * .37) * .018;
    float twinkle = .55 + .45 * sin(t * (1.4 + fract(fi * .19) * 2.0) + fi);
    stars += smoothstep(radius, radius * .25, length(p - star)) * twinkle * step(.08 + fi * .025, progress);
  }
  float halo = exp(-length(p) * 2.5) * progress * (.12 + arrivalGlow * .16);
  color += gold * (stars * .9 + halo);
  float alpha = clamp(crescent * (.9 + progress * .1) + edge * (.36 + arrivalGlow * .2) + stars * .24, 0.0, .98);
  gl_FragColor = vec4(color, alpha);
}
`;

const waitForMedia = () => {
  const media = [...document.images, ...document.querySelectorAll('video')];
  if (!media.length) return Promise.resolve();
  return Promise.all(media.map(element => new Promise(resolve => {
    const done = () => resolve();
    if ((element.tagName === 'IMG' && element.complete) || (element.tagName === 'VIDEO' && element.readyState >= 3)) done();
    else ['load', 'error', 'loadeddata', 'canplaythrough'].forEach(event => element.addEventListener(event, done, { once: true }));
  })));
};

export default function ElectricMoonLoader() {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const renderer = new Renderer({ alpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;
    if (!gl) return undefined;
    const canvas = gl.canvas;
    canvas.className = 'electric-moon-canvas';
    container.appendChild(canvas);
    const uniforms = {
      uResolution: { value: [1, 1] }, uTime: { value: 0 }, uProgress: { value: 0 }, uReduced: { value: reduced ? 1 : 0 }
    };
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program: new Program(gl, { vertex, fragment, uniforms, transparent: true, depthTest: false, depthWrite: false }) });
    let raf = 0;
    let alive = true;
    let started = performance.now();
    let finished = false;
    let minimumTimer = 0;
    let maximumTimer = 0;
    const state = { value: 0 };
    const resize = () => { const w = Math.max(1, container.clientWidth); const h = Math.max(1, container.clientHeight); renderer.setSize(w, h); uniforms.uResolution.value = [w, h]; };
    const frame = now => { if (!alive) return; uniforms.uTime.value = (now - started) / 1000; uniforms.uProgress.value = state.value; renderer.render({ scene: mesh }); raf = requestAnimationFrame(frame); };
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      const arrivalX = -window.innerWidth * .36;
      const arrivalY = window.innerHeight * .28;
      const timeline = gsap.timeline({ onComplete: () => {
        document.body.classList.add('ready');
        gsap.to(container, { opacity: 0, duration: reduced ? .12 : .65, ease: 'power2.inOut', onComplete: () => setVisible(false) });
      } });
      timeline.to(state, { value: 1, duration: reduced ? .25 : .9, ease: 'power2.out', onUpdate: () => { uniforms.uProgress.value = state.value; } }, 0);
      if (reduced) {
        gsap.set(canvas, { x: 0, y: 0, scale: 1, opacity: 1 });
      } else {
        timeline.to(canvas, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.45, ease: 'power3.inOut' }, 0);
        timeline.to({}, { duration: .22 });
      }
    };
    const signals = { fonts: false, media: false, load: false };
    const update = () => {
      const target = (signals.fonts ? .3 : 0) + (signals.media ? .3 : 0) + (signals.load ? .3 : 0);
      gsap.to(state, { value: Math.min(.9, target + .04), duration: reduced ? .08 : .45, ease: 'power2.out', overwrite: true });
      if (signals.fonts && signals.media && signals.load) {
        const elapsed = performance.now() - started;
        clearTimeout(minimumTimer);
        minimumTimer = setTimeout(finish, Math.max(0, 2200 - elapsed));
      }
    };
    const fontPromise = document.fonts?.ready || Promise.resolve();
    fontPromise.then(() => { signals.fonts = true; update(); });
    waitForMedia().then(() => { signals.media = true; update(); });
    const loadPromise = new Promise(resolve => { if (document.readyState === 'complete') resolve(); else window.addEventListener('load', resolve, { once: true }); });
    loadPromise.then(() => { signals.load = true; update(); });
    maximumTimer = setTimeout(finish, 6000);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    if (reduced) gsap.set(canvas, { x: 0, y: 0, scale: 1, opacity: 1 });
    else gsap.set(canvas, { x: -window.innerWidth * .36, y: window.innerHeight * .28, scale: .22, opacity: .16 });
    raf = requestAnimationFrame(frame);
    return () => { alive = false; clearTimeout(minimumTimer); clearTimeout(maximumTimer); cancelAnimationFrame(raf); observer.disconnect(); gsap.killTweensOf(state); gsap.killTweensOf(canvas); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); };
  }, []);

  if (!visible) return null;
  return <div ref={containerRef} className="electric-moon-loader" role="progressbar" aria-label="Desenhando o céu de origem" aria-valuetext="Desenhando a lua e as estrelas" />;
}
