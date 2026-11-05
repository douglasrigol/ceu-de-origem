import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(GSAPSplitText, useGSAP);

const PAGE_TEXT_SELECTOR = 'h1,h2,h3';

export default function SplitText({
  delay = 24,
  duration = 0.68,
  ease = 'power2.out',
  splitType = 'words',
  from = { opacity: 0, y: 18 },
  to = { opacity: 1, y: 0 },
  threshold = 0.12,
  rootMargin = '-32px',
  onLetterAnimationComplete
}) {
  const rootRef = useRef(null);
  const completeRef = useRef(onLetterAnimationComplete);
  completeRef.current = onLetterAnimationComplete;

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    const splits = [];
    const observers = [];
    const animations = [];
    const readyObservers = new Set();

    const start = () => {
      if (cancelled) return;
      const candidates = [...document.querySelectorAll(PAGE_TEXT_SELECTOR)].filter(element =>
        element.textContent.trim() && !element.matches('.rv') && !element.closest('[aria-hidden="true"]') && !element.closest('#ghost-cursor-root')
      );
      const candidateSet = new Set(candidates);
      const targets = candidates.filter(element => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (candidateSet.has(parent)) return false;
        }
        return true;
      });
      targets.forEach(element => {
        if (cancelled) return;
        element.classList.add('split-parent');
        const split = new GSAPSplitText(element, {
          type: splitType,
          smartWrap: true,
          linesClass: 'split-line',
          wordsClass: 'split-word',
          charsClass: 'split-char',
          reduceWhiteSpace: false,
          mask: 'words'
        });
        splits.push(split);
        const parts = splitType.includes('chars') ? split.chars : splitType.includes('words') ? split.words : split.lines;
        if (!parts?.length) return;

        const play = () => {
          if (cancelled || element.dataset.splitAnimated === 'true') return;
          element.dataset.splitAnimated = 'true';
          const tween = gsap.fromTo(parts, { ...from }, {
            ...to,
            duration,
            ease,
            stagger: delay / 1000,
            overwrite: 'auto',
            onComplete: () => {
              gsap.set(parts, { clearProps: 'transform,opacity,willChange' });
              completeRef.current?.(element);
            }
          });
          animations.push(tween);
        };

        const playAfterIntro = () => {
          if (!element.closest('.hero') || document.body.classList.contains('ready')) {
            play();
            return;
          }
          const readyObserver = new MutationObserver(() => {
            if (document.body.classList.contains('ready')) {
              readyObserver.disconnect();
              readyObservers.delete(readyObserver);
              play();
            }
          });
          readyObservers.add(readyObserver);
          readyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        };

        const margin = rootMargin === '-32px' ? '0px 0px -12% 0px' : rootMargin;
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) {
            observer.unobserve(element);
            playAfterIntro();
          }
        }, { threshold: Math.min(threshold, 0.1), rootMargin: margin });
        observer.observe(element);
        observers.push(observer);
      });
    };

    if (document.fonts.status === 'loaded') start();
    else document.fonts.ready.then(start);

    return () => {
      cancelled = true;
      readyObservers.forEach(observer => observer.disconnect());
      readyObservers.clear();
      observers.forEach(observer => observer.disconnect());
      animations.forEach(animation => animation.kill());
      splits.forEach(split => split.revert());
    };
  }, {
    scope: rootRef,
    dependencies: [delay, duration, ease, splitType, JSON.stringify(from), JSON.stringify(to), threshold, rootMargin],
    revertOnUpdate: true
  });

  return <div ref={rootRef} className="split-text-controller" aria-hidden="true" />;
}
