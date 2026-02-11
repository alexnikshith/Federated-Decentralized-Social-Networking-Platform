import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Ready to join the federation?</span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Take control of your{" "}
            <span className="text-gradient-gold">social experience</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of users who have chosen privacy, community, and
            ethical social networking. Find your community or start your own instance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                Sign Up
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/communities">
              <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                Browse Communities
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t border-border/50">
            <div>
              <div className="font-display text-3xl md:text-4xl font-bold text-gradient-gold mb-2">
                2.4k+
              </div>
              <div className="text-sm text-muted-foreground">Active instances</div>
            </div>
            <div>
              <div className="font-display text-3xl md:text-4xl font-bold text-gradient-teal mb-2">
                150k+
              </div>
              <div className="text-sm text-muted-foreground">Federated users</div>
            </div>
            <div>
              <div className="font-display text-3xl md:text-4xl font-bold mb-2">
                12M+
              </div>
              <div className="text-sm text-muted-foreground">Posts shared</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}