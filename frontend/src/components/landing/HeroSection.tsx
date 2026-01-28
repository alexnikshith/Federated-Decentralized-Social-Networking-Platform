import { Button } from "@/components/ui/button";
import { FederationVisualization } from "./FederationVisualization";
import { ArrowRight, Shield, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 pt-24 pb-16 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-muted-foreground">Decentralized by design</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Social networking,{" "}
              <span className="text-gradient-gold">reimagined</span>
              {" "}for privacy
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              Join a federated network where you own your identity, control your data, 
              and connect with communities that share your values. No algorithms. 
              No data harvesting. Just meaningful connections.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              <Link to="/register">
                <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/explore">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Explore Communities
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border/50 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-display font-semibold text-lg">Privacy</span>
                </div>
                <span className="text-sm text-muted-foreground">Your data stays yours</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="font-display font-semibold text-lg">Community</span>
                </div>
                <span className="text-sm text-muted-foreground">Moderated by humans</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="w-4 h-4 text-success" />
                  <span className="font-display font-semibold text-lg">Federated</span>
                </div>
                <span className="text-sm text-muted-foreground">No central control</span>
              </div>
            </div>
          </div>

          {/* Right column - Visualization */}
          <div className="relative lg:pl-8 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="glass-card rounded-2xl p-6 lg:p-8">
              <FederationVisualization />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}