"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Sliders,
  Heart,
  MapPin,
  Flame,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Sparkles,
  Calendar,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";

type Profile = {
  id: string;
  name: string;
  age: number;
  image: string;
  location: string;
  distance: number;
  interests: string[];
  matchPercentage: number;
  isOnline: boolean;
  isVerified: boolean;
};

type LooseRecord = Record<string, unknown>;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&auto=format&fit=crop";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
const USERS_ENDPOINT = "/api/users?excludeSelf=true";
const DISCOVER_ENDPOINT = "/api/users/discover?includePrevious=false";
const DISCOVER_ENDPOINT_FALLBACK = "/api/users/discover";

const isRecord = (v: unknown): v is LooseRecord => typeof v === "object" && v !== null;
const asString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const asNumber = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};
const asBool = (v: unknown) => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "online"].includes(s)) return true;
    if (["false", "0", "no", "offline"].includes(s)) return false;
  }
  return undefined;
};

const toAbsUrl = (value: string | undefined) => {
  if (!value) return undefined;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (!API_BASE_URL) return value;
  const base = API_BASE_URL.replace(/\/$/, "");
  return value.startsWith("/") ? `${base}${value}` : `${base}/${value}`;
};

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

const pickCollection = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  const keys = ["users", "data", "results", "list", "items", "profiles"];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = pickCollection(value);
      if (nested.length) return nested;
    }
  }
  return [];
};

const toInterests = (value: unknown) => {
  if (Array.isArray(value)) return value.map(asString).filter((v): v is string => Boolean(v));
  const source = asString(value);
  return source ? source.split(",").map((x) => x.trim()).filter(Boolean) : [];
};

const toProfileImage = (entry: LooseRecord) => {
  const images = Array.isArray(entry.images) ? entry.images.filter(isRecord) : [];
  const thumbnail =
    images.find((img) => asBool(img.isThumbnail ?? img.is_thumbnail ?? img.thumbnail)) ?? images[0];
  const fromImages = toAbsUrl(asString(thumbnail?.url) ?? asString(thumbnail?.secure_url) ?? asString(thumbnail?.path));
  const direct =
    toAbsUrl(asString(entry.avatar)) ??
    toAbsUrl(asString(entry.profileImage)) ??
    toAbsUrl(asString(entry.image)) ??
    toAbsUrl(asString(entry.photo));
  return fromImages ?? direct ?? FALLBACK_IMAGE;
};

const mapProfiles = (payload: unknown): Profile[] =>
  pickCollection(payload)
    .map((item, index): Profile | null => {
      if (!isRecord(item)) return null;
      const id = asString(item.id) ?? asString(item._id) ?? asString(item.uid) ?? `profile-${index}`;
      const first = asString(item.firstname) ?? asString(item.firstName);
      const last = asString(item.lastname) ?? asString(item.lastName);
      const name = [first, last].filter(Boolean).join(" ").trim() || asString(item.name) || "PairUp member";
      const h = hash(id);
      const interests = toInterests(item.interests);
      return {
        id,
        name,
        age: asNumber(item.age) ?? 18,
        image: toProfileImage(item),
        location: asString(item.location) ?? "Nearby",
        distance: (h % 30) + 1,
        interests: interests.length ? interests : ["Travel", "Music"],
        matchPercentage: 80 + (h % 20),
        isOnline:
          asBool(item.isOnline) ??
          (asString(item.status)?.toLowerCase() === "online" ? true : undefined) ??
          false,
        isVerified: asBool(item.isVerified) ?? asBool(item.verified) ?? asBool(item.isProfileComplete) ?? false,
      };
    })
    .filter((p): p is Profile => Boolean(p));

