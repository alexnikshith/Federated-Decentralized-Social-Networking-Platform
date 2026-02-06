import { Button } from "@/components/ui/button";
import {
  Globe,
} from "lucide-react";

const Explore = () => {
  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold mb-2">
                Explore the <span className="text-gradient-teal">Federation</span>
              </h1>
              <p className="text-muted-foreground">
                Discover content from across the federated network
              </p>
            </div>

            {/* Info message */}
            <div className="glass-card rounded-xl p-8 text-center">
              <Globe className="w-16 h-16 text-accent mx-auto mb-4" />
              <h3 className="font-display font-semibold text-xl mb-3">
                Federated Content Coming Soon
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The federated feed is available on the main Dashboard page.
                This page is reserved for future federation exploration features.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.hash = '#/dashboard'}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => window.location.hash = '#/federation/communities'}>
                  View Communities
                </Button>
              </div>
            </div>

            <div className="mt-8 p-4 bg-secondary/50 rounded-lg border border-border/50">
              <h4 className="font-semibold mb-2 text-sm">ℹ️ About Federation</h4>
              <p className="text-sm text-muted-foreground">
                Your main feed on the Dashboard automatically includes posts from both
                your local instance and trusted federated instances. Posts from remote
                instances are marked with their origin domain.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;