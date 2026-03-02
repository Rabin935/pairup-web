"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type TouchEvent,
  type WheelEvent,
} from "react";
import {
  ArrowLeft,
  Flame,
  Heart,
  ImagePlus,
  Info,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  Send,
  Star,
  Trash2,
  Video,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/context/AuthContext";
import { getAuthData } from "@/lib/auth-utils";
import apiClient from "@/lib/api";

type LooseRecord = Record<string, unknown>;

interface Match {
  id: string;
  conversationId?: string;
  participantId?: string;
  senderId?: string;
  requestType?: "like" | "invite";
  name: string;
  avatar: string;
  profileImage?: string;
  avatarColor: string;
  lastMessage?: string;
  time?: string;
  unread: number;
  online: boolean;
  lastSeen?: string;
  verified: boolean;
  tag?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId?: string;
  body: string;
  imageUrl?: string;
  createdAt: string;
  clientMessageId?: string;
  status?: "pending" | "sent";
}

type MessageTab = "requests" | "new" | "chats";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:5000";
const MATCHES_ENDPOINT = process.env.NEXT_PUBLIC_MATCHES_ENDPOINT ?? "/api/conversations";
const CONVERSATION_START_ENDPOINT =
  process.env.NEXT_PUBLIC_CONVERSATION_START_ENDPOINT ?? "/api/conversations";
const NEW_MATCHES_ENDPOINT = process.env.NEXT_PUBLIC_NEW_MATCHES_ENDPOINT ?? "/api/matches";
const LIKE_REQUESTS_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_REQUESTS_ENDPOINT ?? "/api/likes/pending";
const INVITE_REQUESTS_ENDPOINT = process.env.NEXT_PUBLIC_INVITE_REQUESTS_ENDPOINT ?? "/api/invites/pending";
const LIKE_RESPOND_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_RESPOND_ENDPOINT ?? "/api/likes";
const INVITE_RESPOND_ENDPOINT = process.env.NEXT_PUBLIC_INVITE_RESPOND_ENDPOINT ?? "/api/invites";

const gradientPalette = [
  "from-violet-400 to-violet-700",
  "from-indigo-400 to-indigo-700",
  "from-purple-400 to-purple-700",
  "from-fuchsia-400 to-pink-600",
  "from-rose-400 to-red-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-blue-400 to-cyan-500",
];

const isRecord = (value: unknown): value is LooseRecord => typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length) return value.trim();
  return undefined;
};

const readNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const readBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return undefined;
};

const readIdentifier = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return value.toString();
  if (value && typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const rendered = (value as { toString: () => string }).toString().trim();
    if (rendered && rendered !== "[object Object]") return rendered;
  }
  return undefined;
};

const isObjectIdLike = (value: string | undefined | null): value is string =>
  Boolean(value && /^[a-f0-9]{24}$/i.test(value));

const deriveMongoUserId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  const candidates = [
    readIdentifier(value._id),
    readIdentifier(value.mongoId),
    readIdentifier(value.id),
    readIdentifier(value.userId),
  ];

  return candidates.find((item): item is string => isObjectIdLike(item)) ?? null;
};

const decodeMongoUserIdFromToken = (token: string | null | undefined): string | null => {
  if (!token || typeof window === "undefined" || typeof window.atob !== "function") return null;

  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const payload = JSON.parse(window.atob(padded)) as LooseRecord;
    const decodedId =
      readIdentifier(payload.id) ??
      readIdentifier(payload._id) ??
      readIdentifier(payload.userId);

    return isObjectIdLike(decodedId) ? decodedId : null;
  } catch {
    return null;
  }
};

const deriveUserId = (value: unknown): string | null => {
  const mongoId = deriveMongoUserId(value);
  if (mongoId) return mongoId;

  if (!isRecord(value)) return null;
  const candidates = [
    readIdentifier(value.id),
    readIdentifier(value.userId),
    readIdentifier(value.uid),
  ];

  return candidates.find((item): item is string => Boolean(item)) ?? null;
};

const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pairup_token") ?? window.localStorage.getItem("authToken");
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const pickGradientForId = (seed?: string) => {
  if (!seed) return gradientPalette[0];
  const index = hashString(seed) % gradientPalette.length;
  return gradientPalette[index];
};

const formatRelativeTime = (iso?: string) => {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const extractTag = (source?: LooseRecord | null) => {
  if (!source) return undefined;
  const interests = source.interests;
  if (Array.isArray(interests)) {
    const chip = interests.find(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
    if (chip) return chip;
  }
  if (typeof interests === "string" && interests.trim().length) {
    const chip = interests
      .split(/,|;/)
      .map((token) => token.trim())
      .find((token) => token.length > 0);
    if (chip) return chip;
  }
  return (
    readString(source.tagline ?? source.bio ?? source.occupation ?? source.jobTitle ?? source.profession) ??
    undefined
  );
};

const resolveParticipant = (record: LooseRecord, currentUserId?: string | null): LooseRecord | null => {
  const candidateKeys = [
    "participant",
    "match",
    "matchedUser",
    "matched_user",
    "matchedProfile",
    "matched_profile",
    "user",
    "partner",
    "recipient",
    "peer",
    "contact",
    "fromUser",
    "from_user",
    "sender",
    "requester",
    "preview",
  ];

  for (const key of candidateKeys) {
    const candidate = record[key];
    if (isRecord(candidate)) return candidate;
  }

  if (Array.isArray(record.participants)) {
    const participants = record.participants.filter((item): item is LooseRecord => isRecord(item));
    if (!participants.length) return null;
    if (currentUserId) {
      const other = participants.find((entry) => deriveUserId(entry) !== currentUserId);
      if (other) return other;
    }
    return participants[0];
  }

  return null;
};

const pickCollection = (payload: unknown, depth = 0): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload) || depth > 2) return [];

  const keys = [
    "matches",
    "invitations",
    "conversations",
    "threads",
    "items",
    "results",
    "list",
    "users",
    "records",
    "data",
  ];
  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value) && Array.isArray(value.data)) return value.data;
  }

  if (isRecord(payload.data) && payload.data !== payload) {
    return pickCollection(payload.data, depth + 1);
  }

  return [];
};