export default function SearchPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<"card" | "grid">("card");
  const [filters, setFilters] = useState({ minAge: 18, maxAge: 50, maxDistance: 50, interests: [] as string[] });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    let mapped: Profile[] = [];
    let lastError: unknown = null;

    try {
      const primary = await apiClient.get(USERS_ENDPOINT);
      mapped = mapProfiles(primary.data);
    } catch (error) {
      lastError = error;
    }

    if (!mapped.length) {
      try {
        const fallback = await apiClient.get(DISCOVER_ENDPOINT);
        mapped = mapProfiles(fallback.data);
      } catch (error) {
        lastError = error;
      }
    }

    if (!mapped.length) {
      try {
        const fallback2 = await apiClient.get(DISCOVER_ENDPOINT_FALLBACK);
        mapped = mapProfiles(fallback2.data);
      } catch (error) {
        lastError = error;
      }
    }

    if (mapped.length) {
      setProfiles(mapped);
      setError(null);
    } else {
      setProfiles([]);
      setError(
        lastError instanceof Error && lastError.message
          ? `Unable to load profiles: ${lastError.message}`
          : "Unable to load profiles right now."
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProfiles();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchProfiles]);

  const allInterests = useMemo(() => Array.from(new Set(profiles.flatMap((p) => p.interests))).slice(0, 30), [profiles]);
  const interestChoices = allInterests.length ? allInterests : ["Travel", "Music", "Fitness", "Art"];

  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => {
        const ageOk = p.age >= filters.minAge && p.age <= filters.maxAge;
        const distOk = p.distance <= filters.maxDistance;
        const interestsOk = !filters.interests.length || filters.interests.some((i) => p.interests.includes(i));
        const searchOk = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return ageOk && distOk && interestsOk && searchOk;
      }),
    [profiles, filters, searchTerm]
  );

  const safeIndex = filteredProfiles.length ? Math.min(currentIndex, filteredProfiles.length - 1) : 0;
  const currentProfile = filteredProfiles[safeIndex];

  const toggleLike = (id: string) =>
    setLikedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const resetFilters = () => {
    setFilters({ minAge: 18, maxAge: 50, maxDistance: 50, interests: [] });
    setSearchTerm("");
    setCurrentIndex(0);
  };

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/30 to-white">
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-lg border-b border-violet-100">
          <div className="max-w-8xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gradient-to-br from-violet-400 to-violet-600 p-2.5 text-white"><Sparkles size={24} /></div>
                <div><h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">PairUp</h1><p className="text-xs text-gray-600">Discover your perfect match</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => void fetchProfiles()} className="px-4 py-2.5 rounded-full border border-violet-200 text-violet-700 font-semibold hover:bg-violet-50">Refresh</button>
                <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold"><Sliders size={18} /><span className="hidden sm:inline">Filters</span></button>
              </div>
            </div>
            <div className="mt-4 relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentIndex(0); }} placeholder="Search by name..." className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border border-violet-200 focus:outline-none focus:border-violet-500" />
            </div>
            {error && <p className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {showFilters && (
            <div className="lg:col-span-1 lg:static fixed inset-0 z-50 bg-black/50 lg:bg-transparent p-4 lg:p-0">
              <div className="bg-white rounded-3xl border border-violet-100 shadow-xl p-6 h-full overflow-y-auto lg:sticky lg:top-24">
                <div className="flex items-center justify-between mb-6 lg:hidden"><h3 className="text-lg font-bold">Filters</h3><button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
                <div className="space-y-6">
                  <div><label className="flex items-center gap-2 text-sm font-semibold mb-3"><Calendar size={16} className="text-violet-500" />Age Range</label><input type="range" min="18" max="50" value={filters.minAge} onChange={(e) => setFilters((p) => ({ ...p, minAge: Math.min(Number(e.target.value), p.maxAge) }))} className="w-full accent-violet-500" /><input type="range" min="18" max="50" value={filters.maxAge} onChange={(e) => setFilters((p) => ({ ...p, maxAge: Math.max(Number(e.target.value), p.minAge) }))} className="w-full accent-violet-500 mt-3" /></div>
                  <div><label className="flex items-center gap-2 text-sm font-semibold mb-3"><MapPin size={16} className="text-violet-500" />Distance (km)</label><input type="range" min="1" max="100" value={filters.maxDistance} onChange={(e) => setFilters((p) => ({ ...p, maxDistance: Number(e.target.value) }))} className="w-full accent-violet-500" /></div>
                  <div><label className="flex items-center gap-2 text-sm font-semibold mb-3"><Sparkles size={16} className="text-violet-500" />Interests</label><div className="flex flex-wrap gap-2">{interestChoices.map((interest) => <button key={interest} onClick={() => setFilters((p) => ({ ...p, interests: p.interests.includes(interest) ? p.interests.filter((i) => i !== interest) : [...p.interests, interest] }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filters.interests.includes(interest) ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700"}`}>{interest}</button>)}</div></div>
                  <button onClick={resetFilters} className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold">Reset Filters</button>
                </div>
              </div>
            </div>
          )}

          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white animate-pulse" />)}</div>
            ) : filteredProfiles.length === 0 ? (
              <div className="bg-white rounded-3xl border border-violet-100 shadow-xl p-12 text-center"><Users size={64} className="mx-auto text-gray-300 mb-4" /><h3 className="text-2xl font-bold text-slate-900 mb-2">No profiles found</h3><p className="text-gray-600 mb-6">Try adjusting your filters to find more matches</p><button onClick={resetFilters} className="px-6 py-2.5 rounded-lg bg-violet-600 text-white font-semibold">Reset Filters</button></div>
            ) : (
              <>
                {viewType === "card" && currentProfile && (
                  <div className="space-y-6">
                    <div className="relative h-96 sm:h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-violet-100">
                      <img src={currentProfile.image} alt={currentProfile.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                        <div className="flex gap-2">{currentProfile.isOnline && <div className="bg-white/95 px-3 py-1.5 rounded-full text-xs font-semibold">Online</div>}{currentProfile.isVerified && <div className="bg-white/95 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1"><Star size={13} className="text-violet-500 fill-current" />Verified</div>}</div>
                        <div className="bg-white/95 px-4 py-2 rounded-full text-sm font-bold text-violet-600 flex items-center gap-1"><Flame size={16} className="text-orange-500" />{currentProfile.matchPercentage}% Match</div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h2 className="text-4xl font-bold mb-2">{currentProfile.name}, <span className="text-2xl">{currentProfile.age}</span></h2>
                        <p className="flex items-center gap-2 mb-4"><MapPin size={18} />{currentProfile.location} - {currentProfile.distance} km away</p>
                        <div className="flex flex-wrap gap-2">{currentProfile.interests.map((interest) => <span key={`${currentProfile.id}-${interest}`} className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-full border border-white/30">{interest}</span>)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <button onClick={() => safeIndex > 0 && setCurrentIndex(safeIndex - 1)} disabled={safeIndex === 0} className="p-4 rounded-full bg-white border border-violet-100 shadow-lg disabled:opacity-50"><ChevronLeft size={24} className="text-violet-600" /></button>
                      <p className="text-sm text-gray-600"><span className="font-bold text-slate-900">{safeIndex + 1}</span> of <span className="font-bold text-slate-900">{filteredProfiles.length}</span></p>
                      <button onClick={() => toggleLike(currentProfile.id)} className={`px-8 py-4 rounded-full ${likedProfiles.has(currentProfile.id) ? "bg-red-500 text-white" : "bg-white border border-gray-300 text-gray-700"}`}><Heart size={24} className={likedProfiles.has(currentProfile.id) ? "fill-current" : ""} /></button>
                      <button onClick={() => safeIndex < filteredProfiles.length - 1 && setCurrentIndex(safeIndex + 1)} disabled={safeIndex === filteredProfiles.length - 1} className="p-4 rounded-full bg-violet-600 text-white shadow-lg disabled:opacity-50"><ChevronRight size={24} /></button>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={() => setViewType("card")} className={`px-6 py-2.5 rounded-full font-semibold ${viewType === "card" ? "bg-violet-600 text-white" : "bg-white border border-violet-100 text-gray-700"}`}>Card View</button>
                  <button onClick={() => setViewType("grid")} className={`px-6 py-2.5 rounded-full font-semibold ${viewType === "grid" ? "bg-violet-600 text-white" : "bg-white border border-violet-100 text-gray-700"}`}>Grid View</button>
                </div>

                {viewType === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    {filteredProfiles.map((profile) => (
                      <div key={profile.id} className="rounded-2xl overflow-hidden shadow-lg bg-white border border-violet-100">
                        <div className="relative h-80">
                          <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                          <button onClick={() => toggleLike(profile.id)} className={`absolute bottom-3 right-3 p-2.5 rounded-full ${likedProfiles.has(profile.id) ? "bg-red-500 text-white" : "bg-white/90 text-gray-900"}`}><Heart size={18} className={likedProfiles.has(profile.id) ? "fill-current" : ""} /></button>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-slate-900">{profile.name} <span className="text-sm text-gray-600">{profile.age}</span></h3>
                          <p className="text-xs text-gray-600 flex items-center gap-1 mb-3"><MapPin size={14} />{profile.distance} km away</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">{profile.interests.slice(0, 2).map((interest) => <span key={`${profile.id}-${interest}`} className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">{interest}</span>)}</div>
                            <div className="text-xs font-bold text-orange-600 flex items-center gap-0.5"><Flame size={12} />{profile.matchPercentage}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
