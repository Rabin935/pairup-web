"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";
import CompleteProfileModal from "./_components/CompleteProfileModal";
import {
    Camera,
    Star,
    Heart,
    Grid3X3,
    Eye,
    Sparkles,
    Upload,
    X,
    Settings,
    MoreHorizontal,
    MapPin,
    CheckCircle,
    Award,
    Flame,
    Users,
} from "lucide-react";

type UserImage = {
    id: string;
    url: string;
    public_id?: string;
    isThumbnail?: boolean;
};

type UserProfile = {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    gender?: string;
    interestedIn?: string;
    age?: number;
    location?: string;
    interests?: string[] | string;
    bio?: string;
    profileImage?: string;
    isProfileComplete?: boolean;
    images?: UserImage[];
};

type ProfileStats = {
    views: number;
    likes: number;
    matches: number;
    updatedAt?: string;
};

type ApiErrorShape = {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
};

const PROFILE_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&auto=format&fit=crop";
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

const resolveImageUrl = (value: string | undefined) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
        return trimmed;
    }
    const base = API_BASE_URL.replace(/\/$/, "");
    if (trimmed.startsWith("/")) {
        return base ? `${base}${trimmed}` : trimmed;
    }
    return base ? `${base}/${trimmed.replace(/^\//, "")}` : trimmed;
};

const readStringValue = (value: unknown) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};

const readBooleanValue = (value: unknown) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes"].includes(normalized)) return true;
        if (["false", "0", "no"].includes(normalized)) return false;
    }
    return undefined;
};

const getDisplayValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string" && value.trim() === "") return "N/A";
    return value;
};

const normalizeUserPayload = (payload: unknown): UserProfile | null => {
    if (!payload || typeof payload !== "object") return null;
    const source = payload as Record<string, unknown>;
    const nestedData = source.data as Record<string, unknown> | undefined;
    const rawUser = (source.user ||
        nestedData?.user ||
        nestedData ||
        source) as Record<string, unknown>;

    const rawImages = Array.isArray(rawUser.images) ? rawUser.images : [];
    const normalizedImages: UserImage[] = rawImages
        .map((item, index) => {
            if (typeof item === "string") {
                const url = resolveImageUrl(item);
                if (!url) return null;
                return {
                    id: item,
                    url,
                    isThumbnail: index === 0,
                } as UserImage;
            }

            if (!item || typeof item !== "object") return null;
            const imageRecord = item as Record<string, unknown>;
            const rawUrl =
                readStringValue(imageRecord.url) ??
                readStringValue(imageRecord.secure_url) ??
                readStringValue(imageRecord.path) ??
                readStringValue(imageRecord.src);
            const url = resolveImageUrl(rawUrl);
            if (!url) return null;

            const rawId =
                readStringValue(imageRecord.id) ??
                readStringValue(imageRecord._id) ??
                readStringValue(imageRecord.public_id) ??
                url;

            return {
                id: rawId,
                url,
                public_id: readStringValue(imageRecord.public_id),
                isThumbnail: readBooleanValue(imageRecord.isThumbnail ?? imageRecord.is_thumbnail ?? imageRecord.thumbnail) ?? false,
            } as UserImage;
        })
        .filter((image): image is UserImage => Boolean(image?.id && image?.url));

    const profileImage = resolveImageUrl(readStringValue(rawUser.profileImage));
    const selectedFromImages = normalizedImages.find((image) => image.isThumbnail)?.url ?? normalizedImages[0]?.url;

    return {
        ...(rawUser as UserProfile),
        profileImage: profileImage ?? selectedFromImages,
        images: normalizedImages,
    };
};

const normalizeStatsPayload = (payload: unknown): ProfileStats => {
    const root = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    const source = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
    return {
        views: Number(source.views || 0),
        likes: Number(source.likes || 0),
        matches: Number(source.matches || 0),
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
    };
};

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

const getErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as ApiErrorShape;
    return apiError?.response?.data?.message || apiError?.message || fallback;
};

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ProfileStats>({ views: 0, likes: 0, matches: 0 });
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingThumbnail, setIsSettingThumbnail] = useState<string | null>(null);
    const [thumbnailError, setThumbnailError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("gallery");
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await apiClient.get("api/users/me");
            const normalized = normalizeUserPayload(data);
            setProfile(normalized);
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to load profile");
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async (showLoader = false) => {
        if (showLoader) setIsStatsLoading(true);
        try {
            const { data } = await apiClient.get("api/users/me/stats");
            setStats(normalizeStatsPayload(data));
        } catch {
            setStats((current) => ({
                ...current,
                updatedAt: current.updatedAt ?? new Date().toISOString(),
            }));
        } finally {
            if (showLoader) setIsStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
        fetchStats(true);
    }, [fetchProfile, fetchStats]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            fetchStats();
        }, 15000);

        const onFocus = () => {
            fetchStats();
        };

        window.addEventListener("focus", onFocus);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchStats]);

    const interestChips = useMemo(() => {
        if (!profile?.interests) return [] as string[];
        if (Array.isArray(profile.interests)) return profile.interests.filter(Boolean);
        return profile.interests
            .split(",")
            .map((chip) => chip.trim())
            .filter((chip) => chip.length > 0);
    }, [profile?.interests]);

    const initials = useMemo(() => {
        if (!profile) return "PU";
        const names = [profile.firstname, profile.lastname].filter(Boolean) as string[];
        if (!names.length) return "PU";
        return names
            .map((name) => name.trim().charAt(0).toUpperCase())
            .slice(0, 2)
            .join("");
    }, [profile]);

    const statsCards = useMemo(
        () => [
            { label: "Views", value: stats.views },
            { label: "Likes", value: stats.likes },
            { label: "Matches", value: stats.matches },
        ],
        [stats.likes, stats.matches, stats.views]
    );

    const selectedThumbnailUrl = useMemo(() => {
        if (!profile) return undefined;
        const thumbnailFromImages = profile.images?.find((image) => image.isThumbnail && image.url)?.url;
        if (thumbnailFromImages) return thumbnailFromImages;
        if (profile.profileImage) return profile.profileImage;
        return profile.images?.[0]?.url;
    }, [profile]);

    const handleSetThumbnail = async (imageId: string) => {
        setThumbnailError(null);

        let shouldRequest = false;
        let rollbackPayload: { images?: UserImage[]; profileImage?: string } | null = null;

        setProfile((current) => {
            if (!current?.images?.length) return current;
            const targetImage = current.images.find((image) => image.id === imageId);
            if (!targetImage || targetImage.isThumbnail) return current;

            shouldRequest = true;
            rollbackPayload = {
                images: current.images.map((image) => ({ ...image })),
                profileImage: current.profileImage,
            };

            return {
                ...current,
                profileImage: targetImage.url,
                images: current.images.map((image) => ({
                    ...image,
                    isThumbnail: image.id === imageId,
                })),
            };
        });

        if (!shouldRequest) return;

        setIsSettingThumbnail(imageId);
        try {
            await apiClient.patch(`api/users/set-thumbnail/${encodeURIComponent(imageId)}`);
            await fetchProfile();
        } catch (err: unknown) {
            const message = getErrorMessage(err, "Failed to set thumbnail");
            setThumbnailError(message);
            if (rollbackPayload) {
                setProfile((current) => {
                    if (!current) return current;
                    return {
                        ...current,
                        profileImage: rollbackPayload?.profileImage,
                        images: rollbackPayload?.images,
                    };
                });
            }
        } finally {
            setIsSettingThumbnail(null);
        }
    };

    const renderState = () => {
        if (isLoading) {
            return (
                <div className="space-y-6 animate-pulse">
                    <div className="h-80 rounded-3xl bg-gradient-to-r from-violet-200 to-violet-100"></div>
                    <div className="h-64 rounded-3xl bg-gradient-to-r from-violet-100 to-violet-50"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-8 text-red-700 shadow-md">
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">!</div>
                        <div className="flex-1">
                            <p className="font-semibold text-lg">{error}</p>
                            <p className="text-sm text-red-600 mt-1">Please try again or contact support.</p>
                        </div>
                    </div>
                    <button
                        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-8 py-3 text-white text-sm font-semibold hover:from-violet-600 hover:to-violet-700 transition-all duration-200 shadow-lg"
                        onClick={() => window.location.reload()}
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (!profile) {
            return (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-violet-100">
                    <p className="text-gray-600 text-lg">We could not find your profile details.</p>
                </div>
            );
        }

        const fullName = getDisplayValue(`${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim());
        const locationAge =
            profile.location && profile.age
                ? `${profile.location} - ${profile.age} years old`
                : String(getDisplayValue(profile.location || profile.age));

        return (
            <>
                {profile.isProfileComplete === false && (
                    <div className="mb-6 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 text-amber-900 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Star size={18} className="text-amber-600" />
                            <p className="font-semibold text-base">Complete your profile to attract more matches</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="whitespace-nowrap text-sm font-semibold text-amber-700 hover:text-amber-800 underline decoration-amber-400 decoration-2 underline-offset-2 transition-colors"
                        >
                            Update now
                        </button>
                    </div>
                )}

                <div className="relative">
                    <div className="h-80 bg-gradient-to-br from-violet-500 via-violet-400 to-violet-600 relative overflow-hidden rounded-1xl">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-10 right-20 w-72 h-72 bg-white rounded-full mix-blend-screen"></div>
                            <div className="absolute bottom-10 left-20 w-60 h-60 bg-white rounded-full mix-blend-screen"></div>
                        </div>
                    </div>

                    <div className="relative px-4 sm:px-6 pb-6">
                        <div className="-mt-20 flex flex-col sm:flex-row gap-6 items-start sm:items-end mb-6">
                            <div className="relative">
                                {selectedThumbnailUrl ? (
                                    <img
                                        src={selectedThumbnailUrl}
                                        alt="Profile"
                                        className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover"
                                        onError={(event) => {
                                            event.currentTarget.src = PROFILE_FALLBACK_IMAGE;
                                        }}
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white text-3xl font-bold flex items-center justify-center">
                                        {initials}
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowPhotoUpload(true)}
                                    className="absolute bottom-2 right-2 bg-violet-500 hover:bg-violet-600 w-9 h-9 rounded-full border-2 border-white shadow-lg text-white transition-all duration-200 flex items-center justify-center"
                                >
                                    <Camera size={16} />
                                </button>
                            </div>

                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 w-full">
                                {statsCards.map((item) => (
                                    <div key={item.label} className="rounded-xl bg-white/95 border border-violet-100 px-4 py-3 text-center shadow-sm">
                                        <p className="text-2xl font-bold text-gray-900">
                                            {isStatsLoading ? "..." : formatCompactNumber(item.value)}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            {item.label === "Views"
                                                ? "Connections"
                                                : item.label === "Likes"
                                                ? "Likes Sent"
                                                : "Match Count"}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="hidden sm:block px-8 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300"
                            >
                                Edit Profile
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                    {fullName}
                                    <CheckCircle size={24} className="text-violet-500" />
                                </h1>
                                <div className="flex items-center gap-2 text-gray-600 mt-1">
                                    <MapPin size={18} className="text-violet-500" />
                                    <span>{locationAge}</span>
                                </div>
                            </div>

                            <p className="text-gray-700 leading-relaxed max-w-2xl">{getDisplayValue(profile.bio)}</p>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                                    <Award size={16} />
                                    Premium Member
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                    <CheckCircle size={16} />
                                    Verified
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                    <Flame size={16} />
                                    Trending
                                </div>
                            </div>

                            <div className="pt-2">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">About Me</h3>
                                {interestChips.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {interestChips.map((interest) => (
                                            <span
                                                key={interest}
                                                className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-gray-800 text-xs font-medium rounded-full border border-violet-200 hover:border-violet-400 transition-all duration-200 cursor-pointer"
                                            >
                                                {interest}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No interests added yet.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:hidden gap-2 mt-6">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-8 py-2.5 bg-gradient-to-r from-violet-500 to-violet-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-violet-500/50 transition-all duration-300"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                <div className="sticky top-20 z-30 bg-white bg-opacity-95 backdrop-blur-lg border-b border-gray-200">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-8">
                        <button
                            onClick={() => setActiveTab("gallery")}
                            className={`py-4 font-semibold text-sm uppercase tracking-wide border-b-2 transition-all duration-200 flex items-center gap-2 ${
                                activeTab === "gallery"
                                    ? "border-violet-500 text-violet-600"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <Grid3X3 size={18} />
                            Gallery
                        </button>
                        <button
                            onClick={() => setActiveTab("activity")}
                            className={`py-4 font-semibold text-sm uppercase tracking-wide border-b-2 transition-all duration-200 flex items-center gap-2 ${
                                activeTab === "activity"
                                    ? "border-violet-500 text-violet-600"
                                    : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <Users size={18} />
                            Activity
                        </button>
                    </div>
                </div>

                {activeTab === "gallery" && (
                    <div className="px-4 sm:px-6 py-8">
                        {thumbnailError && (
                            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {thumbnailError}
                            </div>
                        )}

                        {profile.images?.length ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {profile.images.map((image, idx) => (
                                    <div
                                        key={image.id}
                                        className="relative group rounded-lg overflow-hidden aspect-square border border-violet-100"
                                        style={{ animation: `fadeIn 0.6s ease-out ${idx * 0.1}s backwards` }}
                                    >
                                        <img
                                            src={image.url}
                                            alt="Profile"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                            onError={(event) => {
                                                event.currentTarget.src = PROFILE_FALLBACK_IMAGE;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-4">
                                                <div className="flex items-center gap-1 text-white font-semibold">
                                                    <Eye size={20} />
                                                    {formatCompactNumber(stats.views)}
                                                </div>
                                                <div className="flex items-center gap-1 text-white font-semibold">
                                                    <Heart size={20} className="fill-current" />
                                                    {formatCompactNumber(stats.likes)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute left-3 right-3 bottom-3">
                                            <button
                                                onClick={() => handleSetThumbnail(image.id)}
                                                disabled={image.isThumbnail || isSettingThumbnail === image.id}
                                                className={`w-full rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                                                    image.isThumbnail
                                                        ? "bg-violet-500 text-white"
                                                        : isSettingThumbnail === image.id
                                                        ? "bg-violet-200 text-violet-700 cursor-wait"
                                                        : "bg-white/90 text-violet-700 hover:bg-white"
                                                }`}
                                            >
                                                {image.isThumbnail
                                                    ? "Current Thumbnail"
                                                    : isSettingThumbnail === image.id
                                                    ? "Setting..."
                                                    : "Set as Thumbnail"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-white p-12 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="rounded-full bg-violet-100 p-4">
                                        <Camera size={32} className="text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 mb-1">No photos yet</p>
                                        <p className="text-sm text-slate-600">Upload photos to start building your gallery.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "activity" && (
                    <div className="px-4 sm:px-6 py-8 max-w-2xl">
                        <div className="space-y-4">
                            {stats.updatedAt && (
                                <p className="text-xs text-slate-500">Last synced: {new Date(stats.updatedAt).toLocaleTimeString()}</p>
                            )}
                            {[
                                { label: "Profile Views", value: stats.views, trend: "+12%", icon: Eye, color: "violet" },
                                { label: "Likes Received", value: stats.likes, trend: "+8%", icon: Heart, color: "red" },
                                { label: "Matches", value: stats.matches, trend: "+5%", icon: Sparkles, color: "emerald" },
                                { label: "Gallery Photos", value: profile.images?.length || 0, trend: "Live", icon: Grid3X3, color: "blue" },
                            ].map((stat, idx) => {
                                const Icon = stat.icon;
                                const colorMap = {
                                    violet: "from-violet-500 to-violet-600",
                                    red: "from-red-500 to-red-600",
                                    emerald: "from-emerald-500 to-emerald-600",
                                    blue: "from-blue-500 to-blue-600",
                                } as const;

                                return (
                                    <div
                                        key={idx}
                                        className="p-4 bg-white rounded-xl border border-gray-200 hover:border-violet-300 transition-colors duration-200"
                                        style={{ animation: `slideIn 0.6s ease-out ${idx * 0.1}s backwards` }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`bg-gradient-to-r ${colorMap[stat.color as keyof typeof colorMap]} rounded-full p-2.5 text-white`}>
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                                                    <p className="text-3xl font-bold mt-1 text-slate-900">
                                                        {isStatsLoading ? "..." : formatCompactNumber(stat.value)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-emerald-600 font-semibold text-lg">{stat.trend}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-gradient-to-br from-white via-violet-50 to-white">
                <style>{`
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: scale(0.9);
                        }
                        to {
                            opacity: 1;
                            transform: scale(1);
                        }
                    }

                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateX(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                `}</style>

                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-300 rounded-full mix-blend-multiply blur-3xl opacity-15 animate-pulse"></div>
                    <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-violet-400 rounded-full mix-blend-multiply blur-3xl opacity-10"></div>
                </div>

                <div className="sticky top-0 z-40 bg-white bg-opacity-95 backdrop-blur-lg border-b border-violet-100 border-opacity-50">
                    <div className="max-w-8xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="text-2xl font-black bg-gradient-to-r from-violet-600 to-violet-500 bg-clip-text text-transparent">
                            Profile
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-violet-100 rounded-full transition-colors duration-200">
                                <Settings size={22} className="text-gray-700" />
                            </button>
                            <button className="p-2 hover:bg-violet-100 rounded-full transition-colors duration-200">
                                <MoreHorizontal size={22} className="text-gray-700" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-8xl mx-auto pb-20">{renderState()}</div>

                {/* Photo Upload Modal */}
                {showPhotoUpload && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-slate-900">Upload Profile Photo</h3>
                                <button
                                    onClick={() => setShowPhotoUpload(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-600" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-violet-300 rounded-xl p-8 text-center hover:border-violet-400 transition-colors cursor-pointer bg-violet-50">
                                    <Upload size={32} className="mx-auto text-violet-500 mb-2" />
                                    <p className="text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
                                    <p className="text-xs text-gray-600 mt-1">PNG, JPG, GIF up to 10MB</p>
                                </div>
                                <button
                                    onClick={() => setShowPhotoUpload(false)}
                                    className="w-full py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <CompleteProfileModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        fetchProfile();
                        fetchStats();
                    }}
                    initialData={profile}
                />
            </div>
        </ProtectedRoute>
    );
}
