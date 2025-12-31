'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const videos = [
  '/8-bit city road/8-bit city road_front.mp4',
  '/8-bit city road/8-bit city road_side.mp4',
  '/8-bit city road/8-bit city road_back.mp4',
];

interface Particle { id: number; x: number; y: number; size: number; color: string; speed: number; opacity: number; delay: number; }

const PixelParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const colors = ['#FFD700', '#00ff00', '#ff6b6b', '#5CC9F5', '#a855f7'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      newParticles.push({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 3 + 2, color: colors[Math.floor(Math.random() * colors.length)], speed: Math.random() * 20 + 15, opacity: Math.random() * 0.4 + 0.15, delay: Math.random() * 10 });
    }
    setParticles(newParticles);
  }, []);
  return (
    <div className="particles-container">
      {particles.map((p) => (<div key={p.id} className="pixel-particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, opacity: p.opacity, animationDuration: `${p.speed}s`, animationDelay: `${p.delay}s` }} />))}
    </div>
  );
};

const DumbbellIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="20" width="8" height="24" fill="#FF6B6B"/><rect x="16" y="16" width="8" height="32" fill="#CC5555"/><rect x="24" y="28" width="16" height="8" fill="#888"/><rect x="40" y="16" width="8" height="32" fill="#CC5555"/><rect x="48" y="20" width="8" height="24" fill="#FF6B6B"/></svg>);
const ChecklistIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="48" height="48" fill="#5CC9F5"/><rect x="12" y="12" width="40" height="40" fill="#2D8AB5"/><rect x="16" y="20" width="8" height="8" fill="#7FD954"/><rect x="28" y="20" width="20" height="8" fill="white"/><rect x="16" y="36" width="8" height="8" fill="white" opacity="0.6"/><rect x="28" y="36" width="20" height="8" fill="white" opacity="0.6"/></svg>);
const PlaneIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="28" y="8" width="8" height="16" fill="#5fbf8a"/><rect x="24" y="24" width="16" height="24" fill="#5fbf8a"/><rect x="8" y="28" width="16" height="8" fill="#4a9d70"/><rect x="40" y="28" width="16" height="8" fill="#4a9d70"/><rect x="20" y="48" width="8" height="8" fill="#4a9d70"/><rect x="36" y="48" width="8" height="8" fill="#4a9d70"/></svg>);
const LifeIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><path d="M32 56L12 36C4 28 4 16 14 12C24 8 32 18 32 18C32 18 40 8 50 12C60 16 60 28 52 36L32 56Z" fill="#a855f7"/><path d="M32 48L18 34C12 28 12 20 18 17C24 14 32 22 32 22C32 22 40 14 46 17C52 20 52 28 46 34L32 48Z" fill="#c084fc"/></svg>);

