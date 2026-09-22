import React, { useEffect, useRef } from 'react';

export type LiveBackgroundEffect = 'antigravity' | 'colorwave' | 'asteroids' | 'aurora' | 'cybergrid' | 'constellations' | 'vortex' | 'matrix';

interface AntigravityBackgroundProps {
  theme?: string;
  backgroundEffect?: string;
}

export const BACKGROUND_EFFECTS = [
  { id: 'antigravity', label: 'Antigravity Shapes', icon: '🪐', description: 'Interactive floating geometrics with particle force fields' },
  { id: 'colorwave', label: 'Fluid Color Waves', icon: '🌊', description: 'Multi-layered oscillating sine wave liquid gradients' },
  { id: 'asteroids', label: 'Cosmic Asteroids', icon: '☄️', description: 'Tumbling 3D space rocks with shooting star meteors' },
  { id: 'aurora', label: 'Aurora Borealis', icon: '🌌', description: 'Ethereal curtains of swaying polar lights & stardust' },
  { id: 'cybergrid', label: 'Cyber Perspective Grid', icon: '🌐', description: '3D synthwave neon grid with traveling light pulses' },
  { id: 'constellations', label: 'Stellar Constellations', icon: '✨', description: 'Deep space starfield with interactive star links' },
  { id: 'vortex', label: 'Galactic Vortex', icon: '🌀', description: 'Orbital particle spiral swirling around magnetic core' },
  { id: 'matrix', label: 'Matrix Code Stream', icon: '💻', description: 'Cascading digital rain with glowing cyber glyphs' },
] as const;

export const THEME_PALETTES: Record<string, { primary: string; secondary: string; glow: string; rgbPrimary: string }> = {
  emerald: { primary: '#A5F344', secondary: '#10B981', glow: 'rgba(165, 243, 68, 0.22)', rgbPrimary: '165, 243, 68' },
  royal: { primary: '#3B82F6', secondary: '#60A5FA', glow: 'rgba(59, 130, 246, 0.22)', rgbPrimary: '59, 130, 246' },
  purple: { primary: '#A855F7', secondary: '#C084FC', glow: 'rgba(168, 85, 247, 0.22)', rgbPrimary: '168, 85, 247' },
  sunset: { primary: '#FF6B00', secondary: '#F97316', glow: 'rgba(255, 107, 0, 0.22)', rgbPrimary: '255, 107, 0' },
  forest: { primary: '#22C55E', secondary: '#4ADE80', glow: 'rgba(34, 197, 94, 0.22)', rgbPrimary: '34, 197, 94' },
  cyberpunk: { primary: '#FF00FF', secondary: '#00FFFF', glow: 'rgba(255, 0, 255, 0.22)', rgbPrimary: '255, 0, 255' },
  gold: { primary: '#FBBF24', secondary: '#F59E0B', glow: 'rgba(251, 191, 36, 0.22)', rgbPrimary: '251, 191, 36' },
  ruby: { primary: '#E11D48', secondary: '#FB7185', glow: 'rgba(225, 29, 72, 0.22)', rgbPrimary: '225, 29, 72' },
  ocean: { primary: '#0EA5E9', secondary: '#38BDF8', glow: 'rgba(14, 165, 233, 0.22)', rgbPrimary: '14, 165, 233' },
  midnight: { primary: '#6366F1', secondary: '#818CF8', glow: 'rgba(99, 102, 241, 0.22)', rgbPrimary: '99, 102, 241' },
  lava: { primary: '#EF4444', secondary: '#F87171', glow: 'rgba(239, 68, 68, 0.22)', rgbPrimary: '239, 68, 68' },
  mint: { primary: '#10B981', secondary: '#34D399', glow: 'rgba(16, 185, 129, 0.22)', rgbPrimary: '16, 185, 129' },
  lavender: { primary: '#8B5CF6', secondary: '#A78BFA', glow: 'rgba(139, 92, 246, 0.22)', rgbPrimary: '139, 92, 246' },
  slate: { primary: '#94A3B8', secondary: '#CBD5E1', glow: 'rgba(148, 163, 184, 0.22)', rgbPrimary: '148, 163, 184' },
  monochrome: { primary: '#F3F4F6', secondary: '#9CA3AF', glow: 'rgba(243, 244, 246, 0.22)', rgbPrimary: '243, 244, 246' },
};

