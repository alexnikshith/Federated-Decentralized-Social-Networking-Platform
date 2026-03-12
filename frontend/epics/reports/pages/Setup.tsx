import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { Settings, Server, Container, Database, Terminal, CheckCircle2 } from 'lucide-react';

const Setup: React.FC = () => {
  return (
    <MainLayout>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500">Instance Guide</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
              Instance <span className="text-emerald-500">Setup</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Launch your own community corner. This guide provides everything you need 
              to deploy a Nexus instance and join the global federation.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-20">
            <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5 space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Database className="w-6 h-6 text-emerald-500" />
                Prerequisites
              </h2>
              <ul className="space-y-6">
                {[
                  { title: "MongoDB Atlas", text: "A MongoDB instance for persistent storage of users and content." },
                  { title: "Docker Runtime", text: "Docker and Docker Compose for containerized deployment." },
                  { title: "Go 1.21+", text: "Required only if building from source without Docker." },
                  { title: "Public Domain", text: "An SSL-enabled domain for federated communication." }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5 space-y-8">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Container className="w-6 h-6 text-emerald-500" />
                Quick Start
              </h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Step 1: Clone Repository</p>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs border border-white/5 text-emerald-400">
                    git clone https://github.com/Nexus/core.git
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Step 2: Initialize Env</p>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs border border-white/5 text-emerald-400">
                    cp .env.example .env
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Step 3: Deploy</p>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs border border-white/5 text-emerald-400">
                    docker-compose up -d --build
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto glass-card rounded-[3rem] p-8 md:p-16 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Server className="w-48 h-48" />
            </div>
            
            <h2 className="text-2xl font-bold mb-8">Federation Initialization</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Once your server is running, you must register your instance with the network 
              directory to enable cross-instance discovery.
            </p>
            
            <div className="bg-black/40 rounded-2xl p-8 border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-mono text-muted-foreground">bash</span>
                </div>
                <code className="text-sm text-emerald-400 block">
                    ./scripts/init_federation.sh --domain your-instance.com
                </code>
            </div>
            
            <p className="mt-8 text-sm text-muted-foreground italic">
              * Need help? Join our discord or check the troubleshooting section in the full docs.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Setup;