const XPBar = ({ current, max, color }: { current: number; max: number; color: string }) => (<div className="xp-bar-container"><div className="xp-bar-bg"><div className="xp-bar-fill" style={{ width: `${(current / max) * 100}%`, background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`, boxShadow: `0 0 8px ${color}60` }} /></div><span className="xp-bar-text">{current.toLocaleString()} / {max.toLocaleString()} XP</span></div>);

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const [blinkDots, setBlinkDots] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [crtFlash, setCrtFlash] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const [primaryActive, setPrimaryActive] = useState(true);
  const firstLine = "Life's not a game";
  const secondLine = "but it should be!";

  useEffect(() => { const supabase = createClient(); supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); if (window.location.hash || window.location.search.includes('code=')) { window.history.replaceState({}, '', window.location.pathname); } }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); }); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { if (introComplete) { const target = 12450; const duration = 2000; const steps = 60; const increment = target / steps; let current = 0; const interval = setInterval(() => { current += increment; if (current >= target) { setTotalXP(target); clearInterval(interval); } else { setTotalXP(Math.floor(current)); } }, duration / steps); return () => clearInterval(interval); } }, [introComplete]);
  const handleSignOut = async () => { const supabase = createClient(); await supabase.auth.signOut(); setUser(null); setShowUserMenu(false); };
  const handleGoogleSignIn = async () => { const supabase = createClient(); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); };
  useEffect(() => { videos.forEach((src) => { const video = document.createElement('video'); video.preload = 'auto'; video.src = src; video.load(); }); }, []);
  useEffect(() => { if (primaryVideoRef.current) { primaryVideoRef.current.src = videos[0]; primaryVideoRef.current.load(); } if (secondaryVideoRef.current) { secondaryVideoRef.current.src = videos[1]; secondaryVideoRef.current.load(); } }, []);
  useEffect(() => { if (!showVideo) return; const cycleInterval = setInterval(() => { const nextIdx = (currentVideoIndex + 1) % videos.length; const nextVideo = primaryActive ? secondaryVideoRef.current : primaryVideoRef.current; if (nextVideo) { nextVideo.src = videos[nextIdx]; nextVideo.load(); nextVideo.play().catch(() => {}); } setPrimaryActive(!primaryActive); setCurrentVideoIndex(nextIdx); }, 15000); return () => clearInterval(cycleInterval); }, [showVideo, currentVideoIndex, primaryActive]);
  useEffect(() => { let charIndex = 0; let dotBlinks = 0; const typeFirstLine = setInterval(() => { if (charIndex < firstLine.length) { setTypedText(firstLine.slice(0, charIndex + 1)); charIndex++; } else { clearInterval(typeFirstLine); const blinkInterval = setInterval(() => { dotBlinks++; setBlinkDots((prev) => !prev); if (dotBlinks >= 6) { clearInterval(blinkInterval); setShowSecondLine(true); let secondCharIndex = 0; const typeSecondLine = setInterval(() => { if (secondCharIndex < secondLine.length) { setSecondLineText(secondLine.slice(0, secondCharIndex + 1)); secondCharIndex++; } else { clearInterval(typeSecondLine); setTimeout(() => { setCrtFlash(true); setTimeout(() => { setShowVideo(true); primaryVideoRef.current?.play().catch(() => {}); setCrtFlash(false); setIntroComplete(true); }, 300); }, 500); } }, 80); } }, 300); } }, 100); return () => clearInterval(typeFirstLine); }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow-x: hidden; }
        .particles-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; overflow: hidden; }
        .pixel-particle { position: absolute; image-rendering: pixelated; animation: float-up linear infinite; }
        @keyframes float-up { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; } }
        .crt-wrapper { background: linear-gradient(180deg, #0a0a0a 0%, #151515 50%, #0a0a0a 100%); position: relative; overflow: hidden; min-height: 100vh; }
        .crt-wrapper::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px); pointer-events: none; z-index: 1000; }
        .crt-wrapper::after { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 100%); pointer-events: none; z-index: 999; }
        @keyframes subtle-flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.985; } }
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .page-content { color: #fff; font-family: 'Press Start 2P', monospace; animation: subtle-flicker 4s infinite; position: relative; z-index: 2; }
        .retro-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 1rem 1.5rem; }
        .nav-bar { max-width: 1200px; margin: 0 auto; background: linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.95) 100%); backdrop-filter: blur(10px); border: 2px solid #3a3a3a; border-radius: 12px; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 0 #1a1a1a, 0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05); }
        .nav-logo { font-size: 0.65rem; background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; font-family: 'Press Start 2P', monospace; filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); transition: all 0.3s ease; cursor: pointer; }
        .nav-logo:hover { filter: drop-shadow(0 0 20px rgba(255,215,0,0.8)); transform: scale(1.02); }
        .nav-center { display: flex; align-items: center; gap: 0.75rem; font-size: 0.4rem; color: #888; }
        .nav-xp-value { color: #FFD700; text-shadow: 0 0 10px rgba(255,215,0,0.5); font-size: 0.45rem; }
        .nav-btn { font-family: 'Press Start 2P', monospace; font-size: 0.45rem; padding: 0.6rem 1.2rem; background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); border: 2px solid #CC8800; border-radius: 6px; color: #1a1a1a; cursor: pointer; box-shadow: 0 3px 0 #996600, 0 0 15px rgba(255,215,0,0.2); transition: all 0.15s ease; text-decoration: none; }
        .nav-btn:hover { transform: translateY(-2px); box-shadow: 0 5px 0 #996600, 0 0 25px rgba(255,215,0,0.4); }
        .nav-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 #996600; }
        .crt-intro { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; position: relative; overflow: hidden; }
        .video-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; background: #0a0a0a; }
        .video-background video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; width: auto; height: auto; transform: translate(-50%, -50%); object-fit: cover; transition: opacity 1s ease; }
        .video-primary, .video-secondary { opacity: 0; }
        .video-primary.active, .video-secondary.active { opacity: 0.5; }
        .video-flash { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 10; pointer-events: none; opacity: 0; }
        .video-flash.active { animation: crtFlash 0.4s ease-out forwards; }
        @keyframes crtFlash { 0% { opacity: 0; } 15% { opacity: 0.9; } 30% { opacity: 0.7; } 100% { opacity: 0; } }
        .video-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%), linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%); z-index: 1; }
        .crt-screen { max-width: 95vw; text-align: center; position: relative; z-index: 2; }
        .typing-line { white-space: nowrap; font-size: clamp(0.6rem, 2.5vw, 1.8rem); line-height: 1.8; }
        .typing-line-first { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.8), 0 0 20px rgba(0,255,0,0.5), 0 0 40px rgba(0,255,0,0.3); }
        .typing-line-second { color: #FFD700; text-shadow: 0 0 10px rgba(255,215,0,0.8), 0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.3); display: block; margin-top: 0.5rem; }
        .typing-cursor { display: inline-block; width: 0.5em; height: 1em; background: currentColor; margin-left: 0.15em; animation: cursor-blink 0.8s infinite; vertical-align: middle; box-shadow: 0 0 10px currentColor; }
        .dots { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.5); transition: opacity 0.15s; }
        .scroll-hint { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); font-size: 0.45rem; color: #666; opacity: 0; transition: opacity 0.5s; text-align: center; }
        .scroll-hint.visible { opacity: 1; animation: pulse-glow 2s infinite; }
        @keyframes pulse-glow { 0%, 100% { text-shadow: 0 0 5px rgba(255,215,0,0.3); } 50% { text-shadow: 0 0 15px rgba(255,215,0,0.6); color: #888; } }
        .scroll-arrow { display: block; margin-top: 0.75rem; font-size: 1rem; animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .section-hidden { opacity: 0; visibility: hidden; transform: translateY(30px); }
        .section-visible { opacity: 1; visibility: visible; transform: translateY(0); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .retro-section { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; position: relative; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { font-size: 0.45rem; color: #5fbf8a; margin-bottom: 1rem; font-family: 'Press Start 2P', monospace; letter-spacing: 0.2em; text-shadow: 0 0 10px rgba(95,191,138,0.5); }
        .section-title { font-size: clamp(1.1rem, 4vw, 1.8rem); margin-bottom: 1.5rem; font-family: 'Press Start 2P', monospace; line-height: 1.6; }
        @keyframes rgb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .shimmer-text { background: linear-gradient(90deg, #fff 0%, #fff 35%, #ff6b6b 42%, #FFD700 50%, #00ff00 58%, #fff 65%, #fff 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: rgb-shimmer 4s ease-in-out infinite; }
        .section-subtitle { font-size: 0.45rem; color: #888; line-height: 2.4; max-width: 800px; margin: 0 auto; font-family: 'Press Start 2P', monospace; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
        .game-card { background: linear-gradient(180deg, #252525 0%, #1a1a1a 100%); border: 2px solid #3a3a3a; border-radius: 16px; padding: 1.5rem 1.25rem 1.25rem; text-align: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration: none; display: block; box-shadow: 0 4px 0 #0a0a0a, 0 8px 30px rgba(0,0,0,0.3); position: relative; overflow: hidden; }
        .game-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, var(--card-color, #FFD700), transparent); opacity: 0; transition: opacity 0.3s ease; }
        .game-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, var(--card-glow, rgba(255,215,0,0.1)) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .game-card:hover { transform: translateY(-8px); border-color: var(--card-color, #FFD700); box-shadow: 0 12px 0 #0a0a0a, 0 20px 40px rgba(0,0,0,0.4), 0 0 40px var(--card-glow, rgba(255,215,0,0.15)); }
        .game-card:hover::before, .game-card:hover::after { opacity: 1; }
        .game-card.fitness { --card-color: #FF6B6B; --card-glow: rgba(255,107,107,0.15); }
        .game-card.tasks { --card-color: #5CC9F5; --card-glow: rgba(92,201,245,0.15); }
        .game-card.travel { --card-color: #5fbf8a; --card-glow: rgba(95,191,138,0.15); }
        .game-card.life { --card-color: #a855f7; --card-glow: rgba(168,85,247,0.15); }
        .game-card-badge { position: absolute; top: 0.7rem; right: 0.7rem; font-size: 0.28rem; padding: 0.2rem 0.4rem; background: rgba(95,191,138,0.2); border: 1px solid #5fbf8a; border-radius: 4px; color: #5fbf8a; font-family: 'Press Start 2P', monospace; }
        .game-card-badge.coming-soon { background: rgba(168,85,247,0.2); border-color: #a855f7; color: #a855f7; }
        .game-icon { width: 64px; height: 64px; margin: 0 auto 1rem; transition: all 0.3s ease; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
        .game-card:hover .game-icon { transform: scale(1.1) translateY(-4px); filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4)); }
        .game-name { font-size: 0.7rem; color: #fff; margin-bottom: 0.35rem; font-family: 'Press Start 2P', monospace; }
        .game-tagline { font-size: 0.35rem; color: #888; margin-bottom: 0.75rem; font-family: 'Press Start 2P', monospace; line-height: 1.8; }
        .xp-bar-container { margin-top: 0.5rem; }
        .xp-bar-bg { height: 6px; background: #1a1a1a; border: 1px solid #333; border-radius: 3px; overflow: hidden; }
        .xp-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease-out; }
        .xp-bar-text { display: block; margin-top: 0.35rem; font-size: 0.28rem; color: #666; font-family: 'Press Start 2P', monospace; }
        .game-domain { font-size: 0.32rem; color: #555; margin-top: 0.6rem; font-family: 'Press Start 2P', monospace; transition: color 0.2s ease; }
        .game-card:hover .game-domain { color: #888; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto; }
        .feature-card { background: linear-gradient(180deg, #1e1e1e 0%, #171717 100%); border: 1px solid #2a2a2a; border-radius: 12px; padding: 1.75rem; transition: all 0.3s ease; }
        .feature-card:hover { border-color: #3a3a3a; transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .feature-icon { font-size: 1.75rem; margin-bottom: 0.75rem; }
        .feature-title { font-size: 0.5rem; color: #FFD700; margin-bottom: 0.6rem; font-family: 'Press Start 2P', monospace; }
        .feature-desc { font-size: 0.4rem; color: #888; line-height: 2; font-family: 'Press Start 2P', monospace; }
        .about-content { max-width: 900px; margin: 0 auto; text-align: center; }
        .about-text { font-size: 0.45rem; color: #aaa; line-height: 2.5; font-family: 'Press Start 2P', monospace; margin-bottom: 1.5rem; }
        .about-highlight { color: #FFD700; text-shadow: 0 0 10px rgba(255,215,0,0.3); }
        .total-xp-display { display: inline-flex; align-items: center; gap: 0.75rem; background: linear-gradient(180deg, #252525 0%, #1a1a1a 100%); border: 2px solid #3a3a3a; border-radius: 12px; padding: 1rem 1.75rem; margin-top: 1.25rem; box-shadow: 0 4px 0 #0a0a0a; }
        .total-xp-label { font-size: 0.4rem; color: #888; }
        .total-xp-value { font-size: 0.8rem; color: #FFD700; text-shadow: 0 0 15px rgba(255,215,0,0.5); }
        .retro-footer { padding: 4rem 2rem; text-align: center; border-top: 1px solid #1a1a1a; background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%); }
        .footer-tagline { font-size: 0.5rem; margin-bottom: 1.25rem; }
        .footer-text { font-size: 0.38rem; color: #444; font-family: 'Press Start 2P', monospace; }
        .profile-img { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #FFD700; box-shadow: 0 0 15px rgba(255,215,0,0.4); transition: all 0.3s ease; cursor: pointer; }
        .profile-img:hover { transform: scale(1.1); box-shadow: 0 0 25px rgba(255,215,0,0.6); }
        .dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 0.75rem; background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%); border: 2px solid #3a3a3a; border-radius: 10px; padding: 0.75rem; min-width: 180px; box-shadow: 0 4px 0 #1a1a1a, 0 10px 30px rgba(0,0,0,0.5); }
        .dropdown-email { padding: 0.5rem 0.75rem; color: #666; font-size: 0.32rem; border-bottom: 1px solid #3a3a3a; margin-bottom: 0.5rem; word-break: break-all; }
        .dropdown-btn { width: 100%; padding: 0.6rem 0.75rem; background: none; border: none; color: #ff6b6b; font-size: 0.38rem; font-family: 'Press Start 2P', monospace; cursor: pointer; text-align: left; border-radius: 6px; transition: all 0.2s ease; }
        .dropdown-btn:hover { background: rgba(255,107,107,0.1); }
        .login-dropdown { position: absolute; top: 100%; right: 0; margin-top: 0.75rem; background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%); border: 2px solid #3a3a3a; border-radius: 10px; padding: 1.25rem; min-width: 200px; box-shadow: 0 4px 0 #1a1a1a, 0 10px 30px rgba(0,0,0,0.5); }
        .login-label { font-size: 0.38rem; color: #888; margin-bottom: 1rem; text-align: center; font-family: 'Press Start 2P', monospace; }
        .google-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.85rem; background: #fff; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-family: 'Press Start 2P', monospace; font-size: 0.38rem; color: #333; transition: all 0.2s ease; box-shadow: 0 2px 0 #ccc; }
        .google-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 0 #ccc; border-color: #bbb; }
        .google-btn:active { transform: translateY(1px); box-shadow: 0 1px 0 #ccc; }
        @media (max-width: 768px) { .nav-center { display: none; } .games-grid { gap: 1rem; } .game-card { padding: 1.25rem 1rem 1rem; } .game-icon { width: 48px; height: 48px; } .game-name { font-size: 0.6rem; } .retro-section { padding: 4rem 1.25rem; } }
      `}</style>

      <div className="crt-wrapper">
        <PixelParticles />
        <div className="page-content">
          <nav className="retro-nav"><div className="nav-bar"><span className="nav-logo">GAMIFY.IT.COM</span>{user && introComplete && (<div className="nav-center"><span>TOTAL XP:</span><span className="nav-xp-value">{totalXP.toLocaleString()}</span></div>)}{user ? (<div style={{ position: 'relative' }}><button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{user.user_metadata?.avatar_url ? (<img src={user.user_metadata.avatar_url} alt="Profile" className="profile-img" />) : (<div className="profile-img" style={{ background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>{user.email?.charAt(0).toUpperCase()}</div>)}</button>{showUserMenu && (<div className="dropdown-menu"><div className="dropdown-email">{user.email}</div><button onClick={handleSignOut} className="dropdown-btn">SIGN OUT</button></div>)}</div>) : (<div style={{ position: 'relative' }}><button onClick={() => setShowLoginDropdown(!showLoginDropdown)} className="nav-btn">START PLAYING</button>{showLoginDropdown && (<div className="login-dropdown"><p className="login-label">Continue with</p><button onClick={handleGoogleSignIn} className="google-btn"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Google</button></div>)}</div>)}</div></nav>
          <section className="crt-intro"><div className="video-background"><video ref={primaryVideoRef} className={`video-primary ${showVideo && primaryActive ? 'active' : ''}`} muted loop playsInline preload="auto" /><video ref={secondaryVideoRef} className={`video-secondary ${showVideo && !primaryActive ? 'active' : ''}`} muted loop playsInline preload="auto" /><div className={`video-flash ${crtFlash ? 'active' : ''}`} /><div className="video-overlay" /></div><div className="crt-screen"><div className="typing-line typing-line-first">{typedText}{!showSecondLine && (<><span className="dots" style={{ opacity: blinkDots ? 1 : 0 }}>...</span>{typedText.length === firstLine.length && !blinkDots ? null : <span className="typing-cursor" />}</>)}</div>{showSecondLine && (<div className="typing-line typing-line-second">{secondLineText}{secondLineText.length < secondLine.length && <span className="typing-cursor" />}</div>)}</div><div className={`scroll-hint ${introComplete ? 'visible' : ''}`}>SCROLL TO BEGIN<span className="scroll-arrow">&#9660;</span></div></section>
          <section className={`retro-section ${introComplete ? 'section-visible' : 'section-hidden'}`}><div className="section-header"><p className="section-label">// SELECT YOUR QUEST</p><h2 className="section-title shimmer-text">Choose Your Adventure</h2><p className="section-subtitle">Each app gamifies a different aspect of your life. Complete quests, earn XP, and level up across all domains.</p></div><div className="games-grid"><a href="https://gamify-fitness.vercel.app" target="_blank" rel="noopener noreferrer" className="game-card fitness"><span className="game-card-badge">LIVE</span><DumbbellIcon className="game-icon" /><h3 className="game-name">IRON QUEST</h3><p className="game-tagline">Turn every rep into XP</p><XPBar current={4250} max={5000} color="#FF6B6B" /><p className="game-domain">gamify.fitness</p></a><a href="https://gamify-today.vercel.app" target="_blank" rel="noopener noreferrer" className="game-card tasks"><span className="game-card-badge">LIVE</span><ChecklistIcon className="game-icon" /><h3 className="game-name">DAY QUEST</h3><p className="game-tagline">Conquer your daily missions</p><XPBar current={6800} max={10000} color="#5CC9F5" /><p className="game-domain">gamify.today</p></a><a href="https://gamifytravel.vercel.app" target="_blank" rel="noopener noreferrer" className="game-card travel"><span className="game-card-badge">LIVE</span><PlaneIcon className="game-icon" /><h3 className="game-name">EXPLORER</h3><p className="game-tagline">Map your adventures</p><XPBar current={1400} max={3000} color="#5fbf8a" /><p className="game-domain">gamify.travel</p></a><div className="game-card life" style={{ cursor: 'default', opacity: 0.7 }}><span className="game-card-badge coming-soon">SOON</span><LifeIcon className="game-icon" /><h3 className="game-name">LIFE TRACKER</h3><p className="game-tagline">Gamify everything else</p><XPBar current={0} max={1000} color="#a855f7" /><p className="game-domain">gamify.life</p></div></div></section>
          <section className={`retro-section ${introComplete ? 'section-visible' : 'section-hidden'}`} style={{ transitionDelay: '0.2s' }}><div className="section-header"><p className="section-label">// HOW IT WORKS</p><h2 className="section-title shimmer-text">Level Up Your Life</h2></div><div className="features-grid"><div className="feature-card"><div className="feature-icon">&#x2694;&#xFE0F;</div><h3 className="feature-title">DEFINE YOUR QUESTS</h3><p className="feature-desc">Want to run a marathon? Learn a language? Try every hotdog brand? Your goals become epic quests.</p></div><div className="feature-card"><div className="feature-icon">&#x2728;</div><h3 className="feature-title">EARN EXPERIENCE</h3><p className="feature-desc">Complete objectives to earn XP. Watch your character grow stronger with every accomplishment.</p></div><div className="feature-card"><div className="feature-icon">&#x1F3C6;</div><h3 className="feature-title">UNLOCK ACHIEVEMENTS</h3><p className="feature-desc">Collect badges and trophies. Share your progress and compete with friends.</p></div></div></section>
          <section className={`retro-section ${introComplete ? 'section-visible' : 'section-hidden'}`} style={{ transitionDelay: '0.4s' }}><div className="about-content"><p className="section-label">// ABOUT</p><h2 className="section-title shimmer-text" style={{ marginBottom: '2rem' }}>Why Gamify?</h2><p className="about-text">We believe <span className="about-highlight">life should feel like an adventure</span>. Our suite of apps transforms mundane tasks into epic quests, boring routines into rewarding challenges, and everyday accomplishments into <span className="about-highlight">legendary achievements</span>.</p><p className="about-text">Whether you&apos;re hitting the gym, checking off your to-do list, or exploring new places — every action earns XP that contributes to your <span className="about-highlight">unified profile</span>.</p>{user && (<div className="total-xp-display"><span className="total-xp-label">YOUR TOTAL XP</span><span className="total-xp-value">{totalXP.toLocaleString()}</span></div>)}</div></section>
          <footer className={`retro-footer ${introComplete ? 'section-visible' : 'section-hidden'}`} style={{ transitionDelay: '0.6s' }}><p className="footer-tagline shimmer-text">Life&apos;s not a game... but it should be!</p><p className="footer-text">&copy; {new Date().getFullYear()} GAMIFY.IT.COM — ALL RIGHTS RESERVED</p></footer>
        </div>
      </div>
    </>
  );
}
