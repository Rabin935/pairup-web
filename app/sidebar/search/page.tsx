"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Profile {
  id: number;
  name: string;
  age: number;
  distance: string;
  bio: string;
  interests: string[];
  gradient: string;
  letter: string;
  verified: boolean;
  online: boolean;
  mutualInterests?: number;
}

// ── Interest Categories ────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",          label: "All",          emoji: "✨" },
  { id: "music",        label: "Music",         emoji: "🎵" },
  { id: "travel",       label: "Travel",        emoji: "✈️" },
  { id: "fitness",      label: "Fitness",       emoji: "🏋️" },
  { id: "food",         label: "Food",          emoji: "🍜" },
  { id: "art",          label: "Art",           emoji: "🎨" },
  { id: "books",        label: "Books",         emoji: "📚" },
  { id: "gaming",       label: "Gaming",        emoji: "🎮" },
  { id: "nature",       label: "Nature",        emoji: "🌿" },
  { id: "photography",  label: "Photography",   emoji: "📸" },
  { id: "coffee",       label: "Coffee",        emoji: "☕" },
  { id: "movies",       label: "Movies",        emoji: "🎬" },
  { id: "yoga",         label: "Yoga",          emoji: "🧘" },
  { id: "dogs",         label: "Dogs",          emoji: "🐾" },
  { id: "cooking",      label: "Cooking",       emoji: "👨‍🍳" },
];

// ── Profiles ───────────────────────────────────────────────────────────────
const ALL_PROFILES: Profile[] = [
  { id: 1,  name: "Sophia",   age: 23, distance: "1.2 km", bio: "Photography fanatic & coffee addict. I'll make you pose for a photo at some point.",       interests: ["photography", "coffee", "travel", "art"],        gradient: "from-violet-400 to-violet-700",   letter: "S", verified: true,  online: true,  mutualInterests: 4 },
  { id: 2,  name: "Alex",     age: 25, distance: "3.4 km", bio: "Guitarist by night, hiker on weekends. Looking for someone to share playlists with 🎸",     interests: ["music", "nature", "fitness", "food"],            gradient: "from-indigo-400 to-indigo-700",   letter: "A", verified: false, online: true,  mutualInterests: 2 },
  { id: 3,  name: "Jamie",    age: 22, distance: "0.8 km", bio: "Artist & dog mom to Mochi 🐾 If you're not a dog person, we might have a problem.",          interests: ["art", "dogs", "books", "coffee"],                gradient: "from-purple-400 to-purple-700",   letter: "J", verified: true,  online: false, mutualInterests: 3 },
  { id: 4,  name: "Morgan",   age: 26, distance: "5.1 km", bio: "Watercolor painter who cries at sunsets. Lover of chaos and calm in equal measure ✨",        interests: ["art", "yoga", "nature", "cooking"],              gradient: "from-fuchsia-400 to-fuchsia-700", letter: "M", verified: true,  online: true,  mutualInterests: 1 },
  { id: 5,  name: "Riley",    age: 24, distance: "2.7 km", bio: "Bookworm with a secret love for karaoke. I've read every Murakami novel 📚",                  interests: ["books", "music", "movies", "coffee"],            gradient: "from-violet-500 to-indigo-600",   letter: "R", verified: false, online: true,  mutualInterests: 3 },
  { id: 6,  name: "Casey",    age: 27, distance: "4.2 km", bio: "Startup founder. I work hard and play harder. Let's find somewhere interesting to eat 🌮",   interests: ["food", "fitness", "gaming", "travel"],           gradient: "from-indigo-500 to-violet-600",   letter: "C", verified: true,  online: false, mutualInterests: 2 },
  { id: 7,  name: "Taylor",   age: 23, distance: "1.9 km", bio: "Nature enthusiast & weekend hiker. My golden retriever is basically my co-pilot 🌿",         interests: ["nature", "dogs", "photography", "fitness"],      gradient: "from-emerald-400 to-teal-600",    letter: "T", verified: true,  online: true,  mutualInterests: 2 },
  { id: 8,  name: "Jordan",   age: 28, distance: "6.3 km", bio: "Home chef experimenting with everything. My friends call me the ramen guy 🍜",               interests: ["cooking", "food", "travel", "music"],            gradient: "from-orange-400 to-rose-500",     letter: "J", verified: false, online: false, mutualInterests: 1 },
  { id: 9,  name: "Avery",    age: 21, distance: "0.5 km", bio: "Film student with a camera always in hand. Catch me at every indie cinema in town 🎬",       interests: ["movies", "photography", "art", "coffee"],        gradient: "from-pink-400 to-rose-600",       letter: "A", verified: false, online: true,  mutualInterests: 2 },
  { id: 10, name: "Quinn",    age: 25, distance: "3.8 km", bio: "Gym rat who reads Dostoevsky on rest days. Yes, both can exist 💪📖",                         interests: ["fitness", "books", "yoga", "gaming"],            gradient: "from-violet-600 to-purple-800",   letter: "Q", verified: true,  online: false, mutualInterests: 1 },
  { id: 11, name: "Blake",    age: 26, distance: "7.2 km", bio: "Level 99 gamer, level 1 cook. Will trade gaming tips for dinner recipes 🎮",                  interests: ["gaming", "movies", "music", "cooking"],          gradient: "from-cyan-400 to-blue-600",       letter: "B", verified: true,  online: true,  mutualInterests: 2 },
  { id: 12, name: "Sage",     age: 22, distance: "2.3 km", bio: "Yoga teacher and plant parent. My apartment is basically a jungle ☀️🌱",                     interests: ["yoga", "nature", "cooking", "dogs"],             gradient: "from-green-400 to-emerald-600",   letter: "S", verified: false, online: true,  mutualInterests: 3 },
  { id: 13, name: "Drew",     age: 29, distance: "4.6 km", bio: "Traveled to 34 countries. Still looking for the best coffee in the world ✈️☕",               interests: ["travel", "coffee", "photography", "food"],       gradient: "from-amber-400 to-orange-600",    letter: "D", verified: true,  online: false, mutualInterests: 4 },
  { id: 14, name: "Finley",   age: 24, distance: "1.4 km", bio: "Concert junkie & vinyl collector. If you haven't seen them live, you haven't lived 🎵",      interests: ["music", "art", "movies", "coffee"],              gradient: "from-rose-400 to-pink-600",       letter: "F", verified: false, online: true,  mutualInterests: 2 },
  { id: 15, name: "Emerson",  age: 27, distance: "8.1 km", bio: "Dog trainer by day, novelist by night. My husky Loki edits my drafts 🐾📝",                  interests: ["dogs", "books", "nature", "photography"],        gradient: "from-slate-400 to-violet-600",    letter: "E", verified: true,  online: false, mutualInterests: 1 },
];

