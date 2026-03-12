import React from 'react';
import { MainLayout } from '../../../src/components/layout/MainLayout';
import { Book, Code, Terminal, Layers, ArrowRight } from 'lucide-react';

const Documentation: React.FC = () => {
  const sections = [
    {
      title: "Identity API",
      endpoints: [
        "POST /api/auth/signup",
        "POST /api/auth/login",
        "GET /api/profile/me",
        "PUT /api/profile/me"
      ]
    },
    {
      title: "Content API",
      endpoints: [
        "POST /api/posts",
        "GET /api/feed",
        "POST /api/posts/{id}/like",
        "POST /api/stories"
      ]
    },
    {
      title: "Federation API",
      endpoints: [
        "GET /api/federation/instances",
        "POST /api/federation/users/follow",
        "GET /api/activitypub/resolve"
      ]
    }
  ];

  return (
    <MainLayout>
      <div className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
        
        <div className="container mx-auto py-24 px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto mb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Book className="w-6 h-6 text-indigo-500" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-500">Developer Portal</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight mb-8">
              API <span className="text-indigo-500">Documentation</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Build on the next generation of social networking. Our RESTful API allows you to 
              interface with the Nexus federation directly.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-4">
              <div className="sticky top-24">
                <nav className="glass-card rounded-3xl p-6 border-white/5">
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mb-6">Introduction</h4>
                  <ul className="space-y-2">
                    {["Authentication", "Rate Limiting", "Error Codes", "Webhooks"].map((item) => (
                      <li key={item}>
                        <a href="#" className="flex items-center justify-between group p-3 rounded-xl hover:bg-white/5 transition-all">
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                        </a>
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 mt-8 mb-6">Core Modules</h4>
                  <ul className="space-y-2">
                    {sections.map((section) => (
                      <li key={section.title}>
                        <a href={`#${section.title.toLowerCase().replace(' ', '-')}`} className="flex items-center justify-between group p-3 rounded-xl hover:bg-white/5 transition-all">
                          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{section.title}</span>
                          <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-500" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-12">
              <section className="glass-card rounded-[2.5rem] p-8 md:p-12 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5">
                  <Terminal className="w-40 h-40" />
                </div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Code className="w-6 h-6 text-indigo-500" />
                  Authentication
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Nexus uses JWT (JSON Web Tokens) for authentication. Include your token in the 
                  header of every protected request:
                </p>
                <div className="bg-black/40 rounded-2xl p-6 font-mono text-sm border border-white/5 text-indigo-400">
                  Authorization: Bearer {'<your_jwt_token>'}
                </div>
              </section>

              {sections.map((section) => (
                <section key={section.title} id={section.title.toLowerCase().replace(' ', '-')} className="space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-3 px-4">
                    <Layers className="w-5 h-5 text-indigo-500" />
                    {section.title}
                  </h3>
                  <div className="grid gap-4">
                    {section.endpoints.map((endpoint) => (
                      <div key={endpoint} className="glass-card rounded-2xl p-6 border-white/5 flex items-center justify-between hover:border-indigo-500/20 transition-all group">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md uppercase tracking-tighter">
                            {endpoint.split(' ')[0]}
                          </span>
                          <code className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                            {endpoint.split(' ')[1]}
                          </code>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Documentation;
