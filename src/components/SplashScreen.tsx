import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import AutoPartsBrandLogo from "./AutoPartsBrandLogo";

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  isReady?: boolean;
}

export default function SplashScreen({
  onFinish,
  minDurationMs = 1500,
  isReady = true
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    // Prevent scrolling while splash screen is active
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDurationMs);

    // Hard fallback safety: never keep splash open longer than 3.5s under any condition
    const maxTimer = setTimeout(() => {
      setMinTimeElapsed(true);
      if (!hasFinishedRef.current) {
        setVisible(false);
      }
    }, 3500);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [minDurationMs]);

  useEffect(() => {
    if (minTimeElapsed && isReady && visible && !hasFinishedRef.current) {
      setVisible(false);
    }
  }, [minTimeElapsed, isReady, visible]);

  return (
    <AnimatePresence 
      onExitComplete={() => {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          if (onFinish) {
            onFinish();
          }
        }
      }}
    >
      {visible && (
        <motion.div
          key="native-mobile-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.35, ease: "easeInOut" } 
          }}
          className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0075FF] flex flex-col items-center justify-between p-6 select-none overflow-hidden touch-none"
          style={{ height: "100dvh", width: "100vw" }}
          id="app-native-splash-screen"
        >
          <div className="flex-1" />

          {/* Centered Brand Unit matching user's image */}
          <div className="flex flex-col items-center justify-center text-center relative z-10 w-full max-w-sm px-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ 
                scale: 1,
                opacity: 1
              }}
              transition={{ 
                duration: 0.45,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="w-full flex flex-col items-center justify-center"
            >
              <AutoPartsBrandLogo 
                size={340}
                variant="splash"
              />
            </motion.div>
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center pb-8"
          >
            <p className="text-white/95 text-sm sm:text-base font-normal tracking-wide text-center drop-shadow-sm">
              India’s leading auto parts marketplace
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


