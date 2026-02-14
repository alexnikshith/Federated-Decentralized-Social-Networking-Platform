import { Button } from "@/components/ui/button";

import { ArrowRight, Shield, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 pt-32 pb-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Social networking,{" "}
            <span className="text-gradient-gold">reimagined</span>
            {" "}for privacy
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            Join a federated network where you own your identity, control your data,
            and connect with communities that share your values. No algorithms.
            No data harvesting. Just meaningful connections.
          </p>



          {/* Trust indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-border/50 w-full max-w-3xl opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-display font-semibold text-lg">Privacy</span>
              </div>
              <span className="text-sm text-muted-foreground">Your data stays yours</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-accent" />
                <span className="font-display font-semibold text-lg">Community</span>
              </div>
              <span className="text-sm text-muted-foreground">Moderated by humans</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-success" />
                <span className="font-display font-semibold text-lg">Federated</span>
              </div>
              <span className="text-sm text-muted-foreground">No central control</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}