const buildMatchFromRecord = (entry: unknown, index: number, currentUserId?: string | null): Match | null => {
  if (!isRecord(entry)) return null;

  const participant = resolveParticipant(entry, currentUserId);
  const hasParticipants = Array.isArray(entry.participants);
  const explicitConversationId =
    readIdentifier(entry.conversationId) ??
    readIdentifier(entry.threadId) ??
    (hasParticipants ? readIdentifier(entry.id) : undefined);

  const recordId =
    readIdentifier(entry.id) ??
    readIdentifier(entry.matchId) ??
    readIdentifier(entry.invitationId) ??
    explicitConversationId ??
    readIdentifier(entry._id) ??
    `match-${index}`;
  const conversationId = explicitConversationId;
  const participantId =
    deriveUserId(participant) ??
    readIdentifier(entry._id) ??
    readIdentifier(entry.participantId) ??
    readIdentifier(entry.fromUserId) ??
    readIdentifier(entry.senderId) ??
    readIdentifier(entry.requesterId) ??
    readIdentifier(entry.userId) ??
    conversationId;

  const firstname =
    readString(participant?.firstname) ?? readString(participant?.firstName) ?? readString(entry.firstname) ?? readString(entry.firstName);
  const lastname =
    readString(participant?.lastname) ?? readString(participant?.lastName) ?? readString(entry.lastname) ?? readString(entry.lastName);
  const fallbackName =
    readString(participant?.name) ??
    readString(participant?.displayName) ??
    readString(entry.name) ??
    `Match ${index + 1}`;
  const name = [firstname, lastname].filter(Boolean).join(" ").trim() || fallbackName;
  const avatar = name.charAt(0).toUpperCase() || "P";
  const participantImages = Array.isArray(participant?.images)
    ? participant.images.filter((img): img is LooseRecord => isRecord(img))
    : [];
  const profileImage =
    readString(participant?.profileImage) ??
    readString(participant?.avatar) ??
    readString(participant?.image) ??
    readString(participantImages.find((img) => readBoolean(img.isThumbnail))?.url) ??
    readString(participantImages[0]?.url) ??
    readString(entry.profileImage) ??
    readString(entry.avatar);
  const avatarColor = pickGradientForId(participantId);

  const lastMessage =
    readString(entry.lastMessage) ??
    readString(entry.lastMessageText) ??
    readString(entry.preview) ??
    readString(entry.snippet) ??
    (isRecord(entry.lastMessage) ? readString(entry.lastMessage.body) : undefined) ??
    (isRecord(entry.latestMessage) ? readString(entry.latestMessage.body) : undefined);

  const timestamp =
    readString(entry.lastMessageAt) ??
    (isRecord(entry.lastMessage) ? readString(entry.lastMessage.createdAt) : undefined) ??
    readString(entry.updatedAt) ??
    readString(entry.createdAt);

  const unread =
    readNumber(entry.unread) ??
    readNumber(entry.unreadCount) ??
    readNumber(entry.unreadMessages) ??
    0;

  const participantStatus = readString(participant?.status)?.toLowerCase();
  const online =
    readBoolean(participant?.online) ??
    readBoolean(participant?.isOnline) ??
    (participantStatus === "online" ? true : participantStatus === "offline" ? false : undefined) ??
    readBoolean(entry.online) ??
    readBoolean(entry.isOnline) ??
    false;
  const lastSeen =
    readString(participant?.lastSeen) ??
    readString(entry.lastSeen) ??
    (online ? undefined : readString(participant?.updatedAt));
  const verified = readBoolean(participant?.verified) ?? readBoolean(entry.verified) ?? false;
  const tag = extractTag(participant) ?? "Match";

  return {
    id: recordId,
    conversationId,
    participantId,
    name,
    avatar,
    profileImage,
    avatarColor,
    ...(lastMessage ? { lastMessage } : {}),
    ...(timestamp ? { time: formatRelativeTime(timestamp) } : {}),
    unread: Math.max(0, Math.trunc(unread)),
    online,
    lastSeen,
    verified,
    tag,
  };
};

const extractMatchList = (payload: unknown, currentUserId?: string | null): Match[] =>
  pickCollection(payload)
    .map((entry, index) => buildMatchFromRecord(entry, index, currentUserId))
    .filter((match): match is Match => Boolean(match));

const normalizeMatchesPayload = (payload: unknown, currentUserId?: string | null) => {
  if (!isRecord(payload)) {
    return {
      matches: extractMatchList(payload, currentUserId),
      newMatches: [] as Match[],
    };
  }

  const matchesSource =
    payload.matches ??
    payload.conversations ??
    payload.threads ??
    payload.items ??
    payload.results ??
    payload.list ??
    payload.data ??
    payload;

  const nested = isRecord(payload.data) ? (payload.data as LooseRecord) : undefined;
  const newMatchesSource = payload.newMatches ?? nested?.newMatches ?? payload.pending ?? nested?.pending ?? [];

  return {
    matches: extractMatchList(matchesSource, currentUserId),
    newMatches: extractMatchList(newMatchesSource, currentUserId),
  };
};

const normalizePendingLikesPayload = (payload: unknown): Match[] => {
  if (!isRecord(payload)) return [];

  const nested = isRecord(payload.data) ? (payload.data as LooseRecord) : undefined;
  const likes = Array.isArray(payload.likes)
    ? payload.likes
    : Array.isArray(nested?.likes)
      ? nested.likes
      : [];

  return likes
    .map((entry, index): Match | null => {
      if (!isRecord(entry)) return null;

      const senderId = readIdentifier(entry.senderId);
      const likeId = readIdentifier(entry.likeId) ?? senderId ?? `like-${index}`;
      const name = readString(entry.name) ?? "PairUp user";
      const profileImage = readString(entry.image) ?? readString(entry.profileImage);
      const createdAt = readString(entry.createdAt);

      const match: Match = {
        id: likeId,
        senderId,
        participantId: senderId,
        requestType: "like" as const,
        name,
        avatar: name.charAt(0).toUpperCase() || "P",
        profileImage,
        avatarColor: pickGradientForId(senderId ?? likeId),
        lastMessage: "Liked your profile",
        time: formatRelativeTime(createdAt),
        unread: 0,
        online: false,
        verified: false,
        tag: "Like",
      };
      return match;
    })
    .filter((item): item is Match => item !== null);
};

const normalizePendingInvitesPayload = (payload: unknown, currentUserId?: string | null): Match[] =>
  extractMatchList(payload, currentUserId).map((invite) => ({
    ...invite,
    requestType: "invite" as const,
  }));

const normalizeMessageRecord = (payload: unknown): ChatMessage | null => {
  if (!isRecord(payload)) return null;

  const id =
    readIdentifier(payload.id) ??
    readIdentifier(payload._id) ??
    readIdentifier(payload.clientMessageId);
  const conversationId = readIdentifier(payload.conversationId);
  const senderId = readIdentifier(payload.senderId) ?? readIdentifier(payload.sender);
  const receiverId = readIdentifier(payload.receiverId) ?? readIdentifier(payload.receiver);
  const body = readString(payload.body) ?? readString(payload.text) ?? "";
  const imageUrl = readString(payload.imageUrl) ?? readString(payload.image) ?? readString(payload.photo);
  const createdAt = readString(payload.createdAt) ?? new Date().toISOString();
  const clientMessageId = readIdentifier(payload.clientMessageId);

  if (!id || !conversationId || !senderId) return null;
  if (!body && !imageUrl) return null;

  return {
    id,
    conversationId,
    senderId,
    receiverId,
    body,
    imageUrl,
    createdAt,
    clientMessageId,
    status: "sent",
  };
};

