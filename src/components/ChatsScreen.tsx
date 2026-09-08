import React, { useState, useEffect } from "react";
import { MessageSquare, ArrowRight, Compass, Search, Bell, Trash2 } from "lucide-react";
import { User, Chat } from "../types";
import { subscribeToUserChats, hideChatForUser } from "../lib/firebase";
import BrandLogo from "./BrandLogo";
import UserAvatar from "./UserAvatar";
import PullToRefresh from "./PullToRefresh";
import { useLanguage } from "../lib/LanguageContext";

interface ChatsScreenProps {
  currentUser: User;
  onSelectChat: (chat: Chat) => void;
  unreadCounts: Record<string, number>;
  onOpenUserProfile?: (userId: string, userName: string) => void;
}

export default function ChatsScreen({ 
  currentUser, 
  onSelectChat, 
  unreadCounts = {},
  onOpenUserProfile
}: ChatsScreenProps) {
  const { t } = useLanguage();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "buy" | "sell">("all");

  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log(`[ChatsScreen] Subscribing to chats for user ${currentUser.id}`);
    const unsubscribe = subscribeToUserChats(
      currentUser.id,
      (data) => {
        console.log(`[ChatsScreen] Chats received in ChatsScreen. Size: ${data.length}`);
        setChats(data);
        setLoading(false);
      },
      (err) => {
        console.error(`[ChatsScreen] Error syncing chats in ChatsScreen:`, err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );
    return () => {
      console.log(`[ChatsScreen] Unsubscribing from chats listener in ChatsScreen`);
      unsubscribe();
    };
  }, [currentUser.id]);

  const isCurrentUserBuyer = (chat: Chat): boolean => {
    if (chat.sellerId && chat.sellerId === currentUser.id) return false;
    if (chat.buyerId && chat.buyerId === currentUser.id) return true;
    if (chat.sellerId && chat.sellerId !== currentUser.id) return true;
    if (chat.buyerId && chat.buyerId !== currentUser.id) return false;
    return true;
  };

  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);

  const filteredChats = chats.filter((chat) => {
    if (Array.isArray(chat.hiddenFor) && chat.hiddenFor.includes(currentUser.id)) {
      return false;
    }
    const isUserBuyer = isCurrentUserBuyer(chat);
    if (activeFilter === "buy" && !isUserBuyer) return false;
    if (activeFilter === "sell" && isUserBuyer) return false;

    const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
    const query = (searchQuery || "").toLowerCase();
    return (
      (partnerName || "").toLowerCase().includes(query) ||
      (chat.partTitle || "").toLowerCase().includes(query) ||
      (chat.lastMessageText || "").toLowerCase().includes(query)
    );
  });

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    const id = chatToDelete.id;
    setChatToDelete(null);
    setChats(prev => prev.filter(c => c.id !== id));
    await hideChatForUser(id, currentUser.id);
  };

  const parseTimestamp = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts === "number") return ts;
    if (typeof ts === "string") {
      const parsed = Date.parse(ts);
      return isNaN(parsed) ? Date.now() : parsed;
    }
    if (typeof ts === "object") {
      if (typeof ts.toMillis === "function") return ts.toMillis();
      if (typeof ts.seconds === "number") return ts.seconds * 1000;
    }
    return Date.now();
  };

  const getRelativeTime = (timestamp: any) => {
    const millis = parseTimestamp(timestamp);
    const difference = Date.now() - millis;
    if (difference < 0) return "Just now";
    const minutes = Math.floor(difference / (60 * 1000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days > 30) return "Recently";
    return `${days}d ago`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full relative" id="chats-screen-container">
      {/* Title Header */}
      <div className="bg-[#0B1220] text-white pt-4 pb-3.5 px-4 sticky top-0 z-10 shadow-xl border-b border-[#18233C]">
        <div className="flex items-center justify-between mb-3">
          <BrandLogo size="sm" variant="horizontal" theme="dark" showTagline={false} />
          <div className="relative text-slate-300 p-1">
            <Bell size={18} />
            {Object.values(unreadCounts || {}).reduce((acc, curr) => acc + curr, 0) > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0B1220]" />
            )}
          </div>
        </div>
        
        {/* Custom Inbox Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchMessagesPlaceholder")}
            className="w-full bg-[#131D31] border border-[#1E2D4A] rounded-2xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] font-medium transition-all"
            id="chats-search-input"
          />
        </div>

        {/* Filter Tabs: All, Buy, Sell */}
        <div className="flex items-center gap-2" id="chats-filter-tabs">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-[#0072F5] text-white shadow-xs"
                : "bg-white/10 text-slate-300 hover:bg-white/15"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("buy")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "buy"
                ? "bg-[#0072F5] text-white shadow-xs"
                : "bg-white/10 text-slate-300 hover:bg-white/15"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("sell")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "sell"
                ? "bg-[#0072F5] text-white shadow-xs"
                : "bg-white/10 text-slate-300 hover:bg-white/15"
            }`}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Main Lists Body */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 pb-24 overflow-x-hidden">
        <PullToRefresh onRefresh={async () => {
          // Trigger a quick re-sync
          setLoading(true);
          const unsubscribe = subscribeToUserChats(
            currentUser.id,
            (data) => {
              setChats(data);
              setLoading(false);
            },
            (err) => {
              console.error(err);
              setLoading(false);
            }
          );
          setTimeout(() => unsubscribe(), 4000);
        }}>
        {error ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-red-50 rounded-3xl border border-red-100 shadow-sm" id="chats-error">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3 text-lg font-black">
              ⚠
            </div>
            <h4 className="text-xs font-extrabold text-red-800">{t("failedToSyncChats")}</h4>
            <p className="text-[11px] text-red-600 mt-1 max-w-xs leading-relaxed font-semibold">
              {error}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-3xl border border-slate-100 shadow-sm" id="chats-empty">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
              <MessageSquare size={28} />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800">{t("noActiveConversations")}</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              {t("noActiveConversationsSub")}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5" id="chats-list">
            {filteredChats.map((chat, idx) => {
              const isUserBuyer = currentUser.id === chat.buyerId;
              const partnerName = isUserBuyer ? chat.sellerName : chat.buyerName;
              const partnerId = isUserBuyer ? chat.sellerId : chat.buyerId;
              const unreadCount = unreadCounts[chat.id] || 0;

              return (
                <div
                  key={`${chat.id}-${idx}`}
                  onClick={() => onSelectChat(chat)}
                  className="bg-white active:scale-[0.98] p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 shadow-2xs transition-all duration-150 cursor-pointer flex items-center gap-3.5 relative group"
                  id={`chat-item-${chat.id}`}
                >
                  {/* Partner Avatar with linked part badge */}
                  <div className="relative shrink-0">
                    <UserAvatar
                      userId={partnerId}
                      name={partnerName}
                      size="lg"
                      interactive={!!onOpenUserProfile}
                      onClick={(e) => {
                        if (onOpenUserProfile && partnerId) {
                          e.stopPropagation();
                          onOpenUserProfile(partnerId, partnerName);
                        }
                      }}
                      title={onOpenUserProfile ? `View ${partnerName}'s Profile` : undefined}
                    />

                    {/* Small Part Thumbnail Badge */}
                    {chat.partImageUrl && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border-2 border-white shadow-2xs bg-slate-900">
                        <img src={chat.partImageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span 
                          onClick={(e) => {
                            if (onOpenUserProfile && partnerId) {
                              e.stopPropagation();
                              onOpenUserProfile(partnerId, partnerName);
                            }
                          }}
                          className={`text-xs font-bold text-slate-900 truncate font-display ${onOpenUserProfile ? "hover:text-blue-600 transition-colors" : ""}`}
                          title={onOpenUserProfile ? `View ${partnerName}'s Profile` : undefined}
                        >
                          {partnerName}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md shrink-0 border ${
                            isUserBuyer
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isUserBuyer ? "Buy" : "Sell"}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-slate-400 shrink-0">
                        {getRelativeTime(chat.updatedAt)}
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-indigo-600 truncate mt-0.5">
                      {chat.partTitle}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[11px] text-slate-500 truncate line-clamp-1">
                        {chat.lastMessage || "Click to open chat conversation..."}
                      </span>

                      {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete(chat);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete Conversation"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </PullToRefresh>
      </div>

      {/* Delete Chat Confirmation Modal */}
      {chatToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Delete this conversation?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This will remove the chat with {isCurrentUserBuyer(chatToDelete) ? chatToDelete.sellerName : chatToDelete.buyerName} from your inbox.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setChatToDelete(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteChat}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
