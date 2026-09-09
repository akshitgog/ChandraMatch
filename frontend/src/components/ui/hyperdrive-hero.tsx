"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Rocket } from 'lucide-react';

interface HyperdriveHeroProps { onEngage: () => void; }

const StarfieldCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let speed = 2;
    const stars = Array.from({ length: 420 }, () => ({ x: 0, y: 0, z: 0, pz: 0 }));
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const reset = (star: typeof stars[number]) => {
      star.x = Math.random() * canvas.width - canvas.width / 2;
      star.y = Math.random() * canvas.height - canvas.height / 2;
      star.z = canvas.width;
      star.pz = star.z;
    };
    resize();
    stars.forEach((star) => { reset(star); star.z = Math.random() * canvas.width; star.pz = star.z; });
    const animate = () => {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.z -= speed;
        if (star.z < 1) reset(star);
        const sx = (star.x / star.z) * canvas.width / 2 + canvas.width / 2;
        const sy = (star.y / star.z) * canvas.height / 2 + canvas.height / 2;
        const px = (star.x / star.pz) * canvas.width / 2 + canvas.width / 2;
        const py = (star.y / star.pz) * canvas.height / 2 + canvas.height / 2;
        star.pz = star.z;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy);
        ctx.lineWidth = Math.max(.5, (1 - star.z / canvas.width) * 2);
        ctx.strokeStyle = `rgba(255,255,255,${1 - star.z / canvas.width})`; ctx.stroke();
      });
      frame = requestAnimationFrame(animate);
    };
    const move = (event: MouseEvent) => { speed = 2 + (1 - Math.abs(event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 14; };
    animate(); window.addEventListener('resize', resize); window.addEventListener('mousemove', move);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', move); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
};

export default function HyperdriveHero({ onEngage }: HyperdriveHeroProps) {
  const fadeUp = { hidden: { opacity: 0, y: 18 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * .16 + .35, duration: .7, ease: 'easeOut' } }) };
  return <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black text-white">
    <StarfieldCanvas />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.16),transparent_45%),linear-gradient(to_top,#000,transparent_50%,#000)]" />
    <div className="relative z-10 max-w-3xl px-6 text-center">
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm"><Rocket className="h-4 w-4 text-slate-300" /><span className="text-sm font-medium text-slate-300">Multi-modal lunar image registration</span></motion.div>
      <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="visible" className="mb-6 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-5xl font-bold tracking-tighter text-transparent md:text-7xl">ChandraMatch</motion.h1>
      <motion.p custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">Align lunar imagery across sensors, resolutions, and orbital passes. Launch a focused workspace for precise crater and terrain matching.</motion.p>
      <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible"><button type="button" onClick={onEngage} className="mx-auto flex items-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-black shadow-lg shadow-white/10 transition hover:bg-slate-200">Enter workspace<ArrowRight className="h-5 w-5" /></button></motion.div>
    </div>
  </main>;
}
