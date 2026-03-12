import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { Network, Zap, Shield, Cpu, Share2, Activity } from 'lucide-react';

const Protocol: React.FC = () => {
    const features = [
        {
            title: "ActivityPub Inspired",
            description: "Built on the principles of the W3C ActivityPub standard, ensuring compatibility with the wider fediverse in future iterations.",
            icon: Activity,
            color: "text-rose-500 bg-rose-500/10"
        },
        {
            title: "Async Delivery",
            description: "Our background workers ensure eventual consistency. If a remote instance is down, we queue activities and retry with exponential backoff.",
            icon: Zap,
            color: "text-amber-500 bg-amber-500/10"
        },
        {
            title: "Cryptographic Trust",
            description: "Every federated request includes origin verification and instance-level trust certificates to prevent impersonation and spam.",
            icon: Shield,
            color: "text-emerald-500 bg-emerald-500/10"
        }
    ];

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Network className="w-6 h-6 text-rose-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-rose-500">Core Protocol</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
              The Nexus <span className="text-rose-500">Federation</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Connectivity without centralization. Nexus uses a peer-to-peer protocol that 
              allows independent servers to form a unified social fabric.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {features.map((feature, i) => (
              <div key={i} className="glass-card rounded-[2rem] p-8 border-white/5 hover:border-rose-500/20 transition-all group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="font-display text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-[3rem] p-8 md:p-16 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
              <Share2 className="w-96 h-96" />
            </div>
            
            <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <Cpu className="w-8 h-8 text-rose-500" />
                    How It Works
                </h2>

                <div className="space-y-12">
                    {[
                        { step: "01", title: "Outbound Queueing", text: "When you post, our system generates a Federation Activity. This event is placed in a persistent queue, ensuring it survives server restarts." },
                        { step: "02", title: "Instance Resolution", text: "The Federation Worker identifies which remote instances follow you or are mentioned in your post via a local instance directory." },
                        { step: "03", title: "Mutual Verification", text: "Target instances verify the request origin. If the server is in a 'trusted' state, the activity is accepted into their local processing pipe." },
                        { step: "04", title: "Entity Synchronization", text: "Remote servers cache a copy of your post and update their local feeds, making your content available to their users instantly." }
                    ].map((item, i) => (
                        <div key={i} className="flex gap-8 group">
                            <div className="text-4xl font-display font-black text-rose-500/20 group-hover:text-rose-500 transition-colors">
                                {item.step}
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold uppercase tracking-widest">{item.title}</h4>
                                <p className="text-muted-foreground leading-relaxed max-w-2xl">{item.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Protocol;