const normalizeMessagesPayload = (payload: unknown): ChatMessage[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => normalizeMessageRecord(entry))
      .filter((entry): entry is ChatMessage => Boolean(entry));
  }
  if (!isRecord(payload)) return [];

  const candidates = [
    Array.isArray(payload.messages) ? payload.messages : null,
    isRecord(payload.data) && Array.isArray(payload.data.messages) ? payload.data.messages : null,
    Array.isArray(payload.data) ? payload.data : null,
  ];

  const source = candidates.find((collection) => Array.isArray(collection)) ?? [];
  return source
    .map((entry) => normalizeMessageRecord(entry))
    .filter((entry): entry is ChatMessage => Boolean(entry));
};

const normalizeSocketMessagePayload = (payload: unknown): ChatMessage | null => {
  return normalizeMessageRecord(payload);
};

const buildMatchFromInviteEvent = (payload: unknown): Match | null => {
  if (!isRecord(payload)) return null;

  const invitationId =
    readIdentifier(payload.invitationId) ??
    readIdentifier(payload.id) ??
    readIdentifier(payload.invitation_id);

  if (!invitationId) return null;

  const preview = isRecord(payload.preview) ? payload.preview : undefined;
  const name =
    readString(preview?.name) ??
    readString(payload.previewName) ??
    readString(payload.name) ??
    "New invitation";
  const profileImage =
    readString(preview?.avatar) ??
    readString(preview?.profileImage) ??
    readString(payload.avatar) ??
    readString(payload.profileImage);

  const location = readString(preview?.location) ?? readString(payload.location);
  const age = readNumber(preview?.age ?? payload.age);
  const tagParts = [
    age ? `${age} yrs` : null,
    location,
  ].filter(Boolean);

  const fromUserId =
    readIdentifier(payload.fromUserId) ??
    readIdentifier(payload.senderId) ??
    readIdentifier(payload.userId) ??
    invitationId;

  return {
    id: invitationId,
    conversationId: invitationId,
    participantId: fromUserId,
    senderId: fromUserId,
    requestType: "invite",
    name,
    avatar: name.charAt(0).toUpperCase() || "P",
    profileImage,
    avatarColor: pickGradientForId(fromUserId),
    lastMessage: "Sent you an invitation",
    time: "Just now",
    unread: 0,
    online: false,
    verified: false,
    tag: tagParts.join(" - ") || "Invite",
  };
};

const Avatar = ({
  letter,
  color,
  online,
  size = "md",
  verified = false,
  imageUrl,
  alt,
}: {
  letter: string;
  color: string;
  online?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  verified?: boolean;
  imageUrl?: string;
  alt?: string;
}) => {
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-16 h-16 text-xl",
    xl: "w-20 h-20 text-2xl",
  };
  const dotSizes = {
    sm: "w-3 h-3 border-[2px] -bottom-0.5 -right-0.5",
    md: "w-3.5 h-3.5 border-2 -bottom-0.5 -right-0.5",
    lg: "w-4 h-4 border-2 bottom-0 right-0",
    xl: "w-4 h-4 border-2 bottom-1 right-1",
  };
  const badgeSizes = {
    sm: "w-3.5 h-3.5 -top-0.5 -right-0.5",
    md: "w-4 h-4 -top-0.5 -right-0.5",
    lg: "w-4 h-4 -top-0.5 -right-0.5",
    xl: "w-5 h-5 top-0 right-0",
  };

  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shadow-lg`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt ?? "Profile"}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          letter
        )}
      </div>
      {online !== undefined && (
        <span className={`absolute ${dotSizes[size]} rounded-full ${online ? "bg-emerald-400" : "bg-gray-300"} border-white`} />
      )}
      {verified && (
        <span className={`absolute ${badgeSizes[size]} rounded-full bg-violet-600 border-2 border-white flex items-center justify-center`}>
          <svg viewBox="0 0 12 12" className="w-2 h-2 fill-white">
            <path
              d="M10 3L5 8.5 2 5.5"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );
};

const NewMatchBubble = ({ match, onClick, disabled }: { match: Match; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full p-4 rounded-2xl bg-white border border-violet-100 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 hover:shadow-lg cursor-pointer group text-left dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500 dark:hover:bg-slate-800 ${
      disabled ? "opacity-50 cursor-not-allowed" : ""
    }`}
  >
    <div className="flex gap-3 items-start">
      <Avatar
        letter={match.avatar}
        color={match.avatarColor}
        online={match.online}
        size="md"
        verified={match.verified}
        imageUrl={match.profileImage}
        alt={match.name}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-slate-100">{match.name}</h3>
        <p className="text-sm text-gray-600 truncate dark:text-slate-300">{match.lastMessage ?? "Say hello!"}</p>
        <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">{match.time ?? "Recently"}</p>
      </div>
      <Heart size={18} className="text-violet-400 flex-shrink-0" />
    </div>
  </button>
);

