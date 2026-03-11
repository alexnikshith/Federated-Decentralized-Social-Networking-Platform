import { useEffect, useState } from 'react';
import { useAuthStore } from "../../epics/identity/store/authStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { SplashScreen } from "@/components/landing/SplashScreen";
import { AnimatePresence, motion } from "framer-motion";

const SESSION_KEY = "nexus_particle_intro_seen";

const Index = () => {
  // If the session flag is already set, skip the splash immediately —
  // useState initializer runs once, synchronously, before any render.
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY) !== "true"
  );

  const clearAllSessions = useAuthStore(state => state.clearAllSessions);

  useEffect(() => {
    clearAllSessions();

    // Only run the timer if splash is actually showing
    if (!showSplash) return;

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : (
        <motion.div
          key="main"
          // Very fast fade-in when splash finishes
          initial={{ opacity: showSplash ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: showSplash ? 0.3 : 0, ease: "easeOut" }}
          className="min-h-screen flex flex-col relative bg-transparent"
        >


          {/* Animated Nebula Overlays */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 dark:from-cyan-500/30 dark:to-purple-500/30 animate-pulse duration-[12s] blur-[140px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[140%] h-[140%] bg-gradient-to-tr from-blue-600/10 via-transparent to-pink-600/10 dark:from-blue-600/30 dark:to-pink-600/30 animate-pulse duration-[18s] blur-[140px]" style={{ animationDelay: "3s" }} />
          </div>

          {/* Foreground Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            <Header />
            <main className="flex-1">
              <HeroSection />
              <FeaturesSection />
            </main>
            <Footer />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;