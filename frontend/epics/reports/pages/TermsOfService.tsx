import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { Scale, HeartHandshake, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

const TermsOfService: React.FC = () => {
    const values = [
      {
        title: "Mutual Respect",
        icon: HeartHandshake,
        description: "Nexus is built on community. We expect users to treat each other with dignity and respect, fostering a constructive environment for discourse."
      },
      {
        title: "User Ownership",
        icon: Zap,
        description: "You retain full ownership of the content you create. You grant your instance a license to host and distribute your content across the federation."
      },
      {
        title: "Local Moderation",
        icon: Scale,
        description: "Each instance sets its own rules. By joining an instance, you agree to abide by its specific guidelines and moderation policies."
      }
    ];

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto mb-20 text-center">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-[0.2em] mb-8">
              <Scale className="w-4 h-4" />
              Community Agreement
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
              Terms of <span className="text-amber-500">Service</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Welcome to the Nexus federation. These terms outline our shared expectations 
              and the rules of engagement for our decentralized network.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {values.map((value, i) => (
              <div key={i} className="glass-card rounded-3xl p-8 border-white/5 hover:border-amber-500/20 transition-all flex flex-col gap-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <value.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold mb-4">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            <section className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                1. Acceptable Use
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Nexus is designed for connection and expression. However, the following behavior is strictly prohibited across all compliant instances:</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Harassment or bullying",
                    "Spam or automated manipulation",
                    "Sharing illegal content",
                    "Incitement to violence",
                    "Coordinated disinformation",
                    "Identity theft or impersonation"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                2. Data & Content
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  You are the owner of your content. By posting on Nexus, you grant the instance 
                  operators a worldwide, non-exclusive, royalty-free license to use, copy, 
                  reproduce, and display your content solely for the purpose of operating the 
                  federated network.
                </p>
                <p>
                  Liability for content rests with the creator. Instance operators reserve the 
                  right to remove content that violates local guidelines or global acceptable 
                  use standards.
                </p>
              </div>
            </section>

            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                By using Nexus, you become part of a global collective.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TermsOfService;
