import {
  Shield,
  Users,
  Globe,
  Lock,
  MessageSquare,
  BarChart3,
  Eye,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your data belongs to you. No tracking, no profiling, no selling your information to advertisers.",
    color: "primary",
  },
  {
    icon: Users,
    title: "Community Owned",
    description: "Each instance is independently operated with its own rules, culture, and moderation policies.",
    color: "accent",
  },
  {
    icon: Globe,
    title: "Global Discovery",
    description: "Search and connect with users across every community in the federation through our opt-in Global Directory.",
    color: "success",
  },
  {
    icon: Lock,
    title: "Decentralized Identity",
    description: "Your account lives on your chosen instance. No single authority controls your online presence.",
    color: "primary",
  },
  {
    icon: MessageSquare,
    title: "Meaningful Interactions",
    description: "No algorithmic manipulation. See content from people you follow, in chronological order.",
    color: "accent",
  },
  {
    icon: BarChart3,
    title: "Transparent Analytics",
    description: "Privacy-respecting reports that inform without surveillance. No hidden metrics or dark patterns.",
    color: "success",
  },
];

const iconColors = {
  primary: "text-primary bg-primary/15",
  accent: "text-accent bg-accent/15",
  success: "text-success bg-success/15",
};

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-transparent" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Built on <span className="text-gradient-teal">ethical principles</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Every feature is designed with privacy, transparency, and user autonomy in mind.
            Here's what makes Nexus different.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass-card rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                iconColors[feature.color as keyof typeof iconColors]
              )}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}