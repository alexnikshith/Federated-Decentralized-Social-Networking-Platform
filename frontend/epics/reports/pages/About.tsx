import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import {
    Shield,
    Globe,
    Users,
    Lock,
    BarChart3,
    Network,
    Zap,
    Fingerprint,
    Heart
} from 'lucide-react';
import { cn } from "@/lib/utils";

const About: React.FC = () => {
    const pillars = [
        {
            icon: Fingerprint,
            title: "Identity First",
            description: "Your digital identity shouldn't be a product. On Nexus, you own your handle, your profile, and your connections across every instance you join.",
            color: "text-primary bg-primary/10"
        },
        {
            icon: Network,
            title: "True Federation",
            description: "No silos. Connect with friends regardless of which server they choose. Our protocol handles cross-instance messaging and discovery seamlessly.",
            color: "text-accent bg-accent/10"
        },
        {
            icon: Shield,
            title: "Zero Surveillance",
            description: "We don't just 'promise' privacy; we build it into the architecture. No tracking, no data harvesting, and no algorithmic manipulation of your feed.",
            color: "text-success bg-success/10"
        }
    ];

    const stats = [
        { label: "Community Powered", value: "100%" },
        { label: "Data Ownership", value: "Direct" },
        { label: "Discovery", value: "Global" },
        { label: "Moderation", value: "Local" }
    ];

    return (
        <MainLayout>
            <div className="relative min-h-screen bg-background overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                <div className="absolute top-[10%] right-[10%] w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[20%] left-[5%] w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
                    {/* Header Section */}
                    <div className="max-w-4xl mx-auto text-center mb-24">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-primary text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">
                            Our Mission
                        </span>
                        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
                            A social web that belongs to <span className="text-gradient-gold">you</span>.
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            Nexus is a federated social network built to restore autonomy to the digital user.
                            We aren't a single platform; we are a network of independent communities
                            bound by a shared protocol of ethics and transparency.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
                        {stats.map((stat, i) => (
                            <div key={i} className="glass-card rounded-2xl p-6 text-center border-white/5 dark:border-white/10 hover:border-primary/30 transition-all group">
                                <div className="text-3xl font-display font-black text-foreground group-hover:text-primary transition-colors">
                                    {stat.value}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pillars Section */}
                    <div className="grid md:grid-cols-3 gap-8 mb-24">
                        {pillars.map((pillar, i) => (
                            <div key={i} className="glass-card rounded-[2rem] p-8 border-primary/5 hover:border-primary/20 transition-all flex flex-col gap-6">
                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", pillar.color)}>
                                    <pillar.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-display text-xl font-bold mb-3">{pillar.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm">
                                        {pillar.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Technical Philosophy */}
                    <div className="glass-card rounded-[3rem] p-8 md:p-16 border-primary/10 relative overflow-hidden mb-24">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Globe className="w-64 h-64" />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-12 items-center relative z-10">
                            <div className="lg:w-1/2">
                                <h2 className="font-display text-3xl font-bold mb-6">The Global Directory</h2>
                                <p className="text-muted-foreground leading-relaxed mb-6">
                                    Unlike traditional social networks that trap you in a walled garden, Nexus features a
                                    federated discovery system. Our **Global Directory Visibility** lets you opt into a
                                    cross-community index, making it possible for friends on other servers to find and
                                    follow you instantly, while you maintain full control over your discoverability.
                                </p>
                                <div className="space-y-4">
                                    {[
                                        "Seamless cross-instance follows",
                                        "Privacy-preserving search filters",
                                        "On-demand discoverability toggles",
                                        "Decentralized identity synchronization"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm font-medium">
                                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                                                <Zap className="w-3 h-3 text-success" />
                                            </div>
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
                                <div className="h-48 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 flex items-center justify-center flex-col gap-2">
                                    <Users className="w-8 h-8 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Community</span>
                                </div>
                                <div className="mt-8 h-48 rounded-[2rem] bg-gradient-to-br from-accent/20 to-success/10 border border-accent/20 flex items-center justify-center flex-col gap-2">
                                    <Globe className="w-8 h-8 text-accent" />
                                    <span className="text-xs font-bold uppercase tracking-tighter">Federated</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Quote */}
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
                            <Heart className="w-6 h-6 text-destructive" />
                        </div>
                        <h2 className="text-2xl italic font-serif text-foreground/80 mb-4">
                            "Connecting the world, one community at a time."
                        </h2>
                        <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                            The Nexus Open Source Project
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default About;