const SORT_OPTIONS = ["Best Match", "Nearest", "Youngest", "Most Active"] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ── Profile card ───────────────────────────────────────────────────────────
const ProfileCard = ({ profile, delay }: { profile: Profile; delay: string }) => (
  <div
    className="group bg-white rounded-2xl border border-violet-100 shadow-sm hover:shadow-xl hover:shadow-violet-100/60 hover:border-violet-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer card-enter"
    style={{ animationDelay: delay }}
  >
    {/* Card avatar */}
    <div className={`relative h-48 bg-gradient-to-br ${profile.gradient} flex items-center justify-center overflow-hidden`}>
      {/* Big letter watermark */}
      <span className="text-white/10 font-display font-black select-none" style={{ fontSize: 130 }}>
        {profile.letter}
      </span>
      {/* Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />

      {/* Online badge */}
      {profile.online && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white text-[10px] font-semibold">Online</span>
        </div>
      )}

      {/* Verified badge */}
      {profile.verified && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 border border-white flex items-center justify-center shadow-md">
          <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 fill-violet-600">
            <path d="M10 3L5 8.5 2 5.5" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Mutual interests badge */}
      {profile.mutualInterests && profile.mutualInterests > 0 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2.5 py-1">
          <svg viewBox="0 0 24 24" className="fill-white w-3 h-3">
            <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
          </svg>
          <span className="text-white text-[10px] font-semibold">{profile.mutualInterests} mutual</span>
        </div>
      )}
    </div>

    {/* Card info */}
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-bold text-gray-900 text-lg leading-none">{profile.name}</h3>
            <span className="text-gray-500 text-base font-medium">{profile.age}</span>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {profile.distance}
          </p>
        </div>
        <button className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
      </div>

      <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{profile.bio}</p>

      {/* Interest tags */}
      <div className="flex flex-wrap gap-1.5">
        {profile.interests.slice(0, 3).map((interest) => {
          const cat = CATEGORIES.find((c) => c.id === interest);
          return cat ? (
            <span key={interest} className="text-[11px] font-medium text-violet-700 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
              {cat.emoji} {cat.label}
            </span>
          ) : null;
        })}
        {profile.interests.length > 3 && (
          <span className="text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
            +{profile.interests.length - 3}
          </span>
        )}
      </div>
    </div>
  </div>
);

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("Best Match");
  const [filterOpen, setFilterOpen] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);
  const [maxDistance, setMaxDistance] = useState(10);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = ALL_PROFILES;

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q) ||
          p.interests.some((i) => i.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeCategory !== "all") {
      list = list.filter((p) => p.interests.includes(activeCategory));
    }

    // Age range
    list = list.filter((p) => p.age >= ageRange[0] && p.age <= ageRange[1]);

    // Distance
    list = list.filter((p) => parseFloat(p.distance) <= maxDistance);

    // Online only
    if (onlineOnly) list = list.filter((p) => p.online);

    // Verified only
    if (verifiedOnly) list = list.filter((p) => p.verified);

    // Sort
    if (sortBy === "Nearest") list = [...list].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    else if (sortBy === "Youngest") list = [...list].sort((a, b) => a.age - b.age);
    else if (sortBy === "Most Active") list = [...list].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
    else list = [...list].sort((a, b) => (b.mutualInterests || 0) - (a.mutualInterests || 0));

    return list;
  }, [query, activeCategory, sortBy, ageRange, maxDistance, onlineOnly, verifiedOnly]);

  const activeFiltersCount = (onlineOnly ? 1 : 0) + (verifiedOnly ? 1 : 0) + (maxDistance < 10 ? 1 : 0) + (ageRange[0] > 18 || ageRange[1] < 35 ? 1 : 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Outfit:wght@300;400;500;600&display=swap');
        * { font-family: 'Outfit', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .fade-up    { animation: fadeUp 0.4s ease both; }
        .slide-down { animation: slideDown 0.3s ease both; }
        .card-enter { animation: cardEnter 0.4s ease both; }

        .custom-scroll::-webkit-scrollbar { height: 0; width: 0; }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/30 to-white">

        {/* ── STICKY HEADER ───────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-violet-100 shadow-sm shadow-violet-50/60">

          {/* Top row */}
          <div className="max-w-5xl mx-auto px-5 pt-5 pb-3">
            <div className="flex items-center gap-3 mb-4 fade-up">
              {/* Logo */}
              <div className="flex items-center gap-2 mr-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md shadow-violet-300/40">
                  <svg viewBox="0 0 24 24" className="fill-white w-4 h-4">
                    <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
                  </svg>
                </div>
                <span className="font-display font-bold text-lg text-gray-900 hidden sm:block">PairUp</span>
              </div>

              {/* Search bar */}
              <div className="flex-1 relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, interest, or keyword..."
                  className="w-full pl-11 pr-10 py-3 rounded-2xl bg-violet-50 border border-violet-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" className="w-3 h-3">
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter button */}
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className={`relative flex-shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-200
                  ${filterOpen || activeFiltersCount > 0
                    ? "bg-violet-600 border-violet-600 shadow-lg shadow-violet-200/50"
                    : "bg-white border-violet-200 hover:border-violet-400 hover:bg-violet-50"
                  }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={filterOpen || activeFiltersCount > 0 ? "white" : "#8B5CF6"} strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                </svg>
                {activeFiltersCount > 0 && !filterOpen && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-violet-600 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* ── CATEGORY PILLS ── */}
            <div className="flex gap-2 overflow-x-auto custom-scroll pb-1">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200
                    ${activeCategory === cat.id
                      ? "bg-violet-600 text-white shadow-md shadow-violet-300/40 scale-105"
                      : "bg-white border border-violet-100 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                    }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── FILTER PANEL ── */}
          {filterOpen && (
            <div className="border-t border-violet-100 bg-white slide-down">
              <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Age range */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">
                    Age Range: <span className="text-violet-600">{ageRange[0]}–{ageRange[1]}</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">{ageRange[0]}</span>
                      <input
                        type="range" min="18" max="50" value={ageRange[0]}
                        onChange={(e) => setAgeRange([+e.target.value, ageRange[1]])}
                        className="flex-1 accent-violet-600 h-1.5 rounded-full"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-6">{ageRange[1]}</span>
                      <input
                        type="range" min="18" max="50" value={ageRange[1]}
                        onChange={(e) => setAgeRange([ageRange[0], +e.target.value])}
                        className="flex-1 accent-violet-600 h-1.5 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">
                    Max Distance: <span className="text-violet-600">{maxDistance} km</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min="1" max="50" value={maxDistance}
                      onChange={(e) => setMaxDistance(+e.target.value)}
                      className="flex-1 accent-violet-600 h-1.5 rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>1 km</span><span>50 km</span>
                  </div>
                </div>

                {/* Toggles */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Quick Filters</label>
                  <div className="space-y-3">
                    {[
                      { label: "Online Now", value: onlineOnly, set: setOnlineOnly, emoji: "🟢" },
                      { label: "Verified Only", value: verifiedOnly, set: setVerifiedOnly, emoji: "✅" },
                    ].map((t) => (
                      <button
                        key={t.label}
                        onClick={() => t.set(!t.value)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200
                          ${t.value ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-200"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{t.emoji}</span> {t.label}
                        </span>
                        <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${t.value ? "bg-violet-600" : "bg-gray-300"}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${t.value ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">Sort By</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortBy(s)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all duration-200
                          ${sortBy === s ? "bg-violet-600 text-white shadow-md shadow-violet-200/50" : "bg-gray-50 border border-gray-200 text-gray-600 hover:border-violet-200 hover:text-violet-700"}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Reset */}
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setAgeRange([18, 35]); setMaxDistance(10); setOnlineOnly(false); setVerifiedOnly(false); setSortBy("Best Match"); }}
                      className="mt-3 w-full text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                    >
                      ✕ Reset all filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-5 py-6">

          {/* Results meta row */}
          <div className="flex items-center justify-between mb-6 fade-up">
            <div>
              <h2 className="font-display font-bold text-gray-900 text-xl">
                {activeCategory === "all" ? "Discover People" : `${CATEGORIES.find(c => c.id === activeCategory)?.emoji} ${CATEGORIES.find(c => c.id === activeCategory)?.label} Lovers`}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} {filtered.length === 1 ? "person" : "people"} found
                {query && <> for <span className="text-violet-600 font-medium">"{query}"</span></>}
              </p>
            </div>

            {/* Sort pill (when filter closed) */}
            {!filterOpen && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                >
                  {SORT_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* ── ACTIVE FILTER CHIPS ── */}
          {(activeCategory !== "all" || onlineOnly || verifiedOnly || maxDistance < 10 || ageRange[0] > 18 || ageRange[1] < 35) && (
            <div className="flex flex-wrap gap-2 mb-5 fade-up">
              {activeCategory !== "all" && (
                <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {CATEGORIES.find(c => c.id === activeCategory)?.emoji} {CATEGORIES.find(c => c.id === activeCategory)?.label}
                  <button onClick={() => setActiveCategory("all")} className="ml-1 hover:text-violet-900">×</button>
                </span>
              )}
              {onlineOnly && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  🟢 Online Now
                  <button onClick={() => setOnlineOnly(false)} className="ml-1 hover:text-emerald-900">×</button>
                </span>
              )}
              {verifiedOnly && (
                <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  ✅ Verified
                  <button onClick={() => setVerifiedOnly(false)} className="ml-1 hover:text-violet-900">×</button>
                </span>
              )}
              {maxDistance < 10 && (
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  📍 Within {maxDistance} km
                  <button onClick={() => setMaxDistance(10)} className="ml-1 hover:text-blue-900">×</button>
                </span>
              )}
              {(ageRange[0] > 18 || ageRange[1] < 35) && (
                <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  🎂 {ageRange[0]}–{ageRange[1]} yrs
                  <button onClick={() => setAgeRange([18, 35])} className="ml-1 hover:text-orange-900">×</button>
                </span>
              )}
            </div>
          )}

          {/* ── GRID ── */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center fade-up">
              <div className="w-20 h-20 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-4xl">🔍</div>
              <div>
                <h3 className="font-display font-bold text-gray-900 text-xl mb-2">No results found</h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                  Try adjusting your filters or searching with different keywords.
                </p>
              </div>
              <button
                onClick={() => { setQuery(""); setActiveCategory("all"); setAgeRange([18, 35]); setMaxDistance(10); setOnlineOnly(false); setVerifiedOnly(false); }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-semibold shadow-lg shadow-violet-200/60 hover:scale-105 transition-transform duration-200"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((profile, i) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  delay={`${(i % 8) * 0.05}s`}
                />
              ))}
            </div>
          )}

          {/* Bottom padding */}
          <div className="h-12" />
        </div>
      </div>
    </>
  );
}