import { useEffect } from 'react';
import { useAuthStore } from "../../epics/identity/store/authStore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { EpicsSection } from "@/components/landing/EpicsSection";
import { CTASection } from "@/components/landing/CTASection";

const Index = () => {
  const clearAllSessions = useAuthStore(state => state.clearAllSessions);

  useEffect(() => {
    // Reset all sessions whenever landing page is triggered
    clearAllSessions();
  }, [clearAllSessions]);

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <EpicsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;