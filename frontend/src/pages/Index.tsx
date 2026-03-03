import { useEffect, useState } from 'react';
import { useAuthStore } from "../../epics/identity/store/authStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { SplashScreen } from "@/components/landing/SplashScreen";
import { AnimatePresence, motion } from "framer-motion";


const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const clearAllSessions = useAuthStore(state => state.clearAllSessions);

  useEffect(() => {
    // Reset all sessions whenever landing page is triggered
    clearAllSessions();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, [clearAllSessions]);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="min-h-screen flex flex-col relative bg-transparent"
        >
          {/* Global Cinematic Cosmos Background */}
          <div className="fixed inset-0 w-full h-full bg-[#020617] z-[-2]" />
          <div
            className="fixed inset-0 w-full h-full bg-[url('/cosmos-bg.png')] bg-cover bg-center bg-no-repeat opacity-70 mix-blend-lighten pointer-events-none z-[-1]"
            style={{ filter: "contrast(1.2) brightness(0.9)" }}
          />

          {/* Animated Nebula Overlays */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[140%] bg-gradient-to-br from-cyan-500/30 via-transparent to-purple-500/30 animate-pulse duration-[12s] blur-[140px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[140%] h-[140%] bg-gradient-to-tr from-blue-600/30 via-transparent to-pink-600/30 animate-pulse duration-[18s] blur-[140px]" style={{ animationDelay: "3s" }} />
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
