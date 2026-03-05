"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { getAuthData } from "@/lib/auth-utils";
import apiClient from "@/lib/api";

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type NotificationType = "like" | "invite" | "postLike";

type NotificationItem = {
  id: string;
  type: NotificationType;
  fromUserId: string;
  name: string;
  image?: string;
  createdAt?: string;
  imageId?: string;
  status?: string;
  message?: string;
  isRead: boolean;
  readAt?: string | null;
};
type NotificationAction = "accept" | "decline";

const NAV_LINKS = [
  { label: "Discover", href: "/sidebar/discover", icon: Compass },
  { label: "Search", href: "/sidebar/search", icon: Search },
  { label: "Create", href: "/sidebar/create", icon: Plus },
  { label: "Message", href: "/sidebar/message", icon: MessageCircle },
];

const NOTIFICATIONS_ENDPOINT = process.env.NEXT_PUBLIC_NOTIFICATIONS_ENDPOINT;
const NOTIFICATIONS_MARK_READ_ENDPOINT =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_MARK_READ_ENDPOINT;
const LIKE_REQUESTS_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_REQUESTS_ENDPOINT ?? "/api/likes/pending";
const INVITE_REQUESTS_ENDPOINT = process.env.NEXT_PUBLIC_INVITE_REQUESTS_ENDPOINT ?? "/api/invites/pending";
const POST_LIKE_NOTIFICATIONS_ENDPOINT =
  process.env.NEXT_PUBLIC_POST_LIKE_NOTIFICATIONS_ENDPOINT ?? "/api/users/me/post-like-notifications";
const LIKE_RESPOND_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_RESPOND_ENDPOINT ?? "/api/likes";
const INVITE_RESPOND_ENDPOINT = process.env.NEXT_PUBLIC_INVITE_RESPOND_ENDPOINT ?? "/api/invites";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

const formatNotificationTime = (value?: string) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
};

const toNotificationKey = (item: NotificationItem) => `${item.type}:${item.id}`;
const READ_STORAGE_PREFIX = "pairup:notifications:read";

const getNotificationStorageUserId = () => {
  const authData = getAuthData();
  return (
    authData?.userInfo?._id ||
    authData?.userInfo?.id ||
    authData?.userInfo?.userId ||
    authData?.userInfo?.uid ||
    authData?.userInfo?.email ||
    "anonymous"
  );
};

const getReadStorageKey = () => `${READ_STORAGE_PREFIX}:${getNotificationStorageUserId()}`;

const readStoredReadMap = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getReadStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const normalized: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        normalized[key] = value;
      }
    });
    return normalized;
  } catch {
    return {};
  }
};

