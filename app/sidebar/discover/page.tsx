"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, MapPin, Sparkles, Star, X } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";
import { getAuthData } from "@/lib/auth-utils";

type UserImage = {
    id?: string;
    url: string;
    isThumbnail?: boolean;
};

type DiscoverUser = {
    id: string;
    firstname?: string;
    lastname?: string;
    age?: number;
    location?: string;
    occupation?: string;
    bio?: string;
    interests?: string[] | string;
    images: UserImage[];
};

const ENDPOINT_CANDIDATES = ["api/users/discover", "api/users"];

type LooseRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is LooseRecord => typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const readNumber = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);

const readIdentifier = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    return undefined;
};

const readStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    return value.map((entry) => `${entry}`.trim()).filter((entry) => entry.length > 0);
};

const extractErrorStatus = (error: unknown): number | undefined => {
    if (!isRecord(error)) return undefined;
    const response = isRecord(error.response) ? (error.response as LooseRecord) : null;
    const status = response?.status;
    return typeof status === "number" ? status : undefined;
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
    if (isRecord(error)) {
        const response = isRecord(error.response) ? (error.response as LooseRecord) : null;
        const data = isRecord(response?.data) ? (response?.data as LooseRecord) : null;
        const message = readString(data?.message);
        if (message) {
            return message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

const collectImages = (rawImages: unknown, fallback?: string): UserImage[] => {
    const normalized: UserImage[] = Array.isArray(rawImages)
        ? rawImages
              .map((image): UserImage | null => {
                  const imageRecord = isRecord(image) ? image : null;
                  const urlCandidate =
                      readString(imageRecord?.url) ??
                      readString(imageRecord?.secure_url) ??
                      readString(imageRecord?.location) ??
                      readString(imageRecord?.path) ??
                      readString(imageRecord?.src) ??
                      readString(image);

                  if (!urlCandidate) {
                      return null;
                  }

                  return {
                      id:
                          readIdentifier(imageRecord?.id) ??
                          readIdentifier(imageRecord?._id) ??
                          readIdentifier(imageRecord?.public_id) ??
                          readIdentifier(imageRecord?.key),
                      url: urlCandidate,
                      isThumbnail: Boolean(imageRecord?.isThumbnail ?? imageRecord?.is_thumbnail ?? imageRecord?.thumbnail),
                  };
              })
              .filter((image): image is UserImage => image !== null)
        : [];

    if (!normalized.length && fallback) {
        normalized.push({
            id: "fallback",
            url: fallback,
            isThumbnail: true,
        });
    }

    return normalized;
};

const extractArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (isRecord(value) && Array.isArray(value.data)) {
        return value.data;
    }
    return [];
};

const normalizeUsersResponse = (payload: unknown): DiscoverUser[] => {
    if (!payload) return [];

    const payloadRecord = isRecord(payload) ? payload : null;
    const listCandidate = Array.isArray(payload)
        ? payload
        : payloadRecord?.users ?? payloadRecord?.data ?? payloadRecord?.results ?? payloadRecord?.rows ?? [];

    return extractArray(listCandidate)
        .map((raw, index) => {
            const entry = isRecord(raw) ? raw : {};
            const id =
                readIdentifier(entry.id) ??
                readIdentifier(entry._id) ??
                readIdentifier(entry.userId) ??
                readIdentifier(entry.uid) ??
                readIdentifier(entry.uuid) ??
                `user-${index}`;

            const interestsValue = (() => {
                if (Array.isArray(entry.interests)) {
                    return readStringArray(entry.interests);
                }
                if (typeof entry.interests === "string") {
                    return entry.interests;
                }
                return undefined;
            })();

            return {
                id,
                firstname: readString(entry.firstname) ?? readString(entry.firstName) ?? readString(entry.name),
                lastname: readString(entry.lastname) ?? readString(entry.lastName),
                age: readNumber(entry.age) ?? readNumber(entry.userAge),
                location: readString(entry.location) ?? readString(entry.city) ?? readString(entry.country),
                occupation: readString(entry.occupation) ?? readString(entry.jobTitle) ?? readString(entry.profession),
                bio: readString(entry.bio) ?? readString(entry.about),
                interests: interestsValue,
                images: collectImages(entry.images, readString(entry.profileImage) ?? readString(entry.avatar) ?? readString(entry.photo)),
            } as DiscoverUser;
        })
        .filter((user) => Boolean(user.id));
};

const getInterestChips = (value: DiscoverUser["interests"]): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((chip) => `${chip}`.trim())
            .filter((chip) => chip.length > 0)
            .slice(0, 4);
    }
    return value
        .split(",")
        .map((chip) => chip.trim())
        .filter((chip) => chip.length > 0)
        .slice(0, 4);
};

const getDisplayName = (user?: DiscoverUser) => {
    if (!user) return "";
    const composed = [user.firstname, user.lastname].filter(Boolean).join(" ").trim();
    return composed || "PairUp member";
};

const getThumbnailUrl = (images: UserImage[]): string => {
    if (!images?.length) return "";
    const thumbnail = images.find((image) => image.isThumbnail && image.url);
    return thumbnail?.url ?? images[0]?.url ?? "";
};

type ApiResponse = { data: unknown };

async function fetchUsersPayload(): Promise<ApiResponse> {
    let lastError: unknown = null;

    for (const endpoint of ENDPOINT_CANDIDATES) {
        try {
            return (await apiClient.get(endpoint)) as ApiResponse;
        } catch (err) {
            lastError = err;
            const status = extractErrorStatus(err);
            if (status !== 404 && status !== 405 && status !== 501) {
                throw err;
            }
        }
    }

    throw (lastError instanceof Error ? lastError : new Error("No user endpoint available"));
}

