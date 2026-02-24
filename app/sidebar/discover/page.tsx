"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TinderCard from "react-tinder-card";
import { Loader2, Sparkles } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";
import type { AxiosError } from "axios";

type LooseRecord = Record<string, unknown>;

type DiscoverImage = {
    id: string;
    url: string;
    isThumbnail: boolean;
};

type DiscoverUser = {
    id: string;
    name: string;
    age?: number;
    bio?: string;
    thumbnail: string;
};

type SwipeDirection = "left" | "right";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&auto=format&fit=crop";
const USERS_ENDPOINT = process.env.NEXT_PUBLIC_USERS_ENDPOINT ?? process.env.NEXT_PUBLIC_ADMIN_USERS_ENDPOINT ?? "/api/admin/users";

const shuffle = <T,>(source: T[]): T[] => {
    const copy = [...source];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const isRecord = (value: unknown): value is LooseRecord => typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined => (typeof value === "string" && value.trim().length ? value : undefined);

const readNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
};

const readIdentifier = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim().length) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value.toString();
    return undefined;
};

const toImageList = (source: unknown): DiscoverImage[] => {
    if (!Array.isArray(source)) return [];

    return source
        .map((item) => {
            if (typeof item === "string") {
                return {
                    id: item,
                    url: item,
                    isThumbnail: false,
                } as DiscoverImage;
            }

            if (!isRecord(item)) return null;

            const url =
                readString(item.url) ??
                readString(item.secure_url) ??
                readString(item.location) ??
                readString(item.path) ??
                readString(item.src);

            if (!url) return null;

            return {
                id: readIdentifier(item.id) ?? readIdentifier(item._id) ?? readIdentifier(item.key) ?? url,
                url,
                isThumbnail: Boolean(item.isThumbnail ?? item.is_thumbnail ?? item.thumbnail),
            } as DiscoverImage;
        })
        .filter((image): image is DiscoverImage => Boolean(image));
};

const pickThumbnail = (images: DiscoverImage[], fallback?: string) => {
    if (images.length) {
        const thumbnail = images.find((image) => image.isThumbnail) ?? images[0];
        if (thumbnail?.url) return thumbnail.url;
    }
    return fallback ?? FALLBACK_IMAGE;
};

const pickCollection = (payload: unknown, depth = 0): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!isRecord(payload) || depth > 4) return [];

    const candidateKeys = [
        "users",
        "data",
        "results",
        "list",
        "items",
        "records",
        "profiles",
        "discover",
        "matches",
        "payload",
    ];

    // Handle common { data: { users: [...] } } shape explicitly
    if (isRecord(payload.data)) {
        const nested = payload.data as LooseRecord;
        if (Array.isArray(nested.users)) return nested.users;
        if (Array.isArray(nested.data)) return nested.data;
    }

    for (const key of candidateKeys) {
        const value = payload[key];
        if (Array.isArray(value)) return value;
        if (isRecord(value)) {
            const nested = pickCollection(value, depth + 1);
            if (nested.length) return nested;
        }
    }

    // Generic fallback: search any nested object values for arrays.
    for (const value of Object.values(payload)) {
        if (Array.isArray(value)) return value;
        if (isRecord(value)) {
            const nested = pickCollection(value, depth + 1);
            if (nested.length) return nested;
        }
    }

    return [];
};

const extractUsers = (payload: unknown): DiscoverUser[] => {
    const collection = pickCollection(payload);

    return collection
        .map((entry, index) => {
            if (!isRecord(entry)) return null;

            const id =
                readIdentifier(entry.id) ??
                readIdentifier(entry._id) ??
                readIdentifier(entry.userId) ??
                readIdentifier(entry.uid) ??
                `user-${index}`;

            const firstname = readString(entry.firstname) ?? readString(entry.firstName);
            const lastname = readString(entry.lastname) ?? readString(entry.lastName);
            const fallbackName = readString(entry.name) ?? "PairUp member";
            const name = [firstname, lastname].filter(Boolean).join(" ").trim() || fallbackName;
            const age = readNumber(entry.age) ?? readNumber(entry.userAge);

            const thumbnail = pickThumbnail(
                toImageList(entry.images),
                readString(entry.profileImage) ?? readString(entry.avatar) ?? readString(entry.photo)
            );

            return {
                id,
                name,
                age,
                bio: readString(entry.bio) ?? readString(entry.about),
                thumbnail,
            } as DiscoverUser;
        })
        .filter((user): user is DiscoverUser => Boolean(user?.id));
};

