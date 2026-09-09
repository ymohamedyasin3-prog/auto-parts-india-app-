import React, { useEffect } from "react";
import { MessageSquare, X, Bell } from "lucide-react";
import { Chat } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface InAppNotificationProps {
  notification: { chat: Chat; text: string; id: string } | null;
  onClose: () => void;
  onClick: (chat: Chat) => void;
}

export default function InAppNotification({ notification, onClose, onClick }: InAppNotificationProps) {
  
  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!notification) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id || "in-app-notification"}
          initial={{ y: -80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 15, stiffness: 180 }}
          className="absolute top-3 left-4 right-4 z-50 pointer-events-auto"
          id="in-app-notification-toast"
        >
        <div 
          onClick={() => onClick(notification.chat)}
          className="bg-white/95 backdrop-blur-md text-slate-900 px-3.5 py-3 rounded-2xl shadow-xl border border-slate-200/90 flex flex-row items-center gap-3 cursor-pointer group active:scale-[0.99] transition-all duration-200"
        >
          {/* Glowing Ring Bell/Inquiry Indicator */}
          <div className="relative shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <Bell size={18} className="text-[#0056D2] animate-bounce" />
            <div className="absolute top-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </div>
          </div>

          {/* Text Summary */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex flex-row items-center gap-1.5 justify-between">
              <div className="flex flex-row items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0056D2]">
                  NEW INQUIRY
                </span>
                <span className="text-[8px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded border border-blue-100">
                  MESSAGE
                </span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 font-mono">
                Just now
              </span>
            </div>

            <span className="text-[11px] font-extrabold text-slate-900 truncate mt-0.5">
              {notification.chat.lastSenderId === notification.chat.buyerId ? notification.chat.buyerName : notification.chat.sellerName}
            </span>
            
            <span className="text-[11px] text-slate-600 truncate font-medium">
              "{notification.text}"
            </span>
            
            <span className="text-[9px] text-[#0056D2] font-semibold truncate mt-1 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded inline-block max-w-[200px]">
              Regarding: {notification.chat.partTitle} ({formatPrice(notification.chat.partPrice)})
            </span>
          </div>

          {/* Action indicator and close buttons */}
          <div className="flex flex-col items-center justify-between self-stretch pl-1 shrink-0 gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 rounded-full transition-all cursor-pointer"
              title="Dismiss"
              id="close-notification-btn"
            >
              <X size={13} />
            </button>
            
            <span className="text-[9px] text-[#0056D2] font-black tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">
              TAP →
            </span>
          </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
