import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Globe, Shield, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { federationApi, FederatedInstance } from "@/services/federationApi";

const trustColors = {
  local: "text-primary bg-primary/15",
  trusted: "text-success bg-success/15",
  limited: "text-warning bg-warning/15",
  blocked: "text-destructive bg-destructive/15",
};

const Communities = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [instances, setInstances] = useState<FederatedInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await federationApi.getKnownInstances();
      setInstances(data);
    } catch (err) {
      console.error("Failed to load instances:", err);
      setError("Failed to load federated instances");
    } finally {
      setLoading(false);
    }
  };

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.instance.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.domain.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Separate local and federated instances
  const localInstances = filteredInstances.filter((i) => i.is_local);
  const federatedInstances = filteredInstances.filter((i) => !i.is_local);

  return (
    <div className="min-h-screen">
      <main className="pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <div className="max-w-3xl mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Explore <span className="text-gradient-gold">Communities</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              View federated instances. Each instance is independently operated
              with its own users and content. Connect with instances that align
              with your interests.
            </p>
          </div>

          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search instances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-secondary border-border"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadInstances}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Refresh
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="font-display font-semibold text-xl mb-2">
                Loading instances...
              </h3>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="font-display font-semibold text-xl mb-2 text-destructive">
                {error}
              </h3>
              <p className="text-muted-foreground mb-4">
                Make sure the backend servers are running
              </p>
              <Button onClick={loadInstances}>Try Again</Button>
            </div>
          )}

          {/* Local Instance */}
          {!loading && !error && localInstances.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="font-display font-semibold text-xl">Your Instance</h2>
              </div>
              <div className="grid gap-4">
                {localInstances.map((instance, index) => (
                  <InstanceCard key={instance.domain} instance={instance} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Federated Instances */}
          {!loading && !error && federatedInstances.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-accent" />
                <h2 className="font-display font-semibold text-xl">
                  Federated Instances
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({federatedInstances.length})
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {federatedInstances.map((instance, index) => (
                  <InstanceCard key={instance.domain} instance={instance} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredInstances.length === 0 && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display font-semibold text-xl mb-2">
                No instances found
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search"
                  : "No federated instances configured yet"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface InstanceCardProps {
  instance: FederatedInstance;
  index: number;
}

function InstanceCard({ instance, index }: InstanceCardProps) {
  const trustLevel = instance.is_local ? "local" : instance.trust_level;
  const displayLabel = instance.is_local ? "Local Instance" : "Federated";

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 transition-all duration-300 hover:border-primary/30 group cursor-pointer opacity-0 animate-fade-in-up",
        instance.is_local && "border-primary/20"
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg group-hover:text-primary transition-colors">
            {instance.instance}
          </h3>
          <p className="text-sm text-muted-foreground">{instance.domain}</p>
        </div>
        <div
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-full",
            trustColors[trustLevel as keyof typeof trustColors]
          )}
        >
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span className="capitalize">{displayLabel}</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {instance.is_local
          ? "This is your local instance. All your data is stored here."
          : `Federated instance with ${trustLevel} trust level. Content from this instance is visible in your feed.`}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="capitalize">{trustLevel}</span> • Active
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

export default Communities;