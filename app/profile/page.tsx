"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";
import CompleteProfileModal from "./_components/CompleteProfileModal";
import { Edit3, Camera, Star, Heart, Grid3X3, TrendingUp, Eye, Sparkles, Upload, X, RefreshCw } from "lucide-react";

type UserImage = {
    id: string;
    url: string;
    isThumbnail?: boolean;
};

type UserProfile = {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    gender?: string;
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

const getDisplayValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string" && value.trim() === "") return "N/A";
    return value;
};

const normalizeUserPayload = (payload: unknown): UserProfile | null => {
    if (!payload || typeof payload !== "object") return null;
    const source = payload as Record<string, unknown>;
    const nestedData = source.data as Record<string, unknown> | undefined;
    return (source.user ||
        nestedData?.user ||
        nestedData ||
        source) as UserProfile;
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
            await apiClient.patch(`api/users/set-thumbnail/${imageId}`);
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
                    <div className="h-96 bg-gradient-to-r from-violet-200 to-violet-100 rounded-3xl"></div>
                    <div className="h-96 bg-gradient-to-r from-violet-100 to-violet-50 rounded-3xl"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-2xl p-8 text-red-700 shadow-md">
                    <div className="flex items-start gap-4">
                        <div className="text-2xl">⚠️</div>
                        <div className="flex-1">
                            <p className="font-semibold text-lg">{error}</p>
                            <p className="text-sm text-red-600 mt-1">Please try again or contact support</p>
                        </div>
                    </div>
                    <button
                        className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-8 py-3 text-white text-sm font-semibold hover:from-violet-600 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                    <p className="text-gray-600 text-lg">We couldn&apos;t find your profile details.</p>
                </div>
            );
        }

        return (
            <>
                {profile.isProfileComplete === false && (
                    <div className="mb-6 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 text-amber-900 flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⭐</span>
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

                {/* Cover Section */}
                <div className="relative h-80 bg-gradient-to-br from-violet-500 via-violet-400 to-violet-600 rounded-3xl overflow-hidden mb-8 shadow-xl">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-20 w-72 h-72 bg-white rounded-full mix-blend-screen"></div>
                        <div className="absolute bottom-10 left-20 w-60 h-60 bg-white rounded-full mix-blend-screen"></div>
                    </div>
                </div>

                {/* Profile Header - Profile Info Card */}
                <div className="relative -mt-32 mb-8 px-4 sm:px-0">
                    <div className="bg-white rounded-3xl shadow-2xl border border-violet-100 p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Left - Profile Picture & Basic Info */}
                            <div className="md:col-span-1 flex flex-col items-center">
                                <div className="relative mb-6">
                                    {profile.profileImage ? (
                                        <div className="relative group">
                                            <img
                                                src={profile.profileImage}
                                                alt="Profile"
                                                className="h-48 w-48 rounded-2xl object-cover shadow-xl border-4 border-white"
                                            />
                                            <button
                                                onClick={() => setShowPhotoUpload(true)}
                                                className="absolute bottom-2 right-2 bg-violet-500 hover:bg-violet-600 rounded-full p-2.5 shadow-lg text-white transition-all duration-200 transform hover:scale-110"
                                            >
                                                <Camera size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative group">
                                            <div className="h-48 w-48 rounded-2xl bg-gradient-to-br from-violet-400 via-violet-500 to-violet-600 text-white flex items-center justify-center text-5xl font-bold shadow-xl border-4 border-white">
                                                {initials}
                                            </div>
                                            <button
                                                onClick={() => setShowPhotoUpload(true)}
                                                className="absolute bottom-2 right-2 bg-white hover:bg-violet-50 rounded-full p-2.5 shadow-lg text-violet-500 transition-all duration-200 transform hover:scale-110"
                                            >
                                                <Camera size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full text-center">
                                    <h1 className="text-3xl font-bold text-slate-900">
                                        {getDisplayValue(`${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim())}
                                    </h1>
                                    <p className="text-violet-600 font-semibold mt-1">
                                        {profile.age && profile.location ? `${profile.age} • ${profile.location}` : getDisplayValue(profile.location || profile.age)}
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-600">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                        <span>Online</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="w-full grid grid-cols-3 gap-3 mt-6">
                                    {statsCards.map((item) => (
                                        <div
                                            key={item.label}
                                            className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-3 text-center border border-violet-200"
                                        >
                                            <p className="text-xs text-gray-600 font-medium">{item.label}</p>
                                            <p className="text-lg font-bold text-gray-900 mt-1">
                                                {isStatsLoading ? "..." : formatCompactNumber(item.value)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <RefreshCw size={12} className={isStatsLoading ? "animate-spin" : ""} />
                                    <span>Live from database</span>
                                </div>

                                <button
                                    className="w-full mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl hover:from-violet-600 hover:to-violet-700 transition-all duration-200 transform hover:scale-105"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <Edit3 size={18} />
                                    Edit Profile
                                </button>
                            </div>

                            {/* Right - Bio & Interests */}
                            <div className="md:col-span-2">
                                {/* Bio */}
                                <div className="mb-6">
                                    <h3 className="text-xs uppercase tracking-widest text-violet-600 font-semibold mb-3">About Me</h3>
                                    <p className="text-slate-700 leading-relaxed text-base">
                                        {getDisplayValue(profile.bio)}
                                    </p>
                                </div>

                                {/* Interests */}
                                <div className="mb-8">
                                    <h3 className="text-xs uppercase tracking-widest text-violet-600 font-semibold mb-3">Interests & Hobbies</h3>
                                    {interestChips.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {interestChips.map((interest) => (
                                                <span
                                                    key={interest}
                                                    className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-100 to-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 border border-violet-200 hover:shadow-md transition-all duration-200"
                                                >
                                                    <Heart size={12} className="mr-1.5 text-violet-500" />
                                                    {interest}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">No interests added yet</p>
                                    )}
                                </div>

                                {/* Profile Info Grid */}
                                <div>
                                    <h3 className="text-xs uppercase tracking-widest text-violet-600 font-semibold mb-3">Profile Information</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl bg-white border border-violet-100 p-3 hover:bg-violet-50 transition-all duration-200">
                                            <p className="text-xs text-gray-600 font-medium">Email</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-1">{getDisplayValue(profile.email)}</p>
                                        </div>
                                        <div className="rounded-xl bg-white border border-violet-100 p-3 hover:bg-violet-50 transition-all duration-200">
                                            <p className="text-xs text-gray-600 font-medium">Phone</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-1">{getDisplayValue(profile.phone)}</p>
                                        </div>
                                        <div className="rounded-xl bg-white border border-violet-100 p-3 hover:bg-violet-50 transition-all duration-200">
                                            <p className="text-xs text-gray-600 font-medium">Gender</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-1">{getDisplayValue(profile.gender)}</p>
                                        </div>
                                        <div className="rounded-xl bg-white border border-violet-100 p-3 hover:bg-violet-50 transition-all duration-200">
                                            <p className="text-xs text-gray-600 font-medium">Location</p>
                                            <p className="text-sm font-semibold text-slate-900 mt-1">{getDisplayValue(profile.location)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="sticky top-20 z-30 bg-white bg-opacity-95 backdrop-blur-lg border-b border-gray-200 rounded-t-3xl mb-8">
                    <div className="max-w-6xl mx-auto px-4 sm:px-0 flex gap-8">
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
                            <TrendingUp size={18} />
                            Activity
                        </button>
                    </div>
                </div>

                {/* Gallery Section */}
                {activeTab === "gallery" && (
                    <div className="bg-white rounded-3xl shadow-xl border border-violet-100 p-8">
                        <div className="flex flex-col gap-6">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Photos</h2>
                                <p className="text-slate-600">Make your first impression count by setting an eye-catching thumbnail.</p>
                            </div>

                            {thumbnailError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 flex items-start gap-3">
                                    <span className="text-lg mt-0.5">❌</span>
                                    <span>{thumbnailError}</span>
                                </div>
                            )}

                            {profile.images?.length ? (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {profile.images.map((image, index) => (
                                        <div
                                            key={image.id}
                                            className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                                                image.isThumbnail
                                                    ? "border-violet-500 shadow-xl shadow-violet-200/50 scale-105"
                                                    : "border-violet-100 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/30"
                                            } bg-white`}
                                            style={{
                                                animationDelay: `${index * 100}ms`,
                                            }}
                                        >
                                            {image.isThumbnail && (
                                                <div className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg flex items-center gap-1.5 z-10">
                                                    <Star size={12} className="fill-white" />
                                                    Thumbnail
                                                </div>
                                            )}

                                            <div className="relative h-64 overflow-hidden bg-gradient-to-br from-violet-100 to-violet-50">
                                                <img
                                                    src={image.url}
                                                    alt="Profile"
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                                {!image.isThumbnail && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                )}
                                            </div>

                                            <div className="p-5">
                                                <button
                                                    onClick={() => handleSetThumbnail(image.id)}
                                                    disabled={image.isThumbnail || isSettingThumbnail === image.id}
                                                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                                                        image.isThumbnail
                                                            ? "bg-violet-100 text-violet-700 cursor-default"
                                                            : isSettingThumbnail === image.id
                                                            ? "bg-violet-200 text-violet-700 cursor-wait"
                                                            : "bg-gradient-to-r from-violet-100 to-violet-50 text-violet-700 hover:from-violet-200 hover:to-violet-100 border border-violet-200 hover:border-violet-300 hover:shadow-md"
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
                                            <p className="text-sm text-slate-600">Upload photos from the Create tab to start building your gallery</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Activity Section */}
                {activeTab === "activity" && (
                    <div className="bg-white rounded-3xl shadow-xl border border-violet-100 p-8">
                        <div className="max-w-2xl mx-auto space-y-4">
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Activity</h2>
                                <p className="text-slate-600">Track your profile engagement and interactions in near real-time.</p>
                                {stats.updatedAt && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        Last synced: {new Date(stats.updatedAt).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>

                            {[
                                { label: "Profile Views", value: stats.views, icon: Eye, color: "violet" },
                                { label: "Likes Received", value: stats.likes, icon: Heart, color: "red" },
                                {
                                    label: "Total Matches",
                                    value: stats.matches,
                                    icon: Sparkles,
                                    color: "emerald",
                                },
                                {
                                    label: "Gallery Photos",
                                    value: profile.images?.length || 0,
                                    icon: Grid3X3,
                                    color: "blue",
                                },
                            ].map((stat, idx) => {
                                const Icon = stat.icon;
                                const colorClasses = {
                                    violet: "from-violet-500 to-violet-600",
                                    red: "from-red-500 to-red-600",
                                    blue: "from-blue-500 to-blue-600",
                                    emerald: "from-emerald-500 to-emerald-600",
                                };
                                return (
                                    <div
                                        key={idx}
                                        className="p-6 bg-gradient-to-r from-white to-violet-50 rounded-xl border border-violet-100 hover:border-violet-300 transition-all duration-200 hover:shadow-lg"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`bg-gradient-to-r ${colorClasses[stat.color as keyof typeof colorClasses]} rounded-full p-3 text-white`}>
                                                    <Icon size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                                                    <p className="text-3xl font-bold text-slate-900 mt-1">
                                                        {isStatsLoading ? "..." : formatCompactNumber(stat.value)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                Live
                                            </span>
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
            <div className="min-h-screen bg-gradient-to-b from-white via-violet-50/30 to-white">
                <div className="mx-auto max-w-6xl px-4 pb-20 pt-8">
                    {/* Header Section */}
                    <div className="mb-12 mt-12">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-gradient-to-br from-violet-400 to-violet-600 p-3 text-white">
                                <Heart size={24} />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-violet-600 font-semibold">Your Account</p>
                                <h1 className="mt-2 text-4xl md:text-5xl font-bold text-slate-900">Your PairUp Profile</h1>
                                <p className="mt-3 text-slate-600 max-w-2xl text-base leading-relaxed">
                                    Stand out from the crowd. Keep your profile polished and up-to-date so potential matches see the best version of you.
                                </p>
                            </div>
                        </div>
                    </div>

                    {renderState()}
                </div>

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
