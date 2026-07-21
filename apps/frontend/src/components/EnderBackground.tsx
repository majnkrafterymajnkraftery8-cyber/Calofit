'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  pulseSpeed: number;
  pulseDir: number;
}

interface Explosion {
  x: number;
  y: number;
  phase: 'charge' | 'burst' | 'done';
  age: number; // in frames
  maxChargeAge: number; // frames to charge
  beams: Array<{
    angle: number;
    speed: number;
    length: number;
    maxLength: number;
    width: number;
  }>;
}

export default function EnderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let resizeTimeout: NodeJS.Timeout;
    
    // Set initial size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 150);
    });

    // Particle colors matching emerald theme
    const GREEN_PALETTE = [
      '#10b981', // Emerald
      '#059669', // Medium emerald
      '#34d399', // Light emerald
      '#6ee7b7', // Mint green
      '#a7f3d0', // Pale green
      '#047857', // Dark emerald
      '#10b981ee', // Semi-trans
    ];

    // Background stars
    const backgroundStars: Star[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.5 + 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
    }));

    let particles: Particle[] = [];
    let activeExplosion: Explosion | null = null;
    let framesSinceLastExplosion = 0;
    const EXPLOSION_INTERVAL_FRAMES = 15 * 60; // 15 seconds at 60 FPS

    const triggerExplosion = () => {
      const x = Math.random() * (canvas.width * 0.8) + canvas.width * 0.1;
      const y = Math.random() * (canvas.height * 0.8) + canvas.height * 0.1;
      
      const numBeams = Math.floor(Math.random() * 5) + 6; // 6 to 10 light beams
      const beams = Array.from({ length: numBeams }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.04 - 0.02,
        length: 0,
        maxLength: Math.random() * 150 + 100,
        width: Math.random() * 3 + 1.5,
      }));

      activeExplosion = {
        x,
        y,
        phase: 'charge',
        age: 0,
        maxChargeAge: 90, // ~1.5 seconds charge time
        beams,
      };
    };

    // Draw frame loop
    const render = () => {
      // Check document visibility to freeze performance when backgrounded
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Background Stars (Slowly pulsing & drifting)
      backgroundStars.forEach((star) => {
        // Star pulse alpha
        star.alpha += star.pulseSpeed * star.pulseDir;
        if (star.alpha > 0.7) {
          star.alpha = 0.7;
          star.pulseDir = -1;
        } else if (star.alpha < 0.05) {
          star.alpha = 0.05;
          star.pulseDir = 1;
        }

        ctx.save();
        ctx.fillStyle = `rgba(16, 185, 129, ${star.alpha})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#10b981';
        ctx.fillRect(star.x, star.y, star.size, star.size); // Square stars for Minecraft feel!
        ctx.restore();
      });

      // 2. Process Timer to spawn explosions
      framesSinceLastExplosion++;
      if (framesSinceLastExplosion >= EXPLOSION_INTERVAL_FRAMES) {
        triggerExplosion();
        framesSinceLastExplosion = 0;
      }

      // 3. Process Active Explosion
      if (activeExplosion) {
        const expl = activeExplosion;
        expl.age++;

        if (expl.phase === 'charge') {
          const progress = expl.age / expl.maxChargeAge;

          // Draw the growing glowing star core
          ctx.save();
          const coreSize = progress * 10;
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#10b981';
          
          // Draw a glowing diamond/square star core
          ctx.translate(expl.x, expl.y);
          ctx.rotate(progress * Math.PI);
          ctx.fillRect(-coreSize / 2, -coreSize / 2, coreSize, coreSize);
          ctx.restore();

          // Draw rotating and extending light beams
          expl.beams.forEach((beam) => {
            beam.angle += beam.speed;
            if (beam.length < beam.maxLength) {
              beam.length += (beam.maxLength - beam.length) * 0.08;
            }

            ctx.save();
            const beamGrad = ctx.createLinearGradient(expl.x, expl.y, expl.x + Math.cos(beam.angle) * beam.length, expl.y + Math.sin(beam.angle) * beam.length);
            beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            beamGrad.addColorStop(0.2, 'rgba(52, 211, 153, 0.6)');
            beamGrad.addColorStop(1, 'rgba(4, 120, 87, 0)');

            ctx.strokeStyle = beamGrad;
            ctx.lineWidth = beam.width * (1 - progress * 0.3); // beam narrows slightly as it builds up
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#34d399';
            
            ctx.beginPath();
            ctx.moveTo(expl.x, expl.y);
            ctx.lineTo(expl.x + Math.cos(beam.angle) * beam.length, expl.y + Math.sin(beam.angle) * beam.length);
            ctx.stroke();
            ctx.restore();
          });

          // Check for transition to burst
          if (expl.age >= expl.maxChargeAge) {
            expl.phase = 'burst';
            expl.age = 0;

            // Spawn pixelated explosion particles!
            const count = Math.floor(Math.random() * 25) + 45; // 45 to 70 particles
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 3.5 + 1.2;
              particles.push({
                x: expl.x,
                y: expl.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.floor(Math.random() * 5) + 4, // 4px to 8px squares
                color: GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)],
                alpha: 1,
                life: 0,
                maxLife: Math.floor(Math.random() * 60) + 45, // 0.75 to 1.75 seconds life
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: Math.random() * 0.05 - 0.025,
              });
            }
          }
        } else if (expl.phase === 'burst') {
          // Beams quickly fade away during burst phase
          const burstProgress = Math.min(expl.age / 15, 1);
          if (burstProgress < 1) {
            expl.beams.forEach((beam) => {
              beam.angle += beam.speed * 1.5;
              ctx.save();
              const alpha = (1 - burstProgress) * 0.6;
              const beamGrad = ctx.createLinearGradient(expl.x, expl.y, expl.x + Math.cos(beam.angle) * beam.length, expl.y + Math.sin(beam.angle) * beam.length);
              beamGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
              beamGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

              ctx.strokeStyle = beamGrad;
              ctx.lineWidth = beam.width * (1 - burstProgress);
              ctx.beginPath();
              ctx.moveTo(expl.x, expl.y);
              ctx.lineTo(expl.x + Math.cos(beam.angle) * beam.length, expl.y + Math.sin(beam.angle) * beam.length);
              ctx.stroke();
              ctx.restore();
            });
          } else {
            activeExplosion = null; // Explosion object itself is done, particles will remain
          }
        }
      }

      // 4. Update & Draw Particles (Square/Pixelated Minecraft style)
      particles = particles.filter((p) => {
        p.life++;
        if (p.life >= p.maxLife) return false;

        // Apply friction and gravity
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy += 0.015; // subtle gravity drift downwards

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.7; // Cap opacity for subtle background integration
        
        // Shadow/glow for larger particles
        if (p.size > 5) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
        }

        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        return true;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    // Trigger initial explosion after 3 seconds
    const startDelay = setTimeout(triggerExplosion, 3000);

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(startDelay);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none block"
      style={{
        mixBlendMode: 'screen', // Blends nicely on dark backgrounds
      }}
    />
  );
}
