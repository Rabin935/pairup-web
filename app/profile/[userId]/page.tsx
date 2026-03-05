"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Heart, MapPin, MessageCircle, X } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type ProfileImage = {
  id: string;
  url: string;
  isThumbnail?: boolean;
  likesCount?: number;
  likedByMe?: boolean;
};

type PublicProfile = {
  id: string;
  uid?: string;
  firstname?: string;
  lastname?: string;
  age?: number;
  location?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
  images: ProfileImage[];
  isOwnProfile?: boolean;
  lastSeen?: string | null;
  stats?: {
    views?: number;
    likes?: number;
    matches?: number;
  };
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&auto=format&fit=crop";

const readErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiErrorShape;
  return apiError.response?.data?.message || apiError.message || fallback;
};

export default function PublicUserProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = Array.isArray(params?.userId) ? params.userId[0] : params?.userId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProfileImage | null>(null);
  const [likingImageId, setLikingImageId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.get(`/api/users/profile/${encodeURIComponent(userId)}`);
      const payload = (data?.data ?? data) as PublicProfile;

      if (payload?.isOwnProfile) {
        router.replace("/profile");
        return;
      }

      setProfile({
        ...payload,
        images: Array.isArray(payload?.images) ? payload.images : [],
      });
    } catch (err: unknown) {
      setError(readErrorMessage(err, "Unable to load user profile."));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [router, userId]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const fullName = useMemo(() => {
    if (!profile) return "PairUp user";
    return `${profile.firstname ?? ""} ${profile.lastname ?? ""}`.trim() || "PairUp user";
  }, [profile]);

  const handleToggleLike = async (image: ProfileImage) => {
    if (!profile || likingImageId) return;

    setLikingImageId(image.id);
    try {
      const { data } = await apiClient.post(
        `/api/users/${encodeURIComponent(profile.id)}/images/${encodeURIComponent(image.id)}/like`
      );

      const liked = Boolean(data?.data?.liked);
      const likesCount = Number(data?.data?.likesCount ?? image.likesCount ?? 0);

      setProfile((current) => {
        if (!current) return current;
        const nextImages = current.images.map((entry) =>
          entry.id === image.id ? { ...entry, likedByMe: liked, likesCount } : entry
        );
        return { ...current, images: nextImages };
      });

      setSelectedImage((current) =>
        current?.id === image.id ? { ...current, likedByMe: liked, likesCount } : current
      );
    } catch (err) {
      setError(readErrorMessage(err, "Unable to update post like."));
    } finally {
      setLikingImageId(null);
    }
  };

  const handleReportUser = async () => {
    if (!profile) return;
    const reason = window.prompt("Report reason");
    if (!reason || !reason.trim()) return;

    setReporting(true);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/api/users/report/${encodeURIComponent(profile.id)}`, {
        reason: reason.trim(),
      });
      setNotice("Report submitted successfully.");
    } catch (err) {
      setError(readErrorMessage(err, "Unable to report user."));
    } finally {
      setReporting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!profile) return;
    const confirmed = window.confirm("Block this user?");
    if (!confirmed) return;

    setBlocking(true);
    setError(null);
    setNotice(null);
    try {
      await apiClient.post(`/api/users/block/${encodeURIComponent(profile.id)}`);
      setNotice("User blocked.");
      router.push("/sidebar/search");
    } catch (err) {
      setError(readErrorMessage(err, "Unable to block user."));
    } finally {
      setBlocking(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {notice}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-64 rounded-3xl bg-slate-100 animate-pulse dark:bg-slate-900" />
              <div className="h-48 rounded-3xl bg-slate-100 animate-pulse dark:bg-slate-900" />
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Profile not found.
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <img
                    src={profile.profileImage || profile.images[0]?.url || FALLBACK_IMAGE}
                    alt={fullName}
                    className="w-24 h-24 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                      {fullName}
                      {profile.age ? <span className="text-slate-500 dark:text-slate-400 text-2xl">, {profile.age}</span> : null}
                    </h1>
                    <p className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin size={16} className="text-violet-500" />
                      {profile.location || "Nearby"}
                    </p>
                    {profile.bio ? <p className="mt-3 text-slate-700 dark:text-slate-200">{profile.bio}</p> : null}
                    {profile.interests?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.interests.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-200"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: "Views", value: profile.stats?.views ?? 0 },
                    { label: "Likes", value: profile.stats?.likes ?? 0 },
                    { label: "Matches", value: profile.stats?.matches ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={blocking}
                    onClick={() => void handleBlockUser()}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {blocking ? "Blocking..." : "Block User"}
                  </button>
                  <button
                    type="button"
                    disabled={reporting}
                    onClick={() => void handleReportUser()}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {reporting ? "Reporting..." : "Report User"}
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Gallery</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profile.images.length} posts</p>
                </div>
                {profile.images.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {profile.images.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelectedImage(image)}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square dark:border-slate-700 dark:bg-slate-900"
                      >
                        <img
                          src={image.url}
                          alt={fullName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(event) => {
                            event.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white">
                          {image.likesCount ?? 0} likes
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    No posts available yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedImage && profile && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={18} />
              </button>

              <img
                src={selectedImage.url}
                alt={fullName}
                className="w-full max-h-[75vh] object-contain bg-black"
                onError={(event) => {
                  event.currentTarget.src = FALLBACK_IMAGE;
                }}
              />

              <div className="p-4 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <MessageCircle size={16} />
                  View-only profile
                </div>
                <button
                  type="button"
                  onClick={() => void handleToggleLike(selectedImage)}
                  disabled={likingImageId === selectedImage.id}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    selectedImage.likedByMe
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Heart size={16} className={selectedImage.likedByMe ? "fill-current" : ""} />
                  {selectedImage.likedByMe ? "Liked" : "Like Post"} ({selectedImage.likesCount ?? 0})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
