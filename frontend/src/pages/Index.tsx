import { useEffect } from 'react';
import { useAuthStore } from "../../epics/identity/store/authStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { EpicsSection } from "@/components/landing/EpicsSection";


const Index = () => {
  const clearAllSessions = useAuthStore(state => state.clearAllSessions);

  useEffect(() => {
    // Reset all sessions whenever landing page is triggered
    clearAllSessions();
  }, [clearAllSessions]);

  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      {/* Global Cosmos Background */}
      <div
        className="fixed inset-0 w-full h-full bg-[url('/cosmos-bg.png')] bg-cover bg-center bg-no-repeat opacity-60 mix-blend-screen pointer-events-none"
        style={{ filter: "contrast(1.2) brightness(0.8)", zIndex: 0 }}
      />
      {/* Global darkening overlay to ensure text readability */}
      <div className="fixed inset-0 bg-background/60 pointer-events-none" style={{ zIndex: 0 }} />

      {/* Foreground Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <FeaturesSection />
          <EpicsSection />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;