export function AntigravityBackground({ theme = 'emerald', backgroundEffect = 'antigravity' }: AntigravityBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 240,
      isActive: false,
      vx: 0,
      vy: 0,
      lastX: -1000,
      lastY: -1000,
    };

    const shockwaves: Array<{ x: number; y: number; radius: number; maxRadius: number; opacity: number }> = [];

    const currentPalette = THEME_PALETTES[theme] || THEME_PALETTES.emerald;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse Listeners
    const handleMouseMove = (e: MouseEvent) => {
      if (mouse.lastX !== -1000) {
        mouse.vx = e.clientX - mouse.lastX;
        mouse.vy = e.clientY - mouse.lastY;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;
      mouse.isActive = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        mouse.x = touch.clientX;
        mouse.y = touch.clientY;
        mouse.isActive = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.isActive = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleClick = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 10,
        maxRadius: 280,
        opacity: 0.95,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    // ==========================================
    // INITIALIZATION BY EFFECT MODE
    // ==========================================

    // MODE 1: ANTIGRAVITY SHAPES
    const shapeParticleCount = Math.min(130, Math.max(65, Math.floor((width * height) / 10000)));
    const shapeParticles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; shape: 'circle' | 'square' | 'triangle' | 'ring' | 'cross';
      color: string; alpha: number; angle: number; vAngle: number; mass: number; glow: boolean;
    }> = [];

    if (backgroundEffect === 'antigravity') {
      const shapesList: Array<'circle' | 'square' | 'triangle' | 'ring' | 'cross'> = ['circle', 'circle', 'circle', 'square', 'triangle', 'ring', 'cross'];
      for (let i = 0; i < shapeParticleCount; i++) {
        const px = Math.random() * width;
        const py = Math.random() * height;
        const shape = shapesList[Math.floor(Math.random() * shapesList.length)];
        const isPrimary = Math.random() > 0.3;
        shapeParticles.push({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6 - 0.3,
          size: Math.random() * 4.5 + 1.8,
          shape,
          color: isPrimary ? currentPalette.primary : (Math.random() > 0.5 ? currentPalette.secondary : '#FFFFFF'),
          alpha: Math.random() * 0.65 + 0.3,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.03,
          mass: Math.random() * 0.8 + 0.5,
          glow: Math.random() > 0.6,
        });
      }
    }

    // MODE 2: ASTEROIDS & METEORS
    const asteroidCount = Math.min(30, Math.max(14, Math.floor(width / 70)));
    const asteroids: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; rotation: number; vRot: number;
      vertices: Array<{ x: number; y: number }>;
      color: string; alpha: number; glow: boolean;
    }> = [];
    const meteors: Array<{
      x: number; y: number; vx: number; vy: number;
      length: number; size: number; alpha: number; life: number; maxLife: number;
    }> = [];

    if (backgroundEffect === 'asteroids') {
      for (let i = 0; i < asteroidCount; i++) {
        const radius = Math.random() * 18 + 8;
        const vertexCount = Math.floor(Math.random() * 5) + 6;
        const vertices = [];
        for (let v = 0; v < vertexCount; v++) {
          const angle = (v / vertexCount) * Math.PI * 2;
          const offset = (Math.random() - 0.5) * radius * 0.45;
          vertices.push({
            x: Math.cos(angle) * (radius + offset),
            y: Math.sin(angle) * (radius + offset),
          });
        }
        asteroids.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          size: radius,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.02,
          vertices,
          color: Math.random() > 0.4 ? currentPalette.primary : currentPalette.secondary,
          alpha: Math.random() * 0.5 + 0.35,
          glow: Math.random() > 0.5,
        });
      }
    }

    // MODE 3: COLOR WAVE
    let waveTime = 0;
    const waveBubbles: Array<{ x: number; y: number; size: number; speed: number; alpha: number; layer: number }> = [];
    if (backgroundEffect === 'colorwave') {
      for (let i = 0; i < 40; i++) {
        waveBubbles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 6 + 2,
          speed: Math.random() * 0.8 + 0.3,
          alpha: Math.random() * 0.6 + 0.2,
          layer: Math.floor(Math.random() * 3),
        });
      }
    }

    // MODE 4: AURORA
    let auroraStep = 0;
    const auroraParticles: Array<{ x: number; y: number; vy: number; size: number; alpha: number; pulse: number }> = [];
    if (backgroundEffect === 'aurora') {
      for (let i = 0; i < 60; i++) {
        auroraParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vy: -(Math.random() * 0.4 + 0.2),
          size: Math.random() * 3.5 + 1.2,
          alpha: Math.random() * 0.7 + 0.2,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    }

    // MODE 5: CYBER GRID
    let gridOffset = 0;
    const gridPulses: Array<{ col: number; y: number; speed: number; size: number; color: string }> = [];
    if (backgroundEffect === 'cybergrid') {
      const colCount = 18;
      for (let i = 0; i < 25; i++) {
        gridPulses.push({
          col: Math.floor(Math.random() * colCount),
          y: Math.random(),
          speed: Math.random() * 0.008 + 0.004,
          size: Math.random() * 8 + 4,
          color: Math.random() > 0.5 ? currentPalette.primary : currentPalette.secondary,
        });
      }
    }

    // MODE 6: CONSTELLATIONS
    const starCount = Math.min(110, Math.max(50, Math.floor((width * height) / 12000)));
    const stars: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; twinkleSpeed: number;
    }> = [];
    if (backgroundEffect === 'constellations') {
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.03 + 0.01,
        });
      }
    }

    // MODE 7: VORTEX
    const vortexCount = Math.min(220, Math.max(100, Math.floor((width * height) / 6000)));
    const vortexParticles: Array<{
      radius: number; angle: number; speed: number;
      size: number; alpha: number; color: string; z: number;
    }> = [];
    if (backgroundEffect === 'vortex') {
      const maxR = Math.min(width, height) * 0.45;
      for (let i = 0; i < vortexCount; i++) {
        vortexParticles.push({
          radius: Math.pow(Math.random(), 0.7) * maxR + 10,
          angle: Math.random() * Math.PI * 2,
          speed: (Math.random() * 0.015 + 0.005) * (Math.random() > 0.5 ? 1 : 1),
          size: Math.random() * 3.5 + 1.2,
          alpha: Math.random() * 0.8 + 0.2,
          color: Math.random() > 0.35 ? currentPalette.primary : currentPalette.secondary,
          z: Math.random() * 2 + 0.5,
        });
      }
    }

    // MODE 8: MATRIX CODE STREAM
    const matrixChars = '0123456789ABCDEF⚡★✦◈◇◆₹$€£¥';
    const fontSize = 16;
    const columns = Math.floor(width / fontSize) + 1;
    const matrixDrops: Array<{ y: number; speed: number; chars: string[]; length: number }> = [];
    if (backgroundEffect === 'matrix') {
      for (let i = 0; i < columns; i++) {
        const len = Math.floor(Math.random() * 15) + 8;
        const charArr = [];
        for (let j = 0; j < len; j++) {
          charArr.push(matrixChars[Math.floor(Math.random() * matrixChars.length)]);
        }
        matrixDrops.push({
          y: Math.floor(Math.random() * -100),
          speed: Math.random() * 0.8 + 0.4,
          chars: charArr,
          length: len,
        });
      }
    }

    // ==========================================
    // RENDER LOOP
    // ==========================================
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Mouse interactive radial glow overlay
      if (mouse.isActive && mouse.x > 0 && mouse.y > 0) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
        grad.addColorStop(0, `rgba(${currentPalette.rgbPrimary}, 0.16)`);
        grad.addColorStop(0.5, `rgba(${currentPalette.rgbPrimary}, 0.04)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Handle shockwaves across all effects
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += 10;
        sw.opacity *= 0.92;

        if (sw.opacity < 0.01 || sw.radius > sw.maxRadius) {
          shockwaves.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, ${sw.opacity})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // ----------------------------------------------------
      // EFFECT 1: ANTIGRAVITY SHAPES
      // ----------------------------------------------------
      if (backgroundEffect === 'antigravity') {
        // Inter-particle connecting mesh lines
        const maxConnDist = 115;
        for (let i = 0; i < shapeParticles.length; i++) {
          for (let j = i + 1; j < shapeParticles.length; j++) {
            const p1 = shapeParticles[i];
            const p2 = shapeParticles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxConnDist * maxConnDist) {
              const dist = Math.sqrt(distSq);
              const lineAlpha = (1 - dist / maxConnDist) * 0.26 * Math.min(p1.alpha, p2.alpha);
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, ${lineAlpha})`;
              ctx.lineWidth = 0.9;
              ctx.stroke();
            }
          }
        }

        shapeParticles.forEach(p => {
          p.vy -= 0.02 / p.mass;

          if (mouse.isActive) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius && dist > 1) {
              const forceNorm = (mouse.radius - dist) / mouse.radius;
              const repX = (dx / dist) * forceNorm * 4.2;
              const repY = (dy / dist) * forceNorm * 4.2;
              const swirlX = (-dy / dist) * forceNorm * 2.4;
              const swirlY = (dx / dist) * forceNorm * 2.4;
              p.vx += (repX + swirlX) / p.mass;
              p.vy += (repY + swirlY) / p.mass;
            }
          }

          p.vx *= 0.95;
          p.vy *= 0.95;
          p.x += p.vx;
          p.y += p.vy;
          p.angle += p.vAngle;

          if (p.y < -30) { p.y = height + 30; p.x = Math.random() * width; }
          else if (p.y > height + 30) { p.y = -30; p.x = Math.random() * width; }
          if (p.x < -30) p.x = width + 30;
          else if (p.x > width + 30) p.x = -30;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.color;

          if (p.glow) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * 3;
          }

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'square') {
            const s = p.size * 1.6;
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else if (p.shape === 'ring') {
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 1.6, 0, Math.PI * 2);
            ctx.stroke();
          } else if (p.shape === 'triangle') {
            const s = p.size * 2.2;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.866, s * 0.5);
            ctx.lineTo(-s * 0.866, s * 0.5);
            ctx.closePath();
            ctx.fill();
          } else if (p.shape === 'cross') {
            const s = p.size * 1.5;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
            ctx.moveTo(0, -s); ctx.lineTo(0, s);
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 2: COLOR WAVE
      // ----------------------------------------------------
      else if (backgroundEffect === 'colorwave') {
        waveTime += 0.015;
        const waveLayers = [
          { amplitude: 35, wavelength: 0.008, speed: 1.2, yOffset: height * 0.35, color: currentPalette.primary, alpha: 0.18 },
          { amplitude: 50, wavelength: 0.005, speed: -0.9, yOffset: height * 0.55, color: currentPalette.secondary, alpha: 0.15 },
          { amplitude: 25, wavelength: 0.012, speed: 1.6, yOffset: height * 0.72, color: currentPalette.primary, alpha: 0.12 },
        ];

        waveLayers.forEach((layer) => {
          ctx.beginPath();
          ctx.moveTo(0, height);

          for (let x = 0; x <= width; x += 12) {
            let dy = 0;
            if (mouse.isActive) {
              const dist = Math.abs(x - mouse.x);
              if (dist < 200) {
                dy = Math.sin((x + waveTime * 100) * 0.02) * (1 - dist / 200) * 25;
              }
            }
            const y = layer.yOffset + Math.sin(x * layer.wavelength + waveTime * layer.speed) * layer.amplitude + dy;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const waveGrad = ctx.createLinearGradient(0, layer.yOffset - layer.amplitude, 0, height);
          waveGrad.addColorStop(0, layer.color);
          waveGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = waveGrad;
          ctx.globalAlpha = layer.alpha;
          ctx.fill();
        });

        // Floating luminous bubbles on waves
        waveBubbles.forEach(b => {
          b.y -= b.speed;
          if (b.y < -20) { b.y = height + 20; b.x = Math.random() * width; }

          ctx.save();
          ctx.globalAlpha = b.alpha;
          ctx.fillStyle = currentPalette.primary;
          ctx.shadowColor = currentPalette.primary;
          ctx.shadowBlur = b.size * 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 3: ASTEROIDS & METEORS
      // ----------------------------------------------------
      else if (backgroundEffect === 'asteroids') {
        // Spawn random meteor occasionally
        if (Math.random() < 0.03 && meteors.length < 5) {
          const startX = Math.random() * (width * 1.2);
          meteors.push({
            x: startX,
            y: -20,
            vx: - (Math.random() * 8 + 6),
            vy: Math.random() * 8 + 6,
            length: Math.random() * 80 + 40,
            size: Math.random() * 2 + 1,
            alpha: 1,
            life: 0,
            maxLife: Math.floor(Math.random() * 30 + 30),
          });
        }

        // Render meteors
        for (let m = meteors.length - 1; m >= 0; m--) {
          const met = meteors[m];
          met.x += met.vx;
          met.y += met.vy;
          met.life++;
          met.alpha = 1 - (met.life / met.maxLife);

          if (met.life >= met.maxLife || met.y > height + 100 || met.x < -100) {
            meteors.splice(m, 1);
            continue;
          }

          const tailX = met.x - (met.vx / Math.hypot(met.vx, met.vy)) * met.length;
          const tailY = met.y - (met.vy / Math.hypot(met.vx, met.vy)) * met.length;

          const metGrad = ctx.createLinearGradient(met.x, met.y, tailX, tailY);
          metGrad.addColorStop(0, '#FFFFFF');
          metGrad.addColorStop(0.3, currentPalette.primary);
          metGrad.addColorStop(1, 'transparent');

          ctx.save();
          ctx.globalAlpha = met.alpha;
          ctx.strokeStyle = metGrad;
          ctx.lineWidth = met.size;
          ctx.beginPath();
          ctx.moveTo(met.x, met.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();

          // Head glow
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = currentPalette.primary;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(met.x, met.y, met.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Render asteroids
        asteroids.forEach(a => {
          if (mouse.isActive) {
            const dx = a.x - mouse.x;
            const dy = a.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius && dist > 1) {
              const push = (1 - dist / mouse.radius) * 1.5;
              a.vx += (dx / dist) * push;
              a.vy += (dy / dist) * push;
            }
          }

          a.vx *= 0.98;
          a.vy *= 0.98;
          a.x += a.vx;
          a.y += a.vy;
          a.rotation += a.vRot;

          if (a.x < -50) a.x = width + 50;
          else if (a.x > width + 50) a.x = -50;
          if (a.y < -50) a.y = height + 50;
          else if (a.y > height + 50) a.y = -50;

          ctx.save();
          ctx.translate(a.x, a.y);
          ctx.rotate(a.rotation);
          ctx.globalAlpha = a.alpha;
          ctx.strokeStyle = a.color;
          ctx.fillStyle = `rgba(${currentPalette.rgbPrimary}, 0.08)`;
          ctx.lineWidth = 1.6;

          if (a.glow) {
            ctx.shadowColor = a.color;
            ctx.shadowBlur = 10;
          }

          ctx.beginPath();
          a.vertices.forEach((v, idx) => {
            if (idx === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Internal crater lines
          ctx.beginPath();
          ctx.arc(-a.size * 0.2, -a.size * 0.2, a.size * 0.25, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
          ctx.stroke();

          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 4: AURORA BOREALIS
      // ----------------------------------------------------
      else if (backgroundEffect === 'aurora') {
        auroraStep += 0.01;
        const ribbonCount = 3;

        for (let r = 0; r < ribbonCount; r++) {
          const yBase = height * (0.2 + r * 0.25);
          ctx.beginPath();
          ctx.moveTo(0, yBase);

          for (let x = 0; x <= width; x += 20) {
            const shift = Math.sin(x * 0.004 + auroraStep + r) * 60 + Math.cos(x * 0.008 - auroraStep * 0.7) * 30;
            ctx.lineTo(x, yBase + shift);
          }

          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();

          const auroraGrad = ctx.createLinearGradient(0, yBase - 80, 0, yBase + 200);
          auroraGrad.addColorStop(0, 'transparent');
          auroraGrad.addColorStop(0.3, r % 2 === 0 ? currentPalette.primary : currentPalette.secondary);
          auroraGrad.addColorStop(0.7, `rgba(${currentPalette.rgbPrimary}, 0.15)`);
          auroraGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = auroraGrad;
          ctx.globalAlpha = 0.22;
          ctx.fill();
        }

        // Shimmering stardust
        auroraParticles.forEach(p => {
          p.y += p.vy;
          p.pulse += 0.03;
          if (p.y < -20) { p.y = height + 20; p.x = Math.random() * width; }

          const currentAlpha = p.alpha * (0.6 + Math.sin(p.pulse) * 0.4);
          ctx.save();
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = currentPalette.primary;
          ctx.shadowColor = currentPalette.primary;
          ctx.shadowBlur = p.size * 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 5: CYBER GRID
      // ----------------------------------------------------
      else if (backgroundEffect === 'cybergrid') {
        gridOffset = (gridOffset + 1.2) % 40;
        const horizonY = height * 0.45;
        const centerX = width * 0.5;

        // Perspective vertical lines converging to horizon center
        const lineCount = 24;
        ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, 0.2)`;
        ctx.lineWidth = 1;

        for (let i = -lineCount / 2; i <= lineCount / 2; i++) {
          const xBottom = centerX + i * (width / 12);
          ctx.beginPath();
          ctx.moveTo(centerX, horizonY);
          ctx.lineTo(xBottom, height);
          ctx.stroke();
        }

        // Horizontal perspective lines moving towards viewer
        for (let y = horizonY; y < height; y += 18) {
          const progress = (y - horizonY) / (height - horizonY);
          const currentY = y + (gridOffset * progress);
          if (currentY <= height) {
            ctx.beginPath();
            ctx.moveTo(0, currentY);
            ctx.lineTo(width, currentY);
            ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, ${progress * 0.35})`;
            ctx.lineWidth = 1 + progress * 1.5;
            ctx.stroke();
          }
        }

        // Traveling light pulses on grid columns
        gridPulses.forEach(gp => {
          gp.y += gp.speed;
          if (gp.y > 1) gp.y = 0;

          const screenY = horizonY + gp.y * (height - horizonY);
          const xBottom = centerX + (gp.col - 9) * (width / 12);
          const screenX = centerX + (xBottom - centerX) * gp.y;

          ctx.save();
          ctx.fillStyle = gp.color;
          ctx.shadowColor = gp.color;
          ctx.shadowBlur = 12;
          ctx.globalAlpha = gp.y * 0.8;
          ctx.beginPath();
          ctx.arc(screenX, screenY, gp.size * gp.y, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 6: STELLAR CONSTELLATIONS
      // ----------------------------------------------------
      else if (backgroundEffect === 'constellations') {
        const maxDist = 130;

        // Draw connections between stars
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const s1 = stars[i];
            const s2 = stars[j];
            const dx = s1.x - s2.x;
            const dy = s1.y - s2.y;
            const dist = Math.hypot(dx, dy);

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.3 * Math.min(s1.alpha, s2.alpha);
              ctx.beginPath();
              ctx.moveTo(s1.x, s1.y);
              ctx.lineTo(s2.x, s2.y);
              ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, ${alpha})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }

          // Connection to mouse
          if (mouse.isActive) {
            const dx = stars[i].x - mouse.x;
            const dy = stars[i].y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 180) {
              const alpha = (1 - dist / 180) * 0.6 * stars[i].alpha;
              ctx.beginPath();
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = `rgba(${currentPalette.rgbPrimary}, ${alpha})`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }
        }

        // Render stars
        stars.forEach(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.alpha += (Math.random() - 0.5) * s.twinkleSpeed;
          s.alpha = Math.max(0.2, Math.min(0.9, s.alpha));

          if (s.x < 0) s.x = width;
          else if (s.x > width) s.x = 0;
          if (s.y < 0) s.y = height;
          else if (s.y > height) s.y = 0;

          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.fillStyle = currentPalette.primary;
          ctx.shadowColor = currentPalette.primary;
          ctx.shadowBlur = s.size * 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // ----------------------------------------------------
      // EFFECT 7: VORTEX
      // ----------------------------------------------------
      else if (backgroundEffect === 'vortex') {
        const centerX = mouse.isActive ? mouse.x : width * 0.5;
        const centerY = mouse.isActive ? mouse.y : height * 0.5;

        vortexParticles.forEach(p => {
          p.angle += p.speed;
          p.radius -= 0.15;
          if (p.radius < 5) {
            p.radius = Math.min(width, height) * 0.45;
            p.angle = Math.random() * Math.PI * 2;
          }

          const px = centerX + Math.cos(p.angle) * p.radius;
          const py = centerY + Math.sin(p.angle) * p.radius;

          ctx.save();
          ctx.globalAlpha = p.alpha * (p.radius / (Math.min(width, height) * 0.45));
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // Center Singularity Core
        ctx.save();
        ctx.fillStyle = `rgba(${currentPalette.rgbPrimary}, 0.25)`;
        ctx.shadowColor = currentPalette.primary;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ----------------------------------------------------
      // EFFECT 8: MATRIX CODE STREAM
      // ----------------------------------------------------
      else if (backgroundEffect === 'matrix') {
        ctx.font = `${fontSize}px monospace`;

        matrixDrops.forEach((d, i) => {
          d.y += d.speed;
          const x = i * fontSize;

          if (d.y * fontSize > height && Math.random() > 0.975) {
            d.y = 0;
          }

          for (let j = 0; j < d.length; j++) {
            const charY = (d.y - j) * fontSize;
            if (charY < 0 || charY > height) continue;

            const char = d.chars[j % d.chars.length];
            const isHead = j === 0;

            ctx.save();
            if (isHead) {
              ctx.fillStyle = '#FFFFFF';
              ctx.shadowColor = currentPalette.primary;
              ctx.shadowBlur = 8;
              ctx.globalAlpha = 0.95;
            } else {
              const alpha = (1 - j / d.length) * 0.55;
              ctx.fillStyle = j % 2 === 0 ? currentPalette.primary : currentPalette.secondary;
              ctx.globalAlpha = alpha;
            }

            ctx.fillText(char, x, charY);
            ctx.restore();
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
    };
  }, [theme, backgroundEffect]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Dynamic ambient radial gradients matching selected theme */}
      <div 
        className="absolute -top-[25%] -left-[20%] w-[70%] h-[70%] rounded-full blur-[140px] opacity-35 transition-all duration-1000"
        style={{ background: THEME_PALETTES[theme]?.glow || THEME_PALETTES.emerald.glow }}
      />
      <div 
        className="absolute -bottom-[25%] -right-[20%] w-[70%] h-[70%] rounded-full blur-[140px] opacity-30 transition-all duration-1000"
        style={{ background: THEME_PALETTES[theme]?.glow || THEME_PALETTES.emerald.glow }}
      />
      
      {/* Interactive Canvas */}
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />
    </div>
  );
}
