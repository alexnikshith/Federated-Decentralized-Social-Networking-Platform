import { 
  User, 
  Share2, 
  Network, 
  Shield, 
  BarChart3,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const epics = [
  {
    id: 1,
    icon: User,
    title: "Identity",
    subtitle: "Own your digital self",
    description: "Create accounts within your community. Manage your profile, privacy settings, and activity with full transparency and control.",
    features: ["Secure authentication", "Privacy controls", "Activity tracking", "Token-based sessions"],
    color: "primary",
  },
  {
    id: 2,
    icon: Share2,
    title: "Content Sharing",
    subtitle: "Share what matters",
    description: "Create posts, interact with your community, and build meaningful connections without algorithmic interference.",
    features: ["Post creation", "Chronological feeds", "Comments & likes", "Notifications"],
    color: "accent",
  },
  {
    id: 3,
    icon: Network,
    title: "Federation",
    subtitle: "Connected, not controlled",
    description: "Interact across communities while maintaining local autonomy. Every piece of content carries its origin for full transparency.",
    features: ["Cross-instance follows", "Remote feeds", "Origin labeling", "Retry mechanisms"],
    color: "success",
  },
  {
    id: 4,
    icon: Shield,
    title: "Safety",
    subtitle: "Protection by design",
    description: "Robust tools for users and moderators alike. Block, report, and maintain community standards with transparency.",
    features: ["Blocking & reporting", "Moderation tools", "Community rules", "Audit logs"],
    color: "destructive",
  },
  {
    id: 5,
    icon: BarChart3,
    title: "Reports",
    subtitle: "Insight without surveillance",
    description: "Privacy-respecting analytics that inform without compromising user autonomy. All reports stay instance-local.",
    features: ["Activity metrics", "Engagement stats", "Federation reports", "Time-based trends"],
    color: "primary",
  },
];

const colorStyles = {
  primary: {
    icon: "text-primary bg-primary/15",
    border: "border-primary/30",
    badge: "bg-primary/10 text-primary",
  },
  accent: {
    icon: "text-accent bg-accent/15",
    border: "border-accent/30",
    badge: "bg-accent/10 text-accent",
  },
  success: {
    icon: "text-success bg-success/15",
    border: "border-success/30",
    badge: "bg-success/10 text-success",
  },
  destructive: {
    icon: "text-destructive bg-destructive/15",
    border: "border-destructive/30",
    badge: "bg-destructive/10 text-destructive",
  },
};

export function EpicsSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-secondary text-muted-foreground mb-4">
            System Architecture
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Five pillars of <span className="text-gradient-gold">federation</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Nexus is built on five core epics, each representing a fundamental aspect 
            of ethical social networking.
          </p>
        </div>

        <div className="space-y-6">
          {epics.map((epic, index) => {
            const styles = colorStyles[epic.color as keyof typeof colorStyles];
            
            return (
              <div
                key={epic.id}
                className={cn(
                  "glass-card rounded-xl p-6 lg:p-8 border-l-4 transition-all duration-300 hover:translate-x-2 opacity-0 animate-slide-in-right",
                  styles.border
                )}
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex items-start gap-4 lg:w-1/3">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
                      styles.icon
                    )}>
                      <epic.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Epic {epic.id}
                      </span>
                      <h3 className="font-display font-bold text-xl">
                        {epic.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {epic.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="lg:w-1/3">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {epic.description}
                    </p>
                  </div>

                  <div className="lg:w-1/3">
                    <div className="flex flex-wrap gap-2">
                      {epic.features.map((feature) => (
                        <span
                          key={feature}
                          className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-full",
                            styles.badge
                          )}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}