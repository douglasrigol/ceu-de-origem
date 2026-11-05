import React from 'react';
import { createRoot } from 'react-dom/client';
import CrystalizedBall from './CrystalizedBall.jsx';
import GhostCursor from './GhostCursor.jsx';
import SplitText from './SplitText.jsx';
import './CrystalizedBall.css';

const ghostMount = document.querySelector('#ghost-cursor-root');
if (ghostMount) {
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
if (splitTextMount) createRoot(splitTextMount).render(<SplitText />);

const mount = document.querySelector('#crystalized-root');
if (mount) {
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