const MessageCard = ({ match, active, onClick, index }: { match: Match; active: boolean; onClick: () => void; index: number }) => {
  const timeLabel = match.time || "Recently";
  const preview = match.lastMessage || "Say hello!";

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer group text-left ${
        active
          ? "bg-gradient-to-r from-violet-100 to-violet-50 border-violet-300 shadow-lg dark:from-slate-800 dark:to-slate-900 dark:border-violet-500"
          : "bg-white border-violet-100 hover:border-violet-300 hover:bg-violet-50 hover:shadow-lg dark:bg-slate-900 dark:border-slate-800 dark:hover:border-violet-500 dark:hover:bg-slate-800"
      }`}
      style={{ animation: `slideIn 0.4s ease-out ${index * 0.1}s backwards` }}
    >
      <div className="flex gap-3 items-start">
        <Avatar
          letter={match.avatar}
          color={match.avatarColor}
          online={match.online}
          size="md"
          verified={match.verified}
          imageUrl={match.profileImage}
          alt={match.name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-gray-900 dark:text-slate-100">{match.name}</h3>
            <span className="text-xs text-gray-500 dark:text-slate-400">{timeLabel}</span>
          </div>
          <p className="text-sm text-gray-600 truncate dark:text-slate-300">{preview}</p>
        </div>
        {match.unread > 0 && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {match.unread}
          </div>
        )}
      </div>
    </button>
  );
};

const PendingRequestCard = ({
  request,
  onAccept,
  onDecline,
  busy,
}: {
  request: Match;
  onAccept: () => void;
  onDecline: () => void;
  busy?: "accept" | "decline" | null;
}) => (
  <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-white border border-violet-200 hover:border-violet-300 transition-all duration-200 hover:shadow-lg dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:border-violet-500">
    <div className="flex gap-3 mb-3">
      <Avatar
        letter={request.avatar}
        color={request.avatarColor}
        online={request.online}
        size="md"
        verified={request.verified}
        imageUrl={request.profileImage}
        alt={request.name}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate dark:text-slate-100">{request.name}</h3>
        <p className="text-xs text-gray-600 dark:text-slate-300">{request.time ?? "Just now"}</p>
        <div className="flex items-center gap-1 mt-1">
          <Flame size={14} className="text-orange-500" />
          <span className="text-xs font-semibold text-orange-600">{request.tag ?? "Great match"}</span>
        </div>
      </div>
    </div>

    <div className="flex gap-2">
      <button
        onClick={onDecline}
        disabled={Boolean(busy)}
        className={`flex-1 py-2 rounded-lg border font-semibold transition-all duration-200 text-sm ${
          busy
            ? "border-gray-200 text-gray-400 bg-gray-50 cursor-wait dark:border-slate-700 dark:text-slate-500 dark:bg-slate-800"
            : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        }`}
      >
        Decline
      </button>
      <button
        onClick={onAccept}
        disabled={Boolean(busy)}
        className={`flex-1 py-2 rounded-lg text-white font-semibold transition-all duration-200 text-sm ${
          busy ? "bg-violet-300 cursor-wait" : "bg-gradient-to-r from-violet-500 to-violet-600 hover:shadow-lg"
        }`}
      >
        {busy === "accept" ? "Matching..." : "Accept"}
      </button>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-3xl border border-violet-100 shadow-xl dark:bg-slate-900 dark:border-slate-800">
    <div className="text-center px-8">
      <MessageCircle size={64} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">No chat selected</h3>
      <p className="text-gray-600 dark:text-slate-400">Select a chat to start messaging</p>
    </div>
  </div>
);

interface MiniChatProps {
  match: Match;
  conversationId: string;
  currentUserId: string | null;
  onClose: () => void;
}

const MiniChat = ({ match, conversationId, currentUserId, onClose }: MiniChatProps) => {
  const { token: authToken } = useAuth();
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [isPartnerOnline, setIsPartnerOnline] = useState(match.online);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | undefined>(match.lastSeen);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setIsPartnerOnline(match.online);
    setPartnerLastSeen(match.lastSeen);
  }, [match.lastSeen, match.online]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !match.participantId) return;

    socketRef.current.emit("typing:stop", {
      conversationId,
      receiverId: match.participantId,
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId, match.participantId]);

  const emitTyping = useCallback(() => {
    if (!socketRef.current || !match.participantId || !socketReady) return;

    socketRef.current.emit("typing:start", {
      conversationId,
      receiverId: match.participantId,
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1200);
  }, [conversationId, match.participantId, socketReady, stopTyping]);

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      if (!conversationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get(`/api/conversations/${conversationId}/messages`);
        if (!isMounted) return;
        const history = normalizeMessagesPayload(data).map((item) => ({ ...item, status: "sent" as const }));
        setMessages(history);
      } catch (err) {
        console.error("Unable to load messages", err);
        if (isMounted) {
          setError("Unable to load conversation. Try again later.");
          setMessages([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadHistory();

    const storedToken = authToken ?? getStoredAccessToken();

    if (!SOCKET_URL || !conversationId || !storedToken) {
      console.warn("Socket URL, token, or conversation unavailable.");
      return () => {
        isMounted = false;
      };
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token: storedToken },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketReady(true);
      console.log("[socket:chat] connected", {
        socketId: socket.id,
        conversationId,
        currentUserId,
      });
      socket.emit("joinConversation", { conversationId, userId: currentUserId });
    });

    socket.on("receiveMessage", (incoming: unknown) => {
      const normalizedIncoming = normalizeSocketMessagePayload(incoming);
      if (!normalizedIncoming || normalizedIncoming.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (normalizedIncoming.clientMessageId) {
          const idx = prev.findIndex(
            (item) => item.clientMessageId === normalizedIncoming.clientMessageId
          );
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = normalizedIncoming;
            return updated;
          }
        }
        if (prev.some((item) => item.id === normalizedIncoming.id)) {
          return prev;
        }
        return [...prev, normalizedIncoming];
      });
    });

    socket.on("typing:start", (payload: unknown) => {
      if (!isRecord(payload)) return;
      const incomingConversationId = readIdentifier(payload.conversationId);
      const incomingUserId = readIdentifier(payload.userId);
      if (incomingConversationId !== conversationId) return;
      if (!incomingUserId || incomingUserId !== match.participantId) return;
      setIsPartnerTyping(true);
    });

    socket.on("typing:stop", (payload: unknown) => {
      if (!isRecord(payload)) return;
      const incomingConversationId = readIdentifier(payload.conversationId);
      const incomingUserId = readIdentifier(payload.userId);
      if (incomingConversationId !== conversationId) return;
      if (!incomingUserId || incomingUserId !== match.participantId) return;
      setIsPartnerTyping(false);
    });

    socket.on("message:deleted", (payload: unknown) => {
      if (!isRecord(payload)) return;
      const deletedMessageId = readIdentifier(payload.messageId);
      const deletedConversationId = readIdentifier(payload.conversationId);
      if (!deletedMessageId || deletedConversationId !== conversationId) return;
      setMessages((prev) => prev.filter((message) => message.id !== deletedMessageId));
    });

    socket.on("presence:update", (payload: unknown) => {
      if (!isRecord(payload)) return;
      const presenceUserId = readIdentifier(payload.userId);
      if (!presenceUserId || presenceUserId !== match.participantId) return;

      const status = readString(payload.status);
      const lastSeen = readString(payload.lastSeen);
      setIsPartnerOnline(status === "online");
      if (lastSeen) {
        setPartnerLastSeen(lastSeen);
      }
    });

    socket.on("disconnect", () => {
      setSocketReady(false);
      setIsPartnerTyping(false);
    });
    socket.on("connect_error", (err) => {
      console.error("[socket:chat] connect_error", err.message);
    });

    return () => {
      isMounted = false;
      stopTyping();
      socket.emit("leaveConversation", { conversationId, userId: currentUserId });
      socket.off("receiveMessage");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("message:deleted");
      socket.off("presence:update");
      socket.off("connect_error");
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
      setIsPartnerTyping(false);
    };
  }, [authToken, conversationId, currentUserId, match.participantId, stopTyping]);

  useEffect(
    () => () => {
      stopTyping();
    },
    [stopTyping]
  );

  const handleSend = () => {
    if (!currentUserId) {
      setError("Log in to send messages.");
      return;
    }
    if (!match.participantId) {
      setError("Unable to identify the receiver for this conversation.");
      return;
    }
    const trimmed = messageInput.trim();
    if (!trimmed || !socketRef.current || !socketReady) return;
    stopTyping();

    const clientMessageId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    const outgoing: ChatMessage = {
      id: clientMessageId,
      conversationId,
      senderId: currentUserId,
      body: trimmed,
      createdAt: new Date().toISOString(),
      clientMessageId,
      status: "pending",
    };

    setMessages((prev) => [...prev, outgoing]);
    setMessageInput("");

    socketRef.current.emit(
      "sendMessage",
      {
        senderId: currentUserId,
        receiverId: match.participantId,
        text: trimmed,
        clientMessageId,
      },
      (response: unknown) => {
        console.log("[socket:chat] sendMessage ack", response);
        if (!isRecord(response)) return;

        if (response.success) {
          const normalized = normalizeSocketMessagePayload(response.message);
          if (!normalized) return;

          setMessages((prev) => {
            const idx = prev.findIndex((item) => item.clientMessageId === clientMessageId);
            if (idx === -1) return prev;
            const updated = [...prev];
            updated[idx] = normalized;
            return updated;
          });
          return;
        }

        const failureMessage =
          readString(response.message) ?? "Unable to send message. Please try again.";
        setError(failureMessage);
        setMessages((prev) => prev.filter((item) => item.clientMessageId !== clientMessageId));
      }
    );
  };

  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!currentUserId) {
      setError("Log in to send images.");
      return;
    }
    if (!match.participantId) {
      setError("Unable to identify the receiver for this conversation.");
      return;
    }

    setIsUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      formData.append("senderId", currentUserId);
      formData.append("receiverId", match.participantId);
      formData.append("image", file);

      const response = await apiClient.post("/api/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const normalized = normalizeSocketMessagePayload(response.data?.message);
      if (!normalized) return;

      setMessages((prev) => {
        if (prev.some((message) => message.id === normalized.id)) {
          return prev;
        }
        return [...prev, normalized];
      });
    } catch (uploadError) {
      console.error("Unable to upload image message", uploadError);
      setError("Unable to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = window.confirm("Delete this message?");
    if (!confirmed) return;

    setDeletingMessageId(messageId);
    setError(null);

    try {
      await apiClient.delete(`/api/messages/${encodeURIComponent(messageId)}`);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (deleteError) {
      console.error("Unable to delete message", deleteError);
      setError("Unable to delete message. Please try again.");
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMessageInput(event.target.value);
    if (event.target.value.trim()) {
      emitTyping();
    } else {
      stopTyping();
    }
  };

  const statusLabel = isPartnerTyping
    ? "Typing..."
    : isPartnerOnline
      ? "Active now"
      : partnerLastSeen
        ? `Last seen ${formatRelativeTime(partnerLastSeen)}`
        : "Active recently";

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors dark:hover:bg-slate-700"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-slate-200" />
          </button>
          <Avatar
            letter={match.avatar}
            color={match.avatarColor}
            online={isPartnerOnline}
            size="sm"
            verified={match.verified}
            imageUrl={match.profileImage}
            alt={match.name}
          />
          <div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100">{match.name}</h2>
            <p className="text-xs text-gray-600 dark:text-slate-300">{statusLabel}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 hover:bg-violet-100 rounded-lg transition-colors text-violet-600">
            <Phone size={20} />
          </button>
          <button className="p-2.5 hover:bg-violet-100 rounded-lg transition-colors text-violet-600">
            <Video size={20} />
          </button>
          <button className="p-2.5 hover:bg-violet-100 rounded-lg transition-colors text-violet-600">
            <Info size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-white to-violet-50/20 custom-scroll dark:from-slate-900 dark:to-slate-900">
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-500">{error}</div>
        )}

        {isLoading ? (
          <div className="text-center text-xs text-gray-400 dark:text-slate-500 py-6">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-gray-500 dark:text-slate-400">
            <MessageCircle size={24} className="text-gray-400 dark:text-slate-500" />
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"}`}
              style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s backwards` }}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl ${
                  message.senderId === currentUserId
                    ? "bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {message.imageUrl ? (
                  <img
                    src={message.imageUrl}
                    alt="Shared image"
                    className="mb-2 max-w-[220px] max-h-64 rounded-lg object-cover"
                  />
                ) : null}
                {message.body ? <p className="text-sm">{message.body}</p> : null}
                <span className="mt-1 block text-[10px] opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.senderId === currentUserId && message.status === "pending" ? " - sending..." : ""}
                </span>
                {message.senderId === currentUserId && message.status !== "pending" && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteMessage(message.id)}
                    disabled={deletingMessageId === message.id}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100"
                  >
                    <Trash2 size={12} />
                    {deletingMessageId === message.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 sm:p-6 border-t border-violet-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadImage}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage || !currentUserId || !match.participantId}
            className="p-2.5 hover:bg-violet-100 rounded-lg transition-colors text-violet-600 flex-shrink-0 disabled:opacity-50"
            title="Upload image"
          >
            {isUploadingImage ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          </button>
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${match.name}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 focus:outline-none focus:border-violet-500 focus:bg-white transition-all duration-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:focus:bg-slate-900"
            disabled={!socketReady || !currentUserId}
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim() || !socketReady || !currentUserId}
            className="p-2.5 bg-gradient-to-r from-violet-500 to-violet-600 hover:shadow-lg text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MessagesPage() {
  const { user, token } = useAuth();
  const currentUserId = useMemo(() => {
    const fromContext = deriveMongoUserId(user);
    if (fromContext) return fromContext;

    const storedAuth = getAuthData();
    const fromStoredAuth = deriveMongoUserId(storedAuth?.userInfo ?? null);
    if (fromStoredAuth) return fromStoredAuth;

    if (typeof window !== "undefined") {
      const pairupUser = window.localStorage.getItem("pairup_user");
      if (pairupUser) {
        try {
          const parsed = JSON.parse(pairupUser) as LooseRecord;
          const fromPairupUser = deriveMongoUserId(parsed);
          if (fromPairupUser) return fromPairupUser;
        } catch {
          // Ignore malformed local user cache and continue to token fallback.
        }
      }
    }

    return decodeMongoUserIdFromToken(token ?? getStoredAccessToken());
  }, [token, user]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatchFallback, setSelectedMatchFallback] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<MessageTab>("chats");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "online">("all");
  const [requestActionState, setRequestActionState] = useState<Record<string, "accept" | "decline" | null>>({});
  const [requestActionMessage, setRequestActionMessage] = useState<string | null>(null);
  const realtimeSocketRef = useRef<Socket | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const tabOrder = useMemo<MessageTab[]>(() => ["requests", "new", "chats"], []);
  const activeTabIndex = tabOrder.indexOf(activeTab);

  const moveToTabByOffset = useCallback(
    (offset: number) => {
      const nextIndex = Math.max(0, Math.min(tabOrder.length - 1, activeTabIndex + offset));
      const nextTab = tabOrder[nextIndex];
      if (nextTab && nextTab !== activeTab) {
        setActiveTab(nextTab);
      }
    },
    [activeTab, activeTabIndex, tabOrder]
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    swipeStartXRef.current = event.touches[0]?.clientX ?? null;
  }, []);
  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const startX = swipeStartXRef.current;
      const endX = event.changedTouches[0]?.clientX;
      swipeStartXRef.current = null;
      if (startX === null || typeof endX !== "number") return;

      const deltaX = endX - startX;
      if (Math.abs(deltaX) < 45) return;

      if (deltaX < 0) {
        moveToTabByOffset(1);
      } else {
        moveToTabByOffset(-1);
      }
    },
    [moveToTabByOffset]
  );

  const handleWheelSlide = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (Math.abs(event.deltaX) < 30) return;
      if (event.deltaX > 0) {
        moveToTabByOffset(1);
      } else {
        moveToTabByOffset(-1);
      }
    },
    [moveToTabByOffset]
  );

  const applyRecentMessageToLists = useCallback(
    (message: ChatMessage) => {
      const conversationKey = message.conversationId;
      const isActiveConversation =
        selectedMatchId === conversationKey ||
        selectedMatchFallback?.conversationId === conversationKey;
      const shouldIncreaseUnread = message.senderId !== currentUserId && !isActiveConversation;

      const upsertRecentInList = (items: Match[]): Match[] => {
        const index = items.findIndex(
          (item) => item.conversationId === conversationKey || item.id === conversationKey
        );
        if (index === -1) return items;

        const target = items[index];
        const updated: Match = {
          ...target,
          lastMessage: message.body || (message.imageUrl ? "Photo" : target.lastMessage),
          time: formatRelativeTime(message.createdAt),
          unread: shouldIncreaseUnread ? target.unread + 1 : target.unread,
        };

        return [updated, ...items.filter((_, itemIndex) => itemIndex !== index)];
      };

      setMatches((prev) => upsertRecentInList(prev));
      setNewMatches((prev) => upsertRecentInList(prev));
    },
    [currentUserId, selectedMatchFallback?.conversationId, selectedMatchId]
  );

  const fetchMatchedUsers = useCallback(async (): Promise<Match[]> => {
    const accessToken = token ?? getStoredAccessToken();

    const response = await apiClient.get(NEW_MATCHES_ENDPOINT, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    console.log("[matches] /api/matches response:", response.data);
    return extractMatchList(response.data, currentUserId);
  }, [currentUserId, token]);

  const loadMatches = useCallback(async () => {
    if (!currentUserId) {
      setMatches([]);
      setNewMatches([]);
      setPendingRequests([]);
      setMatchesError(null);
      setPendingError(null);
      setMatchesLoading(false);
      return;
    }
    setMatchesLoading(true);
    setMatchesError(null);
    setPendingError(null);

    try {
      const [threads, pendingLikes, pendingInvites, fetchedMatches] = await Promise.allSettled([
        apiClient.get(MATCHES_ENDPOINT),
        apiClient.get(LIKE_REQUESTS_ENDPOINT),
        apiClient.get(INVITE_REQUESTS_ENDPOINT),
        fetchMatchedUsers(),
      ]);

      if (threads.status !== "fulfilled") {
        throw threads.reason ?? new Error("Unable to load conversations");
      }

      console.log("[matches] /api/conversations response:", threads.value.data);

      const normalized = normalizeMatchesPayload(threads.value.data, currentUserId);

      let computedNewMatches = normalized.newMatches;
      if (fetchedMatches.status === "fulfilled") {
        computedNewMatches = fetchedMatches.value;
      } else {
        console.warn("Unable to load /api/matches", fetchedMatches.reason);
        computedNewMatches = normalized.matches;
      }
      setNewMatches(computedNewMatches);

      const mergedMatchesMap = new Map<string, Match>();
      const mergedMatches = [...normalized.matches, ...computedNewMatches];
      mergedMatches.forEach((match) => {
        const key = match.participantId ?? match.id;
        const existing = mergedMatchesMap.get(key);
        if (!existing) {
          mergedMatchesMap.set(key, match);
          return;
        }

        mergedMatchesMap.set(key, {
          ...existing,
          ...match,
          conversationId: existing.conversationId ?? match.conversationId,
          lastMessage: match.lastMessage ?? existing.lastMessage,
          time: match.time ?? existing.time,
          unread: Math.max(existing.unread ?? 0, match.unread ?? 0),
        });
      });
      setMatches(Array.from(mergedMatchesMap.values()));

      const fromLikes =
        pendingLikes.status === "fulfilled"
          ? normalizePendingLikesPayload(pendingLikes.value.data)
          : [];
      const fromInvites =
        pendingInvites.status === "fulfilled"
          ? normalizePendingInvitesPayload(pendingInvites.value.data, currentUserId)
          : [];

      const mergedPending = [...fromLikes, ...fromInvites];
      setPendingRequests(mergedPending);

      if (pendingLikes.status === "rejected" && pendingInvites.status === "rejected") {
        console.warn("Unable to load pending likes and invites", pendingLikes.reason, pendingInvites.reason);
        setPendingError("Unable to load likes waiting for your response.");
      }
    } catch (error) {
      console.error("Failed to load matches", error);
      setMatches([]);
      setNewMatches([]);
      setPendingRequests([]);
      setMatchesError("Unable to load your matches right now. Please try again.");
      setPendingError("Unable to load likes waiting for your response.");
    } finally {
      setMatchesLoading(false);
    }
  }, [currentUserId, fetchMatchedUsers]);

  const upsertPendingRequest = useCallback((request: Match) => {
    setPendingRequests((prev) => {
      const index = prev.findIndex((item) => item.id === request.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = { ...next[index], ...request };
        return next;
      }
      return [request, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setMatches([]);
      setNewMatches([]);
      setPendingRequests([]);
      setPendingError(null);
      setMatchesLoading(false);
      return;
    }

    console.log("[messages] resolved currentUserId:", currentUserId);
    void loadMatches();
  }, [currentUserId, loadMatches]);

  useEffect(() => {
    if (!currentUserId || !SOCKET_URL) {
      return;
    }

    const storedToken = token ?? getStoredAccessToken();

    if (!storedToken) {
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token: storedToken },
    });

    realtimeSocketRef.current = socket;

    const handleInvite = (payload: unknown) => {
      console.log("[socket] invite payload", payload);
      if (isRecord(payload)) {
        const toId = readIdentifier(payload.toUserId ?? payload.recipientId);
        if (toId && currentUserId && toId !== currentUserId) {
          return;
        }
      }

      const match = buildMatchFromInviteEvent(payload);
      if (!match) return;
      upsertPendingRequest(match);
      setPendingError(null);
    };

    const handleRemoval = (payload: unknown) => {
      if (!isRecord(payload)) return;
      const invitationId = readIdentifier(payload.invitationId ?? payload.id);
      if (!invitationId) return;
      setPendingRequests((prev) => prev.filter((item) => item.id !== invitationId));
    };

    const handleMatchCreated = (payload: unknown) => {
      console.log("[socket] match created payload", payload);
      handleRemoval(payload);
      void loadMatches();
    };

    const handleRealtimeMessage = (payload: unknown) => {
      const normalized = normalizeSocketMessagePayload(payload);
      if (!normalized) return;
      applyRecentMessageToLists(normalized);
    };

    const handlePresenceUpdate = (payload: unknown) => {
      if (!isRecord(payload)) return;
      const presenceUserId = readIdentifier(payload.userId);
      if (!presenceUserId) return;

      const status = readString(payload.status);
      const online = status === "online";
      const lastSeen = readString(payload.lastSeen);

      const updatePresence = (items: Match[]) =>
        items.map((item) => {
          if (item.participantId !== presenceUserId) return item;
          return {
            ...item,
            online,
            ...(lastSeen ? { lastSeen } : {}),
          };
        });

      setMatches((prev) => updatePresence(prev));
      setNewMatches((prev) => updatePresence(prev));
    };

    socket.on("connect", () => {
      console.log("[socket] connected", {
        socketId: socket.id,
        currentUserId,
        socketUrl: SOCKET_URL,
      });
    });
    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected", { reason, currentUserId });
    });
    socket.on("connect_error", (error) => {
      console.error("[socket] connect_error", error.message);
    });

    socket.on("invite:created", handleInvite);
    socket.on("matchRequest", handleInvite);
    socket.on("invite:accepted", handleMatchCreated);
    socket.on("like:accepted", handleMatchCreated);
    socket.on("chat:match:created", handleMatchCreated);
    socket.on("invite:rejected", handleRemoval);
    socket.on("receiveMessage", handleRealtimeMessage);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("invite:created", handleInvite);
      socket.off("matchRequest", handleInvite);
      socket.off("invite:accepted", handleMatchCreated);
      socket.off("like:accepted", handleMatchCreated);
      socket.off("chat:match:created", handleMatchCreated);
      socket.off("invite:rejected", handleRemoval);
      socket.off("receiveMessage", handleRealtimeMessage);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
      realtimeSocketRef.current = null;
    };
  }, [applyRecentMessageToLists, currentUserId, loadMatches, token, upsertPendingRequest]);

  const handleSelect = useCallback(
    async (match: Match) => {
      let selected = match;

      if (!selected.conversationId) {
        const participantId = selected.participantId ?? selected.senderId;
        if (!participantId || !isObjectIdLike(participantId)) {
          console.warn("Conversation and participant id missing for match", selected);
          return;
        }

        try {
          const { data } = await apiClient.post(CONVERSATION_START_ENDPOINT, {
            participantId,
          });

          const conversationId =
            readIdentifier((data as { conversationId?: unknown })?.conversationId) ??
            (isRecord(data)
              ? readIdentifier((data.data as { conversationId?: unknown } | undefined)?.conversationId)
              : undefined);

          if (!conversationId) {
            throw new Error("Conversation id missing from start conversation response");
          }

          selected = {
            ...selected,
            id: conversationId,
            conversationId,
            participantId,
          };

          setMatches((prev) => {
            const next = prev.filter(
              (item) =>
                item.conversationId !== conversationId &&
                item.participantId !== participantId
            );
            return [selected, ...next];
          });

          setNewMatches((prev) =>
            prev.map((item) =>
              item.id === match.id || item.participantId === participantId
                ? { ...item, conversationId, id: conversationId, participantId }
                : item
            )
          );
        } catch (error) {
          console.error("Unable to start conversation from new match", error);
          setRequestActionMessage("Unable to open chat for this match right now.");
          return;
        }
      }

      if (selectedMatchId === selected.id) {
        setSelectedMatchId(null);
        setSelectedMatchFallback(null);
        return;
      }

      setMatches((prev) =>
        prev.map((item) =>
          item.id === selected.id || item.conversationId === selected.conversationId
            ? { ...item, unread: 0 }
            : item
        )
      );
      setNewMatches((prev) =>
        prev.map((item) =>
          item.id === selected.id || item.conversationId === selected.conversationId
            ? { ...item, unread: 0 }
            : item
        )
      );

      setSelectedMatchId(selected.id);
      setSelectedMatchFallback(selected);
    },
    [selectedMatchId]
  );

  const activeMatch = useMemo(() => {
    if (selectedMatchId) {
      const located = matches.find((item) => item.id === selectedMatchId);
      if (located) return located;
    }
    return selectedMatchFallback;
  }, [matches, selectedMatchFallback, selectedMatchId]);

  const activeConversationId = activeMatch?.conversationId ?? null;
  const hasActiveConversation = Boolean(activeConversationId);

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return matches.filter((match) => {
      const matchesSearch =
        !query ||
        match.name.toLowerCase().includes(query) ||
        (match.lastMessage ?? "").toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "unread" && match.unread > 0) ||
        (filter === "online" && match.online);
      return matchesSearch && matchesFilter;
    });
  }, [matches, search, filter]);

  const filteredNewMatches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return newMatches.filter(
      (match) =>
        !query ||
        match.name.toLowerCase().includes(query) ||
        (match.lastMessage ?? "").toLowerCase().includes(query)
    );
  }, [newMatches, search]);

  const totalUnread = useMemo(() => matches.reduce((total, match) => total + match.unread, 0), [matches]);
  const onlineCount = useMemo(() => matches.filter((match) => match.online).length, [matches]);

  const handleRequestDecision = useCallback(
    async (request: Match, action: "accept" | "decline") => {
      if (!currentUserId) {
        setRequestActionMessage("Log in to respond to match requests.");
        return;
      }

      setRequestActionState((prev) => ({ ...prev, [request.id]: action }));
      setRequestActionMessage(null);

      try {
        const isLikeRequest =
          request.requestType === "like" ||
          (!request.requestType && Boolean(request.senderId));

        if (isLikeRequest) {
          if (!request.senderId) {
            throw new Error("Missing sender id for like response.");
          }

          await apiClient.post(`${LIKE_RESPOND_ENDPOINT}/${request.senderId}/${action}`);
        } else {
          const inviteAction = action === "decline" ? "reject" : "accept";
          await apiClient.post(`${INVITE_RESPOND_ENDPOINT}/${request.id}/${inviteAction}`);
        }

        if (action === "accept") {
          const participantId = request.participantId ?? request.senderId;

          if (participantId && isObjectIdLike(participantId)) {
            const { data } = await apiClient.post(CONVERSATION_START_ENDPOINT, {
              participantId,
            });

            const conversationId =
              readIdentifier((data as { conversationId?: unknown })?.conversationId) ??
              (isRecord(data)
                ? readIdentifier((data.data as { conversationId?: unknown } | undefined)?.conversationId)
                : undefined);

            if (conversationId) {
              const acceptedMatch: Match = {
                ...request,
                id: conversationId,
                conversationId,
                participantId,
                requestType: undefined,
                senderId: undefined,
                lastMessage: request.lastMessage ?? "Say hello!",
                time: "Just now",
              };

              setNewMatches((prev) => {
                const next = prev.filter(
                  (item) =>
                    item.conversationId !== conversationId &&
                    item.id !== conversationId
                );
                return [acceptedMatch, ...next];
              });

              setMatches((prev) => {
                const next = prev.filter(
                  (item) =>
                    item.conversationId !== conversationId &&
                    item.id !== conversationId
                );
                return [acceptedMatch, ...next];
              });
            }
          }

          await loadMatches();
        } else {
          setPendingRequests((prev) =>
            prev.filter(
              (item) =>
                item.id !== request.id &&
                (!request.senderId || item.senderId !== request.senderId)
            )
          );
        }
      } catch (error) {
        console.error("Unable to respond to match request", error);
        setRequestActionMessage("Unable to update that request. Please try again.");
      } finally {
        setRequestActionState((prev) => ({ ...prev, [request.id]: null }));
      }
    },
    [currentUserId, loadMatches]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-violet-50/30 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <style>{`
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

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #ddd6fe; border-radius: 999px; }
        .dark .custom-scroll::-webkit-scrollbar-thumb { background: #475569; }
      `}</style>

      <div className="max-w-8xl mx-auto h-screen flex flex-col">
        <div className="sticky top-0 z-40 bg-white bg-opacity-95 backdrop-blur-lg border-b border-violet-100 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-violet-600 font-semibold">Messages</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Connections</h1>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{matches.length} chats · {onlineCount} online</p>
            </div>
            <div className="rounded-full bg-gradient-to-br from-violet-400 to-violet-600 p-3 text-white">
              <MessageCircle size={24} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-4 overflow-hidden p-4 sm:p-6">
          <div className={`w-full md:w-96 flex flex-col bg-white rounded-3xl border border-violet-100 shadow-xl overflow-hidden dark:bg-slate-900 dark:border-slate-800 ${hasActiveConversation ? "hidden md:flex" : "flex"}`}>
            <div className="flex gap-1 p-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white dark:border-slate-800 dark:from-slate-800 dark:to-slate-900">
              {([
                { id: "requests", label: "Requests", count: pendingRequests.length },
                { id: "new", label: "New", count: filteredNewMatches.length },
                { id: "chats", label: "Chats", count: filteredMatches.length },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-violet-400 to-violet-900 text-white shadow-lg"
                      : "text-gray-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-auto bg-white text-black bg-opacity-20 px-2 py-0.5 rounded-full text-xs font-bold dark:bg-slate-900 dark:text-slate-100">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab !== "requests" && (
              <div className="p-4 border-b border-violet-100 dark:border-slate-800">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 focus:outline-none focus:border-violet-500 focus:bg-white transition-all duration-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:focus:bg-slate-900"
                  />
                </div>
                {activeTab === "chats" && (
                  <div className="mt-3 flex gap-2">
                    {(["all", "unread", "online"] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setFilter(option)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                          filter === option
                            ? "bg-violet-600 text-white"
                            : "bg-violet-50 text-gray-600 hover:bg-violet-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              className="flex-1 overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheelSlide}
            >
              <div
                className="h-full w-[300%] grid grid-cols-3 transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeTabIndex * (100 / 3)}%)` }}
              >
                <div className="overflow-y-auto custom-scroll">
                  <div className="space-y-3 p-4">
                    {(requestActionMessage || pendingError) && (
                      <div className="space-y-2">
                        {requestActionMessage && (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                            {requestActionMessage}
                          </div>
                        )}
                        {pendingError && (
                          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                            {pendingError}
                          </div>
                        )}
                      </div>
                    )}

                    {matchesLoading ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-28 rounded-2xl bg-gradient-to-r from-violet-50 to-white animate-pulse" />
                      ))
                    ) : pendingRequests.length > 0 ? (
                      pendingRequests.map((request, idx) => (
                        <div key={request.id} style={{ animation: `slideIn 0.4s ease-out ${idx * 0.1}s backwards` }}>
                          <PendingRequestCard
                            request={request}
                            busy={requestActionState[request.id] ?? null}
                            onAccept={() => void handleRequestDecision(request, "accept")}
                            onDecline={() => void handleRequestDecision(request, "decline")}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Heart size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                        <p className="text-gray-600 dark:text-slate-400 font-medium">No like or match requests</p>
                        <button
                          onClick={() => void loadMatches()}
                          className="mt-3 text-sm text-violet-600 font-semibold hover:text-violet-700"
                        >
                          Refresh
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto custom-scroll">
                  <div className="space-y-3 p-4">
                    {matchesLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 rounded-2xl bg-gradient-to-r from-violet-50 to-white animate-pulse" />
                      ))
                    ) : filteredNewMatches.length > 0 ? (
                      filteredNewMatches.map((match, idx) => (
                        <div key={match.id} style={{ animation: `slideIn 0.4s ease-out ${idx * 0.1}s backwards` }}>
                          <NewMatchBubble
                            match={match}
                            onClick={() => {
                              void handleSelect(match);
                            }}
                            disabled={!match.conversationId && !match.participantId}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Star size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                        <p className="text-gray-600 dark:text-slate-400 font-medium">No new connections</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto custom-scroll">
                  <div className="space-y-2 p-4">
                    {matchesError && (
                      <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600 flex items-center justify-between gap-3">
                        <span>{matchesError}</span>
                        <button onClick={() => void loadMatches()} className="font-semibold hover:underline">Retry</button>
                      </div>
                    )}

                    {matchesLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-20 rounded-2xl bg-gradient-to-r from-violet-50 to-white animate-pulse" />
                      ))
                    ) : filteredMatches.length > 0 ? (
                      filteredMatches.map((chat, idx) => (
                        <MessageCard
                          key={chat.id}
                          match={chat}
                          active={selectedMatchId === chat.id}
                          onClick={() => {
                            void handleSelect(chat);
                          }}
                          index={idx}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageCircle size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
                        <p className="text-gray-600 dark:text-slate-400 font-medium">No chats yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-violet-100 flex items-center justify-between bg-white dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-gray-500 dark:text-slate-400">Unread: {totalUnread}</p>
              <button
                className="text-xs text-violet-600 font-semibold hover:text-violet-700"
                onClick={() => setMatches((prev) => prev.map((match) => ({ ...match, unread: 0 })))}
              >
                Mark all read
              </button>
            </div>
          </div>

          {hasActiveConversation && activeMatch && activeConversationId ? (
            <div className="flex-1 bg-white rounded-3xl border border-violet-100 shadow-xl flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800">
              <MiniChat
                match={activeMatch}
                conversationId={activeConversationId}
                currentUserId={currentUserId}
                onClose={() => {
                  setSelectedMatchId(null);
                  setSelectedMatchFallback(null);
                }}
              />
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}





