import React from 'react';
import { createRoot } from 'react-dom/client';
import CrystalizedBall from './CrystalizedBall.jsx';
import GhostCursor from './GhostCursor.jsx';
import SplitText from './SplitText.jsx';
import './CrystalizedBall.css';

/* interruptores de teste (opcionais): abra o site com ?lite (sem os efeitos WebGL) ou ?nosplit (sem a animação palavra a palavra)
   para descobrir qual efeito causa lentidão ou piscadas em um navegador específico */
const params = new URLSearchParams(location.search);
const LITE = params.has('lite');
const NOSPLIT = params.has('nosplit');

const ghostMount = document.querySelector('#ghost-cursor-root');
/* em telas de toque o rastro do cursor não faz sentido e disputa a GPU (limite de contextos WebGL no iOS) com a esfera e a estrela 3D */
const TOUCH = matchMedia('(pointer: coarse)').matches;
if (ghostMount && !LITE && !TOUCH) {
  createRoot(ghostMount).render(
    <GhostCursor
      color="#D9B46A"
      size={74}
      trailLength={72}
      inertia={0.62}
      turbulence={0.78}
      drift={0.12}
      detail={0.9}
      brightness={0.9}
      bloomStrength={0.72}
      bloomRadius={1.2}
      grainIntensity={0.035}
      edgeIntensity={0.5}
      maxDevicePixelRatio={1.5}
      targetPixels={320000}
      intro
      zIndex={0}
    />
  );
}

const splitTextMount = document.querySelector('#split-text-root');
if (splitTextMount && !NOSPLIT) createRoot(splitTextMount).render(<SplitText />);

const mount = document.querySelector('#crystalized-root');
if (mount && !LITE) {
  const renderBall = () => {
    if (mount.dataset.mounted || !document.body.classList.contains('ready')) return;
    mount.dataset.mounted = 'true';
    createRoot(mount).render(
      <CrystalizedBall
        preset="plasma"
        color="#F97316"
        size={0.7}
        crackle={0.85}
        fill={0.5}
        interactive
        hoverStrength={0.7}
      />
    );
  };
  renderBall();
  new MutationObserver(renderBall).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