const fetchDiscoverUsers = async (): Promise<DiscoverUser[]> => {
    try {
        const response = await apiClient.get(USERS_ENDPOINT);
        return extractUsers(response.data);
    } catch (primaryError) {
        console.warn("Primary users endpoint failed, trying fallback /api/admin/users", primaryError);
        try {
            const fallback = await apiClient.get("/api/admin/users");
            return extractUsers(fallback.data);
        } catch (fallbackError) {
            console.error("Fallback admin users endpoint failed", fallbackError);
            try {
                const lastResort = await apiClient.get("/admin/users");
                return extractUsers(lastResort.data);
            } catch (lastResortError) {
                console.error("All user endpoints failed", lastResortError);
                throw primaryError;
            }
        }
    }
};

type LoadOptions = {
    fallbackToCached?: boolean;
    showSpinner?: boolean;
};

export default function DiscoverPage() {
    const [users, setUsers] = useState<DiscoverUser[]>([]);
    const [deckVersion, setDeckVersion] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [swipeError, setSwipeError] = useState<string | null>(null);
    const [inviteNotice, setInviteNotice] = useState<string | null>(null);
    const inviteNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [reloadPending, setReloadPending] = useState(false);
    const swipeQueueRef = useRef<Set<string>>(new Set());
    const autoReloadingRef = useRef(false);
    const initialDeckRef = useRef<DiscoverUser[]>([]);

    const clearInviteNotice = useCallback(() => {
        if (inviteNoticeTimerRef.current) {
            clearTimeout(inviteNoticeTimerRef.current);
            inviteNoticeTimerRef.current = null;
        }
        setInviteNotice(null);
    }, []);

    const setInviteNoticeWithTimeout = useCallback(
        (message: string) => {
            setInviteNotice(message);
            if (inviteNoticeTimerRef.current) {
                clearTimeout(inviteNoticeTimerRef.current);
            }
            inviteNoticeTimerRef.current = setTimeout(() => {
                setInviteNotice(null);
                inviteNoticeTimerRef.current = null;
            }, 4000);
        },
        []
    );

    const loadUsers = useCallback(async (options?: LoadOptions) => {
        const fallbackToCached = options?.fallbackToCached ?? false;
        const showSpinner = options?.showSpinner ?? true;

        if (showSpinner) {
            setLoading(true);
        }
        setError(null);
        setSwipeError(null);
        clearInviteNotice();
        try {
            const data = await fetchDiscoverUsers();
            if (data.length > 0) {
                const randomized = shuffle(data);
                setUsers(randomized);
                initialDeckRef.current = randomized;
            } else if (fallbackToCached && initialDeckRef.current.length) {
                setUsers([...initialDeckRef.current]);
            } else {
                setUsers([]);
            }
            setDeckVersion((prev) => prev + 1);
            swipeQueueRef.current.clear();
        } catch (err) {
            console.error("Failed to fetch discover users", err);
            setError("Unable to load discover matches. Please try again.");
            if (fallbackToCached && initialDeckRef.current.length) {
                setUsers([...initialDeckRef.current]);
            }
        } finally {
            if (showSpinner) {
                setLoading(false);
            }
        }
    }, []);

    const resetDeck = useCallback(() => {
        setError(null);
        setSwipeError(null);
        clearInviteNotice();
        setReloadPending(true);

        loadUsers({ fallbackToCached: true, showSpinner: false })
            .catch(() => {
                /* errors already surfaced via setError */
            })
            .finally(() => {
                setReloadPending(false);
            });
    }, [loadUsers]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const handleSwipe = useCallback(
        async (direction: SwipeDirection, user: DiscoverUser) => {
            if (direction !== "left" && direction !== "right") return;

            if (swipeQueueRef.current.has(user.id)) {
                return;
            }

            swipeQueueRef.current.add(user.id);
            setSwipeError(null);
            clearInviteNotice();
            let deckEmptyAfterSwipe = false;
            setUsers((prev) => {
                const next = prev.filter((candidate) => candidate.id !== user.id);
                deckEmptyAfterSwipe = next.length === 0;
                return next;
            });
            let restored = false;

            try {
                // Right swipe now just removes the card locally; chat flow handles messaging.
            } catch (err) {
                setSwipeError("Unable to process swipe. Please try again.");
                setUsers((prev) => [user, ...prev]);
                restored = true;
                console.error("Swipe submission failed", err);
            } finally {
                swipeQueueRef.current.delete(user.id);
            }

            if (deckEmptyAfterSwipe && !restored && !autoReloadingRef.current) {
                autoReloadingRef.current = true;
                try {
                    await loadUsers({ fallbackToCached: true, showSpinner: false });
                } finally {
                    autoReloadingRef.current = false;
                }
            }
        },
        [loadUsers]
    );

    const handleSwipeWrapper = useCallback(
        (direction: string, user: DiscoverUser) => {
            if (direction === "left" || direction === "right") {
                void handleSwipe(direction, user);
            }
        },
        [handleSwipe]
    );

    useEffect(() => {
        return () => {
            if (inviteNoticeTimerRef.current) {
                clearTimeout(inviteNoticeTimerRef.current);
            }
        };
    }, []);

    const stackedUsers = useMemo(() => users.slice(0, 4), [users]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                    <p className="text-sm text-slate-500">Loading curated matches…</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
                    <p className="text-base font-semibold text-rose-700">{error}</p>
                    <button
                        onClick={() => void loadUsers()}
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (!users.length) {
            return (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
                    <p className="text-xl font-semibold text-slate-900">No more users in your deck.</p>
                    <p className="mt-2 text-sm text-slate-500">
                        You&apos;ve swiped through everyone for now. Check back later for new profiles.
                    </p>
                    <button
                        onClick={resetDeck}
                        disabled={reloadPending || loading}
                        className={`mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg transition ${
                            reloadPending || loading
                                ? "bg-slate-400 cursor-wait"
                                : "bg-slate-900 hover:bg-slate-800"
                        }`}
                    >
                        {reloadPending || loading ? "Reloading…" : "Reload deck"}
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="relative mx-auto h-[520px] w-full max-w-md">
                {stackedUsers.map((user, index) => {
                    const depth = stackedUsers.length - index - 1;
                    const translateY = depth * 10;
                    const scale = 1 - depth * 0.035;

                    return (
                        <TinderCard
                            key={`${user.id}-${deckVersion}`}
                            className="absolute inset-0 cursor-grab"
                            preventSwipe={["up", "down"]}
                            onSwipe={(dir) => handleSwipeWrapper(dir, user)}
                        >
                            <article
                                className="relative h-full w-full overflow-hidden rounded-[32px] bg-slate-900 text-white shadow-2xl transition-transform duration-500 will-change-transform"
                                style={{
                                    transform: `translateY(${translateY}px) scale(${scale})`,
                                    zIndex: 10 + depth,
                                }}
                            >
                                <img
                                    src={user.thumbnail}
                                    alt={user.name}
                                    className="absolute inset-0 h-full w-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] backdrop-blur">
                                    <Sparkles className="h-3.5 w-3.5" /> Browse members
                                </div>

                                <div className="absolute inset-x-6 bottom-6 space-y-2">
                                    <h2 className="text-3xl font-semibold">
                                        {user.name}
                                        {user.age ? <span className="text-white/80">, {user.age}</span> : null}
                                    </h2>
                                    {user.bio && <p className="text-sm text-white/80 line-clamp-3">{user.bio}</p>}
                                    <div className="flex gap-3">
                                        <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                                            Swipe left ↺
                                        </span>
                                        <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                                            Swipe right → Next
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </TinderCard>
                    );
                })}
                </div>
                {swipeError ? (
                    <p className="text-sm text-rose-500 text-center max-w-md">{swipeError}</p>
                ) : null}
                {!swipeError && inviteNotice ? (
                    <p className="text-sm text-emerald-600 text-center max-w-md">{inviteNotice}</p>
                ) : null}
            </div>
        );
    };

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50 px-6 py-10">
                <div className="mx-auto max-w-3xl space-y-10">
                    <header className="text-center">
                        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.5em] text-rose-400">
                            <Sparkles className="h-4 w-4" /> Discover
                        </p>
                        <h1 className="mt-4 text-4xl font-semibold text-slate-900">Swipe your next connection</h1>
                        <p className="mt-3 text-sm text-slate-500">
                            Swipe right to send an invitation, left to skip. The deck refreshes automatically as you meet new people.
                        </p>
                    </header>

                    {renderContent()}
                </div>
            </div>
        </ProtectedRoute>
    );
}
