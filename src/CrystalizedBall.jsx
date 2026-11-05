import React, { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uPointerVelocity;
uniform float uTime;
uniform float uIntro;
uniform float uPulse;
uniform float uPointerActive;
uniform float uCrackle;
uniform float uFill;
uniform vec3 uColor;

#define PI 3.14159265359
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float n = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { n += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return n;
}
void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.x *= uResolution.x / uResolution.y;
  float radius = length(p);
  float angle = atan(p.y, p.x);
  vec2 pointer = uPointer;
  float influence = exp(-length(p - pointer) * 2.6);
  float time = uTime * 0.18;
  vec2 flow = vec2(cos(angle * 2.0 + time), sin(angle * 2.0 - time)) * 0.28;
  float turbulence = fbm(p * 4.0 + flow + vec2(time, -time * 0.72));
  turbulence += 0.45 * fbm(p * 8.0 - flow * 1.6 - time * 0.4);
  float inside = 1.0 - smoothstep(0.955, 1.0, radius);
  float rimWave = sin(angle * 18.0 + sin(angle * 5.0 + time) * 3.0 + time * 2.2);
  float rim = exp(-abs(radius - (0.79 + rimWave * 0.014 * uCrackle)) * 82.0);
  float fineRim = exp(-abs(radius - (0.825 + sin(angle * 41.0 - time * 3.0) * 0.008 * uCrackle)) * 180.0);
  float tendrils = pow(max(0.0, sin(angle * 8.0 + time * 1.7 + turbulence * 8.0)), 13.0);
  float crackle = exp(-abs(radius - (0.78 + tendrils * 0.14 * uCrackle)) * 64.0) * tendrils;
  float plasma = smoothstep(0.25, 0.9, turbulence) * (0.32 + 0.68 * turbulence);
  float pool = (1.0 - smoothstep(-0.55, 0.9, p.y)) * (1.0 - smoothstep(0.45, 1.0, abs(p.x))) * uFill;
  float glow = exp(-max(radius - 0.79, 0.0) * 9.0) * (0.14 + plasma * 0.34);
  vec3 hot = mix(uColor, vec3(1.0, 0.88, 0.67), clamp(plasma * 0.82 + rim * 0.3, 0.0, 1.0));
  vec3 color = hot * (inside * (0.14 + plasma * 0.44 + pool * 0.25) + rim * 0.92 + fineRim * 0.7 + crackle * 1.1 + glow);
  color += uColor * (tendrils * exp(-abs(radius - 0.88) * 20.0) * 0.85);
  // Poeira luminosa animada, distribuída em uma grade de células determinística.
  vec2 cell = floor((p + 1.0) * 29.0);
  vec2 local = fract((p + 1.0) * 29.0) - 0.5;
  float seed = hash(cell);
  vec2 drift = vec2(sin(uTime * 0.45 + seed * 20.0), cos(uTime * 0.37 + seed * 16.0)) * 0.16;
  vec2 particlePosition = (cell + 0.5) / 29.0 * 2.0 - 1.0;
  float pointerDust = exp(-length(particlePosition - pointer) * 5.0) * uPointerActive;
  float pointerSpeed = length(uPointerVelocity);
  vec2 mouseTrail = pointerSpeed > 0.001
    ? normalize(uPointerVelocity) * min(pointerSpeed, 3.5) * pointerDust * 0.14
    : vec2(0.0);
  float particleSize = mix(0.018, 0.045, hash(cell + vec2(7.0, 3.0)));
  float particle = 1.0 - smoothstep(particleSize * 0.55, particleSize, length(local - drift - mouseTrail));
  float twinkle = 0.35 + 0.65 * sin(uTime * (1.5 + seed * 4.0) + seed * 60.0);
  float ambientDust = step(0.68, seed) * smoothstep(0.12, 0.8, turbulence);
  float mouseDust = step(0.48, seed) * pointerDust;
  float particleMask = max(ambientDust, mouseDust) * inside;
  color += mix(uColor, vec3(1.0), 0.55) * particle * max(twinkle, 0.0) * particleMask * (1.6 + pointerDust * 2.4);
  color += uColor * influence * uPulse * 0.9;
  float alpha = clamp((inside * (0.24 + plasma * 0.37 + pool * 0.16) + rim * 0.42 + fineRim * 0.25 + crackle * 0.45 + glow * 0.55 + particle * particleMask * (0.2 + pointerDust * 0.35)) * uIntro, 0.0, 0.82);
  gl_FragColor = vec4(color * uIntro, alpha);
}`;

function parseHex(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255);
}

export default function CrystalizedBall({ color = '#F97316', crackle = 0.85, fill = 0.5, interactive = true, hoverStrength = 0.7, className = '' }) {
  const containerRef = useRef(null);
  const settingsRef = useRef({ color, crackle, fill, interactive, hoverStrength });
  settingsRef.current = { color, crackle, fill, interactive, hoverStrength };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const renderer = new Renderer({ alpha: true, antialias: true, premultipliedAlpha: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;
    if (!gl) return undefined;
    const canvas = gl.canvas;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.className = 'crystalized-ball-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);
    const dustCanvas = document.createElement('canvas');
    dustCanvas.className = 'crystalized-ball-dust';
    dustCanvas.setAttribute('aria-hidden', 'true');
    container.appendChild(dustCanvas);
    const dustContext = dustCanvas.getContext('2d');

    const uniforms = {
      uResolution: { value: [1, 1] },
      uPointer: { value: [0, 0] },
      uPointerVelocity: { value: [0, 0] },
      uTime: { value: 0 },
      uIntro: { value: 0 },
      uPulse: { value: 0 },
      uPointerActive: { value: 0 },
      uCrackle: { value: crackle },
      uFill: { value: fill },
      uColor: { value: parseHex(color) }
    };
    const program = new Program(gl, { vertex, fragment, uniforms, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let startAt = performance.now();
    let pulse = 0;
    let pointer = [0, 0];
    let pointerVelocity = [0, 0];
    let pointerActive = 0;
    let lastPointerAt = 0;
    let lastPointerPosition = null;
    let lastFrameAt = startAt;
    const dustParticles = [];
    let isVisible = true;

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height);
      uniforms.uResolution.value = [width, height];
      dustCanvas.width = Math.round(width * pixelRatio);
      dustCanvas.height = Math.round(height * pixelRatio);
      dustContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(performance.now());
    };
    const move = event => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nextPointer = [(x / rect.width - 0.5) * 2, (0.5 - y / rect.height) * 2];
      const distanceFromCenter = Math.hypot(nextPointer[0] * rect.width / rect.height, nextPointer[1]);
      if (distanceFromCenter > 0.96 || !settingsRef.current.interactive) {
        pointerActive = 0;
        pointerVelocity = [0, 0];
        lastPointerAt = 0;
        lastPointerPosition = null;
        uniforms.uPointerActive.value = 0;
        return;
      }
      const now = performance.now();
      const delta = lastPointerAt ? Math.max((now - lastPointerAt) / 1000, 0.001) : 0;
      const pixelVelocity = lastPointerPosition && delta
        ? [(x - lastPointerPosition.x) / delta, (y - lastPointerPosition.y) / delta]
        : [0, 0];
      if (lastPointerAt) {
        pointerVelocity = nextPointer.map((value, index) => {
          const speed = Math.max(-4, Math.min(4, (value - pointer[index]) / delta));
          return pointerVelocity[index] * 0.45 + speed * 0.55;
        });
      }
      const speed = Math.hypot(...pixelVelocity);
      const particleCount = Math.min(10, Math.max(3, Math.round(speed / 220) + 2));
      for (let index = 0; index < particleCount; index++) {
        const angle = Math.random() * Math.PI * 2;
        const drift = 12 + Math.random() * 36;
        dustParticles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: -pixelVelocity[0] * 0.08 + Math.cos(angle) * drift,
          vy: -pixelVelocity[1] * 0.08 + Math.sin(angle) * drift - 8,
          age: 0,
          life: 0.45 + Math.random() * 0.5,
          size: 0.8 + Math.random() * 1.5
        });
      }
      if (dustParticles.length > 180) dustParticles.splice(0, dustParticles.length - 180);
      pointer = nextPointer;
      lastPointerAt = now;
      lastPointerPosition = { x, y };
      pointerActive = 1;
      uniforms.uPointer.value = pointer;
      uniforms.uPointerActive.value = pointerActive;
      if (settingsRef.current.interactive) start();
    };
    const click = event => {
      const rect = container.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      pulse = Math.max(pulse, settingsRef.current.hoverStrength);
      start();
    };
    function draw(now) {
      raf = 0;
      if (!isVisible) return;
      const elapsed = (now - startAt) / 1000;
      uniforms.uTime.value = reduceMotion ? 0 : elapsed;
      uniforms.uIntro.value = reduceMotion ? 1 : Math.min(1, elapsed / 2.2);
      uniforms.uPulse.value = pulse;
      if (!reduceMotion) {
        pointerVelocity = pointerVelocity.map(value => Math.abs(value) < 0.015 ? 0 : value * 0.92);
      } else {
        pointerVelocity = [0, 0];
      }
      uniforms.uPointerVelocity.value = pointerVelocity;
      uniforms.uPointerActive.value = pointerActive;
      uniforms.uCrackle.value = settingsRef.current.crackle;
      uniforms.uFill.value = settingsRef.current.fill;
      uniforms.uColor.value = parseHex(settingsRef.current.color);
      drawDust(Math.min((now - lastFrameAt) / 1000, 0.05));
      lastFrameAt = now;
      pulse *= 0.96;
      renderer.render({ scene: mesh });
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    }
    function drawDust(delta) {
      if (!dustContext) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      dustContext.clearRect(0, 0, width, height);
      dustContext.save();
      for (let index = dustParticles.length - 1; index >= 0; index--) {
        const particle = dustParticles[index];
        particle.age += delta;
        if (particle.age >= particle.life) {
          dustParticles.splice(index, 1);
          continue;
        }
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= Math.pow(0.94, delta * 60);
        particle.vy *= Math.pow(0.94, delta * 60);
        const alpha = 1 - particle.age / particle.life;
        dustContext.globalAlpha = alpha;
        dustContext.fillStyle = '#ffe0bd';
        dustContext.shadowColor = '#ff9b55';
        dustContext.shadowBlur = 8;
        dustContext.beginPath();
        dustContext.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        dustContext.fill();
      }
      dustContext.restore();
    }
    function start() {
      if (!raf && isVisible) raf = requestAnimationFrame(draw);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else { cancelAnimationFrame(raf); raf = 0; }
    });
    visibility.observe(container);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', click, { passive: true });
    resize();
    start();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', click);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      dustCanvas.remove();
      canvas.remove();
    };
  }, []);

  return <div ref={containerRef} className={`crystalized-ball ${className}`.trim()} />;
}
