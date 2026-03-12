import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { Shield, Lock, Eye, FileText, ChevronRight } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const sections = [
    {
      title: "Data Sovereignty",
      icon: Shield,
      content: "At Nexus, your data belongs to you. Unlike centralized platforms, your personal information, posts, and connections are stored on the instance you chose to join. We do not aggregate your data into global profiles for advertising or surveillance."
    },
    {
      title: "Information Collection",
      icon: Eye,
      content: "We only collect the minimum amount of data required to provide our services. This includes your username, email (if provided), and the content you explicitly share. We do not track your browsing history across the web or collect biometric data."
    },
    {
      title: "Federation & Privacy",
      icon: Lock,
      content: "When you interact with users on other instances, minimal necessary data is shared to facilitate the interaction. You have full control over your discoverability settings—you can choose to be hidden from global search and non-local directories."
    }
  ];

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-500">Legal Framework</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
              Privacy <span className="text-gradient-cyan text-cyan-400">Policy</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We believe privacy is a fundamental human right. Our privacy policy is designed to be 
              transparent, understandable, and protective of your digital autonomy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {sections.map((section, i) => (
              <div key={i} className="glass-card rounded-3xl p-8 border-white/5 hover:border-cyan-500/20 transition-all flex flex-col gap-6 group">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                  <section.icon className="w-8 h-8 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold mb-4">{section.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-500" />
              Detailed Disclosure
            </h2>
            <div className="space-y-10">
              <div className="space-y-4">
                <h4 className="font-bold text-lg uppercase tracking-wider text-cyan-500/80">1. Account Information</h4>
                <p className="text-muted-foreground leading-relaxed">
                  When you register, you create an identity. This identity is bound to your home instance. 
                  Your password is hashed and salted at the edge; we never store plain-text credentials.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-lg uppercase tracking-wider text-cyan-500/80">2. Content & Metadata</h4>
                <p className="text-muted-foreground leading-relaxed">
                  Any content you post (text, images, stories) is stored on your instance. Metadata like 
                  timestamps and interaction counts are used solely for functional purposes. We do not 
                  perform sentiment analysis or profile-building based on your content.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-lg uppercase tracking-wider text-cyan-500/80">3. Rights of Deletion</h4>
                <p className="text-muted-foreground leading-relaxed">
                  You have the right to be forgotten. Deleting your account initiates a purge of your 
                  data from your home instance and sends a "Delete" activity to federated peers to 
                  request removal of cached copies.
                </p>
              </div>
            </div>
            
            <div className="mt-12 pt-12 border-t border-white/5 text-center">
              <p className="text-sm text-muted-foreground">
                Last Updated: March 12, 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PrivacyPolicy;
