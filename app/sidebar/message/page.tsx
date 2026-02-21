"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/context/AuthContext";
import apiClient from "@/lib/api";

type LooseRecord = Record<string, unknown>;

interface Match {
  id: string;
  conversationId?: string;
  name: string;
  avatar: string;
  avatarColor: string;
  lastMessage?: string;
  time?: string;
  unread: number;
  online: boolean;
  verified: boolean;
  tag?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  clientMessageId?: string;
  status?: "pending" | "sent";
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "";
const MATCHES_ENDPOINT = process.env.NEXT_PUBLIC_MATCHES_ENDPOINT ?? "/api/conversations";
const NEW_MATCHES_ENDPOINT = process.env.NEXT_PUBLIC_NEW_MATCHES_ENDPOINT ?? "/api/matches/new";
const LIKE_REQUESTS_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_REQUESTS_ENDPOINT ?? "/api/likes/pending";
const LIKE_RESPOND_ENDPOINT = process.env.NEXT_PUBLIC_LIKE_RESPOND_ENDPOINT ?? "/api/likes";

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
  return undefined;
};

const deriveUserId = (value: unknown): string | null => {
  if (!isRecord(value)) return null;
  return (
    readIdentifier(value.id) ??
    readIdentifier(value.userId) ??
    readIdentifier(value._id) ??
    readIdentifier(value.uid) ??
    null
  );
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

  const keys = ["matches", "conversations", "threads", "items", "results", "list", "users", "records", "data"];
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
  const recordId =
    readIdentifier(entry.id) ??
    readIdentifier(entry.matchId) ??
    readIdentifier(entry.conversationId) ??
    readIdentifier(entry.threadId) ??
    `match-${index}`;
  const conversationId = readIdentifier(entry.conversationId) ?? recordId;
  const participantId = deriveUserId(participant) ?? conversationId;

  const firstname =
    readString(participant?.firstname) ?? readString(participant?.firstName) ?? readString(entry.firstname) ?? readString(entry.firstName);
  const lastname =
    readString(participant?.lastname) ?? readString(participant?.lastName) ?? readString(entry.lastname) ?? readString(entry.lastName);
  const fallbackName = readString(participant?.name) ?? readString(entry.name) ?? `Match ${index + 1}`;
  const name = [firstname, lastname].filter(Boolean).join(" ").trim() || fallbackName;
  const avatar = name.charAt(0).toUpperCase() || "P";
  const avatarColor = pickGradientForId(participantId);

  const lastMessage =
    readString(entry.lastMessage) ??
    readString(entry.lastMessageText) ??
    readString(entry.preview) ??
    readString(entry.snippet) ??
    (isRecord(entry.lastMessage) ? readString(entry.lastMessage.body) : undefined) ??
    (isRecord(entry.latestMessage) ? readString(entry.latestMessage.body) : undefined) ??
    "Say hello! 👋";

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

  const online = readBoolean(participant?.online) ?? readBoolean(entry.online) ?? false;
  const verified = readBoolean(participant?.verified) ?? readBoolean(entry.verified) ?? false;
  const tag = extractTag(participant) ?? "✨ Match";

  return {
    id: recordId,
    conversationId,
    name,
    avatar,
    avatarColor,
    lastMessage,
    time: formatRelativeTime(timestamp),
    unread: Math.max(0, Math.trunc(unread)),
    online,
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

const normalizeMessagesPayload = (payload: unknown): ChatMessage[] => {
  if (Array.isArray(payload)) return payload as ChatMessage[];
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.messages)) return payload.messages as ChatMessage[];
  if (isRecord(payload.data) && Array.isArray(payload.data.messages)) return payload.data.messages as ChatMessage[];
  if (Array.isArray(payload.data)) return payload.data as ChatMessage[];
  return [];
};