export default function DiscoverPage() {
    const [users, setUsers] = useState<DiscoverUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const authData = getAuthData();
            const loggedInId =
                authData?.userInfo?.id ??
                authData?.userInfo?._id ??
                authData?.userInfo?.userId ??
                authData?.userInfo?.uid ??
                null;

            const response = await fetchUsersPayload();
            const normalized = normalizeUsersResponse(response.data);

            const filtered = normalized.filter((user) => {
                if (!user.images.length) return false;
                if (loggedInId && user.id === loggedInId) return false;
                return true;
            });

            setUsers(filtered);
            setActiveIndex(0);
        } catch (err) {
            const message = extractErrorMessage(err, "Unable to load discover matches right now.");
            setError(message);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handlePrev = () => {
        setActiveIndex((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setActiveIndex((prev) => Math.min(users.length - 1, prev + 1));
    };

    const deckUsers = useMemo<DiscoverUser[]>(() => users.slice(activeIndex, Math.min(users.length, activeIndex + 3)), [users, activeIndex]);
    const progress = users.length ? ((activeIndex + 1) / users.length) * 100 : 0;
    const upcoming = useMemo<DiscoverUser[]>(() => users.slice(activeIndex + 1, activeIndex + 5), [users, activeIndex]);

    const renderState = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <div className="h-[520px] w-full max-w-sm animate-pulse rounded-[32px] bg-slate-200" />
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-32 w-full animate-pulse rounded-3xl bg-white" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                    <p className="text-base font-semibold">{error}</p>
                    <button
                        onClick={fetchUsers}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (!users.length) {
            return (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-10 text-center">
                    <p className="text-lg font-semibold text-slate-900">No matches available just yet.</p>
                    <p className="mt-2 text-sm text-slate-500">
                        Refresh the deck or update your profile photos to improve your reach.
                    </p>
                    <button
                        onClick={fetchUsers}
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                        Refresh deck
                    </button>
                </div>
            );
        }

        return (
            <>
                <div className="relative mx-auto h-[520px] w-full max-w-sm">
                    {/* Stack cards to mimic swipe deck */}
                    {deckUsers.map((user: DiscoverUser, index) => {
                        const thumbnail = getThumbnailUrl(user.images);
                        const offset = index * 18;
                        const scale = 1 - index * 0.04;

                        return (
                            <article
                                key={`${user.id}-${index}`}
                                className="absolute inset-0 rounded-[32px] bg-black text-white shadow-2xl"
                                style={{
                                    transform: `translateY(${offset}px) scale(${scale})`,
                                    zIndex: deckUsers.length - index,
                                    opacity: index === 0 ? 1 : 0.85 - index * 0.15,
                                    pointerEvents: index === 0 ? "auto" : "none",
                                }}
                            >
                                <img src={thumbnail} alt={getDisplayName(user)} className="absolute inset-0 h-full w-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                <div className="absolute left-6 right-6 top-6 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                                    <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Fresh match
                                    </span>
                                    <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                                        {activeIndex + 1} / {users.length}
                                    </span>
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-8">
                                    <div className="flex items-center gap-2 text-sm text-white/80">
                                        <MapPin className="h-4 w-4" />
                                        <span>{user.location ?? "Somewhere nearby"}</span>
                                    </div>
                                    <h2 className="mt-2 text-3xl font-semibold">
                                        {getDisplayName(user)}
                                        {user.age ? `, ${user.age}` : ""}
                                    </h2>
                                    {user.occupation && <p className="text-base text-white/80">{user.occupation}</p>}
                                    {user.bio && <p className="mt-3 text-sm text-white/70 line-clamp-2">{user.bio}</p>}
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {getInterestChips(user.interests).map((chip) => (
                                            <span key={`${user.id}-${chip}`} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                                                {chip}
                                            </span>
                                        ))}
                                        {!getInterestChips(user.interests).length && (
                                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">Curious soul</span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                    <button
                        onClick={handlePrev}
                        disabled={activeIndex === 0}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={activeIndex === users.length - 1}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6">
                    <button className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-orange-500 shadow-lg transition hover:scale-105">
                        <X size={28} strokeWidth={3} />
                    </button>
                    <button className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white shadow-xl transition hover:scale-105">
                        <Heart size={40} fill="currentColor" />
                    </button>
                    <button className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-indigo-600 shadow-lg transition hover:scale-105">
                        <Star size={28} fill="currentColor" />
                    </button>
                </div>

                {!!upcoming.length && (
                    <div className="mt-10">
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Up next</p>
                        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                            {upcoming.map((user: DiscoverUser) => (
                                <div key={user.id} className="min-w-[170px] rounded-2xl border border-slate-100 bg-white/80 p-3 shadow-sm">
                                    <img
                                        src={getThumbnailUrl(user.images)}
                                        alt={getDisplayName(user)}
                                        className="h-28 w-full rounded-xl object-cover"
                                        loading="lazy"
                                    />
                                    <p className="mt-3 text-sm font-semibold text-slate-900">{getDisplayName(user)}</p>
                                    <p className="text-xs text-slate-500">{user.location ?? "Undisclosed"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50 px-6 py-10">
                <div className="mx-auto max-w-5xl">
                    <header className="mb-10">
                        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-rose-400">
                            <Sparkles className="h-4 w-4" /> Discover
                        </p>
                        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Swipe through curated matches</h1>
                        <p className="mt-3 text-slate-500">
                            Real people near you with completed profiles. Tap the heart when someone catches your vibe.
                        </p>
                    </header>

                    {renderState()}
                </div>
            </div>
        </ProtectedRoute>
    );
}
