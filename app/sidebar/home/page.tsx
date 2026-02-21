"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";

// ── Floating orb particle ──────────────────────────────────────────────────
const OrbParticle = ({ style }: { style: CSSProperties }) => (
  <div
    className="absolute pointer-events-none select-none rounded-full animate-float"
    style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)", ...style }}
  />
);

// ── Mock swipe card ────────────────────────────────────────────────────────
const MockCard = ({
  name, age, tag, gradient, rotate, zIndex, translateY,
}: {
  name: string; age: number; tag: string;
  gradient: string; rotate: string; zIndex: number; translateY: string;
}) => (
  <div
    className="absolute w-52 h-72 rounded-3xl shadow-2xl overflow-hidden border border-white/20"
    style={{ transform: `rotate(${rotate}) translateY(${translateY})`, zIndex }}
  >
    <div className={`w-full h-full ${gradient} flex flex-col justify-end p-4`}>
      <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 border border-white/30">
        <p className="text-white font-bold font-display text-lg leading-none">{name}, {age}</p>
        <p className="text-white/80 text-xs mt-1">{tag}</p>
      </div>
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
  </div>
);

// ── Feature card ───────────────────────────────────────────────────────────
const FeatureCard = ({
  icon, title, desc, delay,
}: {
  icon: string; title: string; desc: string; delay: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group relative bg-white rounded-2xl border border-violet-100 p-8 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/60 transition-all duration-500 cursor-default"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ${delay}, transform 0.6s ${delay}, box-shadow 0.3s, border-color 0.3s`,
      }}
    >
      <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
    </div>
  );
};

// ── Step ───────────────────────────────────────────────────────────────────
const Step = ({
  num, title, desc, delay,
}: {
  num: string; title: string; desc: string; delay: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex gap-6 items-start"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-32px)",
        transition: `opacity 0.6s ${delay}, transform 0.6s ${delay}`,
      }}
    >
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-300/50">
        <span className="font-display font-black text-white text-xl">{num}</span>
      </div>
      <div className="pt-2">
        <h4 className="font-display text-lg font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
};

