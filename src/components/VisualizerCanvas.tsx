import React, { useEffect, useRef } from 'react';
import { VisualizerMode } from '../types';
import { hue } from '../utils/helpers';

interface VisualizerCanvasProps {
  isPlaying: boolean;
  isBuffering: boolean;
  visualizerType: VisualizerMode;
  visualizerLevel: number; // 1: light, 2: medium, 3: strong
  folderOrTitle: string;
  isRadial?: boolean;
  className?: string;
}

const FX_LEVELS = [0.6, 1.0, 1.5];

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  isPlaying,
  isBuffering,
  visualizerType,
  visualizerLevel,
  folderOrTitle,
  isRadial = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();
    let energy = 0;
    let beat = 0;
    let particles: Array<{ x: number; y: number; r: number; v: number; p: number; hh: number }> | null = null;

    // Determine BPM and Hue based on folder/title
    const baseHue = hue(folderOrTitle);
    let strHash = 0;
    for (let i = 0; i < folderOrTitle.length; i++) {
      strHash = (strHash * 33 + folderOrTitle.charCodeAt(i)) | 0;
    }
    const bpm = 92 + (Math.abs(strHash) % 40);

    // Resolve mode
    const modes: Array<'bars' | 'wave' | 'pulse' | 'aurora' | 'particles'> = [
      'bars',
      'wave',
      'pulse',
      'aurora',
      'particles',
    ];
    const mode = visualizerType === 'random' ? modes[Math.abs(strHash) % modes.length] : visualizerType;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    fit();
    window.addEventListener('resize', fit);

    const hsl = (h: number, s: number, l: number, a = 1) =>
      `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a})`;

    const frame = (now: number) => {
      const target = isPlaying && !isBuffering ? 1 : 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      energy += (target - energy) * (1 - Math.exp(-dt * (target ? 4 : 3)));
      const t = now / 1000;
      const ph = (t * bpm) / 60;
      const fr = ph % 1;
      const fr2 = (ph + 0.5) % 1;
      const kick = Math.min(1, Math.exp(-5 * fr) + 0.35 * Math.exp(-5 * fr2));
      beat += (kick - beat) * (1 - Math.exp(-dt * 30));

      const lv = FX_LEVELS[Math.max(0, Math.min(2, visualizerLevel - 1))];
      const E = energy * lv;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      if (energy > 0.01) {
        const B = beat;
        const H = baseHue;
        const L = 64;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const cx = w / 2;
        const cy = h / 2;
        const baseR = Math.min(w, h) * 0.28;

        const band = (i: number, n: number) => {
          const x = i / n;
          const v = 0.5 + 0.5 * Math.sin(t * (1.6 + x * 5.5) + i * 1.93) * Math.cos(t * 0.9 + i * 0.7);
          return Math.min(1, E * (0.12 + 0.88 * v * (0.5 + 0.5 * B)) * (1.05 - 0.45 * x));
        };

        switch (mode) {
          case 'bars': {
            if (isRadial) {
              const n = 56;
              const maxLen = Math.max(14, Math.min(baseR * 0.34, w / 2 - baseR - 6));
              ctx.lineWidth = Math.max(3, baseR * 0.035);
              for (let i = 0; i < n; i++) {
                const k = i < n / 2 ? i : n - 1 - i;
                const a = (i / n) * Math.PI * 2 - Math.PI / 2;
                const len = 4 + maxLen * band(k, n / 2);
                const r1 = baseR + 8;
                const r2 = r1 + len;
                ctx.strokeStyle = hsl(H + (i / n) * 70, 85, L, 0.9);
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
                ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
                ctx.stroke();
              }
            } else {
              const bw = 6;
              const gap = 3;
              const n = Math.max(8, Math.floor(w / (bw + gap)));
              for (let i = 0; i < n; i++) {
                const k = (Math.abs(i - (n - 1) / 2) / (n / 2)) * (n / 2);
                const bh = 3 + (h - 6) * 0.9 * band(k, n / 2);
                ctx.fillStyle = hsl(H + (i / n) * 70, 85, L, 0.7);
                ctx.fillRect(i * (bw + gap) + (w - n * (bw + gap)) / 2, h - bh, bw, bh);
              }
            }
            break;
          }
          case 'wave': {
            ctx.lineWidth = isRadial ? 3 : 2;
            for (let j = 0; j < 3; j++) {
              ctx.strokeStyle = hsl(H + j * 35, 85, L, 0.85 - j * 0.22);
              ctx.beginPath();
              if (isRadial) {
                const steps = 120;
                const amp = Math.min(baseR * 0.2, w / 2 - baseR - 8) * E;
                for (let i = 0; i <= steps; i++) {
                  const a = (i / steps) * Math.PI * 2;
                  const d = Math.sin(a * 5 + t * (2.2 + j * 0.7)) * 0.6 + Math.sin(a * 9 - t * 3.1 + j) * 0.4;
                  const rr = baseR + 12 + j * 6 + amp * (0.25 + 0.75 * B) * d;
                  const x = cx + Math.cos(a) * rr;
                  const y = cy + Math.sin(a) * rr;
                  i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                }
                ctx.closePath();
              } else {
                const amp = h * 0.38 * E * (0.35 + 0.65 * B);
                for (let x = 0; x <= w; x += 6) {
                  const u = x / w;
                  const env = Math.sin(Math.PI * u);
                  const y =
                    h / 2 +
                    env * amp * (Math.sin(u * 12 + t * (2.5 + j)) * 0.6 + Math.sin(u * 23 - t * 3.3 + j * 2) * 0.4);
                  x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                }
              }
              ctx.stroke();
            }
            break;
          }
          case 'pulse': {
            const maxR = isRadial ? Math.min(w, h) * 0.62 : Math.max(w, h) * 0.55;
            for (let j = 0; j < 4; j++) {
              const p = (t * 0.32 + j / 4) % 1;
              const rr = baseR * (1.05 + p * (maxR / baseR - 1.05));
              ctx.lineWidth = 2 + (1 - p) * 4 * (0.5 + B);
              ctx.strokeStyle = hsl(H + j * 22, 85, L, Math.max(0, 1 - p) * 0.6 * Math.min(1, E));
              ctx.beginPath();
              ctx.ellipse(cx, cy, rr, isRadial ? rr : rr * 0.9, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            break;
          }
          case 'aurora': {
            const R = Math.max(w, h) * 0.55;
            for (let j = 0; j < 3; j++) {
              const x = w * (0.5 + 0.38 * Math.sin(t * (0.23 + j * 0.11) + j * 2.1));
              const y = h * (0.5 + 0.36 * Math.cos(t * (0.19 + j * 0.13) + j));
              const rr = R * (0.55 + 0.25 * Math.sin(t * 0.5 + j) + 0.18 * B * E);
              const gr = ctx.createRadialGradient(x, y, 0, x, y, rr);
              const a = 0.34 * Math.min(1, E);
              gr.addColorStop(0, hsl(H + j * 55, 90, L, a));
              gr.addColorStop(1, hsl(H + j * 55, 90, L, 0));
              ctx.fillStyle = gr;
              ctx.fillRect(0, 0, w, h);
            }
            break;
          }
          case 'particles': {
            const n = isRadial ? 42 : Math.max(14, Math.floor(w / 20));
            if (!particles || particles.length !== n) {
              particles = Array.from({ length: n }, () => ({
                x: Math.random(),
                y: Math.random(),
                r: 1.5 + Math.random() * 3.5,
                v: 0.03 + Math.random() * 0.08,
                p: Math.random() * 6.28,
                hh: Math.random() * 60,
              }));
            }
            for (const q of particles) {
              q.y -= q.v * dt * (0.4 + E * 2.2 + B * 1.2);
              if (q.y < -0.05) {
                q.y = 1.05;
                q.x = Math.random();
              }
              const px = (q.x + Math.sin(t * 0.6 + q.p) * 0.02) * w;
              const py = q.y * h;
              const pr = q.r * (1 + B * 0.7 * E) * 2;
              const gr = ctx.createRadialGradient(px, py, 0, px, py, pr);
              const al = Math.min(1, E) * (0.5 + 0.4 * Math.sin(t * 2 + q.p));
              gr.addColorStop(0, hsl(H + q.hh, 90, L + 8, al));
              gr.addColorStop(1, hsl(H + q.hh, 90, L, 0));
              ctx.fillStyle = gr;
              ctx.beginPath();
              ctx.arc(px, py, pr, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }
        }
      }

      if (target || energy >= 0.01) {
        rafId = requestAnimationFrame(frame);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', fit);
    };
  }, [isPlaying, isBuffering, visualizerType, visualizerLevel, folderOrTitle, isRadial]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};
