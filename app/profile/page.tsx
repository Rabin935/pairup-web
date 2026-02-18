"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";

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
};

const getDisplayValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "string" && value.trim() === "") return "N/A";
    return value;
};

const normalizeUserPayload = (payload: any): UserProfile | null => {
    if (!payload) return null;
    return (payload?.user || payload?.data?.user || payload?.data || payload) as UserProfile;
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data } = await apiClient.get("api/users/me");
                const normalized = normalizeUserPayload(data);
                setProfile(normalized);
            } catch (err: any) {
                const message = err?.response?.data?.message || err?.message || "Failed to load profile";
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

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

    const infoFields = [
        { label: "Firstname", value: profile?.firstname },
        { label: "Lastname", value: profile?.lastname },
        { label: "Email", value: profile?.email },
        { label: "Phone", value: profile?.phone },
        { label: "Gender", value: profile?.gender },
        { label: "Age", value: profile?.age },
        { label: "Location", value: profile?.location },
    ];

    const renderState = () => {
        if (isLoading) {
            return (
                <div className="space-y-6 animate-pulse">
                    <div className="h-8 w-48 bg-white/60 rounded"></div>
                    <div className="h-[180px] bg-white/60 rounded-3xl"></div>
                    <div className="h-[320px] bg-white/60 rounded-3xl"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-700">
                    <p className="font-semibold">{error}</p>
                    <button
                        className="mt-4 inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-2 text-white text-sm font-semibold hover:bg-rose-700 transition"
                        onClick={() => window.location.reload()}
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (!profile) {
            return (
                <div className="bg-white/80 rounded-3xl p-6 text-center text-gray-600">
                    We couldn&apos;t find your profile details.
                </div>
            );
        }

        return (
            <>
                {profile.isProfileComplete === false && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold">Complete your details to continue</p>
                        <button
                            onClick={() => router.push("/user/profile")}
                            className="text-sm font-semibold underline decoration-amber-400 decoration-2"
                        >
                            Update now
                        </button>
                    </div>
                )}

                <section className="bg-white rounded-3xl shadow-xl shadow-rose-100/60 p-8 mb-8 flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3 flex flex-col items-center text-center">
                        {profile.profileImage ? (
                            <img
                                src={profile.profileImage}
                                alt="Profile"
                                className="h-40 w-40 rounded-3xl object-cover shadow-lg"
                            />
                        ) : (
                            <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-rose-500 to-violet-500 text-white flex items-center justify-center text-4xl font-bold shadow-lg">
                                {initials}
                            </div>
                        )}
                        <div className="mt-5">
                            <p className="text-2xl font-semibold text-slate-900">
                                {getDisplayValue(`${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim())}
                            </p>
                            <p className="text-sm text-slate-500">{getDisplayValue(profile.email)}</p>
                        </div>
                        <button
                            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-3 text-white font-semibold shadow-lg shadow-rose-200 hover:opacity-95 transition"
                            onClick={() => router.push("/user/profile")}
                        >
                            Complete Profile
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {infoFields.map((field) => (
                            <div key={field.label} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                                <p className="text-xs uppercase tracking-wide text-slate-500">{field.label}</p>
                                <p className="mt-2 text-lg font-semibold text-slate-900">{getDisplayValue(field.value)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-3xl shadow-xl shadow-rose-100/60 p-8 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Bio</h2>
                        <p className="mt-3 text-slate-600 leading-relaxed">
                            {getDisplayValue(profile.bio)}
                        </p>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Interests</h2>
                        {interestChips.length ? (
                            <div className="mt-3 flex flex-wrap gap-3">
                                {interestChips.map((interest) => (
                                    <span
                                        key={interest}
                                        className="inline-flex items-center rounded-full bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600 border border-rose-100"
                                    >
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-3 text-slate-500">N/A</p>
                        )}
                    </div>
                </section>
            </>
        );
    };

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-slate-50">
                <div className="mx-auto max-w-5xl px-4 pb-16 pt-24">
                    <div className="mb-8">
                        <p className="text-sm uppercase tracking-[0.3em] text-rose-400">Profile</p>
                        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Your PairUp identity</h1>
                        <p className="mt-3 text-slate-500 max-w-2xl">
                            Keep your details polished so potential matches get to know the real you.
                        </p>
                    </div>
                    {renderState()}
                </div>
            </div>
        </ProtectedRoute>
    );
}