// ── Stat ───────────────────────────────────────────────────────────────────
const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <p className="font-display text-4xl md:text-5xl font-black text-white mb-1">{value}</p>
    <p className="text-violet-200/80 text-sm tracking-wide uppercase">{label}</p>
  </div>
);

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleGetStarted = () => {
    window.location.href = "/login";
  };

  const orbs = Array.from({ length: 8 }, (_, i) => ({
    left: `${(i * 13) % 100}%`,
    top: `${(i * 17 + 5) % 90}%`,
    width: `${80 + (i % 4) * 60}px`,
    height: `${80 + (i % 4) * 60}px`,
    animationDelay: `${i * 0.9}s`,
    animationDuration: `${5 + (i % 3) * 2}s`,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Outfit:wght@300;400;500;600&display=swap');

        * { font-family: 'Outfit', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          70%  { box-shadow: 0 0 0 16px rgba(139,92,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .animate-float { animation: float var(--dur, 5s) ease-in-out infinite; }
        .animate-fadeUp { animation: fadeUp 0.8s ease both; }
        .btn-pulse { animation: pulse-ring 2s ease-out infinite; }
        .spin-slow { animation: spin-slow 20s linear infinite; }

        .text-violet-gradient {
          background: linear-gradient(135deg, #8B5CF6, #6D28D9, #8B5CF6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

        {/* ════════════════════════════════════════════════════════════════
            SECTION 1 — HERO
        ════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-white via-violet-50/60 to-white">

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-violet-100/60 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-50/80 blur-3xl" />
            {orbs.map((o, i) => (
              <OrbParticle
                key={i}
                style={{
                  left: o.left, top: o.top,
                  width: o.width, height: o.height,
                  "--dur": o.animationDuration,
                  animationDelay: o.animationDelay,
                } as CSSProperties}
              />
            ))}
            <div className="absolute top-1/2 right-16 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-violet-100 spin-slow opacity-50" />
            <div className="absolute top-1/2 right-16 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-dashed border-violet-200/60 spin-slow opacity-40" style={{ animationDirection: "reverse" }} />
          </div>

          <div className="max-w-6xl mx-auto px-6 pt-28 pb-16 w-full grid lg:grid-cols-2 gap-16 items-center relative z-10">

            {/* Left — Copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-2 mb-8 animate-fadeUp"
                style={{ animationDelay: "0.1s" }}
              >
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-violet-700 text-xs font-semibold tracking-wide">Find your person today</span>
              </div>

              <h1
                className="font-display text-5xl md:text-6xl lg:text-[4.5rem] font-black leading-[1.02] mb-6 animate-fadeUp text-gray-900"
                style={{ animationDelay: "0.2s" }}
              >
                Where Hearts
                <br />
                <span className="text-violet-gradient">Find Each</span>
                <br />
                Other.
              </h1>

              <p
                className="text-gray-500 text-lg leading-relaxed max-w-md mb-10 animate-fadeUp font-light"
                style={{ animationDelay: "0.35s" }}
              >
                PairUp uses smart matching, real-time chat, and AI-powered recommendations
                to help you find someone genuinely worth swiping right for.
              </p>

              <div
                className="flex flex-wrap gap-4 animate-fadeUp"
                style={{ animationDelay: "0.5s" }}
              >
                <button
                  onClick={handleGetStarted}
                  className="btn-pulse group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-violet-700 text-white font-semibold text-base overflow-hidden transition-transform duration-200 hover:scale-105 active:scale-95 shadow-xl shadow-violet-300/50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started — It's Free
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-700 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>

                <button className="px-8 py-4 rounded-2xl border border-gray-200 text-gray-600 font-medium text-base hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all duration-300">
                  Watch Demo ▶
                </button>
              </div>

              <p className="text-gray-400 text-xs mt-6 animate-fadeUp" style={{ animationDelay: "0.65s" }}>
                No credit card needed · Join 50,000+ members
              </p>
            </div>

            {/* Right — Mock cards */}
            <div className="hidden lg:flex justify-center items-center relative h-80">
              <MockCard
                name="Sophia" age={23} tag="📸 Photography · ☕ Coffee"
                gradient="bg-gradient-to-br from-violet-400 to-violet-700"
                rotate="-8deg" zIndex={1} translateY="20px"
              />
              <MockCard
                name="Alex" age={25} tag="🎸 Music · 🏔 Hiking"
                gradient="bg-gradient-to-br from-violet-600 to-indigo-700"
                rotate="4deg" zIndex={2} translateY="-10px"
              />
              <MockCard
                name="Jamie" age={22} tag="🎨 Art · 🐾 Dogs"
                gradient="bg-gradient-to-br from-purple-400 to-violet-600"
                rotate="12deg" zIndex={1} translateY="30px"
              />
              <div className="absolute top-2 left-0 rotate-[-15deg] border-2 border-violet-500 text-violet-600 font-display font-black text-xl px-3 py-1 rounded-lg bg-white shadow-md">
                LIKE 💜
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
            <span className="text-xs text-gray-400 tracking-widest uppercase">Scroll</span>
            <div className="w-px h-10 bg-gradient-to-b from-violet-400 to-transparent" />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 2 — FEATURES
        ════════════════════════════════════════════════════════════════ */}
        <section id="features" className="relative py-32 bg-gray-50/70">
          <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none rotate-180">
            <svg viewBox="0 0 1200 80" className="w-full h-12 fill-white">
              <path d="M0,40 C300,80 900,0 1200,40 L1200,0 L0,0 Z" />
            </svg>
          </div>

          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block text-violet-600 text-sm font-semibold tracking-widest uppercase bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-5">
                Why PairUp
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Everything you need to
                <br />
                <span className="text-violet-gradient">find the one.</span>
              </h2>
              <p className="text-gray-500 max-w-md mx-auto text-base font-light">
                Built for real connections, not endless scrolling. Every feature exists to bring people closer.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              <FeatureCard icon="🧠" title="AI-Powered Matching" desc="Our algorithm reads compatibility signals — interests, bio tone, activity patterns — to surface people you'll actually want to meet." delay="0s" />
              <FeatureCard icon="⚡" title="Real-time Chat" desc="Once you match, talk instantly. No delays, no refresh — messages fly back and forth as fast as you can type them." delay="0.1s" />
              <FeatureCard icon="🎴" title="Intuitive Swipe UI" desc="Drag cards left or right with smooth physics-based animations. Like or pass in under a second with a natural, satisfying gesture." delay="0.2s" />
              <FeatureCard icon="📍" title="Nearby Discovery" desc="Find people near you with GPS-based filtering. Set your distance radius and only see profiles that are actually reachable." delay="0.3s" />
              <FeatureCard icon="✅" title="Profile Verification" desc="Every verified user gets a badge. You always know when you're talking to a real person, not a bot or fake profile." delay="0.4s" />
              <FeatureCard icon="🔒" title="Private & Secure" desc="Your data stays yours. End-to-end encrypted messages, zero ads, zero data selling. We make money from subscriptions, not you." delay="0.5s" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
            <svg viewBox="0 0 1200 80" className="w-full h-12 fill-white">
              <path d="M0,40 C300,80 900,0 1200,40 L1200,80 L0,80 Z" />
            </svg>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 3 — HOW IT WORKS
        ════════════════════════════════════════════════════════════════ */}
        <section id="how" className="relative py-32 bg-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-50 rounded-full blur-3xl opacity-70" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-50 rounded-full blur-2xl" />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">

              {/* Left — Steps */}
              <div>
                <span className="inline-block text-violet-600 text-sm font-semibold tracking-widest uppercase bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-5">
                  Getting Started
                </span>
                <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 mb-12">
                  Three steps to
                  <br />
                  <span className="text-violet-gradient">your match.</span>
                </h2>
                <div className="flex flex-col gap-10">
                  <Step num="1" title="Create your profile" desc="Sign up in seconds. Add photos, write your bio, set your preferences. The more you share, the better your matches become." delay="0s" />
                  <Step num="2" title="Swipe & discover" desc="Browse through curated profiles. Swipe right on people you like, left to pass. Our AI learns your taste as you go." delay="0.15s" />
                  <Step num="3" title="Match & chat" desc="When two people like each other, it's a match. Start a real-time conversation and take things from there." delay="0.3s" />
                </div>
              </div>

              {/* Right — Phone mockup */}
              <div className="hidden lg:flex justify-center">
                <div className="relative w-72">
                  <div className="absolute inset-0 bg-violet-300/30 blur-3xl rounded-full scale-75 translate-y-8" />

                  <div className="relative w-72 h-[580px] rounded-[3rem] border-2 border-violet-100 bg-white shadow-2xl shadow-violet-200/60 overflow-hidden">
                    <div className="h-10 flex items-center justify-between px-6 pt-2 bg-white">
                      <span className="text-gray-400 text-xs font-medium">9:41</span>
                      <div className="w-20 h-5 rounded-full bg-gray-100" />
                      <div className="w-4 h-2 rounded-sm bg-gray-200" />
                    </div>

                    <div className="px-5 py-3">
                      <div className="flex justify-between items-center mb-4">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-4 h-4">
                            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="fill-white w-2.5 h-2.5">
                              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                            </svg>
                          </div>
                          <span className="font-display font-bold text-gray-900 text-base">PairUp</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200" />
                      </div>

                      <div className="relative h-72 mb-4">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 rotate-3 opacity-50 scale-95" />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-800 shadow-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <p className="text-white font-display font-bold text-xl">Sophia, 23</p>
                            <p className="text-white/80 text-xs">📸 Photography · ☕ Coffee</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center gap-5 items-center">
                        <button className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                          <span className="text-lg text-gray-500">✕</span>
                        </button>
                        <button className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-xl shadow-violet-300/50">
                          <svg viewBox="0 0 24 24" className="fill-white w-7 h-7">
                            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                          </svg>
                        </button>
                        <button className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shadow-sm">
                          <span className="text-lg">⭐</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Match toast */}
                  <div
                    className="absolute -top-5 -right-10 bg-white border border-violet-100 rounded-2xl px-4 py-3 shadow-xl shadow-violet-100/60 animate-float"
                    style={{ "--dur": "3s" } as CSSProperties}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🎉</span>
                      <div>
                        <p className="text-gray-900 text-xs font-semibold">It's a Match!</p>
                        <p className="text-gray-400 text-xs">You & Sophia liked each other</p>
                      </div>
                    </div>
                  </div>

                  {/* Message toast */}
                  <div
                    className="absolute -bottom-4 -left-10 bg-white border border-violet-100 rounded-2xl px-4 py-3 shadow-xl shadow-violet-100/60 animate-float"
                    style={{ "--dur": "4s", animationDelay: "1s" } as CSSProperties}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-sm">💬</div>
                      <div>
                        <p className="text-gray-900 text-xs font-semibold">Sophia sent a message</p>
                        <p className="text-gray-400 text-xs">Hey! Nice to meet you 👋</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
            SECTION 4 — STATS + CTA
        ════════════════════════════════════════════════════════════════ */}
        <section id="stats" className="relative py-32 overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-violet-900">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/5 spin-slow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-dashed border-white/5 spin-slow" style={{ animationDirection: "reverse" }} />
          </div>

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm p-10">
              <Stat value="50K+" label="Members" />
              <Stat value="12K+" label="Matches Made" />
              <Stat value="4.9★" label="App Rating" />
              <Stat value="98%" label="Satisfaction" />
            </div>

            <div className="relative text-center rounded-3xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-sm p-16">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-white/10 blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <span className="inline-block text-violet-200 text-sm font-semibold tracking-widest uppercase bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                  Ready?
                </span>
                <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                  Your next chapter
                  <br />
                  starts with a swipe.
                </h2>
                <p className="text-violet-200/80 text-lg max-w-md mx-auto mb-10 font-light">
                  Join thousands of people who found something real on PairUp. Create your free account in under a minute.
                </p>

                <button
                  onClick={handleGetStarted}
                  className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-violet-700 font-bold text-lg hover:scale-105 active:scale-95 transition-transform duration-200 shadow-2xl shadow-black/20 hover:shadow-white/20"
                >
                  Create Free Account
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                <p className="text-violet-300/70 text-sm mt-5">
                  Already have an account?{" "}
                  <a href="/login" className="text-white hover:text-violet-200 underline underline-offset-2 transition-colors font-medium">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer className="bg-white border-t border-violet-100 py-10">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="fill-white w-3.5 h-3.5">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                </svg>
              </div>
              <span className="font-display font-bold text-gray-900">PairUp</span>
            </div>
            <p className="text-gray-400 text-sm">© 2025 PairUp · Built with 💜 as a college project</p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-violet-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-violet-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-violet-600 transition-colors">Contact</a>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}