const Avatar = ({
  letter,
  color,
  online,
  size = "md",
  verified = false,
}: {
  letter: string;
  color: string;
  online?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  verified?: boolean;
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
        {letter}
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
    className={`flex flex-col items-center gap-2 flex-shrink-0 group ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    <div className="relative">
      <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 p-[2.5px] shadow-md shadow-violet-200/60 group-hover:shadow-violet-300/80 group-hover:scale-105 transition-all duration-200">
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${match.avatarColor} flex items-center justify-center text-white font-bold text-lg`}>
            {match.avatar}
          </div>
        </div>
      </div>
      {match.online && (
        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
      )}
    </div>
    <span className="text-xs font-medium text-gray-700 group-hover:text-violet-700 transition-colors">{match.name}</span>
  </button>
);

const MessageCard = ({ match, active, onClick, index }: { match: Match; active: boolean; onClick: () => void; index: number }) => {
  const tagLabel = match.tag && match.tag.trim().length ? match.tag : "✨ Match";
  const timeLabel = match.time || "Recently";
  const preview = match.lastMessage || "Say hello! 👋";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 transition-all duration-200 relative group ${
        active ? "bg-violet-50 border-l-[3px] border-violet-500" : "hover:bg-gray-50 border-l-[3px] border-transparent"
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Avatar letter={match.avatar} color={match.avatarColor} online={match.online} size="md" verified={match.verified} />

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`font-semibold text-sm ${active ? "text-violet-700" : "text-gray-900"}`}>{match.name}</span>
            <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">{tagLabel}</span>
          </div>
          <span className={`text-[11px] flex-shrink-0 ${match.unread > 0 ? "text-violet-600 font-semibold" : "text-gray-400"}`}>{timeLabel}</span>
        </div>

        <div className="flex items-center justify-between">
          <p className={`text-xs truncate max-w-[220px] ${match.unread > 0 ? "text-gray-800 font-medium" : "text-gray-500"}`}>{preview}</p>
          {match.unread > 0 && (
            <span className="flex-shrink-0 ml-2 min-w-[20px] h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
              {match.unread}
            </span>
          )}
        </div>
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
  <div className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/60">
    <Avatar letter={request.avatar} color={request.avatarColor} online={request.online} size="sm" verified={request.verified} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm text-gray-900 truncate">{request.name}</p>
        <span className="text-[11px] text-gray-400 flex-shrink-0">{request.time ?? "Just now"}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1 truncate">
        Wants to match with you · {request.tag ?? "Great vibes"}
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onDecline}
          disabled={Boolean(busy)}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
            busy
              ? "border-gray-200 text-gray-400 bg-gray-50 cursor-wait"
              : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          disabled={Boolean(busy)}
          className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-transform ${
            busy
              ? "bg-violet-300 cursor-wait"
              : "bg-gradient-to-r from-violet-500 to-violet-700 hover:scale-[1.01] shadow-md shadow-violet-200/50"
          }`}
        >
          {busy === "accept" ? "Matching…" : "Accept & Match"}
        </button>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 py-20">
    <div className="w-20 h-20 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-4xl">💜</div>
    <div>
      <h3 className="font-display font-bold text-gray-900 text-xl mb-2">Select a conversation</h3>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs">Choose a match from the left to start chatting, or send a hello to your new matches above.</p>
    </div>
    <button className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-semibold shadow-lg shadow-violet-200/60 hover:scale-105 active:scale-95 transition-transform duration-200">
      Start Swiping ✨
    </button>
  </div>
);

interface MiniChatProps {
  match: Match;
  conversationId: string;
  currentUserId: string | null;
  onClose: () => void;
}

const MiniChat = ({ match, conversationId, currentUserId, onClose }: MiniChatProps) => {
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketReady, setSocketReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

    if (!SOCKET_URL || !conversationId) {
      console.warn("Socket URL missing or conversation unavailable.");
      return () => {
        isMounted = false;
      };
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketReady(true);
      socket.emit("joinConversation", { conversationId, userId: currentUserId });
    });

    socket.on("receiveMessage", (incoming: ChatMessage) => {
      if (incoming.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (incoming.clientMessageId) {
          const idx = prev.findIndex((item) => item.clientMessageId === incoming.clientMessageId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...incoming, status: "sent" };
            return updated;
          }
        }
        return [...prev, { ...incoming, status: "sent" }];
      });
    });

    socket.on("disconnect", () => {
      setSocketReady(false);
    });

    return () => {
      isMounted = false;
      socket.emit("leaveConversation", { conversationId, userId: currentUserId });
      socket.off("receiveMessage");
      socket.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [conversationId, currentUserId]);

  const handleSend = () => {
    if (!currentUserId) {
      setError("Log in to send messages.");
      return;
    }
    const trimmed = messageInput.trim();
    if (!trimmed || !socketRef.current || !socketReady) return;

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

    socketRef.current.emit("sendMessage", {
      conversationId,
      senderId: currentUserId,
      body: trimmed,
      clientMessageId,
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-violet-100 bg-white">
        <Avatar letter={match.avatar} color={match.avatarColor} online={match.online} size="sm" verified={match.verified} />
        <div className="flex-1">
          <p className="font-semibold text-gray-900 text-sm">{match.name}</p>
          <p className={`text-xs ${match.online ? "text-emerald-500" : "text-gray-400"}`}>{match.online ? "● Online now" : "● Last seen recently"}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => (window.location.href = `/chat/${conversationId}`)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            Open Chat →
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 bg-gradient-to-b from-violet-50/20 to-white custom-scroll" style={{ maxHeight: "340px" }}>
        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-500">{error}</div>
        )}

        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-6">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-gray-500">
            <span className="text-2xl">💬</span>
            <p>No messages yet — say hi!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.senderId === currentUserId ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  message.senderId === currentUserId
                    ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-br-md"
                    : "bg-white border border-violet-100 text-gray-800 rounded-bl-md"
                }`}
              >
                <p>{message.body}</p>
                <span className="mt-1 block text-[10px] opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {message.senderId === currentUserId && message.status === "pending" ? " · sending…" : ""}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-violet-100 bg-white">
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
          <input
            type="text"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${match.name}...`}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            disabled={!socketReady || !currentUserId}
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim() || !socketReady || !currentUserId}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
              messageInput.trim() && socketReady && currentUserId ? "bg-gradient-to-br from-violet-500 to-violet-700 hover:scale-105 active:scale-95" : "bg-violet-100 cursor-not-allowed"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MessagesPage() {
  const { user } = useAuth();
  const currentUserId = useMemo(() => deriveUserId(user), [user]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedMatchFallback, setSelectedMatchFallback] = useState<Match | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "online">("all");
  const [requestActionState, setRequestActionState] = useState<Record<string, "accept" | "decline" | null>>({});
  const [requestActionMessage, setRequestActionMessage] = useState<string | null>(null);

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
      const [threads, incoming, pending] = await Promise.allSettled([
        apiClient.get(MATCHES_ENDPOINT),
        apiClient.get(NEW_MATCHES_ENDPOINT),
        apiClient.get(LIKE_REQUESTS_ENDPOINT),
      ]);

      if (threads.status !== "fulfilled") {
        throw threads.reason ?? new Error("Unable to load conversations");
      }

      const normalized = normalizeMatchesPayload(threads.value.data, currentUserId);
      setMatches(normalized.matches);

      let computedNewMatches = normalized.newMatches;
      if (incoming.status === "fulfilled") {
        computedNewMatches = extractMatchList(incoming.value.data, currentUserId);
      } else if (incoming.status === "rejected") {
        console.warn("Unable to load new matches", incoming.reason);
      }
      setNewMatches(computedNewMatches);

      if (pending.status === "fulfilled") {
        setPendingRequests(extractMatchList(pending.value.data, currentUserId));
      } else if (pending.status === "rejected") {
        console.warn("Unable to load pending requests", pending.reason);
        setPendingRequests([]);
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
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setMatches([]);
      setNewMatches([]);
      setPendingRequests([]);
      setPendingError(null);
      setMatchesLoading(false);
      return;
    }
    void loadMatches();
  }, [currentUserId, loadMatches]);

  const handleSelect = useCallback(
    (match: Match) => {
      if (!match.conversationId) {
        console.warn("Conversation missing for match", match);
        return;
      }
      if (selectedMatchId === match.id) {
        setSelectedMatchId(null);
        setSelectedMatchFallback(null);
        return;
      }
      setSelectedMatchId(match.id);
      setSelectedMatchFallback(match);
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
        await apiClient.post(`${LIKE_RESPOND_ENDPOINT}/${request.id}/${action}`, {
          matchId: request.id,
          conversationId: request.conversationId,
          userId: currentUserId,
        });

        if (action === "accept") {
          await loadMatches();
        } else {
          setPendingRequests((prev) => prev.filter((item) => item.id !== request.id));
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Outfit:wght@300;400;500;600&display=swap');
        * { font-family: 'Outfit', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .fade-up  { animation: fadeUp 0.4s ease both; }
        .slide-in { animation: slideIn 0.3s ease both; }

        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #ede9fe; border-radius: 2px; }
      `}</style>

      <div className="min-h-screen bg-gray-50/60 flex flex-col">
        <header className="bg-white border-b border-violet-100 sticky top-0 z-30 shadow-sm shadow-violet-50/60">
          <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-bold text-gray-900 text-xl">Messages</h1>
                  {totalUnread > 0 && <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalUnread}</span>}
                </div>
                <p className="text-xs text-gray-400">
                  {matches.length} matches · {onlineCount} online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center hover:bg-violet-100 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button
                onClick={() => (window.location.href = "/chat")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-200/50 hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Open Full Chat
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
          <section className="bg-white rounded-2xl border border-violet-100 shadow-sm shadow-violet-50/60 overflow-hidden fade-up">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-base">Match Requests</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {matchesLoading ? "Checking for new likes…" : `${pendingRequests.length} people waiting for your response`}
                </p>
              </div>
              <button onClick={() => void loadMatches()} className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors">
                Refresh
              </button>
            </div>

            {requestActionMessage && (
              <div className="mx-5 mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                {requestActionMessage}
              </div>
            )}

            {pendingError && (
              <div className="mx-5 mb-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {pendingError}
              </div>
            )}

            <div className="flex flex-col gap-3 px-5 pb-5">
              {matchesLoading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-2xl bg-gradient-to-r from-violet-50 to-white animate-pulse" />
                ))
              ) : pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-xs text-gray-400">
                  <span className="text-2xl mb-1">🌟</span>
                  No new match requests right now — keep swiping!
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <PendingRequestCard
                    key={request.id}
                    request={request}
                    busy={requestActionState[request.id] ?? null}
                    onAccept={() => void handleRequestDecision(request, "accept")}
                    onDecline={() => void handleRequestDecision(request, "decline")}
                  />
                ))
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-violet-100 shadow-sm shadow-violet-50/60 overflow-hidden fade-up">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="font-display font-bold text-gray-900 text-base">New Matches</h2>
                <p className="text-xs text-gray-400 mt-0.5">{newMatches.length} people liked you back</p>
              </div>
              <button className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors">See all →</button>
            </div>

            <div className="flex gap-5 px-5 pb-5 overflow-x-auto custom-scroll">
              {matchesLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="w-[68px] h-[68px] rounded-full bg-violet-50 animate-pulse" />
                ))
              ) : newMatches.length === 0 ? (
                <div className="flex-1 py-8 text-center text-xs text-gray-400">No new matches yet — keep exploring.</div>
              ) : (
                newMatches.map((match) => (
                  <NewMatchBubble key={match.id} match={match} onClick={() => handleSelect(match)} disabled={!match.conversationId} />
                ))
              )}
            </div>
          </section>

          <div className="flex gap-5 items-start">
            <section
              className={`bg-white rounded-2xl border border-violet-100 shadow-sm shadow-violet-50/60 overflow-hidden flex flex-col fade-up transition-all duration-300 ${
                hasActiveConversation ? "w-full lg:w-[420px] flex-shrink-0" : "w-full"
              }`}
            >
              <div className="px-5 pt-5 pb-4 border-b border-violet-50 space-y-3">
                {matchesError && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-600 flex items-center justify-between gap-4">
                    <span>{matchesError}</span>
                    <button onClick={() => void loadMatches()} className="text-[11px] font-semibold text-rose-600 underline-offset-2 hover:underline">
                      Retry
                    </button>
                  </div>
                )}

                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4">
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-violet-50 border border-violet-100 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  {(["all", "unread", "online"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilter(option)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200 ${
                        filter === option
                          ? "bg-violet-600 text-white shadow-md shadow-violet-200/50"
                          : "bg-violet-50 text-gray-500 border border-violet-100 hover:border-violet-200 hover:text-violet-600"
                      }`}
                    >
                      {option === "unread" && totalUnread > 0 ? `Unread (${totalUnread})` : option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-50 overflow-y-auto custom-scroll" style={{ maxHeight: "520px" }}>
                {matchesLoading ? (
                  <div className="flex flex-col gap-3 px-5 py-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-16 rounded-2xl bg-gradient-to-r from-violet-50 to-white animate-pulse" />
                    ))}
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                    <span className="text-4xl">🔍</span>
                    <p className="text-sm">No conversations found</p>
                  </div>
                ) : (
                  filteredMatches.map((match, index) => (
                    <MessageCard key={match.id} match={match} active={selectedMatchId === match.id} onClick={() => handleSelect(match)} index={index} />
                  ))
                )}
              </div>

              <div className="border-t border-violet-50 px-5 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-400">{matchesLoading ? "Loading…" : `${filteredMatches.length} conversations`}</p>
                <button className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors" onClick={() => setMatches((prev) => prev.map((match) => ({ ...match, unread: 0 })))}>
                  Mark all read
                </button>
              </div>
            </section>

            {hasActiveConversation && activeMatch && activeConversationId && (
              <section className="hidden lg:flex flex-col flex-1 bg-white rounded-2xl border border-violet-100 shadow-sm shadow-violet-50/60 overflow-hidden slide-in min-h-0" style={{ minHeight: "520px" }}>
                <MiniChat
                  match={activeMatch}
                  conversationId={activeConversationId}
                  currentUserId={currentUserId}
                  onClose={() => {
                    setSelectedMatchId(null);
                    setSelectedMatchFallback(null);
                  }}
                />
              </section>
            )}

            {!hasActiveConversation && (
              <div className="hidden lg:flex flex-1 bg-white rounded-2xl border border-violet-100 shadow-sm shadow-violet-50/60 items-center justify-center fade-up" style={{ minHeight: "400px" }}>
                <EmptyState />
              </div>
            )}
          </div>

          <section className="grid grid-cols-3 gap-4 fade-up">
            {[
              { label: "Total Matches", value: matches.length.toString(), icon: "💜", color: "from-violet-50 to-white border-violet-100" },
              { label: "Unread", value: totalUnread.toString(), icon: "✉️", color: "from-violet-50 to-white border-violet-100" },
              { label: "Online Now", value: onlineCount.toString(), icon: "🟢", color: "from-emerald-50 to-white border-emerald-100" },
            ].map((stat) => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.color} border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm`}>
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="font-display font-bold text-gray-900 text-2xl leading-none">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </section>
        </div>

        {hasActiveConversation && activeMatch && activeConversationId && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-violet-100 rounded-t-3xl shadow-2xl shadow-violet-200/40 slide-in" style={{ maxHeight: "70vh" }}>
            <div className="w-12 h-1 rounded-full bg-gray-200 mx-auto mt-3 mb-1" />
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
        )}
        {hasActiveConversation && (
          <div
            className="lg:hidden fixed inset-0 bg-black/20 z-30"
            onClick={() => {
              setSelectedMatchId(null);
              setSelectedMatchFallback(null);
            }}
          />
        )}
      </div>
    </>
  );
}
