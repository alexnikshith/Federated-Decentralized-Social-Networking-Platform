import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  Globe, 
  Shield, 
  Users, 
  Lock, 
  Eye,
  Code,
  Heart,
  Scale
} from "lucide-react";

const principles = [
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "We don't track, profile, or sell your data. Your information stays on your chosen instance, under your control. No algorithmic manipulation, no targeted advertising."
  },
  {
    icon: Users,
    title: "Community Governance",
    description: "Each instance is independently operated by its community. Rules, moderation policies, and culture are determined locally—not by a distant corporation."
  },
  {
    icon: Globe,
    title: "Federated Architecture",
    description: "Instances communicate through a standard protocol, enabling cross-community interaction while preserving autonomy. No single point of failure or control."
  },
  {
    icon: Lock,
    title: "Data Sovereignty",
    description: "Your identity belongs to you. Export your data, migrate to another instance, or delete everything—you're always in control of your digital presence."
  },
  {
    icon: Eye,
    title: "Radical Transparency",
    description: "Moderation actions are logged. Federation relationships are visible. Analytics are privacy-respecting. No hidden algorithms or secret policies."
  },
  {
    icon: Code,
    title: "Open Source",
    description: "Our code is public, auditable, and community-driven. Anyone can inspect how Nexus works, contribute improvements, or run their own instance."
  },
];

const About = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-6">
              <Heart className="w-4 h-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Built with intention</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              Social media, done <span className="text-gradient-gold">differently</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Nexus is not another social network. It's a fundamental rethinking of how 
              online communities should work—prioritizing privacy, autonomy, and genuine 
              human connection over engagement metrics and profit extraction.
            </p>
          </div>

          {/* Mission statement */}
          <div className="glass-card rounded-2xl p-8 md:p-12 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="w-6 h-6 text-primary" />
              <h2 className="font-display text-2xl font-bold">Our Mission</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed mb-4">
                We believe the current model of social media is broken. Centralized platforms 
                have become surveillance machines, optimizing for engagement at the cost of 
                mental health, privacy, and democratic discourse. They've turned users into 
                products, communities into commodities.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Nexus represents an alternative path. Through federation, we distribute power 
                back to communities. Through open protocols, we prevent lock-in. Through 
                transparent design, we build trust. Through privacy-first architecture, we 
                protect autonomy.
              </p>
              <p className="text-foreground leading-relaxed font-medium">
                Our goal isn't to become the next social media giant. It's to demonstrate 
                that technology can serve human connection rather than exploit it—and to 
                help build a more ethical digital future.
              </p>
            </div>
          </div>

          {/* Principles */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl font-bold mb-4">
                Core <span className="text-gradient-teal">Principles</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Every decision we make is guided by these foundational beliefs
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {principles.map((principle, index) => (
                <div 
                  key={principle.title}
                  className="glass-card rounded-xl p-6 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                    <principle.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="glass-card rounded-2xl p-8 md:p-12 mb-16">
            <h2 className="font-display text-2xl font-bold mb-8 text-center">
              How Federation Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Choose Your Home</h3>
                <p className="text-sm text-muted-foreground">
                  Pick an instance that aligns with your interests and values. Each instance 
                  has its own community, rules, and administrators.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-2xl font-bold text-accent">2</span>
                </div>
                <h3 className="font-semibold mb-2">Connect Anywhere</h3>
                <p className="text-sm text-muted-foreground">
                  Follow users from any federated instance. See their posts in your timeline, 
                  interact with their content, all from your home instance.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-display text-2xl font-bold text-success">3</span>
                </div>
                <h3 className="font-semibold mb-2">Stay in Control</h3>
                <p className="text-sm text-muted-foreground">
                  Your data lives on your instance. You can export it, migrate, or delete 
                  it entirely. No lock-in, no hidden strings.
                </p>
              </div>
            </div>
          </div>

          {/* Contributing */}
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-bold mb-4">
              Join the Movement
            </h2>
            <p className="text-muted-foreground mb-6">
              Nexus is open source and community-driven. Whether you want to run your 
              own instance, contribute code, write documentation, or simply spread the 
              word—there's a place for you.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Code className="w-4 h-4" />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;