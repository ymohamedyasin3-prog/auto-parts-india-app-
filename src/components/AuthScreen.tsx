import React, { useState, useEffect } from "react";
import { signInWithGoogle } from "../lib/firebase";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import AutoPartsBrandLogo from "./AutoPartsBrandLogo";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  logoutMessage?: string | null;
  onClearLogoutMessage?: () => void;
}

export default function AuthScreen({ onAuthSuccess, logoutMessage, onClearLogoutMessage }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(logoutMessage || null);

  // Sync logout message into temporary floating toast with auto-dismiss
  useEffect(() => {
    if (logoutMessage) {
      setToastMessage(logoutMessage);
      const timer = setTimeout(() => {
        setToastMessage(null);
        if (onClearLogoutMessage) onClearLogoutMessage();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [logoutMessage, onClearLogoutMessage]);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onAuthSuccess(user);
    } catch (err: any) {
      console.warn("Google Sign-In notice:", err?.message || err);
      let friendlyMessage = "Failed to sign in with Google. Please try again.";
      const errCode = err?.code;
      const rawMsg = String(err?.message || err || "");

      if (errCode === "auth/popup-closed-by-user") {
        friendlyMessage = "Sign-in window was closed. Please try again.";
      } else if (errCode === "auth/popup-blocked") {
        friendlyMessage = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
      } else if (errCode === "auth/network-request-failed") {
        friendlyMessage = "Network connection failed. Please check your connection and try again.";
      } else if (rawMsg.includes("console.firebase.google.com") || rawMsg.includes("unauthorized-domain")) {
        friendlyMessage = "Google Sign-In is temporarily unavailable. Please try again in a moment.";
      } else if (rawMsg && !rawMsg.includes("http") && !rawMsg.includes("firebase") && !rawMsg.includes("Firebase")) {
        friendlyMessage = rawMsg;
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex-1 flex flex-col bg-[#0075FF] justify-between items-center text-white min-h-screen px-6 py-10 relative select-none overflow-hidden"
      style={{ minHeight: "100dvh" }}
      id="auth-screen-container"
    >
      {/* Floating Logout Snackbar / Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="logout-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white text-slate-900 text-xs font-semibold px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 max-w-sm w-[90%]"
          >
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="flex-1 truncate">{toastMessage}</span>
            <button
              onClick={() => {
                setToastMessage(null);
                if (onClearLogoutMessage) onClearLogoutMessage();
              }}
              className="text-slate-400 hover:text-slate-800 p-0.5 rounded-full cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Spacer */}
      <div className="flex-1" />

      {/* Centered Brand Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] flex flex-col items-center justify-center my-auto"
      >
        <AutoPartsBrandLogo size={330} variant="splash" />
      </motion.div>

      {/* Bottom Spacer */}
      <div className="flex-1" />

      {/* Bottom Action: Sign In With Google Pill Button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="w-full max-w-[360px] flex flex-col items-center pb-8 z-10"
      >
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-black/25 backdrop-blur-md rounded-2xl text-xs text-white flex items-center gap-2.5 border border-white/20 w-full"
          >
            <AlertCircle size={16} className="shrink-0 text-white" />
            <span className="leading-tight flex-1">{error}</span>
          </motion.div>
        )}

        {/* White Pill Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-[58px] bg-white hover:bg-slate-50 active:scale-[0.98] text-[#1F2937] font-bold rounded-full px-6 text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-black/15 disabled:opacity-70 cursor-pointer"
          id="btn-google-signin"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-[#0075FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold text-[#1F2937]">Signing in...</span>
            </div>
          ) : (
            <>
              {/* Official Google 4-Color 'G' Icon */}
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-bold text-[#1F2937] tracking-tight text-[17px]">
                Sign in with Google
              </span>
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