const persistReadKeys = (keys: string[], readAt: string) => {
  if (typeof window === "undefined" || keys.length === 0) return;
  const existing = readStoredReadMap();
  const next = { ...existing };
  keys.forEach((key) => {
    next[key] = next[key] || readAt;
  });
  localStorage.setItem(getReadStorageKey(), JSON.stringify(next));
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthData()));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, NotificationAction | null>>({});
  const [supportsNotificationsApi, setSupportsNotificationsApi] = useState(
    () => Boolean(NOTIFICATIONS_ENDPOINT)
  );
  const wasNotificationsOpenRef = useRef(false);

  const loadLegacyNotifications = useCallback(async (): Promise<NotificationItem[]> => {
    const [likesResult, invitesResult, postLikesResult] = await Promise.allSettled([
      apiClient.get(LIKE_REQUESTS_ENDPOINT),
      apiClient.get(INVITE_REQUESTS_ENDPOINT),
      apiClient.get(POST_LIKE_NOTIFICATIONS_ENDPOINT),
    ]);

    const likesResponse = likesResult.status === "fulfilled" ? likesResult.value : null;
    const invitesResponse = invitesResult.status === "fulfilled" ? invitesResult.value : null;
    const postLikesResponse = postLikesResult.status === "fulfilled" ? postLikesResult.value : null;

    const likesPayload = likesResponse && isRecord(likesResponse.data) ? likesResponse.data : {};
    const likesNested = isRecord(likesPayload.data) ? likesPayload.data : {};
    const likesSource = Array.isArray(likesPayload.likes)
      ? likesPayload.likes
      : Array.isArray(likesNested.likes)
      ? likesNested.likes
      : [];

    const invitesPayload = invitesResponse && isRecord(invitesResponse.data) ? invitesResponse.data : {};
    const invitesNested = isRecord(invitesPayload.data) ? invitesPayload.data : {};
    const invitesSource = Array.isArray(invitesPayload.invitations)
      ? invitesPayload.invitations
      : Array.isArray(invitesNested.invitations)
      ? invitesNested.invitations
      : [];

    const postLikesPayload =
      postLikesResponse && isRecord(postLikesResponse.data) ? postLikesResponse.data : {};
    const postLikesNested = isRecord(postLikesPayload.data) ? postLikesPayload.data : {};
    const postLikesSource = Array.isArray(postLikesPayload.notifications)
      ? postLikesPayload.notifications
      : Array.isArray(postLikesNested.notifications)
      ? postLikesNested.notifications
      : [];

    const likeNotifications: NotificationItem[] = likesSource
      .map((entry): NotificationItem | null => {
        if (!isRecord(entry)) return null;
        const senderId = readString(entry.senderId);
        const likeId = readString(entry.likeId) ?? senderId;
        if (!senderId || !likeId) return null;
        return {
          id: likeId,
          type: "like",
          fromUserId: senderId,
          name: readString(entry.name) ?? "PairUp user",
          image: readString(entry.image) ?? readString(entry.profileImage),
          createdAt: readString(entry.createdAt),
          status: readString(entry.status) ?? "pending",
          message: "liked your profile",
          isRead: false,
          readAt: null,
        };
      })
      .filter((item): item is NotificationItem => Boolean(item));

    const inviteNotifications: NotificationItem[] = invitesSource
      .map((entry): NotificationItem | null => {
        if (!isRecord(entry)) return null;
        const inviteId = readString(entry.invitationId);
        const fromUserId = readString(entry.fromUserId);
        const preview = isRecord(entry.preview) ? entry.preview : {};
        if (!inviteId || !fromUserId) return null;
        return {
          id: inviteId,
          type: "invite",
          fromUserId,
          name: readString(preview.name) ?? "PairUp user",
          image: readString(preview.avatar) ?? readString(entry.avatar),
          createdAt: readString(entry.createdAt),
          status: readString(entry.status) ?? "pending",
          message: "sent you a match request",
          isRead: false,
          readAt: null,
        };
      })
      .filter((item): item is NotificationItem => Boolean(item));

    const postLikeNotifications: NotificationItem[] = postLikesSource
      .map((entry): NotificationItem | null => {
        if (!isRecord(entry)) return null;
        const id = readString(entry.id);
        const fromUserId = readString(entry.fromUserId);
        if (!id || !fromUserId) return null;
        return {
          id,
          type: "postLike",
          fromUserId,
          imageId: readString(entry.imageId),
          name: readString(entry.name) ?? "PairUp user",
          image: readString(entry.image),
          createdAt: readString(entry.createdAt),
          status: "received",
          message: readString(entry.message) ?? "liked your post",
          isRead: false,
          readAt: null,
        };
      })
      .filter((item): item is NotificationItem => Boolean(item));

    return [...likeNotifications, ...inviteNotifications, ...postLikeNotifications].sort((a, b) => {
      const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return right - left;
    });
  }, []);

  const loadNotifications = useCallback(async (): Promise<NotificationItem[]> => {
    if (!isAuthenticated) {
      setNotifications([]);
      setNotificationsError(null);
      return [];
    }

    setIsNotificationsLoading(true);
    setNotificationsError(null);

    try {
      let mapped: NotificationItem[] = [];
      if (supportsNotificationsApi && NOTIFICATIONS_ENDPOINT) {
        try {
          const response = await apiClient.get(NOTIFICATIONS_ENDPOINT);
          const payload = isRecord(response.data) ? response.data : {};
          const nested = isRecord(payload.data) ? payload.data : {};
          const source = Array.isArray(payload.notifications)
            ? payload.notifications
            : Array.isArray(nested.notifications)
            ? nested.notifications
            : [];

          mapped = source
            .map((entry): NotificationItem | null => {
              if (!isRecord(entry)) return null;
              const rawType = readString(entry.type);
              if (rawType !== "like" && rawType !== "invite" && rawType !== "postLike") {
                return null;
              }
              const type: NotificationType = rawType;
              const id = readString(entry.id);
              const fromUserId = readString(entry.fromUserId);
              if (!type || !id || !fromUserId) return null;

              return {
                id,
                type,
                fromUserId,
                name: readString(entry.name) ?? "PairUp user",
                image: readString(entry.image),
                createdAt: readString(entry.createdAt),
                imageId: readString(entry.imageId),
                status: readString(entry.status),
                message: readString(entry.message),
                isRead: Boolean(entry.isRead),
                readAt: readString(entry.readAt) ?? null,
              };
            })
            .filter((item): item is NotificationItem => Boolean(item));
        } catch (apiErr: unknown) {
          const typedError = apiErr as ApiErrorShape;
          if (typedError.response?.status === 404) {
            setSupportsNotificationsApi(false);
            mapped = await loadLegacyNotifications();
          } else {
            throw apiErr;
          }
        }
      } else {
        mapped = await loadLegacyNotifications();
      }

      const readMap = readStoredReadMap();
      const mergedWithLocalRead = mapped.map((item) => {
        if (item.isRead) return item;
        const key = toNotificationKey(item);
        if (readMap[key]) {
          return { ...item, isRead: true, readAt: readMap[key] };
        }
        return item;
      });

      setNotifications(mergedWithLocalRead);
      return mergedWithLocalRead;
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setNotificationsError(
        apiError.response?.data?.message || apiError.message || "Unable to load notifications."
      );
      return [];
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [isAuthenticated, loadLegacyNotifications, supportsNotificationsApi]);

  const markNotificationsAsRead = useCallback(
    async (items: NotificationItem[]) => {
      const unreadItems = items.filter((item) => !item.isRead);
      if (!isAuthenticated || unreadItems.length === 0) return;

      const now = new Date().toISOString();
      const unreadKeys = unreadItems.map((item) => toNotificationKey(item));
      persistReadKeys(unreadKeys, now);
      setNotifications((prev) =>
        prev.map((item) =>
          unreadKeys.includes(toNotificationKey(item))
            ? { ...item, isRead: true, readAt: item.readAt ?? now }
            : item
        )
      );

      if (!supportsNotificationsApi || !NOTIFICATIONS_MARK_READ_ENDPOINT) return;

      try {
        await apiClient.patch(NOTIFICATIONS_MARK_READ_ENDPOINT, {
          items: unreadItems.map((item) => ({ id: item.id, type: item.type })),
        });
      } catch (err: unknown) {
        const apiError = err as ApiErrorShape;
        setNotificationsError(
          apiError.response?.data?.message || apiError.message || "Unable to mark notifications as read."
        );
      }
    },
    [isAuthenticated, supportsNotificationsApi]
  );

  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(Boolean(getAuthData()));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    void (async () => {
      await loadNotifications();
    })();

    const intervalId = window.setInterval(() => {
      void (async () => {
        await loadNotifications();
      })();
    }, 15000);

    const onFocus = () => {
      void (async () => {
        await loadNotifications();
      })();
    };

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, loadNotifications]);

  useEffect(() => {
    if (isNotificationsOpen) {
      (async () => {
        await loadNotifications();
      })();
    }
  }, [isNotificationsOpen, loadNotifications]);

  useEffect(() => {
    if (wasNotificationsOpenRef.current && !isNotificationsOpen) {
      void markNotificationsAsRead(notifications);
    }
    wasNotificationsOpenRef.current = isNotificationsOpen;
  }, [isNotificationsOpen, markNotificationsAsRead, notifications]);

  const notificationCount = useMemo(
    () => notifications.reduce((total, item) => total + (item.isRead ? 0 : 1), 0),
    [notifications]
  );

  const handleNotificationAction = async (
    item: NotificationItem,
    action: NotificationAction
  ) => {
    if (item.type === "postLike") {
      await markNotificationsAsRead([item]);
      setIsNotificationsOpen(false);
      router.push(`/profile/${encodeURIComponent(item.fromUserId)}`);
      return;
    }

    const notificationKey = toNotificationKey(item);
    setActionState((prev) => ({ ...prev, [notificationKey]: action }));
    setNotificationsError(null);

    try {
      if (item.type === "like") {
        await apiClient.post(`${LIKE_RESPOND_ENDPOINT}/${item.fromUserId}/${action}`);
      } else {
        const inviteAction = action === "decline" ? "reject" : "accept";
        await apiClient.post(`${INVITE_RESPOND_ENDPOINT}/${item.id}/${inviteAction}`);
      }

      await markNotificationsAsRead([item]);

      setNotifications((prev) => {
        const nextStatus =
          item.type === "invite"
            ? action === "accept"
              ? "accepted"
              : "rejected"
            : action === "accept"
            ? "accepted"
            : "declined";
        return prev.map((existing) =>
          toNotificationKey(existing) === notificationKey
            ? {
                ...existing,
                status: nextStatus,
                isRead: true,
                readAt: existing.readAt ?? new Date().toISOString(),
              }
            : existing
        );
      });
    } catch (err: unknown) {
      const apiError = err as ApiErrorShape;
      setNotificationsError(
        apiError.response?.data?.message || apiError.message || "Unable to update request."
      );
    } finally {
      setActionState((prev) => ({ ...prev, [notificationKey]: null }));
    }
  };

  const hasUnreadNotifications = useMemo(() => notificationCount > 0, [notificationCount]);

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-violet-500 text-white transition-colors hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-500"
      >
        {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
      </button>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 h-screen flex flex-col bg-gradient-to-b from-violet-600 via-violet-500 to-violet-700 text-white shadow-2xl transition-all duration-300 ease-out z-40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 ${
          isSidebarOpen ? "w-72 md:w-64" : "w-0 md:w-20"
        } overflow-hidden`}
      >
        <div className="px-6 py-8 border-b border-violet-400/30 flex-shrink-0 dark:border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 backdrop-blur-md p-2.5 hover:bg-white/30 transition-all duration-200 transform hover:scale-110 flex-shrink-0">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <p className="text-xs uppercase tracking-[0.3em] text-violet-100 font-light">PairUp</p>
                <p className="text-lg font-bold bg-gradient-to-r from-white to-violet-100 bg-clip-text text-transparent">
                  Connect
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                title={isSidebarOpen ? "" : link.label}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                  isActive
                    ? "bg-white text-violet-600 shadow-lg shadow-white/20 scale-105 dark:bg-slate-900 dark:text-white dark:shadow-black/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1 dark:text-slate-200"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-pulse" />
                )}

                <Icon
                  className={`w-5 h-5 transition-all duration-200 flex-shrink-0 relative z-10 ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                />

                {isSidebarOpen && <span className="relative z-10">{link.label}</span>}

                {!isActive && isSidebarOpen && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            title={isSidebarOpen ? "" : "Notifications"}
            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
              isNotificationsOpen
                ? "bg-white text-violet-600 shadow-lg shadow-white/20 scale-105 dark:bg-slate-900 dark:text-white dark:shadow-black/30"
                : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1 dark:text-slate-200"
            } ${!isSidebarOpen ? "justify-center" : ""}`}
          >
            <Bell className="w-5 h-5 transition-all duration-200 flex-shrink-0 relative z-10 group-hover:scale-110" />
            {isSidebarOpen && <span className="relative z-10">Notifications</span>}
            {hasUnreadNotifications && (
              <span
                className={`rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none px-1.5 py-1 ${
                  isSidebarOpen ? "ml-auto" : "absolute -top-0.5 right-3"
                }`}
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {(() => {
            const isProfileActive = pathname === "/profile" || pathname.startsWith("/profile/");
            return (
              <Link
                href="/profile"
                title={isSidebarOpen ? "" : "Profile"}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                  isProfileActive
                    ? "bg-white text-violet-600 shadow-lg shadow-white/20 scale-105 dark:bg-slate-900 dark:text-white dark:shadow-black/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1 dark:text-slate-200"
                }`}
              >
                {isProfileActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-pulse" />
                )}
                <User
                  className={`w-5 h-5 transition-all duration-200 flex-shrink-0 relative z-10 ${
                    isProfileActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
                {isSidebarOpen && <span className="relative z-10">Profile</span>}
              </Link>
            );
          })()}
        </nav>

        <div className="px-3 py-4 border-t border-violet-400/30 flex flex-col gap-2 flex-shrink-0 dark:border-slate-700/40">
          {isSidebarOpen && (
            <Link
              href="/settings"
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 group text-sm font-semibold"
            >
              <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Settings</span>
            </Link>
          )}

          {!isAuthenticated ? (
            isSidebarOpen && (
              <div className="space-y-2 pt-2">
                <Link
                  href="/login"
                  className="block rounded-xl border border-white/30 px-4 py-2.5 text-center text-sm font-semibold hover:bg-white/20 hover:border-white/50 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-violet-600 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Sign up
                </Link>
              </div>
            )
          ) : isSidebarOpen ? (
            <div className="rounded-xl bg-white/10 backdrop-blur-md px-4 py-3.5 text-sm text-white/90 border border-white/20 space-y-2.5">
              <div>
                <p className="font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Logged in
                </p>
                <p className="text-xs text-white/70 mt-1">Manage your profile</p>
              </div>
              <Link
                href="/profile"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
              >
                <User className="w-3 h-3" />
                Open profile
              </Link>
            </div>
          ) : (
            <button
              title="Logged in"
              className="w-full flex items-center justify-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
            >
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </button>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex items-center justify-center w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 text-white text-xs font-medium gap-2 mt-2 border border-white/20"
          >
            {isSidebarOpen ? (
              <>
                <ChevronLeft size={16} />
                <span>Collapse</span>
              </>
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>
      </aside>

      {isNotificationsOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsNotificationsOpen(false)}
          />

          <aside className="fixed right-0 top-0 z-[60] h-screen w-full max-w-md bg-white border-l border-slate-200 shadow-2xl dark:bg-slate-950 dark:border-slate-800">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-violet-600 font-semibold dark:text-violet-300">Notifications</p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {notificationCount} unread | {notifications.length} total
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void (async () => {
                        const items = await loadNotifications();
                        await markNotificationsAsRead(items);
                      })()
                    }
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notificationsError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                    {notificationsError}
                  </div>
                )}

                {isNotificationsLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-500 dark:text-violet-300" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Bell className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-700 font-semibold dark:text-slate-100">No notifications</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your notification history will appear here.</p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const notificationKey = toNotificationKey(item);
                    const busyAction = actionState[notificationKey] ?? null;
                    const initials = item.name.charAt(0).toUpperCase() || "P";
                    const isPendingAction = (item.type === "like" || item.type === "invite") && item.status === "pending";
                    const statusLabel =
                      item.status === "accepted"
                        ? "Accepted"
                        : item.status === "rejected"
                        ? "Rejected"
                        : item.status === "declined"
                        ? "Declined"
                        : "Read";

                    return (
                      <div
                        key={notificationKey}
                        className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-colors ${
                          item.isRead
                            ? "border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/60"
                            : "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40"
                        }`}
                      >
                        <div
                          className={`absolute left-0 top-0 h-full w-1.5 ${
                            item.isRead ? "bg-blue-200 dark:bg-blue-900" : "bg-blue-600 dark:bg-blue-500"
                          }`}
                        />
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden text-violet-700 font-bold dark:bg-violet-900/40 dark:text-violet-200">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{item.name}</p>
                            <p className="text-sm text-slate-600 mt-0.5 dark:text-slate-300">
                              {item.message ||
                                (item.type === "like"
                                  ? "liked your profile"
                                  : item.type === "invite"
                                  ? "sent you a match request"
                                  : "liked your post")}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
                              {formatNotificationTime(item.createdAt)}
                            </p>
                          </div>
                        </div>

                        {item.type === "postLike" ? (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => void handleNotificationAction(item, "accept")}
                              className="w-full rounded-lg bg-violet-600 text-white text-sm font-semibold px-3 py-2 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400"
                            >
                              View Profile
                            </button>
                          </div>
                        ) : isPendingAction ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={Boolean(busyAction)}
                              onClick={() => void handleNotificationAction(item, "accept")}
                              className="flex-1 rounded-lg bg-violet-600 text-white text-sm font-semibold px-3 py-2 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
                            >
                              {busyAction === "accept" ? "Accepting..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(busyAction)}
                              onClick={() => void handleNotificationAction(item, "decline")}
                              className="flex-1 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold px-3 py-2 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                            >
                              {busyAction === "decline" ? "Declining..." : "Decline"}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {statusLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
